# 3D ULPIN & Volumetric Cadastral Mapping Engine (SIH26011)

## Overview
Volumetric property stratification prototype integrating FastAPI for cryptographic 3D ULPIN generation, real-time spatial collision checks, and a Three.js WebGL interactive viewer.

## Quick Start Guide
1. Activate virtual environment:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
4. Open `index.html` in a web browser.
