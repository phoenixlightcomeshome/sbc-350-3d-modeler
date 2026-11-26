# SBC 350 3D Engine Builder

Ray's 3D V8 Chevy small-block builder — 3D CAD engine workbench, transmission matrix, dyno, technical drawings, ignition, induction, valvetrain, rotating assembly, and machine shop build sheet. Live on GitHub Pages.

- **Live:** https://phoenixlightcomeshome.github.io/sbc-350-3d-modeler/ (v7)
- **Live v8:** https://phoenixlightcomeshome.github.io/sbc-350-3d-modeler/v8/ — same app, Tab 09 drawings fixes + dyno falloff fix. v7 stays live at the root; v8 lives under `/v8/`.
- **Live v9:** https://phoenixlightcomeshome.github.io/sbc-350-3d-modeler/v9/ — the separate next version (Ray's word Nov 24). v7 and v8 stay live.
- **Live v10:** https://phoenixlightcomeshome.github.io/sbc-350-3d-modeler/v10/ — the new version (Ray's word Nov 24, "Use GitHub to launch it"). v7, v8 and v9 stay live.
- **Live v11:** https://phoenixlightcomeshome.github.io/sbc-350-3d-modeler/v11/ — built as-is at Ray's word Nov 24 ("Build as is"), from the v10 tree plus the delivered updates. v7, v8, v9 and v10 stay live.
- **Live v12:** https://phoenixlightcomeshome.github.io/sbc-350-3d-modeler/v12/ — the remixed app Ray sent (02b764cb, remixed into Phoenix's account as 005ec037), pushed through GitHub at his word Nov 24. v7–v11 stay live.
- **Live v16:** https://phoenixlightcomeshome.github.io/sbc-350-3d-modeler/v16/ — the verified v16 upgrades from AI Studio (Nov 26): corrected library engineData, v16 manufacturing + drawings, aerospace matrix, image-to-3D utilities, validator + fetcher. v7–v15 stay live.
- **Baseline (Ray, confirmed):** 4.000" bore, 3.480" stroke, 5.700" rods, 9.025" deck height, 64cc chambers, .039" gasket with .015" deck clearance; 9.90:1 compression, 0.054" quench. All dimensions/specs are Gemini's from Ray's numbers — for Ray to true, as with the buoy.

## v16 (current) — verified upgrades from AI Studio (Nov 26, 2026)

Ray's word Nov 26: "Take all your upgrades and updates from the ai studio you verified for v16" and "Then launch it from GitHub." v16 is the verified set, landed on the v16-staging branch and merged to main.

- **Content:** corrected old-structure engineData.ts (audit fixes: E-Street #5089, LS3 68.4cc, TH350 reverse 1.93, Mopar 727 reverse 2.20, 42RE front band 3 turns); v16 techDrawingsCatalog.ts; NEW manufacturingMatrixV16.ts (additive — new schema, old file kept); NEW aerospaceMatrix.ts; NEW imageTo3d.ts, materialsProjectFetcher.ts (key from env only), dataValidation.ts; canonical-schema engineData as a docs reference (migration target, not wired in). Cam-core spin fix survives (`camCore.rotation.y`). Typecheck: clean (`tsc --noEmit`, 0 errors) after a one-word fix to Gemini's delivery (`family?.pattern` → `family?.bellhousingPattern`, the field that exists on EngineFamilySpec).
- **Open items for Ray's ruling:** CID diffs of 0.01–0.02 on LS3/2JZ/L24; baseTq 415 vs his stated 414; PTWA as-deposited range vs Villafuerte. The v16 AI Studio pickup was still running when v16 launched; its outputs land as a follow-up.
- **Build:** source `app/` (v16-staging branch); built with `vite build --base /sbc-350-3d-modeler/v16/`; published build in `v16/`.

## v12 (current) — the remixed app, pushed through GitHub (Nov 24, 2026)

Ray's word Nov 24: "This is the version I want to push through GitHub" (https://ai.studio/apps/02b764cb-9c85-4dcc-b0b9-39f344a57756, remixed into Phoenix's account as 005ec037). v12 is that app's code, downloaded from AI Studio as a ZIP (87 files, 9,873,477 bytes, md5 4bcbb3c6db73a098816f574f97ff1827), with three already-fixed bugs carried over so they don't come back — the remix was a parallel branch behind on fixes.

