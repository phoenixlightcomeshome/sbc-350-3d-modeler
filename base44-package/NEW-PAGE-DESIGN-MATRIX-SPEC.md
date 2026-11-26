# NEW-PAGE-DESIGN-MATRIX-SPEC.md — Tab 14 DRAFT spec: "Design Matrix: Image-to-3D"

(Rebuilt Nov 26 after the rsync incident, from the Nov 25 draft. Draft only —
needs Ray's word on the spec before any build.)

## Idea
A new Tab 14 in the SBC 350 app: a design-matrix page that takes an image
in and walks it through trace → 2D draft → extrude → export, reusing the
image-to-3D work (imageVectorizer.ts + the Tab 00 panel).

## Flow
Image in → trace (Otsu + Marching Squares + RDP) → 2D draft (editable
contours, vertex editor) → extrude (depth required, no default) → export
STL / DXF / SVG. NC export DISABLED until Ray supplies
tool/feed/speed/depth/units.

## Hard rules
- Client-side only. No API calls, no keys, no server.ts.
- Ray's numbers only. Reference dimension required for scale; extrude depth
  required with NO default. No invented dimensions anywhere.
- Preview-only until Ray approves wiring. STOP gate after step 2 (no Tab 14
  shell, no App.tsx changes) until his written approval.
- The 3 JPGs (cinematic_cad_blueprint_desk, cinematic_cnc_5axis_head,
  cinematic_v8_dyno_cell) are uploaded first; the page reuses them.
- The Tab 14 spec files are pasted at step 3 of a build, not in the branch.
