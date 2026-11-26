/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  CamProfileId,
  CoordinatedSpecs,
  EngineConfig,
  InductionDressMode,
  PistonAlloy,
  RingApplication
} from '../types/engine';
import {
  CAM_PROFILES,
  INTAKE_MANIFOLDS,
  RAY_BASELINE_CONFIG,
  TRANSMISSIONS_DB
} from '../data/engineData';
import { calculateCoordinatedSpecs } from '../services/coordinationEngine';
import { BrandEngineSelector } from './BrandEngineSelector';
import {
  Sliders,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Gauge,
  Flame,
  Car,
  Layers
} from 'lucide-react';

interface TabEngConfigProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  onUpdateConfig: (newConfig: Partial<EngineConfig>) => void;
}

interface ValidationErrors {
  [key: string]: string;
}

function validateDraft(draft: EngineConfig): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!Number.isFinite(draft.bore) || draft.bore < 1.5 || draft.bore > 6.5) {
    errors.bore = 'Bore must be between 1.500" and 6.500"';
  }
  if (!Number.isFinite(draft.stroke) || draft.stroke < 1.5 || draft.stroke > 6.5) {
    errors.stroke = 'Stroke must be between 1.500" and 6.500"';
  }
  if (!Number.isFinite(draft.rodLength) || draft.rodLength < 3.5 || draft.rodLength > 8.5) {
    errors.rodLength = 'Rod length must be between 3.500" and 8.500"';
  }
  if (!Number.isFinite(draft.deckHeight) || draft.deckHeight < 6.5 || draft.deckHeight > 14.0) {
    errors.deckHeight = 'Deck height must be between 6.500" and 14.000"';
  }
  if (
    !Number.isFinite(draft.deckClearance) ||
    draft.deckClearance < -0.02 ||
    draft.deckClearance > 0.2
  ) {
    errors.deckClearance = 'Deck clearance must be between -0.020" and 0.200"';
  }
  if (
    !Number.isFinite(draft.gasketThickness) ||
    draft.gasketThickness < 0.01 ||
    draft.gasketThickness > 0.15
  ) {
    errors.gasketThickness = 'Gasket thickness must be between 0.010" and 0.150"';
  }
  if (!Number.isFinite(draft.chamberCc) || draft.chamberCc < 15 || draft.chamberCc > 160) {
    errors.chamberCc = 'Chamber volume must be between 15.0 and 160.0 cc';
  }
  if (
    !Number.isFinite(draft.pistonReliefCc) ||
    draft.pistonReliefCc < -30 ||
    draft.pistonReliefCc > 50
  ) {
    errors.pistonReliefCc = 'Piston relief/dome must be between -30.0 and 50.0 cc';
  }
  if (!Number.isFinite(draft.carbCfm) || draft.carbCfm < 150 || draft.carbCfm > 1800) {
    errors.carbCfm = 'Airflow CFM must be between 150 and 1800';
  }
  if (!Number.isFinite(draft.targetAFR) || draft.targetAFR < 9.5 || draft.targetAFR > 19.5) {
    errors.targetAFR = 'Target AFR must be between 9.5 and 19.5';
  }
  if (
    !Number.isFinite(draft.ignitionTiming) ||
    draft.ignitionTiming < 0 ||
    draft.ignitionTiming > 50
  ) {
    errors.ignitionTiming = 'Timing must be between 0° and 50° BTDC';
  }
  if (
    !Number.isFinite(draft.sparkPlugGap) ||
    draft.sparkPlugGap < 0.018 ||
    draft.sparkPlugGap > 0.07
  ) {
    errors.sparkPlugGap = 'Spark plug gap must be between 0.018" and 0.070"';
  }
  if (!Number.isFinite(draft.rearGear) || draft.rearGear < 2.2 || draft.rearGear > 6.5) {
    errors.rearGear = 'Rear gear ratio must be between 2.20 and 6.50';
  }
  if (
    !Number.isFinite(draft.tireDiameter) ||
    draft.tireDiameter < 20 ||
    draft.tireDiameter > 44
  ) {
    errors.tireDiameter = 'Tire diameter must be between 20.0" and 44.0"';
  }

  return errors;
}

