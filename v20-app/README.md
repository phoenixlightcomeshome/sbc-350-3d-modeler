# SBC 350 v20.0.0 Quantum Aerospace Design Studio (Flat Root Archive)

Browser-based 3D CAD, materials science, powertrain packaging, and aerospace matrix studio delivered as a static flat-root archive. Designed to run adaptively without paid or locked API keys (local static server, offline browser, or GitHub Pages) using graceful WebGL2/CPU fallbacks when WebGPU or optional WASM/CDN resources are unavailable.

> **Verification Status:** Individual module audits for Files 2–14 remain `PENDING_ENGINEERING_REVIEW` until each file in this flat-root archive is inspected and verified against the v20 Fixed-Code Standard.

## Studio Architecture (v20 Redesign Target)

- **Rooms & Navigation:** Plain-verb workspace rooms (**Photo Scale**, **Sketch & Build**, **3D Inspect & Slice**, **Parts Matrix**, **Export & Specs**, **Empty Design Room**, **Technical Drawing** bidirectional 2D/3D sheets, and **About & Standards** drawer) with pinned 3D viewport and drag-and-drop workflows.
- **Area 9 Powertrain Packaging:** Engine & transmission selectors (brand filter -> engine -> compatible transmissions with direct vs. adapter labeling; default **SBC 350 + TH350**).
- **Empty Design Room:** Starts with a blank grid/profile for new concept builds (first concept slot: **Phoenix hover craft** and **Phoenix space vehicle** — explicitly flagged as design concepts with dimensions, capacity, propulsion, and materials left for Ray's verification).
- **Project Workflow Tools:** JSON project save/load, point-to-point measure & clearance/fit-check overlay (including calibrated photo overlay), and bidirectional 2D technical drawing <-> 3D modeling transfer via MBD JSON packet + STL/DXF.

## Flat Root Archive Files (14 Core Files)

1. `README.md` — Archive overview, verification labels, engineering baseline, and local run instructions.
2. `index.html` — Studio UI shell, plain-verb rooms, 2-click photo calibration canvas (`19.685 in` default span), Match Target Spec selector, pinned 3D viewport, and interactive workflows *(pending audit)*.
3. `v20_standards.json` — Reference specs, target URL metadata (`plannedTargetUrl` / `launchStatus`), bundle matrix, reference targets, and `sbc_350_head_photo_calibration` (`500 mm = 19.685 in`, `335.5 px`, `17.043 px/in`, `688x532 px -> 40.37 x 31.21 in`) *(pending audit)*.
4. `materialsScience3dpEngineV20.js` — ISO/ASTM 52900 process families (`PBF-LB/M`, `PBF-EB/M`, `PBF-LB/P`, `VPP`, `BJT-M`, `MEX`), thermal/shrinkage/anisotropy/build-time/cost estimators, and ISO/ASTM 52920 / AS9102 framework checklists. Heuristic coefficients and costs must be labeled as **estimates** (`costIsEstimate`) unless backed by verified aerospace-matrix data *(pending audit)*.
5. `webgpuComputeEngineV20.js` — WebGPU / WebGL2 capability probe, WGSL `@workgroup_size(64)` compute kernel template, and section clipping. **WebGPU is detection-only** (`apiDetected`, `activeInRenderer: false`) and the WGSL string is a template unless a real `requestDevice` / `createComputePipeline` / `computePass` pipeline is wired *(pending audit)*.
6. `manifoldBrepEngineV20.js` — Solid modeling kernel layer; either wired to real `opencascade.js` WASM B-Rep with watertight validation or explicitly labeled as an **extrude-based approximation** (`THREE.ExtrudeGeometry`) with exact signed-tetrahedron mesh volume (no loft volume fudge factors) *(pending audit)*.
7. `parametricFeatureEngineV20.js` — Parametric geometry generation (strictly internal inches, circular-flange-only bolt-circle guard, editable unverified corner bolt defaults, real `reverse_eng_fit` technique branch) *(pending audit)*.
8. `drawingSheetRendererV20.js` — 2D technical drawing views (plan/section/detail), datum references, title block, and bidirectional 2D <-> 3D transfer *(pending audit)*.
9. `futureTechEngineV20.js` — Forward-looking propulsion/concept modeling modules with explicit concept/estimate flags *(pending audit)*.
10. `adaptableGraphicsNetworkV20.js` — Adaptive rendering/fallback coordination across WebGL2/CPU capabilities *(pending audit)*.
11. `interactiveSketcherV20.js` — 2D sketch grid, contour simplification (clamped RDP point-to-segment distance), and empty-canvas sketching *(pending audit)*.
12. `manufacturingCadEngineV20.js` — STL export (manufactured closed meshes only; rejects `PlaneGeometry` / reference planes / zero-volume meshes), DXF export (`AC1015`, `$INSUNITS = 1` inches, `$MEASUREMENT = 0` imperial), and MBD JSON packet export (`isRealStepAp242File: false` — **JSON, not STEP AP242**) *(pending audit)*.
13. `aerospaceMatrixControllerV20.js` — Graphical parts/build matrix controller with thumbnail/3D cards, `remove(id)` + recursive `dispose()`, and metadata-only flags for `localStorage`-restored entries *(pending audit)*.
14. `manifest_materials_3dp_v20.json` — Manifest of materials/3DP definitions and aerospace-matrix dataset links *(pending audit)*.

## Engineering & Honesty Standards

- **Single Internal Unit:** All internal geometry and calculations use **inches (`in`)**, converting to metric/display units only at UI and export boundaries.
- **Default Tier:** Starts on **General-Use** (never `tier4_aerospace` by default).
- **SBC 350 Baseline (Immutable Unless Corrected by Ray):** `4.000 in` bore, `3.480 in` stroke, `5.700 in` connecting rods, `9.025 in` deck height, `349.85 CID`, `385 HP / 414 TQ` carb (`408 HP / 431 TQ` MPFI), `4.400 in` bore spacing, `500 mm` (`19.685 in`) head length, `17-position` head-bolt torque sequence (never modeled as a circular bolt circle).
- **Explicit Honesty Labels (Never Green PASS on Unverified Data):**
  - Standards (NIST / ISO/ASTM / AS9102): `NOT_CERTIFIED_FRAMEWORK_REFERENCES_ONLY`
  - Sign-off gate: `humanVerified === true` required (`signoffActor: null`, `tevvStatus: PENDING_ENGINEERING_REVIEW` otherwise)
  - Unmeasured defaults (corner holes, bolt circles, heuristic material constants): `UNVERIFIED DEFAULT — NEEDING RAY'S MEASUREMENT` / `estimate` / `rule-of-thumb`
  - Empty PMI callouts: `NO_REAL_PMI_CALLOUTS_SUPPLIED`
  - MBD export: `JSON-not-STEP` (`isRealStepAp242File: false`)
  - WebGPU probe: `detection-only` unless a live compute pipeline is wired

## Serve Locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/` in a WebGL2-capable browser.