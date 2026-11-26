# Aerospace Matrix page — spec for the v16 build (Ray's word, Nov 26, 2026)

## Where it lives
A SEPARATE page inside the SBC 350 design areas of the app — not a tab buried
inside another view, not a popup. It sits alongside the existing design-studio
pages, reachable from the app's home/design areas.

## Tabs (multiple, one per area)
1. **Materials** — the 10 alloys/composites from aerospaceMatrix.ts
   (Ti-6Al-4V annealed and STA, Inconel 718/625, 7075-T6, 6061-T6, CFRP
   laminate, three magnesium alloys) with UTS, yield, density, max service
   temperature, and uses. Includes the family filter and the two-material
   compare tool with computed specific strength.
2. **Processes** — LPBF, DED, 5-axis CNC, superplastic forming, diffusion
   bonding, friction stir welding, near-net forging, with tolerances,
   finishes, and qualification notes.
3. **Standards** — the 13-standard stack (AS9100D, AS9102C, AS9103, AS9145,
   Nadcap, AMS, MIL, ASME Y14.5, ISO 2768 with its tolerance table, ISO 286,
   ASME B46.1, NASA-STD-6030, 14 CFR 25.571).
4. **Design Methods** — topology optimisation vs generative design, GE LEAP
   nozzle and A350 bracket examples (flagged as OEM claims), A320 bionic
   partition marked as a DESIGN EXPLORATION not production, lightweighting
   principles, damage tolerance vs safe-life, hot-section temperature ladder.
5. **Tolerance contrast** — aerospace vs automotive tolerance contrast, plus
   the flags section carrying every conflict, unpublished value, and vendor
   claim from the data.

## Rules
- Data comes ONLY from src/data/aerospaceMatrix.ts. No values from memory.
- Vendor-claimed values stay flagged [VENDOR_CLAIM]; unverified values stay
  flagged [ESTIMATE] / NEEDING RAY'S MEASUREMENT.
- Do NOT state a characteristic count for ASME Y14.5 (sources conflict).
- The page is read-only data presentation + compare tool. It does not change
  the engine model. NC export rules still apply (locked until Ray supplies
  tool/feed/speed/depth/units).
