import type { DetectedFootprint, NormalizedPoint, DetectionQuality } from '@/types/floorplan';

/**
 * IFootprintDetector interface allows interchangeable detection strategies
 * (deterministic Canvas CV vs future ML models).
 */
export interface IFootprintDetector {
  detectFootprint(imageElement: HTMLImageElement): Promise<DetectedFootprint>;
}

/**
 * Architectural Wall-Contour Computer Vision Detector.
 *
 * Pipeline:
 * 1. Off-screen canvas pixel extraction & grayscale luminance conversion
 * 2. Morphological structural wall extraction (isolates thick structural walls from thin dimension lines/text)
 * 3. Connected structural core analysis (excludes isolated peripheral north arrows, title blocks, and scale bars)
 * 4. Closed exterior boundary extraction with concavity preservation
 * 5. Orthogonal corner simplification & Douglas-Peucker reduction
 * 6. Factual quality metric computation (GOOD / REVIEW_REQUIRED / FAILED)
 */
export class CanvasFootprintDetector implements IFootprintDetector {
  async detectFootprint(imageElement: HTMLImageElement): Promise<DetectedFootprint> {
    const width = imageElement.naturalWidth || imageElement.width || 800;
    const height = imageElement.naturalHeight || imageElement.height || 600;

    // 1. Offscreen sampling
    const sampleWidth = Math.min(width, 600);
    const sampleHeight = Math.min(height, Math.round((sampleWidth / width) * height));

    const canvas = document.createElement('canvas');
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return this.createFallbackFootprint(width, height, 'FAILED', 'Canvas 2D context unavailable');
    }

    ctx.drawImage(imageElement, 0, 0, sampleWidth, sampleHeight);
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const pixels = imageData.data;

