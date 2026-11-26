/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoordinatedSpecs, EngineConfig } from '../types/engine';
import { EngineFamilySpec } from './engineFamilies';

export interface ManufacturingDimensionRow {
  feature: string;
  nominalSpec: string;
  toleranceBand: string;
  surfaceFinishRa: string;
  verificationMethod: string;
  sourceRef: string;
}

export interface ManufacturingGdtCallout {
  symbol: string;
  featureControlFrame: string;
  datumScheme: string;
  engineeringPurpose: string;
  sourceRef: string;
}

export interface SubassemblyManufacturingMatrix {
  subassemblyKey: string;
  partName: string;
  subsystemGroup: 'Core Engine' | 'Induction & Ignition' | 'Support Systems' | 'Powertrain';
  bomCategory: string;
  primaryProcess: string;
  alloySpec: string;
  heatTreatAndFinish: string;
  cycleTimeEst: string;
  keyDimensions: ManufacturingDimensionRow[];
  gdtCallouts: ManufacturingGdtCallout[];
  qualityAndNdt: string[];
}

export interface Sbc350BaselineOnlySpecs {
  engineFamilyLabel: string;
  displacementCiNote: string;
  carburetorHpTorqueNote: string;
  mpfiHpTorqueNote: string;
  mainSaddleHousingBoreIn: string;
  arpRodBoltStretchIn: string;
  hotReliefPressurePsi: string;
  pickupToSumpFloorIn: string;
  sourceRef: string;
}

export interface ModernManufacturingReference {
  cnc5Axis: {
    standardTolerance: string;
    precisionTolerance: string;
    ultraPrecisionNote: string;
    achievableRaNote: string;
    iso2768And22081Note: string;
    sourceRef: string;
  };
  metalAdditive: {
    standardsNote: string;
    lpbfDmlsNote: string;
    binderJetNote: string;
    dedNote: string;
    postMachiningNote: string;
    sourceRef: string;
  };
  castingAndForging: {
    iso8062DctgNote: string;
    investmentCastingNote: string;
    forgingAndShopNote: string;
    sourceRef: string;
  };
  precisionFinishing: {
    plateauHoningMetricsNote: string;
    plateauTargetShopNote: string;
    grindingAndFinishNote: string;
    sourceRef: string;
  };
  modernEngineMaterials: {
    a356AlloyNote: string;
    alloy319Note: string;
    cgiAndBoreCoatingsNote: string;
    ptwaCoatingsNote: string;
    sourceRef: string;
  };
  modernV8Production: {
    balanceStandardNote: string;
    boreDeckFasteningAndOemNote: string;
    sourceRef: string;
  };
}

export const SBC_350_BASELINE_ONLY_SPECS: Sbc350BaselineOnlySpecs = {
  engineFamilyLabel: 'SBC 350 ONLY — Chevrolet Small-Block 350 Baseline',
  displacementCiNote: 'SBC 350 ONLY: 349.85 CID baseline (Ray baseline reference)',
  carburetorHpTorqueNote: 'SBC 350 ONLY: 385 / 414 carbureted baseline reference',
  mpfiHpTorqueNote: 'SBC 350 ONLY: 408 / 431 MPFI baseline reference',
  mainSaddleHousingBoreIn: 'SBC 350 ONLY: 2.6410" nominal housing bore [EST / NEEDS RAY\'S MEASUREMENT on specific block]',
  arpRodBoltStretchIn: 'SBC 350 ONLY: 0.0060" stretch [EST / VERIFY exact ARP fastener part-number card]',
  hotReliefPressurePsi: 'SBC 350 ONLY: 60 PSI hot oil relief reference [EST / NEEDS RAY\'S MEASUREMENT]',
  pickupToSumpFloorIn: 'SBC 350 ONLY: 0.312" pickup-to-pan floor reference [EST / NEEDS RAY\'S MEASUREMENT]',
  sourceRef: 'Ray SBC 350 v15/v16 baseline constants; ARP / shop references [EST where flagged]'
};

