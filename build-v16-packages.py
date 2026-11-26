#!/usr/bin/env python3
"""Build the SBC 350 v16 update clusters (09-12) for the Base44 package.

Follows build-packages.py's cluster format (===== FILE: <path> (<bytes>,
md5 <md5>) ===== + verbatim content, md5-verified). The v16 clusters carry
ONLY the verified v16 upgrades — everything here was verified on disk Nov 26:
  09-library-engineData: corrected old-structure engineData (LIVE — it exports
    everything the app imports: RAY_BASELINE_CONFIG, ENGINE_CATALOG,
    TRANSMISSIONS_DB, VEHICLES_CATALOG, CAM_PROFILES, HEAD_BOLT_17_SEQUENCE)
    + the canonical-schema file as a docs reference (migration target, NOT
    wired in — it exports only POWERTRAIN_LIBRARY and would break the build
    if pasted over engineData.ts). CID diffs 0.01-0.02 on LS3/2JZ/L24 to
    verify on reconcile; baseTq 415 vs Ray's stated 414 is an OPEN
    discrepancy for his ruling — never silently corrected.
  10-manufacturing-drawings: manufacturingMatrix.ts (v16) lands as a NEW
    file manufacturingMatrixV16.ts — it does NOT overwrite the old file,
    because it exports a new schema (no MatrixComponentKey) and the app
    still imports the old one; wiring it in is the v16 chat's follow-up.
    techDrawingsCatalog.ts (v16) DOES overwrite the old file (same key
    exports: getEngineDrawingSheet, getTransmissionDrawingSheet).
  11-aerospace: aerospaceMatrix.ts (v16) + the Aerospace Matrix page spec.
  12-utilities: imageTo3d.ts + materialsProjectFetcher.ts + dataValidation.ts
    + the tolerance rule. Fetcher key from env only; E derived, never k_vrh.
Base = clusters 01-08 (v14 + image-to-3D = v15 content). Paste 01-08 first,
then 09-12 in order; the v16 clusters OVERWRITE the same paths where they
overlap (engineData.ts, manufacturingMatrix.ts, techDrawingsCatalog.ts).
The v16 AI Studio pickup is still running — its outputs land as a follow-up
package. Do NOT invent them.
"""
import hashlib
import re
import shutil
from pathlib import Path

REPO = Path.home() / "workspace/sbc-350-3d-modeler"
HF = Path.home() / "workspace/goals/camless-sbc-350-forced-induction-engine/hidden_files"
PKG = REPO / "base44-package"

CLUSTERS = [
    ("cluster-09-library-enginedata.txt", "SBC 350 v16 library engineData, cluster 9 of 12", [
        ("src/data/engineData.ts", HF / "engineData-old-structure-corrected-20261126.ts"),
        ("docs/engineData-canonical-schema-20261126.ts", HF / "engineData-canonical-schema-20261126.ts"),
    ]),
    ("cluster-10-manufacturing-drawings.txt", "SBC 350 v16 manufacturing + drawings, cluster 10 of 12", [
        ("src/data/manufacturingMatrixV16.ts", HF / "manufacturingMatrix-v16-gemini-20261126.ts"),
        ("src/data/techDrawingsCatalog.ts", HF / "techDrawingsCatalog-v16-gemini-20261126.ts"),
    ]),
    ("cluster-11-aerospace.txt", "SBC 350 v16 aerospace matrix + page spec, cluster 11 of 12", [
        ("src/data/aerospaceMatrix.ts", HF / "aerospaceMatrix-v16-gemini-20261126.ts"),
        ("docs/AEROSPACE-PAGE-SPEC.md", PKG / "AEROSPACE-PAGE-SPEC.md"),
    ]),
    ("cluster-12-utilities.txt", "SBC 350 v16 utilities, cluster 12 of 12", [
        ("src/utils/imageTo3d.ts", HF / "imageTo3d-v16-gemini-20261126.ts"),
        ("src/services/materialsProjectFetcher.ts", HF / "materialsProjectFetcher-v16-gemini-20261126.ts"),
        ("src/utils/dataValidation.ts", HF / "dataValidation-v16-gemini-20261126.ts"),
        ("docs/TOLERANCE-RULE.md", PKG / "TOLERANCE-RULE.md"),
    ]),
]


def build_cluster(fname, note, files):
    parts = [
        f"# {fname} — {note}",
        "# Source: goal hidden_files, verified on disk Nov 26, 2026 (md5-matched copies home). Paste ONE cluster per builder message, in order, AFTER clusters 01-08.",
        f"# Files in this cluster: {len(files)}",
        "",
    ]
    for rel, path in files:
        data = path.read_bytes()
        md5 = hashlib.md5(data).hexdigest()
        parts.append(f"===== FILE: {rel} ({len(data)} bytes, md5 {md5}) =====\n")
        parts.append(data.decode("utf-8"))
        parts.append("")
    return "\n".join(parts)


def verify_clusters():
    seen = {}
    for fname, _note, files in CLUSTERS:
        text = (PKG / fname).read_text(encoding="utf-8")
        for rel, path in files:
            data = path.read_bytes()
            m = re.search(rf"===== FILE: {re.escape(rel)} \((\d+) bytes, md5 ([0-9a-f]+)\) =====", text)
            assert m, f"{fname}: header missing for {rel}"
            assert int(m.group(1)) == len(data), f"{fname}: byte count wrong for {rel}"
            assert m.group(2) == hashlib.md5(data).hexdigest(), f"{fname}: md5 wrong for {rel}"
            assert data.decode("utf-8").strip() in text, f"{fname}: content missing for {rel}"
            assert rel not in seen, f"duplicate file across v16 clusters: {rel}"
            seen[rel] = fname
    return len(seen)


def main():
    for fname, note, files in CLUSTERS:
        (PKG / fname).write_text(build_cluster(fname, note, files), encoding="utf-8")
    n = verify_clusters()
    print(f"base44-package: {n} v16 files verified across 4 clusters (md5 + content)")
    print("OK — clusters 09-12 built")


if __name__ == "__main__":
    main()
