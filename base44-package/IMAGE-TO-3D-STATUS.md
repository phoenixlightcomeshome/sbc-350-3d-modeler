# Image-to-3D status (rebuilt Nov 26 after the rsync incident)

## What it is
Tab 00 (Design Studio) gains an "Image to 3D" panel: upload an image →
trace its outline (Otsu + Marching Squares + RDP) → 2D draft → extrude →
export STL / DXF / SVG. NC export DISABLED until Ray supplies
tool/feed/speed/depth/units. Client-side only, no API, no keys. Scale and
extrude depth are required inputs with NO defaults — no invented dimensions.

## Current state
- DELIVERED by Gemini Nov 25 ~17:35 (Ray's AI Studio account, chat
  "SBC Image-to-3D — fresh build from v14":
  https://aistudio.google.com/u/1/prompts/1nZWJXrktW8isaudcaHAo_sUdtNcxoyKQ).
- LANDED + VERIFIED Nov 25 ~17:41–17:59 in staging (imageVectorizer.ts 910
  lines + TabDesignStudio 1890 → 3454 lines; tsc exit 0, build exit 0).
- LOST Nov 25 ~19:34 in the rsync incident (staging src deleted). The
  authoritative source is Gemini's chat above. Re-download in progress:
  the 5 code blocks were downloaded (imageVectorizer.ts + patch parts a–d)
  and a Drive folder "SBC image-to-3D recovery 20261125" was created in
  Ray's Drive; the paste-into-Docs step waits on Ray signing in to
  raysironworks101 on his phone browser.
- After the re-landing: re-verify (marker grep + tsc + build), then add
  cluster-08 to both packages and push the restored tree to GitHub.

## MISMATCH Nov 25 ~20:06 — received Block 1 is NOT the verified file
The browser quoted a Block 1 (saved at ~/workspace/recovery-20261125/imageVectorizer-received-block1.ts): 543 lines, NOT 910; true markers ALL 0 (computeGrayscale, computeOtsuThreshold, traceMarchingSquares, interpolateFraction, rdpOpenChain, polygonSignedArea, polygonInsidePolygon, downsampleImageData); isHole present 3x; exports at wrong lines (vectorizeImageData 446 vs 604, vectorizeImageFile 480 vs 807, scalePointsToMm 498 vs 890); algorithm is boundary tracing (traceBoundary) + mean threshold (determineThreshold), not Marching Squares + Otsu. It is a DIFFERENT version from the chat, not the verified ~17:35 Deliverable 1. DO NOT land it. The browser was sent back to find the correct ~910-line block (VectorContour {points, holes: VectorPoint[][]}, the true helper names, exports near lines 604/807/890) and re-send Block 1; Block 2 stays on hold until Block 1 is right. **RESOLVED Nov 25 ~20:10:** the browser re-sent the corrected Block 1 (saved at ~/workspace/recovery-20261125/imageVectorizer-corrected-block1.ts): **774 lines measured** (vs 910 in the Nov 25 notes — a formatting/count difference; all export positions sit ~85% of the noted lines, uniformly); ALL true markers present (each helper defined + called); ALL wrong markers 0 (no isHole, no OrbitControls, no traceBoundary/determineThreshold); VectorContour {points, holes: VectorPoint[][]}; defaults RDP 1.0 / min area 16; PNG/JPG only. ACCEPTED as the true Marching Squares/Otsu file. Block 2 (patch part a) requested next.

## Markers that prove the true code (NOT the wrong first landing)
- imageVectorizer.ts: computeGrayscale, computeOtsuThreshold,
  traceMarchingSquares, vectorizeImageData, vectorizeImageFile,
  scalePointsToMm; VectorContour {points, holes: VectorPoint[][]}.
- TabDesignStudio.tsx: activePixelsPerMm, refSpanPxInput, caliperPoints,
  handleExportTracedStl; manual spherical-orbit preview (NO OrbitControls).
- WRONG-version names (must be 0): OrbitControls, resolvedPxPerMm,
  referencePxInput, toGrayscale, detectDarkForeground, rdpRecursive, isHole.

## Open items for Ray to true
- Caliper tool + vertex editor extras (built, unconfirmed).
- Assumptions: rdpEpsilon 1.0 px, minContourArea 16 px², STL scale 1,
  origin defaults Bottom-Left (toggleable to Center).
- Reconcile with the Tabs4Pods 7-file pull-down after the midnight reset —
  do not silently replace one version with the other.