export const MODERN_MANUFACTURING_REFERENCE: ModernManufacturingReference = {
  cnc5Axis: {
    standardTolerance: '±0.05 mm (±0.002 in) typical precision CNC; ±0.13 mm (±0.005 in) standard CNC baseline [Ref: Protolabs CNC Tolerances]',
    precisionTolerance: '±0.02 mm (±0.0008 in) on capable features/setups [EST — verify machine capability & fixture stack]',
    ultraPrecisionNote: '±0.005 mm (±0.0002 in) achievable only on capable geometry with thermal stabilization & metrology [EST — verify capability per part]',
    achievableRaNote: 'Ra 0.8 µm to 6.3 µm typical CNC milling/turning; Ra 0.4 µm or finer requires dedicated fine finishing/lapping [Ref: Protolabs; AeroVac Alloy Forge]',
    iso2768And22081Note:
      'ISO 2768-1 defines general linear/angular classes (f, m, c, v; e.g., ISO 2768-m allows ±0.2 mm on 6–30 mm and ±0.3 mm on 30–120 mm, while ISO 2768-f is tighter). ISO 2768-2 was withdrawn and replaced by ISO 22081. Neither ISO 2768-1 nor ISO 2768-2 defines Ra/Rz surface roughness—specify surface texture separately [Ref: Makerverse ISO 2768 & ISO 22081 Guide]',
    sourceRef: 'ISO 2768-1 / ISO 22081; Protolabs CNC Tolerances; AeroVac Alloy Forge Ra Chart'
  },
  metalAdditive: {
    standardsNote: 'ISO/ASTM 52900 defines AM process categories (Powder Bed Fusion / PBF, Binder Jetting, Directed Energy Deposition / DED); ISO/ASTM 52904 covers PBF-LB for critical parts [Ref: Epocrafter Metal AM Guide]',
    lpbfDmlsNote: 'LPBF/DMLS typically uses ~20–60 µm layer thickness, achieves ~99.5%+ density on qualified builds, and shows ~±0.1–0.2 mm as-built dimensional variation with ~5–25 µm as-built Ra [EST — depends on alloy, geometry & machine qualification; Ref: Norck DMLS vs Binder Jetting]',
    binderJetNote: 'Metal Binder Jetting deposits binder in powder bed followed by furnace sintering (~96%+ density on HP routes [Ref: Norck]); undergoes sintering shrinkage and requires qualification per ISO/ASTM 52900 / 52920 [Ref: Epocrafter]',
    dedNote: 'DED feeds powder or wire into a focused thermal melt pool for deposition/repair; as-deposited geometry & roughness are coarser than LPBF and require post-machining for mating/precision surfaces [Ref: Epocrafter]',
    postMachiningNote: 'CNC post-machining on critical/functional datums is standard practice for tight tolerances (~±0.02 mm / ±0.0008 in) and sealing/bearing finishes [EST — verify datum allowance & stock-up]',
    sourceRef: 'ISO/ASTM 52900; ISO/ASTM 52904; ISO/ASTM 52920; Norck; Epocrafter'
  },
  castingAndForging: {
    iso8062DctgNote: 'ISO 8062-3 defines Dimensional Casting Tolerance Grades DCTG 1 (tightest) to DCTG 16; wall thickness is generally assigned one grade coarser than linear DCTG. At DCTG 6 on 63–100 mm nominal size, total tolerance zone is 0.78 mm (±0.39 mm) [Ref: ISO 8062-3; Redstone Manufacturing]',
    investmentCastingNote: 'Investment casting typically achieves ~Ra 6.3–12.5 µm as-cast with critical/sealing/bearing features CNC-machined [EST — verify foundry capability & alloy shrinkage]',
    forgingAndShopNote: 'Forgings and castings used in engine builds require stock allowance and metrology verification on machined bores, decks, journals, and bolt bosses [NEEDS RAY\'S MEASUREMENT on physical parts]',
    sourceRef: 'ISO 8062-3; Redstone Manufacturing Investment Casting Guide'
  },
  precisionFinishing: {
    plateauHoningMetricsNote: 'Cylinder bore plateau honing is evaluated using Material Ratio curve parameters—Rk (core roughness), Rpk (reduced peak height), Rvk (reduced valley depth), and Rmr (material ratio)—plus cylindricity and crosshatch angle, rather than Ra alone [Ref: Digital Metrology; Engine Professional]',
    plateauTargetShopNote: 'Shop/engine-builder plateau ratio targets vary by application (e.g., ~73% gasoline / ~80–85% heavy-duty/extreme shop targets) [EST — shop target; verify with ring/hone manufacturer & NEEDS RAY\'S MEASUREMENT]',
    grindingAndFinishNote: 'Cylindrical/surface grinding and honing achieve fine finishes (e.g., ~Ra 0.4–1.6 µm depending on wheel/stone grit, feed, and coolant/metrology) [Ref: AeroVac Alloy Forge]',
    sourceRef: 'Digital Metrology Plateau Honing; Engine Professional; AeroVac Alloy Forge'
  },
  modernEngineMaterials: {
    a356AlloyNote: 'A356 (~6.5–7.5% Si, ~0.25–0.45% Mg, low Fe/Cu ≤0.20% each; SAE 336 / UNS A13560) provides pressure tightness, castability, ductility, and ~33–45 ksi (230–310 MPa) tensile strength (~24–32 ksi yield) in T6 temper [Ref: LeClaire Manufacturing A356 Guide; WB Castings]',
    alloy319Note: '319 aluminum (~5.5–6.5% Si, ~3.0–4.0% Cu; SAE 326 / UNS A03190) is widely used for cast engine components for castability, elevated-temperature strength, and machinability, with lower corrosion resistance/ductility than low-Cu A356 [Ref: LeClaire Manufacturing; WB Castings 319 Alloy]',
    cgiAndBoreCoatingsNote: 'Compacted Graphite Iron (CGI) and aluminum blocks with cast-in liners or thermal spray coatings balance strength, thermal conductivity, and wear; neither A356 nor 319 has sufficient bare bore wear resistance without liners or coatings [Ref: LeClaire Manufacturing; WB Castings; NEEDS RAY\'S MEASUREMENT for specific block/liner specs]',
    ptwaCoatingsNote: 'Plasma Transferred Wire Arc (PTWA) bore coating sprays atomized ferrous wire into cylinder bores (~90–150 µm as-deposited thickness, ~25–50 µm finished/smoothed thickness); thin coating—cannot be bored like a thick cast-iron sleeve [Ref: Villafuerte / ITSSe PTWA Study; US20160245224A1]',
    sourceRef: 'LeClaire Manufacturing; WB Castings; Villafuerte / ITSSe; US20160245224A1'
  },
  modernV8Production: {
    balanceStandardNote: 'Rigid rotor balance grades are defined under ISO 1940-1, now superseded by ISO 21940-11:2016 (including G6.3 reference grade) [Ref: ISO 1940-1 / ISO 21940-11 Reference]',
    boreDeckFasteningAndOemNote: 'Modern V8 production relies on controlled bore honing (plateau/crosshatch/cylindricity), deck flatness/finish for MLS gaskets, dynamic rotating-assembly balancing, and torque-angle (TTY / yield) fastener tightening; exact OEM tolerances and installed clearances depend on the specific engine model [NEEDS RAY\'S MEASUREMENT on physical assembly; verify OEM service manual]',
    sourceRef: 'ISO 1940-1 / ISO 21940-11; Engine Professional'
  }
};

