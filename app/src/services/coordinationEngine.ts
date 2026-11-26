/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EngineConfig,
  CoordinatedSpecs,
  DynoDataPoint,
  SpeedInGearRow,
  CompatibilityReport,
  TransmissionItem,
  HeadFlowPoint
} from '../types/engine';
import {
  CAM_PROFILES,
  INTAKE_MANIFOLDS,
  TRANSMISSIONS_DB,
  VEHICLES_CATALOG,
  CARB_STYLE_OPTIONS,
  EXHAUST_PORT_PRESETS,
  HEADER_PRIMARY_OPTIONS,
  CYLINDER_HEAD_FLOW_BENCH
} from '../data/engineData';
import { STORE_VEHICLE_MODELS } from '../data/autoPartsCatalog';
import { ENGINE_FAMILIES } from '../data/engineFamilies';
import { VEHICLE_CATALOG } from '../data/vehicleCatalog';

export function calculateCoordinatedSpecs(
  config: EngineConfig,
  transOverridesById?: Record<string, Partial<TransmissionItem>>
): CoordinatedSpecs {
  const {
    bore,
    stroke,
    rodLength,
    deckClearance,
    gasketThickness,
    chamberCc,
    pistonReliefCc,
    pistonAlloy,
    ringApplication,
    camProfile,
    rockerRatio,
    selectedIntake,
    carbCfm,
    targetAFR,
    ignitionTiming,
    selectedTrans,
    rearGear,
    tireDiameter,
    selectedVehicle,
    engineFamilyId,
    bellhousingPattern,
    inductionDress = 'carb_hei'
  } = config;

  const activeFamily = engineFamilyId ? ENGINE_FAMILIES[engineFamilyId] : undefined;
  const isCustomOrSbcBaseline = !activeFamily || activeFamily.id === 'gm_sbc_350';

  // MPFI induction dress (restored from v11): sequential port injection +
  // 90mm throttle body adds 6% HP / 4% TQ over the carb baseline
  // (385 -> 408 HP, 414 -> 431 TQ) and shifts the peaks +100 RPM.
  const isMpfi = inductionDress === 'mpfi_cnp';
  const mpfiHpMult = isMpfi ? 1.06 : 1.0;
  const mpfiTqMult = isMpfi ? 1.04 : 1.0;

  // 1. DISPLACEMENT & CYLINDER VOLUMES
  const cylCount = config.cylinders ?? activeFamily?.cylinders ?? 8;
  const isRotary = activeFamily?.configuration === 'Rotary';
  // (PI / 4) * bore^2 * stroke * cylinders for piston engines; rotor swept chamber for Wankel rotary
  const displacementCi = isRotary
    ? +(activeFamily?.displacementCi ?? cylCount * 39.9).toFixed(2)
    : +((Math.PI / 4) * Math.pow(bore, 2) * stroke * cylCount).toFixed(2);
  const displacementL = isRotary
    ? +(activeFamily?.displacementL ?? displacementCi * 0.016387064).toFixed(3)
    : +(displacementCi * 0.016387064).toFixed(3);
  const singleCylinderCc = +((displacementCi * 16.387064) / Math.max(1, cylCount)).toFixed(2);

  // 2. QUENCH / SQUISH DISTANCE (Ray's Confirmed Spec: .039" gasket + .015" deck = .054")
  const quenchDistance = isRotary ? 0.045 : +(gasketThickness + deckClearance).toFixed(4);
  const quenchStatus = isRotary
    ? 'WANKEL APEX-SEAL HOUSING CLEARANCE (ROTARY ARCHITECTURE)'
    : quenchDistance >= 0.038 && quenchDistance <= 0.055
    ? 'OPTIMAL DETONATION SHIELD (0.038" - 0.055")'
    : quenchDistance < 0.038
    ? 'DANGER: EXCESSIVE ROD STRETCH & PISTON-TO-HEAD CONTACT RISK'
    : 'POOR: END-GAS DETONATION ZONE (> 0.055")';

  // 3. COMPRESSION VOLUMES & STATIC COMPRESSION RATIO (SCR)
  // Deck volume (in cc) = (PI / 4) * bore^2 * deckClearance * 16.387064
  const deckVolumeCc = isRotary
    ? 0
    : +(((Math.PI / 4) * Math.pow(bore, 2) * deckClearance * 16.387064)).toFixed(2);
  // Gasket volume (fire-ring bore ~ bore + 0.100", exact 4.100" for 4.000" SBC 350)
  const gasketBore = bore + 0.100;
  const gasketVolumeCc = isRotary
    ? 0
    : +(((Math.PI / 4) * Math.pow(gasketBore, 2) * gasketThickness * 16.387064)).toFixed(2);
  const totalClearanceCc = Math.max(
    10,
    +(chamberCc + gasketVolumeCc + deckVolumeCc + pistonReliefCc).toFixed(2)
  );
  const staticCR = +((singleCylinderCc + totalClearanceCc) / totalClearanceCc).toFixed(2);

  // 4. ROD-TO-STROKE RATIO & PISTON KINEMATICS
  const rodStrokeRatio = +(rodLength / stroke).toFixed(3);
  const maxRodAngleDeg = +(Math.asin((stroke / 2) / rodLength) * (180 / Math.PI)).toFixed(2);
  const meanPistonSpeed6000 = Math.round((2 * stroke * 6000) / 12); // FPM

  // 5. CAMSHAFT & VALVETRAIN COORDINATION
  const presetCam = CAM_PROFILES[camProfile] || CAM_PROFILES.street;
  let cam = presetCam;

  if (!isCustomOrSbcBaseline && activeFamily) {
    const baseFamCam = activeFamily.camBaseline;
    const basePreset = CAM_PROFILES[baseFamCam.camProfileId] || CAM_PROFILES.street;
    const camSwitched = camProfile !== baseFamCam.camProfileId;
    const hpScale = camSwitched ? presetCam.baseHp / basePreset.baseHp : 1;
    const tqScale = camSwitched ? presetCam.baseTq / basePreset.baseTq : 1;
    const durDelta = camSwitched ? presetCam.intakeDur050 - basePreset.intakeDur050 : 0;

    cam = {
      id: camProfile,
      name: camSwitched ? `${activeFamily.shortName} · ${presetCam.name}` : baseFamCam.name,
      desc: baseFamCam.notes,
      intakeDur050: Math.max(175, baseFamCam.intakeDur050 + durDelta),
      exhDur050: Math.max(180, baseFamCam.exhDur050 + durDelta),
      lobeLift: camSwitched ? +(baseFamCam.lobeLift * (presetCam.lobeLift / basePreset.lobeLift)).toFixed(3) : baseFamCam.lobeLift,
      advertisedIntake: baseFamCam.intakeDur050 + 50 + durDelta,
      advertisedExh: baseFamCam.exhDur050 + 50 + durDelta,
      lsa: baseFamCam.lsa,
      ivcDeg: camSwitched ? Math.max(32, baseFamCam.ivcDeg + (presetCam.ivcDeg - basePreset.ivcDeg)) : baseFamCam.ivcDeg,
      baseHp: Math.round(baseFamCam.baseHp * hpScale),
      baseTq: Math.round(baseFamCam.baseTq * tqScale),
      hpRpm: camSwitched ? Math.round(baseFamCam.hpRpm * (presetCam.hpRpm / basePreset.hpRpm)) : baseFamCam.hpRpm,
      tqRpm: camSwitched ? Math.round(baseFamCam.tqRpm * (presetCam.tqRpm / basePreset.tqRpm)) : baseFamCam.tqRpm,
      ve: baseFamCam.ve,
      recStall: presetCam.recStall,
      vacuumIdle: presetCam.vacuumIdle
    };
  }

  const totalValveLift = +(cam.lobeLift * rockerRatio).toFixed(3);

  // Dynamic Compression Ratio (DCR):
  // Effective stroke accounts for Intake Valve Closing (IVC) ABDC degrees (or rotor port closing eq)
  const effectiveStroke = stroke * (1 - (cam.ivcDeg / 180) * 0.45);
  const effectiveCylCc = isRotary
    ? singleCylinderCc * (1 - (cam.ivcDeg / 180) * 0.45)
    : (Math.PI / 4) * Math.pow(bore, 2) * effectiveStroke * 16.387064;
  const dynamicCR = +((effectiveCylCc + totalClearanceCc) / totalClearanceCc).toFixed(2);

  // 6. MACHINE SHOP RING GAPS & PTW CLEARANCES
  const ringFactorTop =
    ringApplication === 'street' ? 0.0045 :
    ringApplication === 'street_strip' ? 0.0050 : 0.0065;
  const topRingGap = +(bore * ringFactorTop).toFixed(3);
  const secondRingGap = +(topRingGap + 0.003).toFixed(3); // 2nd ring wider prevents flutter
  const oilRingGap = 0.015;

  const ptwClearance =
    pistonAlloy === '2618'
      ? '0.0045" – 0.0055" (Forged 2618 High-Expansion Race Alloy)'
      : pistonAlloy === '4032'
      ? '0.0028" – 0.0035" (Forged 4032 Low-Expansion Street/Strip Alloy)'
      : '0.0018" – 0.0025" (Hypereutectic Cast Alloy)';

  // 7. INDUCTION, CARBURETOR SIZING & PORT FLOW BENCH DYNAMICS
  const intake = INTAKE_MANIFOLDS.find(i => i.id === selectedIntake) || INTAKE_MANIFOLDS[0];
  const peakCfmDemand = Math.round(((displacementCi * cam.hpRpm) / 3456) * cam.ve);

  const carbStyle = config.carbStyle || '4150_dp';
  const carbStyleSpec = CARB_STYLE_OPTIONS.find(c => c.id === carbStyle) || CARB_STYLE_OPTIONS[1];
  const venturiIn = config.carbVenturiIn ?? carbStyleSpec.venturiIn;
  const airFilterCfmBonus = config.airFilterCfmBonus ?? 15;
  const intakePortCc = config.intakePortCc ?? 185;
  const intakeValveIn = config.intakeValveIn ?? 2.02;
  const exhaustPortCc = config.exhaustPortCc ?? 68;
  const exhaustPortShape = config.exhaustPortShape || 'd_port';
  const exhaustValveIn = config.exhaustValveIn ?? 1.60;
  const headerPrimaryIn = config.headerPrimaryIn ?? 1.625;

  const effectiveCarbCfm = Math.max(
    isMpfi ? 850 : 250,
    Math.round(carbCfm * carbStyleSpec.flowCoeff + (airFilterCfmBonus - 15))
  );

  const carbSizingStatus =
    effectiveCarbCfm < peakCfmDemand * 0.92
      ? 'RESTRICTIVE (TOP-END CHOKE / CRISP STREET VACUUM)'
      : effectiveCarbCfm <= peakCfmDemand * 1.38
      ? 'OPTIMAL MATCH (CRISP BOOSTER SIGNAL & PEAK VE)'
      : 'OVERSIZED (SOFT LOW-RPM BOOSTER SIGNAL · DRAG RACE)';

  // Intake & exhaust cylinder head port flow scaling (normalized 1.000 at 185cc / 2.02" / 68cc D-port / 1.60")
  const intakePortFlowMult =
    Math.pow(intakePortCc / 185, 0.56) * Math.pow(intakeValveIn / 2.02, 0.95);
  const exhaustPreset = EXHAUST_PORT_PRESETS.find((e) => e.shape === exhaustPortShape);
  const exhaustShapeMult =
    exhaustPortShape === 'oval_stock'
      ? 0.93
      : exhaustPortShape === 'raised_runner'
      ? 1.06
      : exhaustPortShape === 'cnc_race'
      ? 1.12
      : exhaustPreset?.flowScale ?? 1.0;
  const exhaustPortFlowMult =
    Math.pow(exhaustPortCc / 68, 0.48) * Math.pow(exhaustValveIn / 1.60, 0.90) * exhaustShapeMult;

  const dynamicHeadFlowBench: HeadFlowPoint[] = CYLINDER_HEAD_FLOW_BENCH.map((pt) => ({
    lift: pt.lift,
    intakeCfm: Math.round(pt.intakeCfm * intakePortFlowMult),
    exhaustCfm: Math.round(pt.exhaustCfm * exhaustPortFlowMult)
  }));

  const bench600 = dynamicHeadFlowBench[dynamicHeadFlowBench.length - 1];
  const intakeFlowPeakCfm = bench600.intakeCfm;
  const exhaustFlowPeakCfm = bench600.exhaustCfm;
  const eiFlowRatioPct = Math.round((exhaustFlowPeakCfm / Math.max(1, intakeFlowPeakCfm)) * 100);
  // Estimated runner port velocity (baseline ~248 ft/s at 185cc)
  const intakeVelocityFps = Math.round((peakCfmDemand / Math.max(1, cylCount)) * (185 / intakePortCc) * 3.88);

  const headerSpec = HEADER_PRIMARY_OPTIONS.find((h) => Math.abs(h.id - headerPrimaryIn) < 0.02);
  const headerScavengeMult =
    headerSpec?.scavengeMult ??
    (headerPrimaryIn >= 2.0 ? 1.06 : headerPrimaryIn >= 1.875 ? 1.05 : headerPrimaryIn >= 1.75 ? 1.03 : headerPrimaryIn <= 1.5 ? 0.96 : 1.0);
  const headerTorqueMult = headerPrimaryIn >= 1.875 ? 0.97 : headerPrimaryIn === 1.75 ? 1.01 : headerPrimaryIn <= 1.5 ? 1.015 : 1.0;

  const venturiMult = Math.max(0.96, Math.min(1.04, 1 + (venturiIn - 1.375) * 0.075));
  const airFilterMult = Math.max(0.95, Math.min(1.045, 1 + (airFilterCfmBonus - 15) * 0.0008));

  const portPowerMult =
    Math.pow(intakePortFlowMult, 0.72) *
    Math.pow(exhaustPortFlowMult, 0.34) *
    headerScavengeMult *
    venturiMult *
    airFilterMult;

  const portTorqueMult =
    Math.pow(intakePortFlowMult, 0.24) *
    Math.pow(exhaustPortFlowMult, 0.22) *
    headerTorqueMult *
    airFilterMult *
    (intakePortCc > 215 && camProfile === 'rv' ? 0.94 : 1.0);

  // 8. LIVE DYNO CALCULATIONS & POWER CURVES
  const idealTiming = isCustomOrSbcBaseline
    ? 36
    : activeFamily!.inductionBaseline.ignitionTiming;
  const timingFactor =
    ignitionTiming === idealTiming
      ? 1.0
      : ignitionTiming > idealTiming + 4
      ? 0.92
      : Math.max(0.84, 1.0 - Math.abs(idealTiming - ignitionTiming) * 0.01);

  const idealAfr = isCustomOrSbcBaseline ? 12.9 : activeFamily!.inductionBaseline.targetAFR;
  const afrFactor = Math.max(0.85, 1.0 - Math.pow(targetAFR - idealAfr, 2) * 0.04);
  const carbFactor =
    effectiveCarbCfm >= peakCfmDemand
      ? 1.0
      : Math.max(0.84, 0.94 * (effectiveCarbCfm / Math.max(250, peakCfmDemand)));

  let baseUnmodHp: number;
  let baseUnmodTq: number;

  if (isCustomOrSbcBaseline) {
    const dispPowerScale = Math.abs(displacementCi - 349.85) < 0.5 ? 1.0 : Math.pow(displacementCi / 349.85, 0.72);
    baseUnmodHp = cam.baseHp * dispPowerScale * (staticCR / 9.90) * intake.hpMult * timingFactor * afrFactor;
    baseUnmodTq = cam.baseTq * (displacementCi / 350.4) * intake.tqMult * timingFactor * afrFactor;
  } else {
    const famBaseCid = activeFamily!.displacementCi || displacementCi;
    const famDispScale = Math.abs(displacementCi - famBaseCid) < 2.0 ? 1.0 : Math.pow(displacementCi / famBaseCid, 0.72);
    const famBaseSingleCc = (famBaseCid * 16.387064) / Math.max(1, cylCount);
    const famBaseDeckVol = isRotary
      ? 0
      : (Math.PI / 4) * Math.pow(activeFamily!.bore, 2) * activeFamily!.deckClearance * 16.387064;
    const famBaseGasketVol = isRotary
      ? 0
      : (Math.PI / 4) * Math.pow(activeFamily!.bore + 0.1, 2) * activeFamily!.gasketThickness * 16.387064;
    const famBaseClearance = Math.max(
      10,
      activeFamily!.chamberCc + famBaseGasketVol + famBaseDeckVol + activeFamily!.pistonReliefCc
    );
    const famBaseCR = Math.max(7.5, (famBaseSingleCc + famBaseClearance) / famBaseClearance);
    const famIntake = INTAKE_MANIFOLDS.find(i => i.id === activeFamily!.inductionBaseline.selectedIntake) || INTAKE_MANIFOLDS[0];
    const relIntakeHp = intake.hpMult / famIntake.hpMult;
    const relIntakeTq = intake.tqMult / famIntake.tqMult;

    baseUnmodHp = cam.baseHp * famDispScale * (staticCR / famBaseCR) * relIntakeHp * timingFactor * afrFactor;
    baseUnmodTq = cam.baseTq * (displacementCi / famBaseCid) * (staticCR / famBaseCR) * relIntakeTq * timingFactor * afrFactor;
  }

  const peakHp = Math.round(baseUnmodHp * carbFactor * portPowerMult * mpfiHpMult);
  const peakTq = Math.round(baseUnmodTq * portTorqueMult * mpfiTqMult);
  const portModHpDelta = peakHp - Math.round(baseUnmodHp);
  const portModTqDelta = peakTq - Math.round(baseUnmodTq);

  const hpPeakRpm = isMpfi ? cam.hpRpm + 100 : cam.hpRpm;
  const tqPeakRpm = isMpfi ? cam.tqRpm + 100 : cam.tqRpm;

  // Brake Specific Fuel Consumption (BSFC)
  const bsfcLbHr = +(peakHp * (isMpfi ? 0.47 : 0.49)).toFixed(1);
  const fuelGph = +(bsfcLbHr / 6.0).toFixed(1);

  // Synthesize SAE J1349 Power & Torque Absorption Sweep
  // Fix (Nov 24, carried from v11): no torque floor — torque keeps decaying
  // past its peak, and a monotonic guard keeps HP from rising after the HP
  // peak while HP = TQ x RPM / 5252 keeps holding on every row.
  const dynoMaxRpm = Math.max(6500, Math.ceil((hpPeakRpm + 400) / 250) * 250);
  const dynoCurve: DynoDataPoint[] = [];
  const hpSpan = Math.max(750, hpPeakRpm - tqPeakRpm);
  const dropAtHpPeak = Math.max(
    0.08,
    Math.min(0.32, 1 - (peakHp * 5252) / (Math.max(1, peakTq) * hpPeakRpm))
  );

  let maxHpSoFar = 0;
  let passedHpPeak = false;
  let prevHp = 0;

  for (let r = 1500; r <= dynoMaxRpm; r += 250) {
    let tqFactor: number;
    if (r <= tqPeakRpm) {
      tqFactor = Math.max(0.25, 1 - Math.pow((tqPeakRpm - r) / 2500, 2) * 0.30);
    } else {
      tqFactor = Math.max(
        0.05,
        1 - Math.pow((r - tqPeakRpm) / hpSpan, 2.35) * dropAtHpPeak
      );
    }

    let currTq = Math.round(peakTq * tqFactor);
    let currHp = Math.round((currTq * r) / 5252);

    if (r > hpPeakRpm || passedHpPeak) {
      passedHpPeak = true;
      if (currHp > prevHp) {
        currTq = Math.round((prevHp * 5252) / r);
        currHp = Math.round((currTq * r) / 5252);
        while (currHp > prevHp && currTq > 0) {
          currTq -= 1;
          currHp = Math.round((currTq * r) / 5252);
        }
      }
    } else if (currHp >= maxHpSoFar) {
      maxHpSoFar = currHp;
    } else {
      passedHpPeak = true;
    }

    prevHp = currHp;
    const currVe = +(cam.ve * (0.8 + 0.2 * tqFactor)).toFixed(2);
    const currFuelFlow = +(currHp * 0.49).toFixed(1);

    dynoCurve.push({
      rpm: r,
      hp: currHp,
      tq: currTq,
      ve: currVe,
      fuelFlowLbsHr: currFuelFlow
    });
  }

  // 9. TRANSMISSION SPEED IN GEAR TABLE
  const baseTrans = TRANSMISSIONS_DB[selectedTrans] || TRANSMISSIONS_DB.th350;
  const transOverride = transOverridesById?.[baseTrans.id];
  const trans = transOverride ? { ...baseTrans, ...transOverride } : baseTrans;
  const speedInGearTable: SpeedInGearRow[] = trans.ratios.map((ratio, idx) => {
    const totalReduction = +(ratio * rearGear).toFixed(3);
    const mphAt2500 = Math.round((2500 * tireDiameter) / (totalReduction * 336));
    const mphAt5500 = Math.round((5500 * tireDiameter) / (totalReduction * 336));
    const cruiseRpmAt65 = Math.round((65 * totalReduction * 336) / tireDiameter);

    return {
      gear: idx + 1,
      ratio,
      totalReduction,
      mphAt2500,
      mphAt5500,
      cruiseRpmAt65
    };
  });

  // 10. UNIVERSAL TRANSMISSION COMPATIBILITY AUDIT
  const catalogVehicle = VEHICLE_CATALOG[selectedVehicle];
  const storeVehicle = STORE_VEHICLE_MODELS.find(v => v.id === selectedVehicle);
  const vehicle = VEHICLES_CATALOG[selectedVehicle] || VEHICLES_CATALOG.camaro1969;
  const tunnelClearance = catalogVehicle
    ? `${catalogVehicle.make} ${catalogVehicle.model}: ${catalogVehicle.tunnelSize}`
    : storeVehicle
    ? `${storeVehicle.make} ${storeVehicle.model}: ${storeVehicle.tunnelSize}`
    : vehicle.tunnelSize;

  // Section 10 compatibility (PBR Batch 1 fix, carried from v11): resolve the
  // SELECTED engine's bellhousing pattern — explicit override first, then the
  // selected family. The trailing literal is only the default for the custom /
  // no-family SBC baseline (Ray's confirmed baseline pattern); it is NOT a
  // lookup of sbc_350_ray as the selected engine. The override comes from
  // config.bellhousingPattern, which the App preset handlers set from the
  // selected catalog entry's pattern.
  const activeBellhousing = bellhousingPattern || activeFamily?.bellhousingPattern || 'GM_Chevy_V8';
  const familyMatch = activeFamily?.compatibleTransmissions.find((m) => m.transId === trans.id);

  let isDirectBoltOn = false;
  let adapterRequired = 'None (Direct Factory Bolt-On)';
  let hardwareNotes = '';
  let bellhousing = '';

  if (activeBellhousing === 'GM_Chevy_V8') {
    if (trans.nativePattern === 'GM_Chevy_V8' || trans.nativePattern === 'GM_Dual_BOP_Chevy') {
      isDirectBoltOn = true;
      bellhousing = 'Direct OEM Chevy 6-Bolt Bellhousing';
      hardwareNotes = 'Uses standard Chevy bellhousing bolt pattern. Match starter nose and flexplate/flywheel to 153 vs 168-tooth ring gear.';
    } else if (trans.id === 'nissan_cd009') {
      adapterRequired = 'Collins / Maverick SBC-to-CD009 Billet Aluminum Adapter Plate';
      hardwareNotes = 'Requires custom stepped flywheel with Chevy crank pattern and 350Z friction clutch disc.';
      bellhousing = 'Requires machined front bellhousing bell cut';
    } else if (trans.id === 'tremecT56') {
      adapterRequired = 'QuickTime RM-6023 SFI Steel Bellhousing (Chevy V8 to Tremec T56 Face)';
      hardwareNotes = 'Direct bolt-in with 26-spline 11" clutch disc and hydraulic throwout bearing.';
      bellhousing = 'SFI Spec 6.1 Explosive Proof Bellhousing';
    } else if (trans.id === 'zf_8hp70_universal') {
      adapterRequired = 'DomTube / Sound Performance 8HP-to-SBC Billet Adapter Plate + Crank Hub Adapter';
      hardwareNotes = 'Requires standalone HTG Tuning or Turbolamik TCU electronic transmission controller.';
      bellhousing = 'Billet 6061-T6 Adapter Plate';
    } else {
      adapterRequired = 'Aftermarket Multi-Pattern Billet Bellhousing / Adapter Kit';
      hardwareNotes = 'Custom flywheel spacing and pilot bushing extension required.';
      bellhousing = 'Custom SFI Swap Adapter Bellhousing';
    }
  } else if (familyMatch && familyMatch.fitment === 'direct') {
    isDirectBoltOn = true;
    bellhousing = `Direct ${activeBellhousing} Bellhousing`;
    hardwareNotes = familyMatch.notes;
  } else if (trans.nativePattern === activeBellhousing) {
    isDirectBoltOn = true;
    bellhousing = `Direct ${activeBellhousing} Bellhousing`;
    hardwareNotes = activeFamily?.bellhousingNotes || `Native factory ${activeBellhousing} bolt-up.`;
  } else if (familyMatch && familyMatch.fitment === 'variant_bellhousing') {
    isDirectBoltOn = true;
    adapterRequired = `Variant ${activeBellhousing} Case / Bellhousing Required`;
    bellhousing = `${activeBellhousing} Specific Bellhousing Case`;
    hardwareNotes = familyMatch.notes;
  } else if (
    activeBellhousing === 'GM_LS_Modular' &&
    (trans.nativePattern === 'GM_Chevy_V8' || trans.nativePattern === 'GM_Dual_BOP_Chevy')
  ) {
    isDirectBoltOn = false;
    adapterRequired = '5/6-Bolt Shared Pattern + 0.400" LS Crank Snout Spacer (for TH350/TH400)';
    bellhousing = 'GM LS-to-SBC Shared Bellhousing (12 o-clock bolt omitted)';
    hardwareNotes = familyMatch?.notes || 'Bolts with 5 of 6 bellhousing bolts; use dished flexplate + crank pilot spacer for pre-LS automatics.';
  } else if (trans.id === 'zf_8hp70_universal') {
    adapterRequired = `8HP-to-${activeBellhousing} Billet Adapter Plate + Standalone TCU`;
    bellhousing = 'Billet 6061-T6 Adapter Plate';
    hardwareNotes = familyMatch?.notes || 'Requires standalone TCU controller and crank hub spacer.';
  } else {
    adapterRequired = familyMatch?.notes || `Aftermarket ${activeBellhousing}-to-${trans.nativePattern} Swap Bellhousing / Adapter`;
    bellhousing = `Swap Bellhousing (${activeBellhousing} → ${trans.nativePattern})`;
    hardwareNotes = activeFamily?.bellhousingNotes || 'Verify starter pocket, crank imbalance/flexplate tooth count, and pilot bearing depth.';
  }

  const compatibility: CompatibilityReport = {
    isDirectBoltOn,
    adapterRequired,
    hardwareNotes,
    bellhousing,
    tunnelClearance
  };

  return {
    displacementCi,
    displacementL,
    cylinderCc: singleCylinderCc,
    deckVolumeCc,
    gasketVolumeCc,
    totalClearanceCc,
    quenchDistance,
    quenchStatus,
    staticCR,
    dynamicCR,
    rodStrokeRatio,
    maxRodAngleDeg,
    meanPistonSpeed6000,
    totalValveLift,
    topRingGap,
    secondRingGap,
    oilRingGap,
    ptwClearance,
    peakCfmDemand,
    effectiveCarbCfm,
    carbSizingStatus,
    intakeFlowPeakCfm,
    exhaustFlowPeakCfm,
    eiFlowRatioPct,
    intakeVelocityFps,
    portModHpDelta,
    portModTqDelta,
    dynamicHeadFlowBench,
    peakHp,
    peakTq,
    hpPeakRpm,
    tqPeakRpm,
    bsfcLbHr,
    fuelGph,
    knockRisk: isCustomOrSbcBaseline
      ? ignitionTiming > 38
      : ignitionTiming > Math.max(38, activeFamily!.inductionBaseline.ignitionTiming + 6),
    camData: cam,
    intakeData: intake,
    dynoCurve,
    speedInGearTable,
    compatibility
  };
}
