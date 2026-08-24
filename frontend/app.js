/**
 * SIH26011: 3D ULPIN Volumetric Cadastral Visualization Client
 * Three.js WebGL Engine, Interactive Raycaster, Strata Slicing & Title Certificate Generator
 */

const API_BASE = "/api";
let scene, camera, renderer, controls, raycaster, mouse;
const parcelMeshes = [];
let allParcelsData = [];
let selectedMesh = null;
let hoveredMesh = null;
let currentFloorFilter = null;

function init() {
    const container = document.getElementById("canvas-container");

    // 1. Scene & Atmosphere
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.010);

    // 2. Camera setup
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(32, 24, 36);

    // 3. WebGL Renderer with High-DPI support
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls with smooth damping
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.15; // Allow slight sub-surface view
    controls.minDistance = 5;
    controls.maxDistance = 150;

    // 5. Illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.70);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xe2e8f0, 0.90);
    dirLight.position.set(40, 60, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const blueFillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    blueFillLight.position.set(-30, -20, -30);
    scene.add(blueFillLight);

    // 6. Cadastral Boundary & Ground Plane
    createCadastralGrid();

    // 7. Raycasting & Interaction Listeners
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);

    // 8. Fetch Initial Dataset
    fetchParcels();
    fetchMetrics();
    animate();
}

function createCadastralGrid() {
    // Primary Cadastral Ground Grid
    const gridHelper = new THREE.GridHelper(70, 70, 0x10b981, 0x1e293b);
    gridHelper.position.y = 0.0;
    scene.add(gridHelper);

    // Base Survey Lot Perimeter Outline (Emerald Boundary Line)
    const lotPoints = [
        new THREE.Vector3(-15, 0.05, -15),
        new THREE.Vector3(15, 0.05, -15),
        new THREE.Vector3(15, 0.05, 15),
        new THREE.Vector3(-15, 0.05, 15),
        new THREE.Vector3(-15, 0.05, -15),
    ];
    const lotGeo = new THREE.BufferGeometry().setFromPoints(lotPoints);
    const lotMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 });
    const lotLine = new THREE.Line(lotGeo, lotMat);
    scene.add(lotLine);
}

async function fetchParcels() {
    try {
        const url = currentFloorFilter !== null 
            ? `${API_BASE}/parcels?floor_level=${currentFloorFilter}`
            : `${API_BASE}/parcels`;
        const res = await fetch(url);
        const data = await res.json();
        allParcelsData = data;
        renderParcels(data);
        updateTelemetry(data);
    } catch (err) {
        console.error("Failed to fetch 3D parcels:", err);
    }
}

async function fetchMetrics() {
    try {
        const res = await fetch(`${API_BASE}/metrics`);
        const metrics = await res.json();
        document.getElementById("stat-total-vol").innerText = `${metrics.total_cadastral_volume_m3.toLocaleString()} m³`;
    } catch (err) {
        console.error("Failed to fetch metrics:", err);
    }
}

function updateTelemetry(parcels) {
    document.getElementById("stat-units-count").innerText = parcels.length;
    const totalVol = parcels.reduce((sum, p) => sum + (p.volume_m3 || 0), 0);
    document.getElementById("stat-total-vol").innerText = `${Math.round(totalVol).toLocaleString()} m³`;
}

