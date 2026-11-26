# SBC 350 v14 — Base44 build brief (rebuilt Nov 26 after the rsync incident)

## Source
`~/workspace/sbc-350-3d-modeler/base44-package/` — 8 paste clusters (57 text
files, md5-verified by build-packages.py) + this brief + Tab 14 spec +
image-to-3D status. Clusters 01–07 are the v14 source. Cluster 08
(image-to-3D) is PENDING the re-landing; cluster-04's TabDesignStudio.tsx
(1890 lines) is the OLD version and cluster 08 replaces it.

## Route
Paste clusters into the Base44 builder, ONE cluster per message, in order.
GitHub import is the preferred route when it works (0 credits for the import);
the paste route is the fallback. Do NOT merge into main. Do NOT publish.
Nothing ships without Ray's word.

## STOP gate (Claude evaluation, Nov 25 ~15:04 — fixes applied)
After step 2 (core pasted + building), STOP. No Tab 14 / no wiring until Ray
gives written approval. Preview-only — never publish without his word.

## Route 2 (paste) — upload first
Upload the 3 JPGs (filenames in MANIFEST.txt) + the public/ tree BEFORE
pasting code. Then paste clusters 01–07, then 08.

## Verified facts the builder must honor
- `bun install` (bun.lock ships). vite.config sets NO base (defaults to /).
- Baseline: 349.85 CID, 385 HP / 414 TQ carb, 408 HP / 431 TQ MPFI.
  408/431 is PROVISIONAL — Gemini's calculation, for Ray to true.
- Cam fix, never regress: `camCore.rotation.y = crankAngle * 0.5`.
- Component3DTechRenderer already exists (Tab 12's). MPFI flip IS in Tab 13.
- NC export DISABLED until Ray supplies tool/feed/speed/depth/units.
- Extrude depth is a required input with NO default. RDP epsilon is shown
  and user-adjustable. A reference dimension is required for scale.
- No secrets: do not run/port server.ts, no API keys anywhere.
- Spec files are pasted at step 3, not in the branch.
- localStorage overrides will NOT carry to Base44 (different origin).

## Credits
Check message credits + the daily limit in the editor BEFORE sending a builder
prompt. Stop at 0 credits. Never upgrade to the Builder plan ($40/mo) without
Ray's word — he handles payments himself. A GitHub-imported app has NO Publish
button in Base44 — the preview is a development preview, not production hosting.
