/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EngineConfig, CoordinatedSpecs } from '../types/engine';
import { SpecialModControlsStrip } from './SpecialModControlsStrip';
import { Flame, AlertTriangle, ShieldCheck, Zap, Activity } from 'lucide-react';

interface TabIgnitionProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  onUpdateConfig: (newConfig: Partial<EngineConfig>) => void;
}

export const TabIgnition: React.FC<TabIgnitionProps> = ({
  config,
  specs,
  onUpdateConfig
}) => {
  const firingOrder = [1, 8, 4, 3, 6, 5, 7, 2];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 font-mono text-xs text-gray-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-700/80">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500" />
            IGNITION TIMING, SPARK ADVANCE &amp; DETONATION ENVELOPE
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 font-sans">
            HEI distributor advance curve, spark plug gaps, and live detonation risk audit.
          </p>
        </div>

        {/* Detonation Safety Status Badge */}
        <div className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-2 ${
          specs.knockRisk
            ? 'bg-red-950/60 border-red-500 text-red-400'
            : 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
        }`}>
          {specs.knockRisk ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
          <span>{specs.knockRisk ? 'DETONATION / KNOCK RISK (OVER-ADVANCE)' : 'OPTIMAL TIMING WINDOW (34° - 36°)'}</span>
        </div>
      </div>

      <SpecialModControlsStrip
        config={config}
        specs={specs}
        onUpdateConfig={onUpdateConfig}
        variant="compact"
      />

      {/* Total Ignition Timing Slider */}
      <div className="bg-[#181e24] p-5 rounded-xl border border-gray-800 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-200 font-semibold">
            Total Timing Advance (@ 3,000 RPM WOT)
          </span>
          <span className="text-amber-400 font-bold text-base font-mono">{config.ignitionTiming}° BTDC</span>
        </div>
        <input
          type="range"
          min="26"
          max="44"
          step="1"
          value={config.ignitionTiming}
          onChange={(e) => onUpdateConfig({ ignitionTiming: parseInt(e.target.value) })}
          className="w-full accent-amber-500 cursor-pointer h-2.5 bg-gray-800 rounded-lg"
        />
        <div className="flex justify-between text-[11px] text-gray-400 font-sans">
          <span>26° (Retarded - Soft Torque)</span>
          <span>32° (Conservative)</span>
          <span className="text-emerald-400 font-bold">36° Optimal (Ray's SBC 350 Spec)</span>
          <span className="text-red-400 font-bold">40°+ (Severe Detonation / Pre-Ignition)</span>
        </div>

        {/* Timing Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <div className="bg-black/50 p-2.5 rounded border border-gray-800">
            <span className="text-[10px] text-gray-400 block">INITIAL BASE TIMING (@ IDLE):</span>
            <span className="text-white font-bold text-sm">12° BTDC @ 850 RPM</span>
          </div>
          <div className="bg-black/50 p-2.5 rounded border border-gray-800">
            <span className="text-[10px] text-gray-400 block">CENTRIFUGAL MECHANICAL ADVANCE:</span>
            <span className="text-amber-400 font-bold text-sm">24° Advance (All In by 3,000 RPM)</span>
          </div>
          <div className="bg-black/50 p-2.5 rounded border border-gray-800">
            <span className="text-[10px] text-gray-400 block">VACUUM ADVANCE (PART-THROTTLE):</span>
            <span className="text-cyan-400 font-bold text-sm">+10° to 12° at 15 inHg Vacuum</span>
          </div>
        </div>
      </div>

      {/* Spark Plug Gap & Firing Order */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Spark Plug Gap */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-bold">SPARK PLUG ELECTRODE GAP:</span>
            <span className="text-cyan-400 font-bold text-sm">{config.sparkPlugGap.toFixed(3)}"</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0.035, 0.040, 0.045].map((gap) => (
              <button
                key={gap}
                onClick={() => onUpdateConfig({ sparkPlugGap: gap })}
                className={`py-2 px-2 rounded-lg text-center border transition ${
                  config.sparkPlugGap === gap
                    ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                    : 'bg-black/50 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <div className="text-xs">{gap.toFixed(3)}"</div>
                <div className="text-[9px] text-gray-400">{gap === 0.040 ? "Ray's HEI Spec" : gap === 0.035 ? "Points / Turbo" : "CDI Box"}</div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
            High-Energy Ignition (HEI) delivers up to 50,000 Volts. The 0.040" gap produces a fat, hot spark kernel that lights lean 12.9:1 AFR mixtures cleanly.
          </p>
        </div>

        {/* Firing Order & Cylinder Arrangement */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-bold uppercase">CHEVROLET SBC FIRING ORDER:</span>
            <span className="text-orange-400 font-bold font-mono">1-8-4-3-6-5-7-2</span>
          </div>

          {/* Interactive Firing Order Indicator */}
          <div className="flex items-center justify-between bg-black/60 p-3 rounded-lg border border-gray-800">
            {firingOrder.map((cyl, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center font-bold text-xs text-white shadow">
                  {cyl}
                </div>
                <span className="text-[9px] text-gray-500 mt-1">#{idx + 1}</span>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-gray-400 flex justify-between border-t border-gray-800 pt-1 font-sans">
            <span>Driver Side (Left): 1 - 3 - 5 - 7</span>
            <span>Passenger Side (Right): 2 - 4 - 6 - 8</span>
          </div>
        </div>
      </div>
    </div>
  );
};