export function getManufacturingMatrix(
  config: EngineConfig,
  specs: CoordinatedSpecs,
  family?: EngineFamilySpec | null
): SubassemblyManufacturingMatrix[] {
  const cyls = config.cylinders ?? family?.cylinders ?? 8;
  const boreIn = config.bore.toFixed(3);
  const strokeIn = config.stroke.toFixed(3);
  const rodIn = config.rodLength.toFixed(3);
  const deckIn = config.deckHeight.toFixed(3);
  const gasketIn = config.gasketThickness.toFixed(3);
  const quenchIn = specs.quenchDistance.toFixed(3);
  const chamberCc = config.chamberCc.toFixed(1);
  const firingOrder = family?.firingOrder ?? 'Verify OEM / engine family firing order [NEEDS RAY\'S MEASUREMENT]';
  const pattern = family?.bellhousingPattern ?? 'Verify block/bellhousing bolt pattern [NEEDS RAY\'S MEASUREMENT]';
  const intakeStyleLabel =
    config.inductionDress === 'mpfi_cnp'
      ? `MPFI + ${config.carbCfm} CFM TB / CNP`
      : `${specs.intakeData.style} / ${config.carbCfm} CFM`;
  const isSbc350 = family?.id === 'gm_sbc_350' || Math.abs(config.bore - 4.0) < 0.002 && Math.abs(config.stroke - 3.48) < 0.002;

  return [
    {
      subassemblyKey: 'block',
      partName: `Cylinder Block (${cyls}-Cyl, ${boreIn}" Bore × ${deckIn}" Deck)`,
      subsystemGroup: 'Core Engine',
      bomCategory: 'Engine Block',
      primaryProcess: '5-Axis CNC Line Bore, Deck Milling & Torque-Plate Honing (Cast/Billet Route)',
      alloySpec: family?.id === 'gm_sbc_350'
        ? 'Cast iron (SBC 350 baseline) or A356/319 aluminum / CGI per build [Ref: LeClaire Mfg; WB Castings]'
        : 'Cast iron, A356/319 aluminum, or CGI per engine family/OEM spec [Ref: LeClaire Mfg; WB Castings]',
      heatTreatAndFinish:
        'Stress-relieved casting; plateau honing evaluated by Rk/Rpk/Rvk/Rmr [Ref: Digital Metrology; Engine Professional]',
      cycleTimeEst: '6.4 hrs [EST — shop routing estimate; verify per fixture/machine]',
      keyDimensions: [
        {
          feature: 'Cylinder Bore Diameter',
          nominalSpec: `${boreIn}"`,
          toleranceBand: '±0.0005" [EST — verify OEM/bore spec; NEEDS RAY\'S MEASUREMENT on block]',
          surfaceFinishRa: 'Plateau honed (Rk/Rpk/Rvk/Rmr; ~Ra 0.4–0.8 µm reference) [Ref: Digital Metrology; Protolabs]',
          verificationMethod: '3-point bore gauge + stylus profilometer at 3 depths, X/Y [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'EngineConfig.bore; Digital Metrology; Protolabs'
        },
        {
          feature: 'Deck Height (Crank CL to Deck)',
          nominalSpec: `${deckIn}"`,
          toleranceBand: '±0.002" bank-to-bank [EST — verify OEM spec; NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'MLS gasket prep Ra ≤ 0.8 µm typical [EST — verify gasket maker spec]',
          verificationMethod: 'Deck bridge + dial/digital indicator across deck plane [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'EngineConfig.deckHeight; AeroVac Alloy Forge'
        },
        {
          feature: 'Quench / Compressed Gasket Stack',
          nominalSpec: `${quenchIn}" quench (${gasketIn}" gasket)`,
          toleranceBand: 'Per piston deck clearance + gasket thickness [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Sealing face finish per gasket spec [EST]',
          verificationMethod: 'Piston protrusion depth gauge + compressed gasket spec [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'CoordinatedSpecs.quenchDistance; EngineConfig.gasketThickness'
        },
        {
          feature: 'Main Bearing Saddle Bore',
          nominalSpec: isSbc350
            ? 'SBC 350 ONLY: 2.6410" [EST / NEEDS RAY\'S MEASUREMENT]'
            : 'Per OEM / engine family print [NEEDS RAY\'S MEASUREMENT]',
          toleranceBand: '±0.0003" [EST — verify OEM/aftermarket block spec]',
          surfaceFinishRa: 'Ra 0.8 µm or finer [EST — verify bearing/machinist spec]',
          verificationMethod: 'Dial bore gauge with main caps torqued to spec [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: isSbc350 ? 'SBC_350_BASELINE_ONLY_SPECS [EST]' : 'OEM / Block Blueprint [NEEDS RAY\'S MEASUREMENT]'
        }
      ],
      gdtCallouts: [
        {
          symbol: '⌖',
          featureControlFrame: 'Ø0.015 mm positional tolerance to main bore datum axis [EST — verify print]',
          datumScheme: 'Datum A: Main bore centerline | Datum B: Rear main thrust face | Datum C: Pan rail',
          engineeringPurpose: 'Maintains cylinder bore squareness and coaxial alignment',
          sourceRef: 'ISO 22081 / GD&T general practice [EST]'
        },
        {
          symbol: '⏥',
          featureControlFrame: '0.015 mm / 150 mm deck flatness [EST — verify print / MLS spec]',
          datumScheme: 'Datum A: Main bore axis',
          engineeringPurpose: 'Supports uniform head gasket clamping load and combustion sealing',
          sourceRef: 'ISO 22081 / Engine machining practice [EST]'
        }
      ],
      qualityAndNdt: [
        'Magnetic particle / liquid penetrant inspection on critical castings [EST — verify NDT standard per material]',
        'Torque-plate honing under simulated head bolt load [EST — verify torque/plate spec]',
        'All measured bore/deck/clearance numbers require physical shop measurement [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'timingCover',
      partName: 'Timing Cover & Front Seal / Trigger Interface',
      subsystemGroup: 'Core Engine',
      bomCategory: 'Timing Cover',
      primaryProcess: 'Cast / CNC-Machined Housing & Seal Bore Finishing',
      alloySpec: 'A356 or 319 aluminum / cast alloy per OEM or aftermarket cover [Ref: LeClaire Mfg; WB Castings]',
      heatTreatAndFinish: 'As-cast or anodized/machined sealing faces [EST — verify part spec]',
      cycleTimeEst: '1.2 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Front Seal Bore & Crank Snout Concentricity',
          nominalSpec: 'Per OEM / cover drawing [NEEDS RAY\'S MEASUREMENT]',
          toleranceBand: '±0.05 mm standard CNC [Ref: Protolabs; verify cover spec]',
          surfaceFinishRa: 'Seal bore Ra ≤ 1.6 µm typical [EST — verify seal maker spec]',
          verificationMethod: 'Dial indicator / concentricity check [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'Protolabs CNC Tolerances'
        }
      ],
      gdtCallouts: [
        {
          symbol: '◎',
          featureControlFrame: 'Concentricity to crank snout axis [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Crankshaft front journal/snout axis',
          engineeringPurpose: 'Prevents premature front seal lip wear and oil leakage',
          sourceRef: 'ISO 22081 / Mechanical assembly practice [EST]'
        }
      ],
      qualityAndNdt: [
        'Visual & leak/sealing surface inspection prior to assembly [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'crank',
      partName: `Crankshaft (${strokeIn}" Stroke, ${cyls}-Cyl)`,
      subsystemGroup: 'Core Engine',
      bomCategory: 'Crankshaft',
      primaryProcess: 'Forging / Billet Turning, Induction Hardening, Journal Grinding & Dynamic Balancing',
      alloySpec: 'Forged steel / 4340 / billet steel per engine family & build spec [NEEDS RAY\'S MEASUREMENT]',
      heatTreatAndFinish: 'Journal hardening/nitriding & precision grinding; balanced per ISO 1940-1 / ISO 21940-11 [Ref: ISO 1940-1 / ISO 21940-11]',
      cycleTimeEst: '4.5 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Stroke Throw (Rod Journal Centerline Offset)',
          nominalSpec: `${strokeIn}"`,
          toleranceBand: '±0.0005" [EST — verify OEM/aftermarket crank spec]',
          surfaceFinishRa: 'Journal finish Ra ≤ 0.4 µm typical [EST — verify bearing/crank spec]',
          verificationMethod: 'Micrometer / stroke fixture & profilometer [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'EngineConfig.stroke; AeroVac Alloy Forge'
        },
        {
          feature: 'Dynamic Rotor Balance Grade',
          nominalSpec: 'ISO 1940-1 / ISO 21940-11 G6.3 reference [Ref: ISO 1940-1 / ISO 21940-11]',
          toleranceBand: 'Per bobweight & max operating RPM [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Fillet roll / ground journal transition [EST]',
          verificationMethod: 'Dynamic balancing machine printout [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'ISO 1940-1 / ISO 21940-11'
        }
      ],
      gdtCallouts: [
        {
          symbol: '↗',
          featureControlFrame: 'Circular/total runout on journals & flange [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A-B: Front and rear main journals',
          engineeringPurpose: 'Controls whip, bearing oil-film stability, and rear main/flywheel runout',
          sourceRef: 'ISO 22081 / Rotating machinery practice [EST]'
        }
      ],
      qualityAndNdt: [
        'Magnetic particle inspection (ASTM E1444) on steel/forged cranks [EST — verify applicable NDT standard]',
        'Bobweight card & journal clearance check [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'rotating',
      partName: `Connecting Rods (${rodIn}" C-to-C) & Pistons (${config.pistonAlloy})`,
      subsystemGroup: 'Core Engine',
      bomCategory: 'Connecting Rods / Pistons',
      primaryProcess: 'Forging / CNC Machining, Big-End Sizing & Piston Ring Grooving',
      alloySpec: `Rod: forged steel/alloy per spec; Piston: ${config.pistonAlloy} (A356/319/forged alloys vary by design) [Ref: LeClaire Mfg; WB Castings]`,
      heatTreatAndFinish: 'Shot peening / thermal or anti-friction coatings per part spec [EST — verify part spec]',
      cycleTimeEst: '3.8 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Connecting Rod Center-to-Center Length',
          nominalSpec: `${rodIn}"`,
          toleranceBand: '±0.0005" set weight/length match [EST — verify rod spec]',
          surfaceFinishRa: 'Big/small-end bore honed [EST — verify rod spec]',
          verificationMethod: 'Rod length fixture & bore gauge with bolts torqued [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'EngineConfig.rodLength'
        },
        {
          feature: 'Piston-to-Wall (PTW) & Ring End Gaps',
          nominalSpec: `PTW: ${specs.ptwClearance} | Gaps: ${specs.topRingGap}" / ${specs.secondRingGap}" / ${specs.oilRingGap}"`,
          toleranceBand: 'Per piston alloy, bore temp & duty factor [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Skirt & bore plateau texture [Ref: Digital Metrology]',
          verificationMethod: 'Feeler gauge / bore gauge in cylinder bore [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'CoordinatedSpecs; Digital Metrology'
        },
        {
          feature: 'Rod Fastener Stretch / Torque',
          nominalSpec: isSbc350
            ? 'SBC 350 ONLY: 0.0060" stretch [EST / VERIFY fastener spec]'
            : 'Per fastener manufacturer / OEM spec [NEEDS RAY\'S MEASUREMENT]',
          toleranceBand: 'Per fastener spec sheet [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Threaded/underhead lube applied per spec [EST]',
          verificationMethod: 'Stretch gauge or calibrated torque/torque-angle wrench [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: isSbc350 ? 'SBC_350_BASELINE_ONLY_SPECS [EST]' : 'Fastener Manufacturer Spec'
        }
      ],
      gdtCallouts: [
        {
          symbol: '∥',
          featureControlFrame: 'Pin bore-to-big bore parallelism & twist [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Big-end bore axis',
          engineeringPurpose: 'Prevents edge loading on rod bearings and piston skirts',
          sourceRef: 'ISO 22081 / Engine machining practice [EST]'
        }
      ],
      qualityAndNdt: [
        'Weigh all rods and pistons/pins for balance matching [NEEDS RAY\'S MEASUREMENT]',
        'Verify ring end gap in bore at target depth [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'cam',
      partName: `Camshaft (${specs.camData.name})`,
      subsystemGroup: 'Core Engine',
      bomCategory: 'Camshaft & Lifters',
      primaryProcess: 'CNC Lobe Grinding, Journal Finishing & Degreeing Verification',
      alloySpec: 'Cast iron, chilled iron, or billet/8620 steel per cam profile [NEEDS RAY\'S MEASUREMENT]',
      heatTreatAndFinish: 'Surface-hardened lobes/journals; polished or ground per profile [EST — verify cam card]',
      cycleTimeEst: '2.1 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Cam Lobe Lift & Timing @ .050"',
          nominalSpec: `${specs.camData.lobeLift.toFixed(3)}" lobe | ${specs.camData.intakeDur050}°/${specs.camData.exhDur050}° @ .050"`,
          toleranceBand: 'Per cam card [NEEDS RAY\'S MEASUREMENT when degreed in engine]',
          surfaceFinishRa: 'Lobe nose/flank per cam maker [EST]',
          verificationMethod: 'Degree wheel + dial indicator on lifter/valvetrain [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'CoordinatedSpecs.camData'
        }
      ],
      gdtCallouts: [
        {
          symbol: '↗',
          featureControlFrame: 'Journal runout & lobe index accuracy [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A-B: End cam journals',
          engineeringPurpose: 'Maintains consistent valve event timing across all cylinders',
          sourceRef: 'ISO 22081 / Valvetrain practice [EST]'
        }
      ],
      qualityAndNdt: [
        'Verify cam bearing clearance, end play, and degreed timing before assembly [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'heads',
      partName: `Cylinder Heads (${chamberCc}cc Chambers, ${config.rockerRatio}:1 Rocker)`,
      subsystemGroup: 'Core Engine',
      bomCategory: 'Cylinder Heads',
      primaryProcess: 'Casting / 5-Axis CNC Porting, Valve Job & Deck Surfacing',
      alloySpec: 'Cast iron or aluminum (A356 / 319 / billet alloys per head design) [Ref: LeClaire Mfg; WB Castings]',
      heatTreatAndFinish: 'Solution/aged T6 where applicable; multi-angle valve seats & milled deck [Ref: LeClaire Mfg]',
      cycleTimeEst: '5.2 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Combustion Chamber Volume',
          nominalSpec: `${chamberCc} cc`,
          toleranceBand: 'Chamber-to-chamber cc matched [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Deck surface per head/gasket spec [EST]',
          verificationMethod: 'Burette chamber CC check on assembled/bare head [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'EngineConfig.chamberCc'
        },
        {
          feature: 'Total Valve Lift (with Rocker Ratio)',
          nominalSpec: `${specs.totalValveLift}" (${config.rockerRatio}:1)`,
          toleranceBand: 'Check coil bind, retainer-to-seal & piston-to-valve clearance [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Valve guide & seat concentricity [NEEDS RAY\'S MEASUREMENT]',
          verificationMethod: 'Dial indicator / modeling clay or indicator check on engine [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'CoordinatedSpecs.totalValveLift; EngineConfig.rockerRatio'
        }
      ],
      gdtCallouts: [
        {
          symbol: '⏥',
          featureControlFrame: 'Deck flatness across gasket sealing plane [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Head gasket deck face',
          engineeringPurpose: 'Ensures even clamping pressure and combustion seal',
          sourceRef: 'ISO 22081 / Head machining practice [EST]'
        }
      ],
      qualityAndNdt: [
        'Pressure/leak test & valve seat/guide inspection [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'intake',
      partName: `Intake Manifold (${specs.intakeData.name})`,
      subsystemGroup: 'Induction & Ignition',
      bomCategory: 'Intake Manifold',
      primaryProcess: 'Casting / CNC Port & Flange Machining (or AM Prototype/Low-Volume)',
      alloySpec: 'Aluminum alloy or composite/polymer per manifold design [EST — verify manifold spec]',
      heatTreatAndFinish: 'Machined flange/port faces; coated or raw per spec [EST]',
      cycleTimeEst: '2.0 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Runner Volume & Airflow Rating',
          nominalSpec: `${specs.intakeData.runnerCc} cc / ${specs.intakeData.flowCfm} CFM (${intakeStyleLabel})`,
          toleranceBand: 'Per manifold spec / flow test [EST — verify part spec]',
          surfaceFinishRa: 'Gasket flange face machined [EST]',
          verificationMethod: 'Port-to-head gasket alignment check on block/heads [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'CoordinatedSpecs.intakeData; EngineConfig'
        }
      ],
      gdtCallouts: [
        {
          symbol: '∥',
          featureControlFrame: 'Intake flange coplanarity / port alignment [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Port flange plane',
          engineeringPurpose: 'Prevents intake vacuum/boost leaks and port mismatch',
          sourceRef: 'ISO 22081 / Induction assembly practice [EST]'
        }
      ],
      qualityAndNdt: [
        'Inspect flange flatness, bolt holes, and vacuum/coolant passages [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'efiRails',
      partName: 'Fuel Metering / Throttle / EFI Rail Hardware',
      subsystemGroup: 'Induction & Ignition',
      bomCategory: 'Fuel Metering',
      primaryProcess: 'CNC Machining, Anodizing/Plating & Flow/Pressure Verification',
      alloySpec: 'Aluminum / steel / brass per carburetor or EFI rail assembly [EST — verify component spec]',
      heatTreatAndFinish: 'Machined sealing bores & O-ring grooves [EST]',
      cycleTimeEst: '1.5 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Airflow Rating & Target WOT AFR',
          nominalSpec: `${config.carbCfm} CFM | Target AFR ${config.targetAFR}:1`,
          toleranceBand: 'Per fuel system calibration [EST — verify on engine/dyno; NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'O-ring bore / sealing seat finish [EST]',
          verificationMethod: 'Fuel pressure & wideband AFR verification [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'EngineConfig.carbCfm; EngineConfig.targetAFR'
        }
      ],
      gdtCallouts: [
        {
          symbol: '⌖',
          featureControlFrame: 'Injector / throttle bore & mounting boss location [EST]',
          datumScheme: 'Datum A: Mounting datum face',
          engineeringPurpose: 'Maintains fuel/air metering alignment and leak-free sealing',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Pressure-test fuel rails/fittings for zero leaks prior to startup [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'ignition',
      partName: `Ignition System (${config.ignitionTiming}° Total, Firing ${firingOrder})`,
      subsystemGroup: 'Induction & Ignition',
      bomCategory: 'Ignition Distributor',
      primaryProcess: 'CNC Housing/Shaft Machining & Timing Verification',
      alloySpec: 'Aluminum / steel / composite per ignition architecture [EST — verify part spec]',
      heatTreatAndFinish: 'Hardened drive gear / trigger components per spec [EST]',
      cycleTimeEst: '1.1 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Total Advance & Spark Plug Gap',
          nominalSpec: `${config.ignitionTiming}° BTDC | Gap ${config.sparkPlugGap.toFixed(3)}"`,
          toleranceBand: 'Per ignition curve & plug spec [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Per component spec [EST]',
          verificationMethod: 'Timing light & plug gap gauge [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'EngineConfig.ignitionTiming; EngineConfig.sparkPlugGap'
        }
      ],
      gdtCallouts: [
        {
          symbol: '◎',
          featureControlFrame: 'Distributor/trigger shaft concentricity [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Housing pilot bore',
          engineeringPurpose: 'Consistent spark trigger timing across RPM range',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Verify firing order, phasing, and base/total timing [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'lubrication',
      partName: 'Lubrication Pump & Pickup',
      subsystemGroup: 'Support Systems',
      bomCategory: 'Oil Pump & Pickup',
      primaryProcess: 'Precision Gear/Rotor Machining & Housing Finishing',
      alloySpec: 'Cast iron / powdered metal / aluminum per pump spec [EST — verify pump spec]',
      heatTreatAndFinish: 'Precision ground/honed rotor & gear clearances [EST]',
      cycleTimeEst: '1.3 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Hot Relief / Oil Pressure Reference',
          nominalSpec: isSbc350
            ? 'SBC 350 ONLY: 60 PSI hot relief reference [EST / NEEDS RAY\'S MEASUREMENT]'
            : 'Per OEM / pump spec [NEEDS RAY\'S MEASUREMENT]',
          toleranceBand: 'Depends on oil viscosity, temp & clearance [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Pump gear/housing working surfaces [EST]',
          verificationMethod: 'Mechanical/calibrated oil pressure gauge [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: isSbc350 ? 'SBC_350_BASELINE_ONLY_SPECS [EST]' : 'OEM / Pump Spec'
        }
      ],
      gdtCallouts: [
        {
          symbol: '⊥',
          featureControlFrame: 'Pump mounting flange perpendicularity to drive [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Mounting flange',
          engineeringPurpose: 'Prevents shaft binding and oil pressure loss',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Prime lubrication system and verify oil flow/pressure before sustained load [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'oilPan',
      partName: 'Oil Pan & Sump',
      subsystemGroup: 'Support Systems',
      bomCategory: 'Oil Pan',
      primaryProcess: 'Stamping / Forming / Welding or Casting & Rail Straightening',
      alloySpec: 'Steel or cast/fabricated aluminum per application [EST — verify pan spec]',
      heatTreatAndFinish: 'Coated or bare aluminum per spec [EST]',
      cycleTimeEst: '1.4 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Pickup-to-Pan Floor Clearance',
          nominalSpec: isSbc350
            ? 'SBC 350 ONLY: 0.312" reference [EST / NEEDS RAY\'S MEASUREMENT]'
            : 'Per pan/pickup manufacturer spec [NEEDS RAY\'S MEASUREMENT]',
          toleranceBand: 'Measure with modeling clay/plumb check [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Pan rail flatness verified [NEEDS RAY\'S MEASUREMENT]',
          verificationMethod: 'Physical pickup-to-pan clearance check [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: isSbc350 ? 'SBC_350_BASELINE_ONLY_SPECS [EST]' : 'Pan / Pickup Spec'
        }
      ],
      gdtCallouts: [
        {
          symbol: '⏥',
          featureControlFrame: 'Rail flatness along pan perimeter [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Pan mounting rail',
          engineeringPurpose: 'Prevents oil weeping along gasket rail',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Inspect welds, drain plug threads, and baffle security [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'cooling',
      partName: 'Cooling Pump & Thermostat Interface',
      subsystemGroup: 'Support Systems',
      bomCategory: 'Water Pump',
      primaryProcess: 'Casting & CNC Sealing/Bearing Bore Machining',
      alloySpec: 'Aluminum (A356/319) or cast iron per pump design [Ref: LeClaire Mfg; WB Castings]',
      heatTreatAndFinish: 'Machined gasket & hub faces [EST]',
      cycleTimeEst: '1.2 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Impeller-to-Housing Clearance & Pulley Alignment',
          nominalSpec: 'Per pump/accessory drive spec [NEEDS RAY\'S MEASUREMENT]',
          toleranceBand: 'Verify belt alignment & clearance on engine [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Gasket sealing faces [EST]',
          verificationMethod: 'Straightedge / feeler gauge check [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'Engine accessory drive practice [NEEDS RAY\'S MEASUREMENT]'
        }
      ],
      gdtCallouts: [
        {
          symbol: '∥',
          featureControlFrame: 'Pulley plane alignment with crank/accessory pulleys [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Mounting face',
          engineeringPurpose: 'Reduces belt slip and bearing side load',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Pressure-test cooling system for leaks [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'fuel',
      partName: 'Fuel Delivery System',
      subsystemGroup: 'Support Systems',
      bomCategory: 'Fuel Pump',
      primaryProcess: 'Machining / Assembly & Pressure/Flow Check',
      alloySpec: 'Per fuel pump/regulator/line specification [EST]',
      heatTreatAndFinish: 'Fuel-compatible materials & seals [EST]',
      cycleTimeEst: '1.0 hr [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Fuel Flow & Pressure at Demand',
          nominalSpec: `${specs.fuelGph} GPH demand reference [EST — verify pump curve & pressure]`,
          toleranceBand: 'Per regulator/EFI/carb spec [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Fitting & sealing surfaces [EST]',
          verificationMethod: 'Fuel pressure gauge & flow check [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'CoordinatedSpecs.fuelGph'
        }
      ],
      gdtCallouts: [
        {
          symbol: '⌖',
          featureControlFrame: 'Mounting & fitting port alignment [EST]',
          datumScheme: 'Datum A: Mounting surface',
          engineeringPurpose: 'Prevents line strain and fuel leaks',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Leak-check all fuel fittings under pressure before starting [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'starter',
      partName: 'Starter Motor & Ring Gear Mesh',
      subsystemGroup: 'Support Systems',
      bomCategory: 'Starter Motor',
      primaryProcess: 'Housing Machining & Pinion Mesh Check',
      alloySpec: 'Cast/machined housing & hardened gear per starter spec [EST]',
      heatTreatAndFinish: 'Per starter manufacturer spec [EST]',
      cycleTimeEst: '0.8 hr [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Pinion-to-Ring-Gear Clearance',
          nominalSpec: 'Per starter/flywheel/flexplate spec [NEEDS RAY\'S MEASUREMENT]',
          toleranceBand: 'Shim as required per manufacturer [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Mounting pad contact [EST]',
          verificationMethod: 'Physical mesh/clearance check on assembly [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'Starter/driveline practice [NEEDS RAY\'S MEASUREMENT]'
        }
      ],
      gdtCallouts: [
        {
          symbol: '⊥',
          featureControlFrame: 'Starter nose/mount alignment to ring gear plane [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Mounting flange',
          engineeringPurpose: 'Ensures smooth pinion engagement without binding',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Verify starter engagement, current draw, and clearance [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'bellhousing',
      partName: `Bellhousing / Pattern Interface (${pattern})`,
      subsystemGroup: 'Powertrain',
      bomCategory: 'Bellhousing',
      primaryProcess: 'Casting / CNC Machining & Runout/Alignment Check',
      alloySpec: 'Aluminum / cast iron / SFI steel per transmission & chassis spec [EST]',
      heatTreatAndFinish: 'Machined block & transmission mating faces [EST]',
      cycleTimeEst: '1.5 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Bellhousing Bore Concentricity & Face Runout',
          nominalSpec: `Pattern: ${pattern} [NEEDS RAY\'S MEASUREMENT on installed bellhousing]`,
          toleranceBand: 'Per transmission/OEM/SFI spec [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Machined mating faces [EST]',
          verificationMethod: 'Dial indicator on crank flange / pilot bore [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'EngineFamilySpec.pattern'
        }
      ],
      gdtCallouts: [
        {
          symbol: '◎',
          featureControlFrame: 'Pilot bore concentricity to crankshaft axis [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Crankshaft axis / dowel reference',
          engineeringPurpose: 'Aligns transmission input shaft with crankshaft centerline',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Verify dowel pins, bolt engagement, and runout [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'converter',
      partName: 'Torque Converter / Clutch Assembly',
      subsystemGroup: 'Powertrain',
      bomCategory: 'Converter / Clutch',
      primaryProcess: 'Precision Machining, Balancing & End-Play Check',
      alloySpec: 'Per transmission/clutch specification [EST]',
      heatTreatAndFinish: 'Per manufacturer spec [EST]',
      cycleTimeEst: '1.0 hr [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Converter Stall / Clutch Engagement Spec',
          nominalSpec: `${config.stallSpeed} RPM stall setting [NEEDS RAY\'S MEASUREMENT / verify converter spec]`,
          toleranceBand: 'Per converter/clutch manufacturer [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Friction/hub surfaces per spec [EST]',
          verificationMethod: 'Converter pull-out & installed clearance check [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'EngineConfig.stallSpeed'
        }
      ],
      gdtCallouts: [
        {
          symbol: '↗',
          featureControlFrame: 'Hub/flexplate/flywheel runout [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Rotational axis',
          engineeringPurpose: 'Minimizes vibration and thrust load',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Verify converter seating depth / clutch release travel [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'frontPump',
      partName: 'Transmission Front Pump',
      subsystemGroup: 'Powertrain',
      bomCategory: 'Front Pump',
      primaryProcess: 'Precision Gear/Bushing Machining & Seal Inspection',
      alloySpec: 'Per transmission specification [EST]',
      heatTreatAndFinish: 'Per transmission service manual [EST]',
      cycleTimeEst: '1.0 hr [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Pump Gear & Bushing Clearances',
          nominalSpec: 'Per transmission service manual [NEEDS RAY\'S MEASUREMENT]',
          toleranceBand: 'Per OEM/aftermarket rebuild spec [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Pump faces & bushing ID per spec [EST]',
          verificationMethod: 'Feeler gauge / dial bore gauge [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'Transmission service manual [NEEDS RAY\'S MEASUREMENT]'
        }
      ],
      gdtCallouts: [
        {
          symbol: '⊥',
          featureControlFrame: 'Pump face squareness to axis [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Pump bore axis',
          engineeringPurpose: 'Maintains hydraulic sealing and gear clearance',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Inspect pump gears, stator support, and seals [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'clutchPack',
      partName: 'Clutch Pack / Gear Engagement Pack',
      subsystemGroup: 'Powertrain',
      bomCategory: 'Clutch Pack',
      primaryProcess: 'Friction/Steel Stack Clearance & End-Play Setup',
      alloySpec: 'Per transmission specification [EST]',
      heatTreatAndFinish: 'Per transmission service manual [EST]',
      cycleTimeEst: '1.2 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Clutch Pack Clearance / End Play',
          nominalSpec: 'Per transmission service manual [NEEDS RAY\'S MEASUREMENT]',
          toleranceBand: 'Selective snap ring / thrust washer per manual [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Per spec [EST]',
          verificationMethod: 'Feeler gauge / dial indicator [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'Transmission service manual [NEEDS RAY\'S MEASUREMENT]'
        }
      ],
      gdtCallouts: [
        {
          symbol: '∥',
          featureControlFrame: 'Drum/plate parallelism [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Shaft axis',
          engineeringPurpose: 'Even clutch apply and heat dissipation',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Air-check clutch apply and verify end play [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'mainCase',
      partName: 'Transmission Main Case & Gear Train',
      subsystemGroup: 'Powertrain',
      bomCategory: 'Main Case',
      primaryProcess: 'Case Inspection, Bore Alignment & Gear End-Play Check',
      alloySpec: 'Per transmission specification [EST]',
      heatTreatAndFinish: 'Per transmission service manual [EST]',
      cycleTimeEst: '1.8 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Shaft End Play & Gear Tooth Mesh',
          nominalSpec: 'Per transmission service manual [NEEDS RAY\'S MEASUREMENT]',
          toleranceBand: 'Per OEM/aftermarket manual [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Per spec [EST]',
          verificationMethod: 'Dial indicator / gear contact pattern check [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'Transmission service manual [NEEDS RAY\'S MEASUREMENT]'
        }
      ],
      gdtCallouts: [
        {
          symbol: '⌖',
          featureControlFrame: 'Bore/shaft center distance & alignment [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Main bore axis',
          engineeringPurpose: 'Controls gear mesh noise and bearing life',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Inspect case bores, threads, and gear teeth for wear/damage [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'valveBody',
      partName: 'Valve Body & Hydraulic/Shift Controls',
      subsystemGroup: 'Powertrain',
      bomCategory: 'Valve Body',
      primaryProcess: 'Valve Bore Inspection, Check-Ball/Spring Verification & Torque Sequence',
      alloySpec: 'Per transmission specification [EST]',
      heatTreatAndFinish: 'Per transmission service manual [EST]',
      cycleTimeEst: '1.1 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Valve Body Bolt Torque & Spool Freedom',
          nominalSpec: 'Per transmission service manual [NEEDS RAY\'S MEASUREMENT]',
          toleranceBand: 'Torque in sequence per manual [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Mating/valve bores per spec [EST]',
          verificationMethod: 'Calibrated torque wrench & valve movement check [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'Transmission service manual [NEEDS RAY\'S MEASUREMENT]'
        }
      ],
      gdtCallouts: [
        {
          symbol: '⏥',
          featureControlFrame: 'Valve body mating face flatness [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Gasket sealing face',
          engineeringPurpose: 'Prevents cross-leaks between hydraulic circuits',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Verify check balls, valves, filter, and line pressure [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'pan',
      partName: 'Transmission Pan & Fluid Sump',
      subsystemGroup: 'Powertrain',
      bomCategory: 'Transmission Pan',
      primaryProcess: 'Pan Rail Flatness Check & Fastener Torque',
      alloySpec: 'Per transmission pan specification [EST]',
      heatTreatAndFinish: 'Per pan spec [EST]',
      cycleTimeEst: '0.6 hr [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Pan Rail Flatness & Filter Clearance',
          nominalSpec: 'Per transmission/pan spec [NEEDS RAY\'S MEASUREMENT]',
          toleranceBand: 'Torque evenly per manual [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Per spec [EST]',
          verificationMethod: 'Straightedge & clearance check [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'Transmission service manual [NEEDS RAY\'S MEASUREMENT]'
        }
      ],
      gdtCallouts: [
        {
          symbol: '⏥',
          featureControlFrame: 'Pan flange flatness [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Pan rail plane',
          engineeringPurpose: 'Prevents fluid seepage',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Verify fluid level and check for leaks after warm-up [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'tailhousing',
      partName: 'Tailhousing / Extension Housing & Output Seal',
      subsystemGroup: 'Powertrain',
      bomCategory: 'Tailhousing',
      primaryProcess: 'Bushing/Seal Bore Check & Mount Fitment',
      alloySpec: 'Per transmission specification [EST]',
      heatTreatAndFinish: 'Per spec [EST]',
      cycleTimeEst: '0.7 hr [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Extension Bushing & Seal Bore Fit',
          nominalSpec: 'Per transmission manual [NEEDS RAY\'S MEASUREMENT]',
          toleranceBand: 'Per manual [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Seal journal/bore per spec [EST]',
          verificationMethod: 'Bore gauge / visual seal check [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'Transmission service manual [NEEDS RAY\'S MEASUREMENT]'
        }
      ],
      gdtCallouts: [
        {
          symbol: '◎',
          featureControlFrame: 'Tailhousing bore concentricity to output shaft [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Output shaft axis',
          engineeringPurpose: 'Supports output yoke and prevents vibration',
          sourceRef: 'ISO 22081 [EST]'
        }
      ],
      qualityAndNdt: [
        'Verify output shaft end play, seal lip direction, and mount bolts [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'slipYoke',
      partName: 'Slip Yoke, Driveshaft & Rear Axle Ratio',
      subsystemGroup: 'Powertrain',
      bomCategory: 'Driveline',
      primaryProcess: 'Driveshaft Length/Balance & U-Joint/Pinion Angle Check',
      alloySpec: 'Per driveshaft/axle specification [EST]',
      heatTreatAndFinish: 'Balanced assembly per driveline shop spec [NEEDS RAY\'S MEASUREMENT]',
      cycleTimeEst: '1.2 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Rear Axle Ratio & Tire Diameter',
          nominalSpec: `${config.rearGear.toFixed(2)}:1 gear | ${config.tireDiameter.toFixed(1)}" tire`,
          toleranceBand: 'Actual tire OD & slip yoke travel measured on vehicle [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Yoke journal / U-joint fit per spec [EST]',
          verificationMethod: 'Tape measure / angle finder / driveshaft balance [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'EngineConfig.rearGear; EngineConfig.tireDiameter'
        }
      ],
      gdtCallouts: [
        {
          symbol: '↗',
          featureControlFrame: 'Driveshaft runout & working U-joint angles [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Driveline rotational axis',
          engineeringPurpose: 'Minimizes driveline vibration and U-joint wear',
          sourceRef: 'ISO 22081 / Driveline practice [EST]'
        }
      ],
      qualityAndNdt: [
        'Verify driveshaft slip travel, U-joint retaining clips/straps, and working angles [NEEDS RAY\'S MEASUREMENT]'
      ]
    },
    {
      subassemblyKey: 'chassis',
      partName: `Chassis & Tunnel Fitment (${config.selectedVehicle})`,
      subsystemGroup: 'Powertrain',
      bomCategory: 'Chassis Fitment',
      primaryProcess: 'Physical Tunnel, Crossmember & Steering/Firewall Clearance Verification',
      alloySpec: 'Per vehicle chassis specification [EST]',
      heatTreatAndFinish: 'Per chassis/coating spec [EST]',
      cycleTimeEst: '1.5 hrs [EST — shop routing estimate]',
      keyDimensions: [
        {
          feature: 'Transmission Tunnel, Mount & Header/Steering Clearances',
          nominalSpec: `Vehicle ID: ${config.selectedVehicle} [NEEDS RAY\'S MEASUREMENT on chassis]`,
          toleranceBand: 'Measure physical clearances prior to final weld/bolt [NEEDS RAY\'S MEASUREMENT]',
          surfaceFinishRa: 'Per chassis/coating spec [EST]',
          verificationMethod: 'Physical mock-up & clearance measurement [NEEDS RAY\'S MEASUREMENT]',
          sourceRef: 'EngineConfig.selectedVehicle'
        }
      ],
      gdtCallouts: [
        {
          symbol: '⌖',
          featureControlFrame: 'Engine/transmission mount centerline alignment [NEEDS RAY\'S MEASUREMENT]',
          datumScheme: 'Datum A: Chassis frame/reference plane',
          engineeringPurpose: 'Maintains driveline angles and clearance to body/steering',
          sourceRef: 'ISO 22081 / Chassis swap practice [EST]'
        }
      ],
      qualityAndNdt: [
        'Inspect mounts, crossmember, brake/fuel lines, and exhaust clearances [NEEDS RAY\'S MEASUREMENT]'
      ]
    }
  ];
}