export const TabEngConfig: React.FC<TabEngConfigProps> = ({
  config,
  specs,
  onUpdateConfig
}) => {
  const [draft, setDraft] = useState<EngineConfig>(config);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  // Sync draft whenever config updates from BrandEngineSelector or other tabs
  useEffect(() => {
    setDraft(config);
  }, [config]);

  const errors = useMemo(() => validateDraft(draft), [draft]);
  const errorCount = Object.keys(errors).length;

  const previewSpecs = useMemo(() => {
    if (errorCount > 0) return specs;
    return calculateCoordinatedSpecs(draft);
  }, [draft, errorCount, specs]);

  const isDirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(config);
  }, [draft, config]);

  const updateField = <K extends keyof EngineConfig>(key: K, value: EngineConfig[K]) => {
    setAppliedNotice(null);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleNumberChange = (key: keyof EngineConfig, raw: string) => {
    const parsed = parseFloat(raw);
    updateField(key, (Number.isNaN(parsed) ? 0 : parsed) as EngineConfig[typeof key]);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (errorCount > 0) return;
    onUpdateConfig(draft);
    setAppliedNotice(
      `Applied ${previewSpecs.displacementCi} CID (${previewSpecs.staticCR}:1 CR, ${previewSpecs.peakHp} HP) to active simulation & 3D assembly.`
    );
  };

  const handleResetBaseline = () => {
    setDraft(RAY_BASELINE_CONFIG);
    onUpdateConfig({
      ...RAY_BASELINE_CONFIG,
      engineFamilyId: 'gm_sbc_350',
      firingOrder: '1-8-4-3-6-5-7-2',
      bellhousingPattern: 'GM_Chevy_V8',
      inductionDress: 'carb_hei'
    });
    setAppliedNotice("Restored Ray's confirmed SBC 350 baseline configuration.");
  };

  const quenchOk = previewSpecs.quenchDistance >= 0.038 && previewSpecs.quenchDistance <= 0.055;

  return (
    <div className="p-4 sm:p-6 max-w-[1440px] mx-auto w-full space-y-5 text-xs text-slate-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-orange-400" />
            <span>Engineering Config &amp; Multi-Brand Powertrain Builder</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Load OEM factory engine families by vehicle &amp; year or dial in custom blueprint tolerances before committing to live MODSIM calculations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetBaseline}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-[#12161c] hover:border-orange-500 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
            <span>Reset Ray&apos;s SBC 350</span>
          </button>
        </div>
      </div>

      {/* Embedded Multi-Brand Vehicle & Engine Selector */}
      <BrandEngineSelector
        config={config}
        specs={specs}
        onUpdateConfig={onUpdateConfig}
      />

      {/* Consolidated Engineering Configuration Form + Live Preview */}
      <form onSubmit={handleApply} className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left 8 Columns: Validated Blueprint Inputs */}
        <div className="xl:col-span-8 space-y-4">
          {/* Block & Rotating Geometry */}
          <div className="bg-[#12161c] border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Cylinder Block, Rotating &amp; Chamber Geometry</span>
              </h3>
              <span className="font-mono text-[11px] text-slate-400">
                Validated Imperial / CC Inputs
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Cylinder Bore (1.500&quot; – 6.500&quot;)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={draft.bore}
                  onChange={(e) => handleNumberChange('bore', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
                {errors.bore && <p className="text-[10px] text-red-400">{errors.bore}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Crank Stroke (1.500&quot; – 6.500&quot;)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={draft.stroke}
                  onChange={(e) => handleNumberChange('stroke', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
                {errors.stroke && <p className="text-[10px] text-red-400">{errors.stroke}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Cylinders / Rotors
                </label>
                <select
                  value={draft.cylinders ?? 8}
                  onChange={(e) => updateField('cylinders', Number(e.target.value))}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                >
                  <option value={8}>8 Cylinders (V8)</option>
                  <option value={6}>6 Cylinders (V6 / VR6 / I6 / Boxer H6)</option>
                  <option value={4}>4 Cylinders (I4 / Boxer H4)</option>
                  <option value={3}>3 Cylinders (I3)</option>
                  <option value={5}>5 Cylinders (I5)</option>
                  <option value={10}>10 Cylinders (V10)</option>
                  <option value={12}>12 Cylinders (V12 / W12)</option>
                  <option value={2}>2 Rotors (Wankel Rotary)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Rod Length (3.500&quot; – 8.500&quot;)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={draft.rodLength}
                  onChange={(e) => handleNumberChange('rodLength', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
                {errors.rodLength && <p className="text-[10px] text-red-400">{errors.rodLength}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Block Deck Height (6.500&quot; – 14.000&quot;)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={draft.deckHeight}
                  onChange={(e) => handleNumberChange('deckHeight', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
                {errors.deckHeight && <p className="text-[10px] text-red-400">{errors.deckHeight}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Deck Clearance (-0.020&quot; – 0.200&quot;)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={draft.deckClearance}
                  onChange={(e) => handleNumberChange('deckClearance', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
                {errors.deckClearance && (
                  <p className="text-[10px] text-red-400">{errors.deckClearance}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Head Gasket (0.010&quot; – 0.150&quot;)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={draft.gasketThickness}
                  onChange={(e) => handleNumberChange('gasketThickness', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
                {errors.gasketThickness && (
                  <p className="text-[10px] text-red-400">{errors.gasketThickness}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Head Chamber (15.0 – 160.0 cc)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={draft.chamberCc}
                  onChange={(e) => handleNumberChange('chamberCc', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
                {errors.chamberCc && <p className="text-[10px] text-red-400">{errors.chamberCc}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Piston Dish/Dome (-30 – +50 cc)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={draft.pistonReliefCc}
                  onChange={(e) => handleNumberChange('pistonReliefCc', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
                {errors.pistonReliefCc && (
                  <p className="text-[10px] text-red-400">{errors.pistonReliefCc}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Piston Alloy
                </label>
                <select
                  value={draft.pistonAlloy}
                  onChange={(e) => updateField('pistonAlloy', e.target.value as PistonAlloy)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-white outline-none"
                >
                  <option value="4032">4032 Forged Street/Strip</option>
                  <option value="2618">2618 Forged Race / Boost</option>
                  <option value="hypereutectic">Hypereutectic OEM / Street</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Ring Gap Application
                </label>
                <select
                  value={draft.ringApplication}
                  onChange={(e) => updateField('ringApplication', e.target.value as RingApplication)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-white outline-none"
                >
                  <option value="street">Naturally Aspirated Street (.0045&quot;/in)</option>
                  <option value="street_strip">Street / Strip Perf (.0050&quot;/in)</option>
                  <option value="nitrous">Boost / Nitrous Severe (.0065&quot;/in)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Firing Order
                </label>
                <input
                  type="text"
                  value={draft.firingOrder || '1-8-4-3-6-5-7-2'}
                  onChange={(e) => updateField('firingOrder', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Valvetrain, Induction & Ignition */}
          <div className="bg-[#12161c] border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>Valvetrain, Induction &amp; Ignition Calibration</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Camshaft Profile Tier
                </label>
                <select
                  value={draft.camProfile}
                  onChange={(e) => updateField('camProfile', e.target.value as CamProfileId)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-white outline-none"
                >
                  {Object.values(CAM_PROFILES).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Rocker Arm Ratio
                </label>
                <select
                  value={draft.rockerRatio}
                  onChange={(e) => updateField('rockerRatio', Number(e.target.value))}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                >
                  {[1.0, 1.5, 1.55, 1.6, 1.65, 1.7, 1.73, 1.8, 1.81, 2.0].map((r) => (
                    <option key={r} value={r}>
                      {r === 1.0 ? '1.0:1 (DOHC Direct Bucket)' : `${r}:1`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Intake Manifold Architecture
                </label>
                <select
                  value={draft.selectedIntake}
                  onChange={(e) => updateField('selectedIntake', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-white outline-none"
                >
                  {INTAKE_MANIFOLDS.map((im) => (
                    <option key={im.id} value={im.id}>
                      {im.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Fuel / Ignition System Dress
                </label>
                <select
                  value={draft.inductionDress || 'carb_hei'}
                  onChange={(e) =>
                    updateField('inductionDress', e.target.value as InductionDressMode)
                  }
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-white outline-none"
                >
                  <option value="carb_hei">Carburetor + Distributor / HEI</option>
                  <option value="mpfi_cnp">Multi-Port EFI + Coil-Near-Plug</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Carburetor / TB Style
                </label>
                <select
                  value={draft.carbStyle || '4150_dp'}
                  onChange={(e) => updateField('carbStyle', e.target.value as EngineConfig['carbStyle'])}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-white outline-none"
                >
                  <option value="2bbl">2-BBL Economizer (2300)</option>
                  <option value="4150_dp">4150 Double Pumper</option>
                  <option value="4500_dominator">4500 Dominator Race</option>
                  <option value="dual_quad">Dual-Quad Twin 4-BBL</option>
                  <option value="mpfi_tb">4-BBL Billet EFI TB</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Carburetor / Throttle Body CFM
                </label>
                <input
                  type="number"
                  step="10"
                  value={draft.carbCfm}
                  onChange={(e) => handleNumberChange('carbCfm', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
                {errors.carbCfm && <p className="text-[10px] text-red-400">{errors.carbCfm}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Venturi Bore / Air Scoop (in / CFM)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    step="0.0125"
                    value={draft.carbVenturiIn ?? 1.375}
                    onChange={(e) => handleNumberChange('carbVenturiIn', e.target.value)}
                    className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-2 py-2 font-mono text-white outline-none"
                    title="Primary Venturi Bore (inches)"
                  />
                  <input
                    type="number"
                    step="5"
                    value={draft.airFilterCfmBonus ?? 15}
                    onChange={(e) => handleNumberChange('airFilterCfmBonus', e.target.value)}
                    className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-2 py-2 font-mono text-white outline-none"
                    title="Air Cleaner / Scoop CFM Bonus"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Intake Port (cc) &amp; Valve (in)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    step="5"
                    value={draft.intakePortCc ?? 185}
                    onChange={(e) => handleNumberChange('intakePortCc', e.target.value)}
                    className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-2 py-2 font-mono text-white outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={draft.intakeValveIn ?? 2.02}
                    onChange={(e) => handleNumberChange('intakeValveIn', e.target.value)}
                    className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-2 py-2 font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Exhaust Port (cc) &amp; Shape
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    step="2"
                    value={draft.exhaustPortCc ?? 68}
                    onChange={(e) => handleNumberChange('exhaustPortCc', e.target.value)}
                    className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-2 py-2 font-mono text-white outline-none"
                  />
                  <select
                    value={draft.exhaustPortShape || 'd_port'}
                    onChange={(e) =>
                      updateField('exhaustPortShape', e.target.value as EngineConfig['exhaustPortShape'])
                    }
                    className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-2 py-2 text-white outline-none text-[11px]"
                  >
                    <option value="oval_stock">OEM Oval</option>
                    <option value="d_port">CNC D-Port</option>
                    <option value="raised_runner">Raised Square</option>
                    <option value="cnc_race">CNC Race</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Exhaust Valve &amp; Header Primary
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    step="0.025"
                    value={draft.exhaustValveIn ?? 1.60}
                    onChange={(e) => handleNumberChange('exhaustValveIn', e.target.value)}
                    className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-2 py-2 font-mono text-white outline-none"
                  />
                  <input
                    type="number"
                    step="0.125"
                    value={draft.headerPrimaryIn ?? 1.625}
                    onChange={(e) => handleNumberChange('headerPrimaryIn', e.target.value)}
                    className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-2 py-2 font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Target WOT Air-Fuel Ratio
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={draft.targetAFR}
                  onChange={(e) => handleNumberChange('targetAFR', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
                {errors.targetAFR && <p className="text-[10px] text-red-400">{errors.targetAFR}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Total Ignition Timing (° BTDC)
                </label>
                <input
                  type="number"
                  step="1"
                  value={draft.ignitionTiming}
                  onChange={(e) => handleNumberChange('ignitionTiming', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
                {errors.ignitionTiming && (
                  <p className="text-[10px] text-red-400">{errors.ignitionTiming}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Spark Plug Gap (inches)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={draft.sparkPlugGap}
                  onChange={(e) => handleNumberChange('sparkPlugGap', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
                {errors.sparkPlugGap && (
                  <p className="text-[10px] text-red-400">{errors.sparkPlugGap}</p>
                )}
              </div>
            </div>
          </div>

          {/* Driveline & Chassis Pairing */}
          <div className="bg-[#12161c] border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-400" />
                <span>Transmission, Bellhousing &amp; Rear Driveline</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-300">
                  Transmission Unit
                </label>
                <select
                  value={draft.selectedTrans}
                  onChange={(e) => {
                    const trans = TRANSMISSIONS_DB[e.target.value];
                    setDraft((prev) => ({
                      ...prev,
                      selectedTrans: e.target.value,
                      stallSpeed: trans ? trans.defaultStall : prev.stallSpeed
                    }));
                    setAppliedNotice(null);
                  }}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-white outline-none"
                >
                  {Object.values(TRANSMISSIONS_DB).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Converter Stall (RPM)
                </label>
                <input
                  type="number"
                  step="100"
                  value={draft.stallSpeed}
                  onChange={(e) => handleNumberChange('stallSpeed', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Bellhousing Pattern
                </label>
                <input
                  type="text"
                  value={draft.bellhousingPattern || 'GM_Chevy_V8'}
                  onChange={(e) => updateField('bellhousingPattern', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Rear Axle Gear Ratio
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={draft.rearGear}
                  onChange={(e) => handleNumberChange('rearGear', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
                {errors.rearGear && <p className="text-[10px] text-red-400">{errors.rearGear}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Rear Tire Diameter (in)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={draft.tireDiameter}
                  onChange={(e) => handleNumberChange('tireDiameter', e.target.value)}
                  className="w-full bg-[#0d1014] border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 font-mono text-white outline-none"
                />
                {errors.tireDiameter && (
                  <p className="text-[10px] text-red-400">{errors.tireDiameter}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Live Computed Readout & Apply Actions */}
        <aside className="xl:col-span-4 bg-[#12161c] border border-slate-800 rounded-xl p-4 space-y-4 sticky top-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span>Live MODSIM Preview</span>
            </h3>
            {isDirty ? (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300">
                Staged Edits
              </span>
            ) : (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                Synced
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-lg bg-[#0d1014] border border-slate-800">
              <div className="text-[10px] text-slate-400">Displacement</div>
              <div className="font-mono text-base font-bold text-cyan-300 tabular-nums">
                {previewSpecs.displacementCi} CID
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                {previewSpecs.displacementL} Liters
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0d1014] border border-slate-800">
              <div className="text-[10px] text-slate-400">Compression Ratio</div>
              <div className="font-mono text-base font-bold text-amber-300 tabular-nums">
                {previewSpecs.staticCR}:1 SCR
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                {previewSpecs.dynamicCR}:1 Dynamic
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0d1014] border border-slate-800">
              <div className="text-[10px] text-slate-400">Peak Power</div>
              <div className="font-mono text-base font-bold text-orange-400 tabular-nums">
                {previewSpecs.peakHp} HP
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                @ {previewSpecs.hpPeakRpm} RPM
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0d1014] border border-slate-800">
              <div className="text-[10px] text-slate-400">Peak Torque</div>
              <div className="font-mono text-base font-bold text-emerald-400 tabular-nums">
                {previewSpecs.peakTq} lb-ft
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                @ {previewSpecs.tqPeakRpm} RPM
              </div>
            </div>
          </div>

          <div className="bg-[#0d1014] border border-slate-800 rounded-lg divide-y divide-slate-800/80 text-[11px]">
            <div className="px-3 py-2 flex justify-between gap-2">
              <span className="text-slate-400">Quench Clearance</span>
              <span className={`font-mono font-semibold ${quenchOk ? 'text-emerald-400' : 'text-amber-300'}`}>
                {previewSpecs.quenchDistance}&quot;
              </span>
            </div>
            <div className="px-3 py-2 flex justify-between gap-2">
              <span className="text-slate-400">Rod / Stroke Ratio</span>
              <span className="font-mono text-white">
                {previewSpecs.rodStrokeRatio}:1 ({previewSpecs.maxRodAngleDeg}°)
              </span>
            </div>
            <div className="px-3 py-2 flex justify-between gap-2">
              <span className="text-slate-400">Net Valve Lift</span>
              <span className="font-mono text-cyan-300">{previewSpecs.totalValveLift}&quot;</span>
            </div>
            <div className="px-3 py-2 flex justify-between gap-2">
              <span className="text-slate-400">Airflow Demand</span>
              <span className="font-mono text-white">{previewSpecs.peakCfmDemand} CFM</span>
            </div>
            <div className="px-3 py-2 flex justify-between gap-2">
              <span className="text-slate-400">Ring Gaps (Top / 2nd)</span>
              <span className="font-mono text-slate-200">
                {previewSpecs.topRingGap}&quot; / {previewSpecs.secondRingGap}&quot;
              </span>
            </div>
            <div className="px-3 py-2 space-y-0.5">
              <div className="text-slate-400">Bellhousing &amp; Fitment</div>
              <div className={`font-mono font-semibold ${previewSpecs.compatibility.isDirectBoltOn ? 'text-emerald-400' : 'text-amber-300'}`}>
                {previewSpecs.compatibility.bellhousing}
              </div>
              <div className="text-[10px] text-slate-400">
                {previewSpecs.compatibility.adapterRequired}
              </div>
            </div>
          </div>

          {errorCount > 0 && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/50 text-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>Fix {errorCount} out-of-range field{errorCount > 1 ? 's' : ''} before applying.</span>
            </div>
          )}

          {appliedNotice && (
            <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{appliedNotice}</span>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={errorCount > 0}
              className="w-full px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-45 text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Engineering Config</span>
            </button>
            <button
              type="button"
              onClick={handleResetBaseline}
              className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-[#0d1014] hover:border-slate-500 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Ray&apos;s Baseline</span>
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
};