function renderParcels(parcels) {
    // Clear existing parcel meshes
    parcelMeshes.forEach(m => scene.remove(m));
    parcelMeshes.length = 0;

    parcels.forEach(p => {
        const b = p.bounds;
        const width = b.max_x - b.min_x;
        const height = b.max_z - b.min_z;
        const depth = b.max_y - b.min_y;

        const posX = (b.min_x + b.max_x) / 2;
        const posY = (b.min_z + b.max_z) / 2;
        const posZ = (b.min_y + b.max_y) / 2;

        const geo = new THREE.BoxGeometry(width, height, depth);

        // Color coding:
        // Deep Underground (B-2): 0x4c1d95 (Purple)
        // Shallow Underground (B-1): 0x312e81 (Deep Indigo)
        // Above-Ground Residential: 0x0f172a / 0x1e293b (Slate glass)
        let baseColor = 0x1e293b;
        let edgeColor = 0x38bdf8;
        let opacity = 0.85;

        if (p.floor_level === -2) {
            baseColor = 0x4c1d95;
            edgeColor = 0xc084fc;
            opacity = 0.75;
        } else if (p.floor_level === -1) {
            baseColor = 0x312e81;
            edgeColor = 0x818cf8;
            opacity = 0.80;
        }

        const mat = new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: 0.3,
            metalness: 0.3,
            transparent: true,
            opacity: opacity,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(posX, posY, posZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Bounding Edges
        const edges = new THREE.EdgesGeometry(geo);
        const lineSeg = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 1.5 }));
        mesh.add(lineSeg);

        mesh.userData = {
            ...p,
            defaultColor: baseColor,
            defaultOpacity: opacity,
            edgeColor: edgeColor,
            lineSegRef: lineSeg,
        };

        scene.add(mesh);
        parcelMeshes.push(mesh);
    });
}

function onPointerMove(event) {
    if (event.clientX < 400 && event.clientY < 350) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(parcelMeshes, false);

    if (intersects.length > 0) {
        const target = intersects[0].object;
        if (hoveredMesh !== target && target !== selectedMesh) {
            resetHovered();
            hoveredMesh = target;
            hoveredMesh.material.color.setHex(0x0284c7); // Light cyan hover
            document.body.style.cursor = "pointer";
        }
    } else {
        resetHovered();
        document.body.style.cursor = "default";
    }
}

function resetHovered() {
    if (hoveredMesh && hoveredMesh !== selectedMesh) {
        hoveredMesh.material.color.setHex(hoveredMesh.userData.defaultColor);
        hoveredMesh = null;
    }
}

