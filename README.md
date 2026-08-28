# 3D ULPIN & Vertical Property Mapping System (SIH26011)

[![Vite](https://img.shields.io/badge/Vite-5.4+-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![CesiumJS](https://img.shields.io/badge/CesiumJS-3D%20GIS-139FCB.svg?logo=cesium&logoColor=white)](https://cesium.com)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-06B6D4.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

> **Smart India Hackathon 2026 — Problem Statement SIH26011**  
> **Ministry of Rural Development • Department of Land Resources (DoLR)**  
> *Next-generation 3D Cadastral Digital Twin & Volumetric Property Stratification Command Center integrating client-side 2D floorplan footprint extraction, parametric vertical building generation, and interactive 3D ULPIN management.*

---

## 🏛️ System Architecture Overview

```
Floorplan Blueprint (PNG / JPG / SVG)
         ↓
1. Deterministic Computer-Vision Floorplan Detector
   • Morphological structural wall extraction
   • Connected architectural core boundary tracing
   • Exclusion of peripheral dimension lines, north compass, and title blocks
         ↓
2. Vector Footprint Review & Physical Calibration
   • Interactive SVG vector overlay on blueprint
   • Verified physical dimensions: 18.00 m × 14.50 m (261.00 sq.m ≈ 2,809 sq.ft)
   • Factual Quality Indicator (GOOD / REVIEW_REQUIRED / FAILED)
         ↓
3. Parametric Vertical Stacking Engine
   • User-configured floors above ground, basements, floor height, slab thickness
   • Ground level anchored at 0m, above-ground floors (F01..F04), subterranean basements (B01)
   • Deterministic prototype 3D ULPIN encoding (e.g., 12A34B56C78D90-A003, 12A34B56C78D90-B001)
         ↓
4. Interactive CesiumJS 3D Command Center
   • Spatially anchored 3D labels rotating with camera
   • Strata floor slabs with air-gaps & subterranean basement rendering
   • Unified selection sync across Property Explorer, Vertical Explorer, and Property Intelligence
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0 or higher
- **npm**: v9.0 or higher

### 2. Installation & Running
```bash
# Clone the repository
git clone https://github.com/akashgamerz6575-spec/SIH-Hackathon.git
cd SIH-Hackathon

# Install dependencies
npm install

# Start the local development server
npm run dev
```

The application will be available at `http://localhost:5173`.

### 3. Production Build
```bash
npm run build
```

---

## 🎯 Key Features

1. **Floorplan → 3D Digital Twin Workflow**:
   - Ingests 2D architectural blueprints and extracts the exterior structural perimeter.
   - User-in-the-loop verification of physical dimensions (e.g. 18.00m × 14.50m) and area (2,809 sq.ft).
   - Generates multi-story buildings with basements in seconds.

2. **Spatially Anchored 3D Cadastre**:
   - High-fidelity 3D floor strata in CesiumJS with status-driven visual feedback (Verified cyan, Anomaly red, Subterranean teal).
   - Dynamic 3D badge labels anchored to each floor.

3. **Multi-Attribute Search & Intelligence**:
   - Fast `Ctrl+K` search across Parcel IDs, Building IDs, Floor IDs, and 3D ULPIN codes.
   - Comprehensive Record of Rights (RoR) inspection and one-click ULPIN copying.

4. **Multi-Property Cadastre Switching**:
   - Seamless switching between standard Demo Cadastre (`KA-BLR-DEMO-001`) and user-generated 3D properties without page reloads.

---

## 📄 License
Developed for Smart India Hackathon (SIH26011).
