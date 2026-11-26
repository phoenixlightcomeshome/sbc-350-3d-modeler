# SBC 350 v16 — Base44 build brief (new version, Ray's account raysironworks101@gmail.com)

## What this is
A NEW VERSION of the SBC 350 app in Ray's Base44 account, built from ALL the
verified v16 upgrades. Base = clusters 01–08 (v14 source + image-to-3D =
v15 content). Then clusters 09–12 (v16 updates) in order. Nothing here is
unverified — every file was checked on disk Nov 26 before packaging.

## Route
1. **GitHub import FIRST (0 credits):** import the v16 staging branch from
   GitHub (phoenixlightcomeshome/sbc-350-3d-modeler, branch v16-staging).
   The repo is public.
2. **Paste route is the fallback:** paste clusters ONE per builder message,
   in order 01–12. Clusters 09–12 OVERWRITE the same paths where they
   overlap (src/data/engineData.ts, techDrawingsCatalog.ts). Cluster 10's
   manufacturingMatrix v16 lands as a NEW file, src/data/manufacturingMatrixV16.ts
   — it does NOT overwrite manufacturingMatrix.ts, because it exports a new
   schema and the app still imports the old one; wiring it in is the v16
   chat's follow-up work. Cluster 09's canonical-schema file is a DOCS
   REFERENCE (migration target) — do not wire it in; the corrected
   old-structure file is the live engineData.ts, because it exports
   everything the app imports and the canonical schema would break the
   build if pasted over it.
3. Upload the 3 JPGs (filenames in MANIFEST.txt) + the public/ tree BEFORE
   pasting code (same as the v14 brief).

## Verified facts the builder must honor
- Baseline: 349.85 CID, 385 HP / 414 TQ carb, 408 HP / 431 TQ MPFI.
  408/431 is PROVISIONAL — Gemini's calculation, for Ray to true.
- Cam fix, never regress: `camCore.rotation.y = crankAngle * 0.5`.
- NC export DISABLED until Ray supplies tool/feed/speed/depth/units.
- Extrude depth is a required input with NO default. A reference dimension
  is required for scale. Calibrated true scale: 138 px = 4.400 in.
- No secrets: do not run/port server.ts, no API keys anywhere. The
  Materials Project fetcher reads its key ONLY from an environment variable.
- Aerospace Matrix page: a SEPARATE page in the SBC 350 design areas with
  multiple tabs (Materials, Processes, Standards, Design Methods, Tolerance
  contrast), data ONLY from src/data/aerospaceMatrix.ts. See
  docs/AEROSPACE-PAGE-SPEC.md.
- Tolerance rule: every dimension/tolerance/capability value comes from an
  industry standard or is flagged NEEDING RAY'S MEASUREMENT. Design checks
  flag what a process cannot make instead of silently building it. See
  docs/TOLERANCE-RULE.md and src/utils/dataValidation.ts.
- OPEN ITEMS for Ray's ruling (do not decide these): CID diffs of 0.01–0.02
  on LS3/2JZ/L24 between the canonical schema and the Nov 25 numbers;
  baseTq 415 vs his stated 414. The validation module reports the baseTq
  mismatch as a DISCREPANCY — never silently correct it.
- The v16 AI Studio pickup is still running — its outputs (Files 1–2,
  enhancement pass, diffs) land as a follow-up package. Do NOT invent them.

## Credits
Check message credits + the daily limit in the editor BEFORE sending a
builder prompt. Stop at 0 credits. Never upgrade to the Builder plan
($40/mo) without Ray's word — he handles payments himself. A GitHub-imported
app has NO Publish button in Base44 — the preview is a development preview,
not production hosting. Do NOT publish. Nothing ships without Ray's word.