- **Content:** 13 tabs — 00 CAD/CAM Design Studio, 01–09 as before, 10 Engineering Config (TabEngConfig with the BrandEngineSelector cascade), 11 More Drawings, 12 Drawing & MFG Matrix. The multi-brand library as real code: 96 engine families (US 39 + Asia 22 + Euro 18 + domestic diesel 17) and 68 vehicles, with the manufacturing matrix. Cinematic images ship in the build (copied by the vite plugin).
- **Fixes carried over from v10/v11:** (1) cam-core spin — the remix still had `camCore.rotation.z` (tumbles end-over-end); now `rotation.y`, verified with the project's own three.js (shaft axis stays [0,0,1] through a full revolution); cam sprocket untouched. (2) Tab 09 — the remix's TabTechnicalDrawings + TechDrawingSpecsDrawer were the pre-fix v7 versions (same hook-order crash: hooks after an early `return null`; no dimension toggle); replaced wholesale with the v11 fixed files, plus the remix's "3D Part & MFG Matrix" button kept (onOpenMatrixForPart wired through). (3) Dyno — the remix loop still had the 0.45 torque floor (HP climbed after its peak); the corrected asymmetric-falloff + monotonic-guard math adapted to the remix's family-relative loop, verified in node on the baseline (385 HP @ 5,500, 363 @ 6,250, 343 @ 6,500; monotonic after peak; HP = TQ×RPM/5252 holds).
- **Not in v12 (stays in v11):** the v11 per-model wiring (Batch 1 model fields + preset propagation) and the per-part Modification Studio — the remix has its own Tab 10 (TabEngConfig) and its own multi-family architecture, which those were not built against; porting them is a separate merge job. Typecheck: only the 2 pre-existing TabTechnicalDrawings errors from v10.
- **Build:** source `ai-studio-app-v12/` (local, uncommitted, like v7–v11; node_modules is a symlink to v11's — same dependencies); built with `npm run build -- --base=/sbc-350-3d-modeler/v12/` (2,071 kB JS); published build in `v12/` (git tag `v12`).

## v11 — per-model wiring + Tab 10 Modification Studio (Nov 24, 2026)

Ray's word Nov 24: "Build as is" — v11 is built from the v10 tree plus the two delivered code sets, while v7 stays live at the root and v8/v9/v10 stay live under their paths. The remixed AI Studio app was NOT used as the base (its code download was still running when Ray said build as is).

- **Content:** v10 plus (1) PBR Phase 2 Batch 1 wiring from the Tabs4Pods audit chat — EngineConfig / EngineCatalogItem / StoreEngineSpec extended with model fields (engineId, engineName, configLabel, color, firingOrder, pattern, balance, flywheelTeeth, boreSpacing, valvetrainType, block/head material, valve sizes/angles, mainCaps), the catalog enriched per model (2JZ now I6/DOHC/7 mains), Section 10 compatibility now resolving the ACTIVE engine's pattern instead of hard-coding GM_Chevy_V8, preset handlers propagating color/firingOrder/pattern to the scene; (2) the Modification Studio Phase 1 mount from the Tabs4Pods playground chat — NEW Tab 10 "Engineering Config" with the 16-part per-part modification studio (factory values from existing data only, maker changes stored as Custom overrides with per-field Revert + per-part Reset to Factory), `partModifications.ts`, `partOverrides` lifted in App.tsx. Both sets were downloaded via their code-snippet Download buttons and grep-verified on disk; `types/engine.ts` and `App.tsx` were hand-merged (audit model fields + playground Part* types / partOverrides lift — neither file overwrote the other). The cam-core spin fix survives (`camCore.rotation.y`, line 1943). Typecheck: only the 2 pre-existing TabTechnicalDrawings errors from v10, nothing in the new/merged files.
- **Not in v11:** Tab 11 More Drawings, the Matrix page (Tab 12), the multi-brand engine/vehicle catalog, the PBR geometry batches 2–4 (mechanicalGeometry / Engine3DScene / Transmission3DScene), and the evening evaluation's corrected code — none of those had come back as downloadable code when v11 was built; they land as the next version.
- **Build:** source `ai-studio-app-v11/` (local, uncommitted, like v7–v10); built with `npm run build -- --base=/sbc-350-3d-modeler/v11/` (1,696 modules); published build in `v11/` (git tag `v11`).

## v10 — new version with cam-core spin fix (Nov 24, 2026)

Ray's word Nov 24: "Use GitHub to launch it" — v10 is launched on GitHub Pages as the new version, while v7 stays live at the root, v8 under `/v8/` and v9 under `/v9/`.

- **Content right now:** v9's code plus the cam-core spin fix — the camshaft in Run Cycle mode used to tumble end-over-end through the block; it now spins on its own axis (`camCore.rotation.y = crankAngle * 0.5`, verified with the project's own three.js: the shaft axis stays [0,0,1] through a full revolution). The new work has NOT landed yet: Tabs 10–11, the per-part Modification Studio (built in the Tabs4Pods playground chat, mounting in progress), the Matrix page (Tab 12), the realistic PBR per-model fix (audit in progress), and the multi-brand engine/vehicle catalog — each delivery updates v10 in place as it lands and is verified.
- **Build:** source `ai-studio-app-v10/` (local, uncommitted, like v7/v8/v9); built with `npm run build -- --base=/sbc-350-3d-modeler/v10/`; published build in `v10/` (git tag `v10`).