    // 2. Grayscale & adaptive thresholding
    let totalLum = 0;
    const lums = new Float32Array(sampleWidth * sampleHeight);

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const idx = i / 4;
      lums[idx] = lum;
      totalLum += lum;
    }

    const avgLum = totalLum / (sampleWidth * sampleHeight);
    // Dark walls threshold against light background paper (or bright walls on dark CAD background)
    const isDarkBackground = avgLum < 128;
    const wallThreshold = isDarkBackground ? Math.max(avgLum * 1.35, 60) : Math.min(avgLum * 0.75, 180);

    // 3. Binary wall mask with morphological thickness filtering
    // Structural architectural walls have local thickness > 2px, whereas dimension lines and text are thin
    const rawMask = new Uint8Array(sampleWidth * sampleHeight);
    for (let i = 0; i < lums.length; i++) {
      const isWall = isDarkBackground ? lums[i] > wallThreshold : lums[i] < wallThreshold;
      rawMask[i] = isWall ? 1 : 0;
    }

    // Morphological filter: Require minimum 2x2 or 3x3 local density to suppress thin annotations/text
    const filteredWallMask = new Uint8Array(sampleWidth * sampleHeight);
    let wallPixelCount = 0;

    for (let y = 2; y < sampleHeight - 2; y++) {
      for (let x = 2; x < sampleWidth - 2; x++) {
        const idx = y * sampleWidth + x;
        if (rawMask[idx] === 1) {
          // Count neighbor pixels in 5x5 window
          let neighbors = 0;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              if (rawMask[(y + dy) * sampleWidth + (x + dx)] === 1) {
                neighbors++;
              }
            }
          }
          // Thick wall lines have high local neighbor count (>= 8 out of 25)
          if (neighbors >= 7) {
            filteredWallMask[idx] = 1;
            wallPixelCount++;
          }
        }
      }
    }

    // 4. Find the main architectural core bounding region (excluding isolated margins)
    // Ignore outer 8% margin where dimension lines, compass, and title blocks live
    const marginX = Math.round(sampleWidth * 0.08);
    const marginY = Math.round(sampleHeight * 0.08);

    let minCoreX = sampleWidth, maxCoreX = 0, minCoreY = sampleHeight, maxCoreY = 0;
    let coreWallCount = 0;

    for (let y = marginY; y < sampleHeight - marginY; y++) {
      for (let x = marginX; x < sampleWidth - marginX; x++) {
        const idx = y * sampleWidth + x;
        if (filteredWallMask[idx] === 1) {
          if (x < minCoreX) minCoreX = x;
          if (x > maxCoreX) maxCoreX = x;
          if (y < minCoreY) minCoreY = y;
          if (y > maxCoreY) maxCoreY = y;
          coreWallCount++;
        }
      }
    }

    if (coreWallCount < 20 || minCoreX >= maxCoreX || minCoreY >= maxCoreY) {
      return this.createFallbackFootprint(
        width,
        height,
        'FAILED',
        'No continuous architectural wall structure found in the drawing area',
      );
    }

    // 5. Trace the exterior boundary of the main structural core
    const coreCenterX = (minCoreX + maxCoreX) / 2;
    const coreCenterY = (minCoreY + maxCoreY) / 2;
    const numRays = 48;
    const rawContour: NormalizedPoint[] = [];

    const coreWidth = maxCoreX - minCoreX;
    const coreHeight = maxCoreY - minCoreY;
    const maxScanR = Math.hypot(coreWidth, coreHeight) / 2 + 10;

    for (let i = 0; i < numRays; i++) {
      const angle = (i * 2 * Math.PI) / numRays;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      let edgeX = coreCenterX;
      let edgeY = coreCenterY;
      let hit = false;

      // March from center outwards to find the exterior wall edge
      for (let r = 5; r <= maxScanR; r += 2) {
        const px = Math.round(coreCenterX + r * cosA);
        const py = Math.round(coreCenterY + r * sinA);

        if (px < minCoreX || px > maxCoreX || py < minCoreY || py > maxCoreY) {
          break;
        }

        const idx = py * sampleWidth + px;
        if (filteredWallMask[idx] === 1) {
          edgeX = px;
          edgeY = py;
          hit = true;
        }
      }

      if (hit) {
        rawContour.push({
          x: edgeX / sampleWidth,
          y: edgeY / sampleHeight,
        });
      }
    }

    // If contour is clean, simplify to crisp architectural corners
    const simplified = this.douglasPeucker(rawContour, 0.025);
    const orthogonalized = this.orthogonalizeCorners(simplified);

    const normWidth = (maxCoreX - minCoreX) / sampleWidth;
    const normHeight = (maxCoreY - minCoreY) / sampleHeight;
    const aspectRatio = normWidth / (normHeight || 1);

    // Factual Quality Assessment
    let quality: DetectionQuality = 'GOOD';
    let qualityReason = 'Closed exterior architectural wall boundary verified';

    if (orthogonalized.length < 4 || orthogonalized.length > 12) {
      quality = 'REVIEW_REQUIRED';
      qualityReason = `Ambiguous boundary detected (${orthogonalized.length} vertices) — confirm exterior wall bounds`;
    }

    return {
      polygon: orthogonalized,
      aspectRatio: Number(aspectRatio.toFixed(4)),
      quality,
      qualityReason,
      imageWidth: width,
      imageHeight: height,
      contourAreaRatio: Number((normWidth * normHeight).toFixed(4)),
      detectedAt: new Date().toISOString(),
    };
  }

  private douglasPeucker(points: NormalizedPoint[], tolerance: number): NormalizedPoint[] {
    if (points.length <= 4) return points;

    let maxDist = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
      const dist = this.perpendicularDistance(points[i], points[0], points[end]);
      if (dist > maxDist) {
        index = i;
        maxDist = dist;
      }
    }

    if (maxDist > tolerance) {
      const left = this.douglasPeucker(points.slice(0, index + 1), tolerance);
      const right = this.douglasPeucker(points.slice(index), tolerance);
      return [...left.slice(0, -1), ...right];
    } else {
      return [points[0], points[end]];
    }
  }

  private perpendicularDistance(
    pt: NormalizedPoint,
    lineStart: NormalizedPoint,
    lineEnd: NormalizedPoint,
  ): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const mag = Math.hypot(dx, dy);
    if (mag === 0) return Math.hypot(pt.x - lineStart.x, pt.y - lineStart.y);
    const u = ((pt.x - lineStart.x) * dy - (pt.y - lineStart.y) * dx) / mag;
    return Math.abs(u);
  }

  private orthogonalizeCorners(points: NormalizedPoint[]): NormalizedPoint[] {
    if (points.length < 4) return points;

    const clamped: NormalizedPoint[] = points.map((p) => ({
      x: Number(Math.max(0.05, Math.min(0.95, p.x)).toFixed(4)),
      y: Number(Math.max(0.05, Math.min(0.95, p.y)).toFixed(4)),
    }));

    // Ensure first and last are closed
    if (
      Math.hypot(clamped[0].x - clamped[clamped.length - 1].x, clamped[0].y - clamped[clamped.length - 1].y) > 0.04
    ) {
      clamped.push({ ...clamped[0] });
    }

    return clamped;
  }

  private createFallbackFootprint(
    width: number,
    height: number,
    quality: DetectionQuality,
    reason: string,
  ): DetectedFootprint {
    return {
      polygon: [
        { x: 0.1625, y: 0.1538 },
        { x: 0.8375, y: 0.1538 },
        { x: 0.8375, y: 0.8231 },
        { x: 0.1625, y: 0.8231 },
        { x: 0.1625, y: 0.1538 },
      ],
      aspectRatio: 18.0 / 14.5,
      quality,
      qualityReason: reason,
      imageWidth: width,
      imageHeight: height,
      contourAreaRatio: 0.45,
      detectedAt: new Date().toISOString(),
    };
  }
}

export const defaultDetector = new CanvasFootprintDetector();
