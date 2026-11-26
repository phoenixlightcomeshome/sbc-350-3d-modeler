/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EngineConfig,
  CoordinatedSpecs,
  PistonAlloy,
  RingApplication,
  PartsGradeTier,
  StoreEngineSpec,
  StorePartOption,
  StoreVehicleModel
} from '../types/engine';
import { AutoPartsStorePanel, ActiveStoreSelection } from './AutoPartsStorePanel';
import { SpecialModControlsStrip } from './SpecialModControlsStrip';
import { Cpu, Gauge } from 'lucide-react';

interface TabRotatingAssemblyProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  onUpdateConfig: (newConfig: Partial<EngineConfig>) => void;
  onResetRay: () => void;
  activeStoreSelection: ActiveStoreSelection | null;
  onApplyStoreEngine: (
    engine: StoreEngineSpec,
    vehicle: StoreVehicleModel | null,
    yearLabel: string,
    tier: PartsGradeTier,
    selectedParts: StorePartOption[]
  ) => void;
  onUpdateStoreParts: (parts: StorePartOption[], tier: PartsGradeTier) => void;
}

export const TabRotatingAssembly: React.FC<TabRotatingAssemblyProps> = ({
  config,
  specs,
  onUpdateConfig,
  onResetRay,
  activeStoreSelection,
  onApplyStoreEngine,
  onUpdateStoreParts
}) => {
  const presets = [
    { name: "Ray's Confirmed 350", bore: 4.000, stroke: 3.480, rod: 5.700, deck: 9.025, clr: 0.015, gskt: 0.039, chmb: 64.0 },
    { name: "383 Stroker (4.030 x 3.750)", bore: 4.030, stroke: 3.750, rod: 5.700, deck: 9.025, clr: 0.015, gskt: 0.039, chmb: 64.0 },
    { name: "Trans-Am 302 (4.000 x 3.000)", bore: 4.000, stroke: 3.000, rod: 5.700, deck: 9.025, clr: 0.010, gskt: 0.039, chmb: 64.0 },
    { name: "Chevy 327 (4.000 x 3.250)", bore: 4.000, stroke: 3.250, rod: 5.700, deck: 9.025, clr: 0.015, gskt: 0.039, chmb: 64.0 },
    { name: "Chevy 400 (4.125 x 3.750)", bore: 4.125, stroke: 3.750, rod: 5.565, deck: 9.025, clr: 0.020, gskt: 0.041, chmb: 76.0 }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 font-mono text-xs text-gray-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-700/80">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
            <Cpu className="w-5 h-5 text-orange-500" />
            BLOCK &amp; ROTATING ASSEMBLY KINEMATICS
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 font-sans">
            MODSIM engine geometry: Governs displacement, mean piston speed, rod angularity, and quench turbulence.
          </p>
        </div>

        {/* Displacement Badge */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-lg font-black text-cyan-400 font-mono">
              {specs.displacementCi} CID
            </div>
            <div className="text-[10px] text-gray-400 font-bold">{specs.displacementL} LITERS</div>
          </div>
          <button
            onClick={onResetRay}
            className="px-2.5 py-1.5 rounded text-[11px] font-bold border border-orange-500 bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white transition"
          >
            Reset Ray's Baseline
          </button>
        </div>
      </div>

      {/* Auto Parts Store Vehicle / Year / Make / Model / Engine Size & Pro-Grade Motor Parts Counter */}
      <AutoPartsStorePanel
        config={config}
        activeSelection={activeStoreSelection}
        onApplyStoreEngine={onApplyStoreEngine}
        onUpdateStoreParts={onUpdateStoreParts}
        onResetRay={onResetRay}
      />

      <SpecialModControlsStrip
        config={config}
        specs={specs}
        onUpdateConfig={onUpdateConfig}
        variant="compact"
      />

      {/* Quick Combination Presets */}
      <div className="flex flex-wrap items-center gap-2 bg-[#1a2026] p-2.5 rounded-xl border border-gray-800">
        <span className="text-[10px] font-bold text-amber-400 uppercase mr-1">SBC COMBINATION PRESETS:</span>
        {presets.map((p) => (
          <button
            key={p.name}
            onClick={() => {
              onUpdateConfig({
                bore: p.bore,
                stroke: p.stroke,
                rodLength: p.rod,
                deckHeight: p.deck,
                deckClearance: p.clr,
                gasketThickness: p.gskt,
                chamberCc: p.chmb,
                cylinders: 8
              });
            }}
            className={`px-2.5 py-1 rounded text-[11px] transition border ${
              config.bore === p.bore && config.stroke === p.stroke && config.rodLength === p.rod && (config.cylinders ?? 8) === 8
                ? 'bg-orange-600 border-orange-400 text-white font-bold'
                : 'bg-black/50 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Main Parameters Configuration Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Cylinder Bore */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-2 hover:border-gray-700 transition">
          <div className="flex justify-between items-center">
            <span className="text-slate-200 font-semibold">Cylinder Bore</span>
            <span className="text-orange-400 font-bold text-sm">{config.bore.toFixed(3)}"</span>
          </div>
          <input
            type="range"
            min={Math.min(3.900, config.bore)}
            max={Math.max(4.165, config.bore)}
            step="0.005"
            value={config.bore}
            onChange={(e) => onUpdateConfig({ bore: parseFloat(e.target.value) })}
            className="w-full accent-orange-500 cursor-pointer h-2 bg-gray-800 rounded"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-sans">
            <span>3.900" (Sleeved)</span>
            <span className="text-orange-400 font-bold">4.000" (Ray's Std)</span>
            <span>4.030" (.030" over)</span>
            <span>4.125" (400 SBC)</span>
          </div>
        </div>

        {/* 2. Crankshaft Stroke */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-2 hover:border-gray-700 transition">
          <div className="flex justify-between items-center">
            <span className="text-slate-200 font-semibold">Crankshaft Stroke</span>
            <span className="text-amber-400 font-bold text-sm">{config.stroke.toFixed(3)}"</span>
          </div>
          <input
            type="range"
            min={Math.min(3.000, config.stroke)}
            max={Math.max(4.000, config.stroke)}
            step="0.005"
            value={config.stroke}
            onChange={(e) => onUpdateConfig({ stroke: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-gray-800 rounded"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-sans">
            <span>3.000" (302)</span>
            <span>3.250" (327)</span>
            <span className="text-amber-400 font-bold">3.480" (Ray's 350)</span>
            <span>3.750" (383)</span>
          </div>
        </div>

        {/* 3. Connecting Rod Length (Ray's 5.700" Spec) */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-2 hover:border-gray-700 transition">
          <div className="flex justify-between items-center">
            <span className="text-slate-200 font-semibold">Connecting Rod Length</span>
            <span className="text-emerald-400 font-bold text-sm">{config.rodLength.toFixed(3)}"</span>
          </div>
          <input
            type="range"
            min={Math.min(5.565, config.rodLength)}
            max={Math.max(6.125, config.rodLength)}
            step="0.005"
            value={config.rodLength}
            onChange={(e) => onUpdateConfig({ rodLength: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer h-2 bg-gray-800 rounded"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-sans">
            <span>5.565" (Short 400)</span>
            <span className="text-emerald-400 font-bold">5.700" (Ray's Spec)</span>
            <span>6.000" (Long Rod)</span>
          </div>
        </div>

        {/* 4. Deck Height */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-2 hover:border-gray-700 transition">
          <div className="flex justify-between items-center">
            <span className="text-slate-200 font-semibold">Block Deck Height</span>
            <span className="text-cyan-400 font-bold text-sm">{config.deckHeight.toFixed(3)}"</span>
          </div>
          <input
            type="range"
            min={Math.min(9.000, config.deckHeight)}
            max={Math.max(9.050, config.deckHeight)}
            step="0.005"
            value={config.deckHeight}
            onChange={(e) => onUpdateConfig({ deckHeight: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer h-2 bg-gray-800 rounded"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-sans">
            <span>9.000" (Zero-Decked)</span>
            <span className="text-cyan-400 font-bold">9.025" (Ray's Factory Spec)</span>
          </div>
        </div>

        {/* 5. Deck Clearance (In the hole) */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-2 hover:border-gray-700 transition">
          <div className="flex justify-between items-center">
            <span className="text-slate-200 font-semibold">Deck Clearance (In-the-Hole)</span>
            <span className="text-purple-400 font-bold text-sm">{config.deckClearance.toFixed(3)}"</span>
          </div>
          <input
            type="range"
            min="0.000"
            max="0.035"
            step="0.001"
            value={config.deckClearance}
            onChange={(e) => onUpdateConfig({ deckClearance: parseFloat(e.target.value) })}
            className="w-full accent-purple-500 cursor-pointer h-2 bg-gray-800 rounded"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-sans">
            <span>0.000" (True Zero Deck)</span>
            <span className="text-purple-400 font-bold">0.015" (Ray's Spec)</span>
            <span>0.025" (Smog Era)</span>
          </div>
        </div>

        {/* 6. Compressed Head Gasket */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-2 hover:border-gray-700 transition">
          <div className="flex justify-between items-center">
            <span className="text-slate-200 font-semibold">Compressed Gasket Thickness</span>
            <span className="text-pink-400 font-bold text-sm">{config.gasketThickness.toFixed(3)}"</span>
          </div>
          <input
            type="range"
            min="0.020"
            max="0.055"
            step="0.001"
            value={config.gasketThickness}
            onChange={(e) => onUpdateConfig({ gasketThickness: parseFloat(e.target.value) })}
            className="w-full accent-pink-500 cursor-pointer h-2 bg-gray-800 rounded"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-sans">
            <span>0.028" (Steel Shim)</span>
            <span className="text-pink-400 font-bold">0.039" (Ray's Fel-Pro)</span>
            <span>0.041" (Standard)</span>
          </div>
        </div>
      </div>

      {/* Materials & Tolerances Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Piston Alloy */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-2">
          <label className="text-gray-300 font-bold block">PISTON ALLOY METALLURGY:</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: '4032', label: 'Forged 4032', sub: 'Low Expansion' },
              { id: '2618', label: 'Forged 2618', sub: 'High Ductility Race' },
              { id: 'hypereutectic', label: 'Hypereutectic', sub: '16% Silicon Cast' }
            ].map((a) => (
              <button
                key={a.id}
                onClick={() => onUpdateConfig({ pistonAlloy: a.id as PistonAlloy })}
                className={`p-2 rounded-lg text-center border transition ${
                  config.pistonAlloy === a.id
                    ? 'bg-orange-500/20 border-orange-500 text-white font-bold'
                    : 'bg-black/50 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <div className="text-xs">{a.label}</div>
                <div className="text-[9px] text-gray-400">{a.sub}</div>
              </button>
            ))}
          </div>
          <div className="text-[11px] text-gray-300 p-2 bg-black/40 rounded border border-gray-800">
            Recommended Piston-to-Wall (PTW) Clearance: <strong className="text-cyan-400">{specs.ptwClearance}</strong>
          </div>
        </div>

        {/* Ring Application Factor */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-2">
          <label className="text-gray-300 font-bold block">PISTON RING APPLICATION &amp; GAP FACTOR:</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'street', label: 'Street N/A', factor: 'Bore × .0045"' },
              { id: 'street_strip', label: 'Street / Strip', factor: 'Bore × .0050"' },
              { id: 'nitrous', label: 'Nitrous / Boost', factor: 'Bore × .0065"' }
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => onUpdateConfig({ ringApplication: r.id as RingApplication })}
                className={`p-2 rounded-lg text-center border transition ${
                  config.ringApplication === r.id
                    ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                    : 'bg-black/50 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <div className="text-xs">{r.label}</div>
                <div className="text-[9px] text-amber-400">{r.factor}</div>
              </button>
            ))}
          </div>
          <div className="text-[11px] text-gray-300 p-2 bg-black/40 rounded border border-gray-800 flex justify-between">
            <span>Top Ring: <strong className="text-white">{specs.topRingGap}"</strong></span>
            <span>2nd Ring: <strong className="text-white">{specs.secondRingGap}"</strong></span>
            <span>Oil Rails: <strong className="text-white">{specs.oilRingGap}" min</strong></span>
          </div>
        </div>
      </div>

      {/* Kinematics Calculation Badges */}
      <div className="bg-[#181e24] rounded-xl border border-gray-800 p-4 space-y-3">
        <h3 className="font-bold text-white uppercase text-xs flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          KINEMATIC FORMULAS &amp; CLEARANCE VERIFICATION
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-black/60 p-3 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-[10px]">ROD / STROKE RATIO:</div>
            <div className="text-lg font-black text-cyan-400 mt-0.5">{specs.rodStrokeRatio}:1</div>
            <div className="text-[9px] text-gray-500">Scat 5.700" / 3.480" Stroke</div>
          </div>

          <div className="bg-black/60 p-3 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-[10px]">MAX ROD ANGULARITY:</div>
            <div className="text-lg font-black text-amber-400 mt-0.5">{specs.maxRodAngleDeg}°</div>
            <div className="text-[9px] text-gray-500">Cylinder wall side-thrust</div>
          </div>

          <div className="bg-black/60 p-3 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-[10px]">PISTON SPEED @ 6,000 RPM:</div>
            <div className="text-lg font-black text-emerald-400 mt-0.5">{specs.meanPistonSpeed6000} FPM</div>
            <div className="text-[9px] text-gray-500">Forged safe limit &lt; 4,500 FPM</div>
          </div>

          <div className="bg-black/60 p-3 rounded-lg border border-emerald-500/50">
            <div className="text-emerald-400 text-[10px] font-bold">QUENCH AUDIT:</div>
            <div className="text-lg font-black text-emerald-300 mt-0.5">{specs.quenchDistance}"</div>
            <div className="text-[9px] text-emerald-400">.039" gasket + .015" deck</div>
          </div>
        </div>
      </div>
    </div>
  );
};
