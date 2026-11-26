# Manufacturing tolerance + design capability rule (Ray's word, Nov 26, 2026)

All elements and codes in the app follow industry manufacturing tolerances
and design capabilities — from the image-to-3D function outward.

## What it means in code
- Every dimension, tolerance, and capability value comes from an industry
  standard (ISO 2768, ASME Y14.5, ISO 8062, ISO 21940-11, STEP AP242) or is
  flagged NEEDING RAY'S MEASUREMENT. Nothing is invented.
- Image-to-3D geometry respects process limits: minimum wall, minimum
  feature size, draft, depth. See src/utils/imageTo3d.ts — it returns
  PASS / WARN / FLAG_INFEASIBLE and FLAGS anything a process cannot make
  instead of silently building it. Calibrated true scale: 138 px = 4.400 in.
- src/utils/dataValidation.ts enforces the accuracy rules across the data
  tables: every value carries a source citation; estimates are flagged;
  displacement recomputes to 349.85 CID (bore 4.000 in, stroke 3.480 in,
  8 cylinders); baselines 385 HP / 414 TQ carb and 408 HP / 431 TQ MPFI hold;
  any baseTq 415 vs 414 mismatch is reported as a DISCREPANCY for Ray's
  ruling, never silently corrected.

## Materials Project fetcher (src/services/materialsProjectFetcher.ts)
- The API key comes ONLY from the Secure Vault through an environment
  variable. NEVER put a real key in code or in a chat message.
- Batched material_ids, local cache with TTL, 429 serves the cache.
- elasticity.k_vrh / g_vrh are VRH bulk/shear moduli — NOT Young's modulus.
  E is derived as E = 9KG / (3K + G) and marked plainly as derived.
- The exact Materials Project elasticity field naming/nesting and POST body
  shape must be verified against the current REST API / mp-api schema at
  integration time. Every fetched value is [ESTIMATE] screening data, never
  a certified allowable.