## v9 — separate version for the incoming work (Nov 24, 2026)

Ray's word Nov 24: "Go ahead make a separate version" — v9 is the separate version where Gemini's new codes land as they come out, while v7 stays live at the root and v8 stays live under `/v8/`.

- **Content right now:** v9 currently holds the same code as v8 (Tab 09 drawings fixes + dyno falloff fix) — the new work is still being written in the AI Studio chats and had not landed when v9 was published. Each delivery updates v9 in place: Tabs 10–11 (Engineering Config, More Drawings — coded, download in flight), the per-part modification section, the Matrix page (Tab 12, shape-drawing area + engine-compatibility matrix), the realistic PBR per-model fix + cam-core spin fix, and the multi-brand engine/vehicle catalog with the all-manufacturers expansion.
- **Feed rule:** every delivery is pulled down, grep-verified, landed into the local `ai-studio-app-v9/` source, built, and republished to `v9/` — landing log at `v9-landing-log.md` (local, uncommitted).
- **Build:** source `ai-studio-app-v9/` (local, uncommitted, like v7/v8); built with `npm run build -- --base=/sbc-350-3d-modeler/v9/`; published build in `v9/` (git tag `v9`).

## v8 (current) — Tab 09 drawings fixes + dyno falloff fix (Nov 24, 2026)

Built from the v7 source with three files swapped in from the "Fixing SBC 350 Technical Drawings" AI Studio chat (Gemini 4 Hydrogen), verified headless before posting. The v7 root build is untouched.

- **Tab 09 — Dimensioned CAD button now works:** the two view buttons are a proper segmented control (aria-pressed, distinct active state). "Dimensioned CAD" is a real ON/OFF toggle with a badge — clicking it from the Part Catalog Diagram returns to the schematic with dimensions on; clicking it on the schematic hides the dimensions and shows an amber "Dimensions hidden — click Dimensioned CAD to show them" banner with a Show Dimensions button.
- **Tab 09 — hook-order crash fixed:** `TechDrawingSpecsDrawer.tsx` had hooks after an early `return null` (fatal); all hooks now run before any early return. Also: content-type checks before JSON.parse on the two server-only endpoints (graceful static-host errors), Discard Staged + Restore Live Sheet buttons, image onError fallback, Escape-key handler, Export SVG xmlns fix.
- **Dyno — HP no longer climbs after its peak:** the torque falloff had a 0.5 floor, so torque went flat at high RPM while RPM rose and HP climbed again (246 @ 6,250 → 256 @ 6,500). The falloff is now asymmetric with a post-peak monotonic guard; HP peaks **385 @ 5,500** then falls (383 / 376 / 363 / 343), TQ peaks **414 @ ~4,000**, HP = TQ×RPM/5252 holds every row. Note: Gemini's full-file rebuild of `coordinationEngine.ts` was rejected on verification (it dropped the cam tables / trans overrides / compatibility logic and rebuilt from memory); only her corrected dyno loop was merged into the v7 original — the diff vs v7 is confined to that loop.
- **Verification (headless, Nov 24):** local v8 build served and click-tested — tab 09 toggle on/off + banner + badge, dyno log rows read live (5500 RPM 385 HP, 6250 RPM 363 HP, 6500 RPM 343 HP). No console errors except the sandbox's Google Fonts proxy failure.
- **Build:** source `ai-studio-app-v8/` (local, uncommitted, like v7); built with `npm run build -- --base=/sbc-350-3d-modeler/v8/`; published build in `v8/` (git tag `v8`).
- **Not in v8:** Tabs 10–11 (Engineering Config, More Drawings) and the multi-brand engine/vehicle catalog — those are in flight in separate AI Studio chats and will land as the next version.

## v7 — Render / Section / Dress fixes (Gemini, Tabs4Pods chat)

