/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EngineConfig, CoordinatedSpecs } from '../types/engine';
import { INTAKE_MANIFOLDS } from '../data/engineData';
import { SpecialModControlsStrip } from './SpecialModControlsStrip';
import { Zap, Gauge, Droplet, CheckCircle2, AlertCircle } from 'lucide-react';

interface TabInductionProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  onUpdateConfig: (newConfig: Partial<EngineConfig>) => void;
}

export const TabInduction: React.FC<TabInductionProps> = ({
  config,
  specs,
  onUpdateConfig
}) => {
  const isCarbSufficient = specs.effectiveCarbCfm >= specs.peakCfmDemand;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 font-mono text-xs text-gray-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-700/80">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            INDUCTION, CARBURETION, AIR &amp; EXHAUST PORT AIRFLOW
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 font-sans">
            MODSIM airflow demand vs carburetion, venturi bore, air cleaner, and cylinder head intake/exhaust porting for {specs.displacementCi} CID.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="bg-[#181e24] px-3 py-1.5 rounded-lg border border-gray-700 text-center">
            <div className="text-[10px] text-gray-400">ENGINE PEAK CFM DEMAND</div>
            <div className="text-base font-black text-cyan-400 font-mono">{specs.peakCfmDemand} CFM</div>
          </div>
          <div className={`px-3 py-1.5 rounded-lg border text-center ${
            isCarbSufficient
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-amber-950/40 border-amber-500/50 text-amber-300'
          }`}>
            <div className="text-[10px] font-bold">EFFECTIVE CARB FLOW</div>
            <div className="text-base font-black font-mono">{specs.effectiveCarbCfm} CFM</div>
          </div>
        </div>
      </div>

      {/* Special Carburetor Size, Air / Intake Port & Exhaust Port Workbench */}
      <SpecialModControlsStrip
        config={config}
        specs={specs}
        onUpdateConfig={onUpdateConfig}
        variant="full"
      />

      {/* Intake Manifold Architecture Selector */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
          INTAKE MANIFOLD RUNNER ARCHITECTURE:
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {INTAKE_MANIFOLDS.map((intk) => (
            <div
              key={intk.id}
              onClick={() => onUpdateConfig({ selectedIntake: intk.id, carbCfm: intk.carbCfmDefault })}
              className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                config.selectedIntake === intk.id
                  ? 'bg-orange-950/30 border-orange-500 shadow-lg ring-1 ring-orange-500'
                  : 'bg-[#181e24] border-gray-800 hover:border-gray-700'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-1.5">
                  <h3 className="font-bold text-sm text-white font-sans">{intk.name}</h3>
                  {config.selectedIntake === intk.id && (
                    <span className="bg-orange-500 text-black px-1.5 py-0.5 rounded text-[9px] font-black uppercase">
                      SELECTED
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 mb-3 space-y-0.5 font-sans">
                  <div>Runner Volume: <strong className="text-white">{intk.runnerCc} cc</strong></div>
                  <div>Flow Rating: <strong className="text-white">{intk.flowCfm} CFM</strong></div>
                  <div>Power Multiplier: <strong className="text-cyan-400">+{Math.round((intk.hpMult - 1) * 100)}% HP</strong></div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-800 pt-2 text-[11px]">
                <span className="text-gray-400">Est. Price:</span>
                <span className="text-emerald-400 font-bold font-mono">${intk.price.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Carburetor CFM & Target Air-Fuel Ratio (AFR) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Carburetor CFM Sizing */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-bold">CARBURETOR FLOW SIZING:</span>
            <span className="text-amber-400 font-bold text-sm font-mono">{config.carbCfm} CFM ({specs.effectiveCarbCfm} Eff)</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[500, 650, 750, 900].map((cfm) => (
              <button
                key={cfm}
                onClick={() => onUpdateConfig({ carbCfm: cfm })}
                className={`py-2 px-2 rounded-lg text-center border transition ${
                  config.carbCfm === cfm
                    ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                    : 'bg-black/50 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <div className="text-xs">{cfm} CFM</div>
                <div className="text-[9px] text-gray-400">{cfm === 650 ? "Ray's Baseline" : cfm === 900 ? "Dual-Quad" : ""}</div>
              </button>
            ))}
          </div>

          <div className={`p-2.5 rounded-lg border flex items-start gap-2 ${
            isCarbSufficient
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}>
            {isCarbSufficient ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />}
            <div className="text-[11px] leading-relaxed">
              {isCarbSufficient
                ? `Effective capacity (${specs.effectiveCarbCfm} CFM) exceeds peak engine demand (${specs.peakCfmDemand} CFM) at ${specs.hpPeakRpm} RPM. Volumetric efficiency unchoked.`
                : `Effective capacity (${specs.effectiveCarbCfm} CFM) is slightly below theoretical peak engine demand (${specs.peakCfmDemand} CFM). Yields crisp low-end booster signal.`}
            </div>
          </div>
        </div>

        {/* Target Air-Fuel Ratio (AFR) & Fuel Burn */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-bold">WIDE OPEN THROTTLE (WOT) AFR TARGET:</span>
            <span className="text-cyan-400 font-bold text-sm font-mono">{config.targetAFR.toFixed(1)}:1 AFR</span>
          </div>
          <input
            type="range"
            min="11.5"
            max="14.0"
            step="0.1"
            value={config.targetAFR}
            onChange={(e) => onUpdateConfig({ targetAFR: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer h-2 bg-gray-800 rounded"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-sans">
            <span>11.5:1 (Rich)</span>
            <span className="text-cyan-400 font-bold">12.8 - 13.0:1 (Max Best Torque)</span>
            <span>14.0:1 (Lean)</span>
          </div>

          <div className="p-2.5 bg-black/50 rounded-lg border border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplet className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[10px] text-gray-400 font-bold">FUEL MASS FLOW RATE:</div>
                <div className="text-sm font-bold text-white font-mono">{specs.bsfcLbHr} LBS/HR</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-400 font-bold">VOLUMETRIC GALLONS:</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">{specs.fuelGph} GPH @ WOT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
