/**
 * Quantum Aerospace Room 2: Sketch & Build
 * Parametric 2D Profiles, Thickness, Bolt Circles, Holes, Slots, Materials, Tiers, and Build 3D Part
 */
import React, { useState } from 'react';
import {
  MATERIALS,
  FABRICATION_TIERS,
  INDUSTRY_CATALOG,
  REFERENCE_SPECS,
  formatDimension,
  formatTolerance,
} from '../engine/standards';
import { ParametricPartConfig, evaluateDfm } from '../engine/cadEngine';
import {
  Wrench,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Shield,
  Box,
} from 'lucide-react';

interface SketchBuildRoomProps {
  config: ParametricPartConfig;
  displayMetric: boolean;
  onConfigChange: (newConfig: ParametricPartConfig) => void;
  onBuildPart: () => void;
  onNavigateToInspect: () => void;
}

export const SketchBuildRoom: React.FC<SketchBuildRoomProps> = ({
  config,
  displayMetric,
  onConfigChange,
  onBuildPart,
  onNavigateToInspect,
}) => {
  const [showAdvancedRules, setShowAdvancedRules] = useState(false);
  const [showEngineSpecs, setShowEngineSpecs] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState('automotive_motorsports');

  const dfm = evaluateDfm(config);
  const selectedMaterial = MATERIALS[config.materialName] || MATERIALS['6061-T6 Aluminum'];
  const selectedTier = FABRICATION_TIERS[config.tierId] || FABRICATION_TIERS.tier2_jobshop;

  // Preset Part Templates
  const handleSelectPreset = (presetName: string) => {
    if (presetName === 'camless_flange') {
      onConfigChange({
        ...config,
        name: 'SBC 350 Camless Flange Plate',
        subsystem: 'Cylinder Head',
        widthIn: 19.685, // 500 mm head length
        heightIn: 4.4, // bore spacing width
        thicknessIn: 0.625, // flange thickness
        cornerRadiusIn: 0.375,
        hasCornerHoles: true,
        cornerHoleDiaIn: 0.4375, // 7/16-14 head bolt clearance
        cornerHoleMarginIn: 0.75,
        hasBoltCircle: false,
        boltCircleCount: 17,
        boltCirclePcdIn: 4.4,
        boltCircleHoleDiaIn: 0.4375,
        hasCenterSlot: true,
        slotLengthIn: 2.5,
        slotWidthIn: 1.25,
        materialName: '6061-T6 Aluminum',
        tierId: 'tier2_jobshop',
      });
    } else if (presetName === 'water_neck') {
      onConfigChange({
        ...config,
        name: 'SBC 350 Thermostat Water Neck',
        subsystem: 'Cooling Crossover',
        widthIn: 4.25,
        heightIn: 3.5,
        thicknessIn: 0.5,
        cornerRadiusIn: 0.5,
        hasCornerHoles: true,
        cornerHoleDiaIn: 0.375,
        cornerHoleMarginIn: 0.5,
        hasBoltCircle: true,
        boltCircleCount: 2,
        boltCirclePcdIn: 3.25,
        boltCircleHoleDiaIn: 0.375,
        hasCenterSlot: false,
        materialName: '6061-T6 Aluminum',
        tierId: 'tier2_jobshop',
      });
    } else if (presetName === 'intake_runner_plate') {
      onConfigChange({
        ...config,
        name: 'SBC 350 MPFI Intake Runner Flange',
        subsystem: 'Intake Plenum',
        widthIn: 18.5,
        heightIn: 3.75,
        thicknessIn: 0.5,
        cornerRadiusIn: 0.25,
        hasCornerHoles: true,
        cornerHoleDiaIn: 0.375,
        cornerHoleMarginIn: 0.5,
        hasBoltCircle: false,
        hasCenterSlot: true,
        slotLengthIn: 2.0,
        slotWidthIn: 1.5,
        materialName: '7075-T6 Aluminum',
        tierId: 'tier3_precision',
      });
    }
  };

  return (
    <div className="flex flex-col space-y-5 p-5 text-slate-200">
      {/* Room Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-sky-400" />
            <span>SKETCH &amp; BUILD 3D PART</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Parametric Profiles, Bolt Circles, Cutouts, Material Specs &amp; DFM Verification
          </p>
        </div>

        {/* PRIMARY ACTION BUTTON */}
        <button
          onClick={() => {
            onBuildPart();
            onNavigateToInspect();
          }}
          className="flex items-center space-x-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-mono text-sm font-bold transition-all shadow-lg shadow-sky-900/30 active:scale-95"
        >
          <Box className="w-4 h-4" />
          <span>BUILD 3D PART</span>
        </button>
      </div>

      {/* Everyday Choices (Top Section) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Col: Presets & Geometry Dimensions (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Quick Presets */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
            <label className="text-xs font-mono font-semibold text-slate-300 block mb-2">
              SBC 350 PART PRESETS
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <button
                onClick={() => handleSelectPreset('camless_flange')}
                className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-sky-500 transition-colors text-left"
              >
                <div className="font-bold text-sky-400 truncate">Camless Flange</div>
                <div className="text-[10px] text-slate-400">500mm Head Plate</div>
              </button>
              <button
                onClick={() => handleSelectPreset('water_neck')}
                className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-sky-500 transition-colors text-left"
              >
                <div className="font-bold text-sky-400 truncate">Water Neck</div>
                <div className="text-[10px] text-slate-400">Thermostat Mount</div>
              </button>
              <button
                onClick={() => handleSelectPreset('intake_runner_plate')}
                className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-sky-500 transition-colors text-left"
              >
                <div className="font-bold text-sky-400 truncate">Intake Runner</div>
                <div className="text-[10px] text-slate-400">MPFI Port Flange</div>
              </button>
            </div>
          </div>

          {/* Core Dimensions */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase">
                ENVELOPE &amp; THICKNESS
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Units: {displayMetric ? 'Millimeters (Display)' : 'Inches (Internal)'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-mono">
              {/* Width */}
              <div>
                <label className="text-slate-400 block mb-1">
                  Length / Width ({displayMetric ? 'mm' : 'in'})
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={displayMetric ? +(config.widthIn * 25.4).toFixed(1) : config.widthIn}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 1;
                    onConfigChange({
                      ...config,
                      widthIn: displayMetric ? val / 25.4 : val,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* Height */}
              <div>
                <label className="text-slate-400 block mb-1">
                  Height / Span ({displayMetric ? 'mm' : 'in'})
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={displayMetric ? +(config.heightIn * 25.4).toFixed(1) : config.heightIn}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 1;
                    onConfigChange({
                      ...config,
                      heightIn: displayMetric ? val / 25.4 : val,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* Thickness */}
              <div>
                <label className="text-slate-400 block mb-1">
                  Thickness ({displayMetric ? 'mm' : 'in'})
                </label>
                <input
                  type="number"
                  step="0.025"
                  value={displayMetric ? +(config.thicknessIn * 25.4).toFixed(2) : config.thicknessIn}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0.1;
                    onConfigChange({
                      ...config,
                      thicknessIn: displayMetric ? val / 25.4 : val,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Parametric Features (Holes, Bolt Circle, Slots) */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
            <span className="text-xs font-mono font-bold text-sky-400 uppercase block border-b border-slate-800 pb-2">
              PARAMETRIC CUTOUT FEATURES
            </span>

            {/* Corner Holes */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded text-xs font-mono space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.hasCornerHoles}
                    onChange={(e) => onConfigChange({ ...config, hasCornerHoles: e.target.checked })}
                    className="accent-sky-500 rounded"
                  />
                  <span className="font-semibold text-slate-200">Corner Mounting Holes (4x)</span>
                </label>
                <span className="text-slate-500 text-[10px]">Perimeter array</span>
              </div>
              {config.hasCornerHoles && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-slate-400 text-[11px] block">Hole Diameter (in)</label>
                    <input
                      type="number"
                      step="0.03125"
                      value={config.cornerHoleDiaIn}
                      onChange={(e) =>
                        onConfigChange({ ...config, cornerHoleDiaIn: parseFloat(e.target.value) || 0.25 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block">Corner Margin (in)</label>
                    <input
                      type="number"
                      step="0.0625"
                      value={config.cornerHoleMarginIn}
                      onChange={(e) =>
                        onConfigChange({ ...config, cornerHoleMarginIn: parseFloat(e.target.value) || 0.5 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bolt Circle */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded text-xs font-mono space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.hasBoltCircle}
                    onChange={(e) => onConfigChange({ ...config, hasBoltCircle: e.target.checked })}
                    className="accent-sky-500 rounded"
                  />
                  <span className="font-semibold text-slate-200">Pitch Circle Diameter (PCD) Bolt Array</span>
                </label>
                <span className="text-slate-500 text-[10px]">Radial pattern</span>
              </div>
              {config.hasBoltCircle && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="text-slate-400 text-[11px] block">Bolt Count</label>
                    <input
                      type="number"
                      value={config.boltCircleCount}
                      onChange={(e) =>
                        onConfigChange({ ...config, boltCircleCount: parseInt(e.target.value) || 6 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block">PCD Dia (in)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.boltCirclePcdIn}
                      onChange={(e) =>
                        onConfigChange({ ...config, boltCirclePcdIn: parseFloat(e.target.value) || 3.0 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block">Hole Dia (in)</label>
                    <input
                      type="number"
                      step="0.03125"
                      value={config.boltCircleHoleDiaIn}
                      onChange={(e) =>
                        onConfigChange({ ...config, boltCircleHoleDiaIn: parseFloat(e.target.value) || 0.375 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Center Oblong Slot */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded text-xs font-mono space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.hasCenterSlot}
                    onChange={(e) => onConfigChange({ ...config, hasCenterSlot: e.target.checked })}
                    className="accent-sky-500 rounded"
                  />
                  <span className="font-semibold text-slate-200">Center Port Oblong Slot</span>
                </label>
                <span className="text-slate-500 text-[10px]">Coolant / Runner cutout</span>
              </div>
              {config.hasCenterSlot && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-slate-400 text-[11px] block">Slot Length (in)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.slotLengthIn}
                      onChange={(e) =>
                        onConfigChange({ ...config, slotLengthIn: parseFloat(e.target.value) || 2.0 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block">Slot Width (in)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={config.slotWidthIn}
                      onChange={(e) =>
                        onConfigChange({ ...config, slotWidthIn: parseFloat(e.target.value) || 1.0 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Material, Tier & DFM Analysis (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Material Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase">MATERIAL SELECTION</span>
              {selectedMaterial.densityVerified ? (
                <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-600/50 rounded text-[9px] font-mono font-bold">
                  ASM VERIFIED
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-amber-950 text-amber-400 border border-dashed border-amber-600/60 rounded text-[9px] font-mono font-bold">
                  NEEDING RAY'S MEASUREMENT
                </span>
              )}
            </div>

            <select
              value={config.materialName}
              onChange={(e) => onConfigChange({ ...config, materialName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 text-xs font-mono focus:border-sky-500 focus:outline-none"
            >
              {Object.keys(MATERIALS).map((mat) => (
                <option key={mat} value={mat}>
                  {mat} ({MATERIALS[mat].category})
                </option>
              ))}
            </select>

            <div className="text-[11px] font-mono text-slate-400 space-y-1 pt-1 bg-slate-950/60 p-2.5 rounded border border-slate-800">
              <div className="flex justify-between">
                <span>Density:</span>
                <strong className="text-slate-200">
                  {selectedMaterial.densityLbPerIn3.toFixed(4)} lb/in³
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Estimated Cost:</span>
                <strong className="text-slate-200">${selectedMaterial.costPerLbUsd.toFixed(2)} / lb</strong>
              </div>
              <div className="flex justify-between">
                <span>K-Factor (Bend):</span>
                <strong className="text-slate-200">{selectedMaterial.kFactor}</strong>
              </div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800 truncate">
                Source: {selectedMaterial.densitySource}
              </div>
            </div>
          </div>

          {/* Fabrication Tier Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <span className="text-xs font-mono font-bold text-sky-400 uppercase block border-b border-slate-800 pb-2">
              FABRICATION TIER PRESET
            </span>

            <div className="space-y-2">
              {Object.values(FABRICATION_TIERS).map((tier) => (
                <label
                  key={tier.id}
                  className={`flex items-start space-x-2 p-2 rounded border cursor-pointer text-xs font-mono transition-colors ${
                    config.tierId === tier.id
                      ? 'bg-sky-950/40 border-sky-600 text-sky-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="fabricationTier"
                    value={tier.id}
                    checked={config.tierId === tier.id}
                    onChange={(e) => onConfigChange({ ...config, tierId: e.target.value })}
                    className="mt-0.5 accent-sky-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between font-bold text-slate-200 text-[11px]">
                      <span>{tier.label.split(':')[0]}</span>
                      <span className="text-sky-400">{formatTolerance(tier.toleranceIn, displayMetric)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Min Wall: {formatDimension(tier.minWallIn, displayMetric)} | Min Hole:{' '}
                      {formatDimension(tier.minHoleDiaIn, displayMetric)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* DFM Rule Check & Mass Properties */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase">DFM CHECK &amp; MASS</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  dfm.passed ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/50' : 'bg-red-950 text-red-400'
                }`}
              >
                {dfm.passed ? 'DFM PASS' : 'ISSUES DETECTED'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-slate-950/80 p-2.5 rounded border border-slate-800">
              <div>
                <div className="text-[10px] text-slate-400">Volume</div>
                <div className="font-bold text-slate-200">{dfm.estimatedVolumeIn3.toFixed(2)} in³</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Weight</div>
                <div className="font-bold text-sky-400">{dfm.estimatedWeightLb.toFixed(2)} lb</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Raw Mat.</div>
                <div className="font-bold text-slate-200">${dfm.estimatedRawMaterialCostUsd.toFixed(2)}</div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              {dfm.checks.map((c, i) => (
                <div
                  key={i}
                  className={`p-2 rounded border text-[11px] ${
                    c.status === 'PASS'
                      ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                      : c.status === 'WARNING'
                      ? 'bg-amber-950/20 border-amber-600/50 text-amber-200'
                      : c.status === 'NEEDING_MEASUREMENT'
                      ? 'bg-amber-950/30 border-dashed border-amber-600/60 text-amber-300'
                      : 'bg-red-950/30 border-red-600/50 text-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{c.ruleName}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                        c.status === 'PASS'
                          ? 'text-emerald-400'
                          : c.status === 'NEEDING_MEASUREMENT'
                          ? 'text-amber-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{c.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SBC 350 Engine Specs Collapsible Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowEngineSpecs(!showEngineSpecs)}
          className="w-full flex items-center justify-between p-3.5 bg-slate-900 hover:bg-slate-850 text-xs font-mono font-bold text-slate-300 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>SBC 350 ENGINE &amp; TRANSMISSION SPECIFICATIONS (BASELINE)</span>
          </div>
          {showEngineSpecs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showEngineSpecs && (
          <div className="p-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* OEM Baseline */}
            <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-400">{REFERENCE_SPECS.sbc_350_oem.label}</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-600/50 rounded font-bold">
                  VERIFIED
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>
                  Displacement: <strong>{REFERENCE_SPECS.sbc_350_oem.displacementCid} CID</strong>
                </div>
                <div>
                  Bore Spacing: <strong>{REFERENCE_SPECS.sbc_350_oem.boreSpacingIn}"</strong>
                </div>
                <div>
                  Carb Power: <strong>{REFERENCE_SPECS.sbc_350_oem.horsepowerCarb} HP / {REFERENCE_SPECS.sbc_350_oem.torqueCarbFtLb} TQ</strong>
                </div>
                <div>
                  Bore × Stroke: <strong>4.000" × 3.480"</strong>
                </div>
                <div>
                  Transmission: <strong>{REFERENCE_SPECS.sbc_350_oem.defaultTransmission}</strong>
                </div>
                <div>
                  Head Length: <strong>500 mm / 19.685"</strong>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                <strong>17 Head Bolts:</strong> {REFERENCE_SPECS.sbc_350_oem.stockBoltTorqueSpec} (Stock) | {REFERENCE_SPECS.sbc_350_oem.arpBoltTorqueSpec} (ARP)
              </div>
            </div>

            {/* MPFI Provisional & Camless Prototype */}
            <div className="p-3 bg-slate-950 rounded border border-dashed border-amber-600/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400">{REFERENCE_SPECS.sbc_350_camless.label}</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-amber-950 text-amber-400 border border-amber-600/50 rounded font-bold">
                  NEEDING RAY'S MEASUREMENT
                </span>
              </div>
              <div className="text-[11px] text-slate-300">
                MPFI Provisional:{' '}
                <strong className="text-amber-400">
                  {REFERENCE_SPECS.sbc_350_oem.horsepowerMpfiProvisional} HP / {REFERENCE_SPECS.sbc_350_oem.torqueMpfiProvisionalFtLb} TQ
                </strong>{' '}
                <span className="text-[9px] text-amber-500">(PROVISIONAL — UNVERIFIED)</span>
              </div>
              <div className="text-[10px] text-slate-400 leading-relaxed">
                {REFERENCE_SPECS.sbc_350_camless.editableDefaultsNote}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Preset & Industry Rules Collapsible Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowAdvancedRules(!showAdvancedRules)}
          className="w-full flex items-center justify-between p-3.5 bg-slate-900 hover:bg-slate-850 text-xs font-mono font-bold text-slate-300 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-sky-500" />
            <span>ADVANCED PRESETS &amp; INDUSTRY STANDARDS CATALOG</span>
          </div>
          {showAdvancedRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvancedRules && (
          <div className="p-4 border-t border-slate-800 space-y-3 text-xs font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {Object.values(INDUSTRY_CATALOG).map((catalog) => (
                <div
                  key={catalog.id}
                  onClick={() => {
                    setSelectedIndustry(catalog.id);
                    onConfigChange({
                      ...config,
                      materialName: catalog.defaultMaterial,
                      tierId: catalog.defaultTier,
                    });
                  }}
                  className={`p-2.5 rounded border cursor-pointer transition-colors ${
                    selectedIndustry === catalog.id
                      ? 'bg-sky-950/60 border-sky-500 text-sky-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-slate-200 text-[11px] truncate">{catalog.label.split('(')[0]}</div>
                  <div className="text-[10px] text-sky-400 mt-1">{catalog.defaultStandard}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Def: {catalog.defaultMaterial} ({catalog.defaultTier.split('_')[0]})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