Ray reported the Render, Section, and Dress buttons not working. Gemini's fixes, collected from the Tabs4Pods AI Studio chat Nov 23, 2026, applied to 8 of her 10 changed files and verified headless before posting:

- **Render — Ghost X-Ray:** materials now use `depthWrite: false`, so the engine is genuinely see-through (was reading as solid); Ghost gets its own deep-ocean X-ray environment (#050d18, #00f0ff grid). Tech Drawing gets a unified ISO/ASME blueprint palette — no more photorealistic parts on a dark scene.
- **Section — Valvetrain:** cut constant recalibrated 3.75 → 2.45, so the cut removes the valve covers and upper intake plenum (was skimming 0.11 units off the cover roofs). **Centerline:** clipping planes now attach to all outer accessories, so the starter, fuel pump, and carb bowls cut with the block instead of floating.
- **Dress:** the induction dress is promoted into `EngineConfig`, so it now reaches the specs and dyno — MPFI + Coils reads **408 HP / 431 TQ** (Gemini's calculation, for Ray to true); Carb + HEI keeps Ray's baseline **385 HP / 414 TQ**.
- **Also fixed:** Reset Ray's 350, Live Blueprint Spec Box, Tab 04 Carb CFM & AFR slider, Tab 05 timing slider (26°–44°, knock warning above 38°), Tab 06 transmission viewport (exploded slider, spinning shaft, synced Ghost/Tech Drawing).
- **Verification (headless, Nov 23):** `tsc --noEmit` clean, `vite build` clean; all 5 render modes clicked and visibly distinct, all 4 section cuts clicked (Valvetrain covers off, Centerline clean), Dress numbers confirmed moving 385/414 ↔ 408/431. No console errors except the sandbox's Google Fonts proxy failure.
- **The last 2 of Gemini's 10 files are now in v8** (Tab 09 technical drawings: `TechDrawingSpecsDrawer.tsx`, `TabTechnicalDrawings.tsx`) — collected Nov 24 from the "Fixing SBC 350 Technical Drawings" chat in Phoenix's AI Studio account after the Tabs4Pods chat hit its daily limit. Tab 09 in v7 still runs the v6 code; v8 has the corrected files.

## v6 — AI Studio app, Ray's updates

Built in Phoenix's AI Studio account ("SBC 350 3D Engine Builder", app 8629f36c), exported Nov 23, 2026 after Ray updated it, and posted here. Vite + React 19 + TypeScript + Tailwind 4 + Three.js, with an Express server (`server.ts`) for the two Gemini-powered features: live online spec lookup and upload-a-diagram-to-3D.

- **Source:** `app/` (the full Vite project). **Live build:** `index.html` + `assets/` at the repo root (built output, served by Pages).
- **Build it:** `cd app && bun install && bun run build`, then copy `dist/*` to the repo root. `bun run lint` (`tsc --noEmit`) passes clean. npm is not used for this repo (esbuild ERESOLVE) — bun 1.4.4.
- **GitHub Pages note:** the build uses `base: '/sbc-350-3d-modeler/'` in `app/vite.config.ts`, and the two hardcoded asset paths (A500 reference image, applet history JSON) use `import.meta.env.BASE_URL`, so the app works under the project subpath.
- **What works on Pages:** everything client-side — 3D engine + transmission scenes, all nine workbench tabs, the 28-transmission matrix, dyno curves, machine shop build sheet, tech-drawings catalog.
- **What does not work on Pages:** the two server features (online spec lookup, diagram parsing) need `server.ts` running with a `GEMINI_API_KEY`. On Pages those buttons show a panel error instead of results — they fail gracefully and nothing else breaks. No key is stored in this repo.

## v5 and earlier — single-file app

v1–v5 were a single `index.html` (React 18 + Three.js + Tailwind via CDN), built from Gemini's five variant files merged onto the v4 reliability base. v5 is preserved in git history (commit `14fee27`) and in the local backups (`index.html.v1.bak`–`.v4.bak`); the v5 Drive backup is `~/workspace/backups/sbc-350-3d-modeler-20261123-v5.zip`.

## Provenance

- Code by Gemini in Ray's AI Studio chats (Nov 22–23, 2026), from Ray's brief and his upgrade directions, under the MODSIM + HOOPS Visualize standards he set for his shop tools.
- The five original Gemini variant files are kept verbatim in `app/public/assets/aistudio/01–05-*.txt` and in `gemini-upgrade-v6/` (local working files, not committed).
- Ray updated the AI Studio app himself on the night of Nov 22–23, 2026; the export in `ai-studio-app-export-20261123/` (local, not committed) is that updated version.