function onPointerDown(event) {
    if (event.clientX < 400 && event.clientY < 350) return;
    const inspector = document.getElementById("inspector-panel");
    if (!inspector.classList.contains("hidden")) {
        const rect = inspector.getBoundingClientRect();
        if (event.clientX >= rect.left && event.clientX <= rect.right &&
            event.clientY >= rect.top && event.clientY <= rect.bottom) {
            return;
        }
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(parcelMeshes, false);

    if (intersects.length > 0) {
        selectParcel(intersects[0].object);
    }
}

function selectParcel(mesh) {
    if (selectedMesh) {
        selectedMesh.material.color.setHex(selectedMesh.userData.defaultColor);
    }

    selectedMesh = mesh;
    mesh.material.color.setHex(0x10b981); // Highlight emerald

    const p = mesh.userData;
    const inspector = document.getElementById("inspector-panel");
    inspector.classList.remove("hidden");

    document.getElementById("parcel-name").innerText = p.unit_label;
    document.getElementById("parcel-type").innerText = p.property_type || "Residential Apartment";
    document.getElementById("ulpin-text").innerText = p.ulpin_3d;
    document.getElementById("floor-level").innerText = p.floor_level < 0 ? `Basement ${p.floor_level}` : `Floor ${p.floor_level}`;
    document.getElementById("elevation-range").innerText = `${p.bounds.min_z}m to ${p.bounds.max_z}m MSL`;
    document.getElementById("parcel-volume").innerText = `${p.volume_m3} m³`;
    document.getElementById("parcel-coords").innerText = `X: [${p.bounds.min_x}, ${p.bounds.max_x}] | Y: [${p.bounds.min_y}, ${p.bounds.max_y}]`;
    document.getElementById("owner-name").innerText = p.owner_name;
    document.getElementById("survey-no").innerText = p.base_survey_no;
    document.getElementById("encumbrance-status").innerText = p.encumbrance_status || "Clear / Validated";
}

function closeInspector() {
    document.getElementById("inspector-panel").classList.add("hidden");
    if (selectedMesh) {
        selectedMesh.material.color.setHex(selectedMesh.userData.defaultColor);
        selectedMesh = null;
    }
}

function filterStrata(floor) {
    currentFloorFilter = floor;
    document.querySelectorAll(".strata-btn").forEach(btn => {
        btn.classList.remove("bg-indigo-600", "text-white", "shadow");
        btn.classList.add("bg-slate-800", "text-slate-300");
    });
    event.target.classList.remove("bg-slate-800", "text-slate-300");
    event.target.classList.add("bg-indigo-600", "text-white", "shadow");
    fetchParcels();
}

async function seedUrbanComplex() {
    try {
        const res = await fetch(`${API_BASE}/seed-complex`, { method: "POST" });
        if (res.ok) {
            currentFloorFilter = null;
            await fetchParcels();
            await fetchMetrics();
            closeInspector();
        }
    } catch (err) {
        alert("Error seeding complex: " + err);
    }
}

async function triggerLidarIngest() {
    try {
        const res = await fetch(`${API_BASE}/parcels/ingest-lidar?auto_register=true`, { method: "POST" });
        const result = await res.json();
        alert(`LiDAR UAV Ingestion Completed!\n\nDetected Floors: ${result.detected_floors}\nBuilding Height: ${result.building_height_m}m\nEstimated IoU: ${result.quality_metrics.footprint_iou_estimate}\nUnits Registered: ${result.draft_parcels_registered}`);
        await fetchParcels();
        await fetchMetrics();
    } catch (err) {
        alert("Failed to ingest drone LiDAR: " + err);
    }
}

function copyUlpin() {
    if (!selectedMesh) return;
    navigator.clipboard.writeText(selectedMesh.userData.ulpin_3d);
    alert("3D ULPIN copied to clipboard:\n" + selectedMesh.userData.ulpin_3d);
}

function downloadExport(format) {
    if (!selectedMesh) return;
    const ulpin = selectedMesh.userData.ulpin_3d;
    window.open(`${API_BASE}/parcel/${encodeURIComponent(ulpin)}/3d?format=${format}`, "_blank");
}

function openRegisterModal() {
    document.getElementById("register-modal").classList.remove("hidden");
    document.getElementById("register-error").classList.add("hidden");
}

function closeRegisterModal() {
    document.getElementById("register-modal").classList.add("hidden");
}

async function handleRegisterSubmit(event) {
    event.preventDefault();
    const errorEl = document.getElementById("register-error");
    errorEl.classList.add("hidden");

    const payload = {
        unit_label: document.getElementById("reg-unit-label").value,
        floor_level: parseInt(document.getElementById("reg-floor-level").value),
        owner_name: document.getElementById("reg-owner-name").value,
        base_survey_no: document.getElementById("reg-survey-no").value,
        property_type: document.getElementById("reg-property-type").value,
        state_code: "KA",
        district_code: "560",
        bounds: {
            min_x: parseFloat(document.getElementById("reg-min-x").value),
            max_x: parseFloat(document.getElementById("reg-max-x").value),
            min_y: parseFloat(document.getElementById("reg-min-y").value),
            max_y: parseFloat(document.getElementById("reg-max-y").value),
            min_z: parseFloat(document.getElementById("reg-min-z").value),
            max_z: parseFloat(document.getElementById("reg-max-z").value),
        }
    };

    try {
        const res = await fetch(`${API_BASE}/parcels/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            errorEl.innerText = err.detail || "Topology verification rejected registration.";
            errorEl.classList.remove("hidden");
            return;
        }

        const saved = await res.json();
        closeRegisterModal();
        await fetchParcels();
        await fetchMetrics();
        alert(`Successfully registered 3D Unit!\nAssigned ULPIN: ${saved.ulpin_3d}`);
    } catch (err) {
        errorEl.innerText = "Network error: " + err.message;
        errorEl.classList.remove("hidden");
    }
}

function printTitleCertificate() {
    if (!selectedMesh) return;
    const p = selectedMesh.userData;
    const printWin = window.open("", "", "width=850,height=750");
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Digital 3D Title Certificate - ${p.ulpin_3d}</title>
            <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
                .cert-border { border: 4px double #0f172a; padding: 30px; border-radius: 12px; }
                .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
                .emblem { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; }
                .dept { font-size: 14px; font-weight: 600; color: #475569; margin-top: 4px; }
                .scheme { font-size: 12px; color: #64748b; }
                .ulpin-badge { background: #f1f5f9; border: 2px dashed #0284c7; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center; }
                .ulpin-label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }
                .ulpin-code { font-family: monospace; font-size: 18px; font-weight: bold; color: #0369a1; margin-top: 6px; }
                .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; font-size: 13px; margin-bottom: 24px; }
                .field-label { color: #64748b; font-weight: 500; }
                .field-value { color: #0f172a; font-weight: 600; }
                .spatial-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 24px; }
                .footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
                .qr-mock { display: inline-block; padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: monospace; font-size: 10px; background: #fff; }
            </style>
        </head>
        <body>
            <div class="cert-border">
                <div class="header">
                    <div class="emblem">Government of India</div>
                    <div class="dept">Ministry of Rural Development • Department of Land Resources (DoLR)</div>
                    <div class="scheme">Digital India Land Records Modernization Programme (DILRMP) — 3D Volumetric Property Card</div>
                </div>

                <div class="ulpin-badge">
                    <div class="ulpin-label">3D Unique Land Parcel Identification Number (Bhu-Aadhaar 3D)</div>
                    <div class="ulpin-code">${p.ulpin_3d}</div>
                </div>

                <div class="section-title">Record of Rights (RoR) Legal Attributes</div>
                <div class="grid">
                    <div><span class="field-label">Legal Title Holder:</span> <span class="field-value">${p.owner_name}</span></div>
                    <div><span class="field-label">Unit Identifier:</span> <span class="field-value">${p.unit_label}</span></div>
                    <div><span class="field-label">Base Survey Lot No:</span> <span class="field-value">${p.base_survey_no}</span></div>
                    <div><span class="field-label">Cadastral Classification:</span> <span class="field-value">${p.property_type || "Residential Apartment"}</span></div>
                    <div><span class="field-label">State / District Code:</span> <span class="field-value">${p.state_code} / ${p.district_code}</span></div>
                    <div><span class="field-label">Encumbrance Status:</span> <span class="field-value" style="color: #059669;">${p.encumbrance_status || "Clear / Validated"}</span></div>
                </div>

                <div class="section-title">Volumetric & Spatial Dimension Extents (ISO 19152 LADM)</div>
                <div class="spatial-box">
                    <div class="grid" style="margin-bottom: 0;">
                        <div><span class="field-label">Vertical Layer:</span> <span class="field-value">${p.floor_level < 0 ? `Basement ${p.floor_level}` : `Floor ${p.floor_level}`}</span></div>
                        <div><span class="field-label">Mean Sea Level Elevation:</span> <span class="field-value">${p.bounds.min_z}m to ${p.bounds.max_z}m MSL</span></div>
                        <div><span class="field-label">3D Volumetric Extent:</span> <span class="field-value">${p.volume_m3} m³</span></div>
                        <div><span class="field-label">Local Footprint Span:</span> <span class="field-value">X: [${p.bounds.min_x}, ${p.bounds.max_x}] | Y: [${p.bounds.min_y}, ${p.bounds.max_y}]</span></div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 30px;">
                    <div class="qr-mock">CRYPTOGRAPHIC SIGNATURE VALIDATED<br>HASH: ${p.ulpin_3d.split('-').pop()}</div>
                    <div style="text-align: right; font-size: 11px;">
                        <div><strong>Competent Cadastral Authority</strong></div>
                        <div style="color: #64748b;">Directorate of Survey & Land Records</div>
                    </div>
                </div>

                <div class="footer">
                    This digital property card is cryptographically generated and certified under ISO 19152 (LADM) 3D Spatial Profile specifications.
                </div>
            </div>
        </body>
        </html>
    `);
    printWin.document.close();
    printWin.print();
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

window.onload = init;
