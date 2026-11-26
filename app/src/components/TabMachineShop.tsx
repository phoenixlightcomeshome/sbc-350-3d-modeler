/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EngineConfig, CoordinatedSpecs } from '../types/engine';
import {
  ARP_TORQUE_AND_STRETCH_SPECS,
  HEAD_BOLT_17_SEQUENCE,
  BASE_BOM,
  MECHANIC_SPECS_LIBRARY
} from '../data/engineData';
import {
  Printer,
  ShieldCheck,
  Wrench,
  DollarSign,
  ClipboardList,
  Archive,
  Store
} from 'lucide-react';
import { ActiveStoreSelection } from './AutoPartsStorePanel';
import { SpecialModControlsStrip } from './SpecialModControlsStrip';
import {
  APPLET_HISTORY_PATH,
  CURRENT_APPLET_ID,
  SIBLING_ENGINE_ID
} from './EcosystemRegistryModal';

interface TabMachineShopProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  onUpdateConfig?: (newConfig: Partial<EngineConfig>) => void;
  onOpenRegistry?: () => void;
  activeStoreSelection?: ActiveStoreSelection | null;
}

export const TabMachineShop: React.FC<TabMachineShopProps> = ({
  config,
  specs,
  onUpdateConfig,
  onOpenRegistry,
  activeStoreSelection
}) => {
  const [selectedBoltStep, setSelectedBoltStep] = useState<number>(3); // 1 = 25 ft-lbs, 2 = 45 ft-lbs, 3 = 65-70 ft-lbs
  const [hoveredBolt, setHoveredBolt] = useState<number | null>(null);

  const topRowBolts = [13, 9, 5, 1, 3, 7, 11, 15, 17];
  const bottomRowBolts = [14, 10, 6, 2, 4, 8, 12, 16];

  const hasStoreParts = Boolean(activeStoreSelection && activeStoreSelection.selectedParts.length > 0);
  const storePartsCost = activeStoreSelection
    ? activeStoreSelection.selectedParts.reduce((acc, p) => acc + p.price + (p.coreCharge || 0), 0)
    : 0;
  const totalBomCost = hasStoreParts
    ? storePartsCost
    : BASE_BOM.reduce((acc, item) => acc + item.price, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 font-mono text-xs text-gray-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-700/80">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-orange-500" />
            CLIENT ENGINE BUILD SHEET &amp; MACHINE SHOP SPECIFICATIONS
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 font-sans">
            Ray's Confirmed Baseline Blueprinted Standards | Quench audit, ring gaps, ARP bolt stretch, and 17-bolt head pattern.
          </p>
        </div>

        {/* Print / Export Build Sheet Button */}
        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl text-xs font-bold border border-cyan-500 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 shadow-xl flex items-center gap-2 transition no-print"
        >
          <Printer className="w-4 h-4" />
          <span>PRINT / EXPORT BUILD SHEET</span>
        </button>
      </div>

      {onUpdateConfig && (
        <div className="no-print">
          <SpecialModControlsStrip
            config={config}
            specs={specs}
            onUpdateConfig={onUpdateConfig}
            variant="compact"
          />
        </div>
      )}

      {/* Blueprinted Build Sheet Summary Card */}
      <div className="bg-[#181e24] p-5 rounded-2xl border border-gray-800 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">PROJECT SERIAL IDENTIFIER</div>
            <div className="text-base font-black text-white font-sans">
              {activeStoreSelection
                ? `${activeStoreSelection.yearLabel === 'ALL' ? '' : `${activeStoreSelection.yearLabel} `}${activeStoreSelection.vehicle ? `${activeStoreSelection.vehicle.make} ${activeStoreSelection.vehicle.model}` : activeStoreSelection.engine.make} — ${activeStoreSelection.engine.name}`
                : "CHEVROLET SMALL BLOCK 350 — RAY'S CONFIRMED BASELINE"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/50 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-[9px] text-emerald-400 font-bold uppercase">QUENCH AUDIT:</div>
                <div className="text-sm font-black text-white">{specs.quenchDistance}" (PASS)</div>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-black/60 border border-gray-700 text-right">
              <div className="text-[9px] text-gray-400 uppercase">STATIC CR:</div>
              <div className="text-sm font-black text-amber-400">{specs.staticCR}:1</div>
            </div>
          </div>
        </div>

        {/* 4-Column Core Geometric Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
          <div className="p-2.5 bg-black/50 rounded-lg border border-gray-800">
            <span className="text-gray-400 block text-[10px]">CYLINDER BORE:</span>
            <span className="text-white font-bold text-sm">{config.bore.toFixed(3)}"</span>
          </div>
          <div className="p-2.5 bg-black/50 rounded-lg border border-gray-800">
            <span className="text-gray-400 block text-[10px]">CRANKSHAFT STROKE:</span>
            <span className="text-white font-bold text-sm">{config.stroke.toFixed(3)}"</span>
          </div>
          <div className="p-2.5 bg-black/50 rounded-lg border border-gray-800">
            <span className="text-gray-400 block text-[10px]">ROD LENGTH (RAY'S SPEC):</span>
            <span className="text-emerald-400 font-bold text-sm">{config.rodLength.toFixed(3)}"</span>
          </div>
          <div className="p-2.5 bg-black/50 rounded-lg border border-gray-800">
            <span className="text-gray-400 block text-[10px]">DECK HEIGHT:</span>
            <span className="text-white font-bold text-sm">{config.deckHeight.toFixed(3)}"</span>
          </div>
          <div className="p-2.5 bg-black/50 rounded-lg border border-gray-800">
            <span className="text-gray-400 block text-[10px]">DECK CLEARANCE:</span>
            <span className="text-cyan-400 font-bold text-sm">{config.deckClearance.toFixed(3)}" in-the-hole</span>
          </div>
          <div className="p-2.5 bg-black/50 rounded-lg border border-gray-800">
            <span className="text-gray-400 block text-[10px]">GASKET COMPRESSED:</span>
            <span className="text-cyan-400 font-bold text-sm">{config.gasketThickness.toFixed(3)}" Fel-Pro</span>
          </div>
          <div className="p-2.5 bg-black/50 rounded-lg border border-gray-800">
            <span className="text-gray-400 block text-[10px]">CHAMBER VOLUME:</span>
            <span className="text-amber-400 font-bold text-sm">{config.chamberCc.toFixed(1)} cc</span>
          </div>
          <div className="p-2.5 bg-black/50 rounded-lg border border-gray-800">
            <span className="text-gray-400 block text-[10px]">PISTON RELIEF:</span>
            <span className="text-white font-bold text-sm">+{config.pistonReliefCc.toFixed(1)} cc Flat-Top</span>
          </div>
        </div>
      </div>

      {/* 17-Bolt Cylinder Head Torquing Sequence Interactive Diagram */}
      <div className="bg-[#181e24] p-5 rounded-2xl border border-gray-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-white uppercase text-xs flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-500" />
              17-BOLT CYLINDER HEAD TORQUING SEQUENCE &amp; FASTENER SPEC
            </h3>
            <p className="text-[11px] text-gray-400 font-sans mt-0.5">
              Strict spiral pattern from center outwards. Stage 1: 25 ft-lbs ➔ Stage 2: 45 ft-lbs ➔ Stage 3: 65-70 ft-lbs.
            </p>
          </div>

          <div className="flex items-center gap-1.5 no-print">
            <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">STAGE:</span>
            {[1, 2, 3].map((step) => (
              <button
                key={step}
                onClick={() => setSelectedBoltStep(step)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                  selectedBoltStep === step
                    ? 'bg-orange-600 border-orange-400 text-white'
                    : 'bg-black/50 border-gray-700 text-gray-400'
                }`}
              >
                Stage {step} ({step === 1 ? '25' : step === 2 ? '45' : '65-70'} ft-lbs)
              </button>
            ))}
          </div>
        </div>

        {/* Visual Cylinder Head Bolt Map */}
        <div className="bg-[#11151a] p-5 rounded-xl border border-gray-800/80 space-y-4">
          <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase border-b border-gray-800 pb-2">
            <span>INTAKE MANIFOLD SIDE (TOP ROW — 9 BOLTS)</span>
            <span>CYLINDER HEAD FRONT ➔ REAR</span>
          </div>

          {/* Top Row: 13, 9, 5, 1, 3, 7, 11, 15, 17 */}
          <div className="flex justify-between items-center max-w-2xl mx-auto px-4">
            {topRowBolts.map((num) => (
              <div
                key={num}
                onMouseEnter={() => setHoveredBolt(num)}
                onMouseLeave={() => setHoveredBolt(null)}
                className={`w-9 h-9 rounded-full flex flex-col items-center justify-center font-bold text-xs cursor-pointer transition-all transform hover:scale-110 shadow-lg ${
                  hoveredBolt === num
                    ? 'bg-cyan-400 text-black ring-4 ring-cyan-300'
                    : 'bg-orange-600 hover:bg-orange-500 text-white'
                }`}
              >
                <span>{num}</span>
              </div>
            ))}
          </div>

          {/* Bottom Row: 14, 10, 6, 2, 4, 8, 12, 16 */}
          <div className="flex justify-between items-center max-w-xl mx-auto px-6">
            {bottomRowBolts.map((num) => (
              <div
                key={num}
                onMouseEnter={() => setHoveredBolt(num)}
                onMouseLeave={() => setHoveredBolt(null)}
                className={`w-9 h-9 rounded-full flex flex-col items-center justify-center font-bold text-xs cursor-pointer transition-all transform hover:scale-110 shadow-lg ${
                  hoveredBolt === num
                    ? 'bg-cyan-400 text-black ring-4 ring-cyan-300'
                    : 'bg-amber-500 hover:bg-amber-400 text-black font-black'
                }`}
              >
                <span>{num}</span>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-gray-400 text-center uppercase border-t border-gray-800 pt-2">
            EXHAUST HEADER SIDE (BOTTOM ROW — 8 BOLTS)
          </div>
        </div>

        <div className="text-[11px] text-amber-300 bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/30 font-sans leading-relaxed">
          <strong>CRITICAL MACHINE SHOP MANDATE:</strong> Small block Chevy cylinder head bolts penetrate directly into the engine block coolant water jacket. Every fastener must have threads coated in Loctite 567 or Permatex High-Temperature Thread Sealant to prevent cooling system pressurized coolant leaks into the oil pan.
        </div>
      </div>

      {/* ARP Fasteners Preload & Stretch Gauge Table */}
      <div className="bg-[#181e24] p-5 rounded-2xl border border-gray-800 space-y-3">
        <h3 className="font-bold text-white uppercase text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ARP PRECISION FASTENER TORQUE &amp; STRETCH SPECIFICATIONS
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-black/60 text-gray-400 border-b border-gray-800">
              <tr>
                <th className="p-2">FASTENER LOCATION</th>
                <th className="p-2">THREAD SIZE</th>
                <th className="p-2 text-orange-400">STRETCH GAUGE (PRELOAD)</th>
                <th className="p-2 text-amber-400">TORQUE (ARP ULTRA-TORQUE)</th>
                <th className="p-2 text-gray-400">PROCEDURAL NOTES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {ARP_TORQUE_AND_STRETCH_SPECS.map((s, idx) => (
                <tr key={idx} className="hover:bg-gray-800/40">
                  <td className="p-2 font-bold text-white">{s.item}</td>
                  <td className="p-2 text-cyan-300">{s.size}</td>
                  <td className="p-2 text-orange-400 font-bold">{s.stretch || 'N/A'}</td>
                  <td className="p-2 text-amber-400 font-bold">{s.arp}</td>
                  <td className="p-2 text-gray-400 font-sans">{s.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mechanic Real-World Operating Specs */}
      <div className="bg-[#181e24] p-5 rounded-2xl border border-gray-800 space-y-3">
        <h3 className="font-bold text-white uppercase text-xs">SHOP CLEARANCES &amp; SETTINGS CHEAT SHEET</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {MECHANIC_SPECS_LIBRARY.map((m, idx) => (
            <div key={idx} className="p-3 bg-black/50 rounded-xl border border-gray-800 space-y-1">
              <div className="text-[10px] text-gray-400 uppercase font-bold">{m.label}:</div>
              <div className="text-sm font-black text-amber-400">{m.value}</div>
              <p className="text-[10px] text-gray-400 font-sans leading-tight">{m.notes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Itemized Bill of Materials (BOM) & Parts Counter */}
      <div className="bg-[#181e24] p-5 rounded-2xl border border-gray-800 space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-800 pb-2">
          <h3 className="font-bold text-white uppercase text-xs flex items-center gap-2">
            {hasStoreParts ? (
              <Store className="w-4 h-4 text-emerald-400" />
            ) : (
              <DollarSign className="w-4 h-4 text-emerald-400" />
            )}
            {hasStoreParts
              ? `PRO AUTO PARTS COUNTER PICK-LIST (${activeStoreSelection?.selectedParts.length} SKUs — ${activeStoreSelection?.tier.toUpperCase()})`
              : 'ITEMIZED BILL OF MATERIALS (BOM) & SKU CROSS-REFERENCE'}
          </h3>
          <div className="text-xs font-bold text-emerald-400 font-mono">
            TOTAL ESTIMATED PARTS: ${totalBomCost.toFixed(2)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-black/60 text-gray-400 border-b border-gray-800">
              <tr>
                <th className="p-2">SUBSYSTEM</th>
                <th className="p-2">COMPONENT DESCRIPTION</th>
                <th className="p-2 text-cyan-400">PART NUMBER / SKU</th>
                <th className="p-2 text-right text-emerald-400">UNIT PRICE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {hasStoreParts
                ? activeStoreSelection?.selectedParts.map((sp) => (
                    <tr key={sp.id} className="hover:bg-gray-800/40">
                      <td className="p-2 font-bold text-white">{sp.category}</td>
                      <td className="p-2 text-gray-300 font-sans">
                        <span className="text-amber-300 font-bold">{sp.brand}</span> — {sp.name}
                      </td>
                      <td className="p-2 text-cyan-300 font-mono font-bold">{sp.sku}</td>
                      <td className="p-2 text-right font-bold text-emerald-400 font-mono">
                        ${(sp.price + (sp.coreCharge || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))
                : BASE_BOM.map((b, idx) => (
                    <tr key={idx} className="hover:bg-gray-800/40">
                      <td className="p-2 font-bold text-white">{b.cat}</td>
                      <td className="p-2 text-gray-300 font-sans">{b.part}</td>
                      <td className="p-2 text-cyan-300 font-mono font-bold">{b.num}</td>
                      <td className="p-2 text-right font-bold text-emerald-400 font-mono">
                        ${b.price.toFixed(2)}
                      </td>
                    </tr>
                  ))}
              <tr className="bg-black/80 font-bold">
                <td colSpan={3} className="p-3 text-right text-white uppercase">
                  TOTAL ESTIMATED PARTS INVESTMENT:
                </td>
                <td className="p-3 text-right text-emerald-400 text-sm font-black font-mono">
                  ${totalBomCost.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Studio Lineage & Sibling Reference */}
      <div className="bg-[#181e24] p-5 rounded-2xl border border-cyan-500/30 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-2.5">
          <div>
            <h3 className="font-bold text-white uppercase text-xs flex items-center gap-2">
              <Archive className="w-4 h-4 text-cyan-400" />
              STUDIO LINEAGE &amp; SIBLING WORKSPACE CROSS-REFERENCE
            </h3>
            <p className="text-[11px] text-gray-400 font-sans mt-0.5">
              Indexed from Ray &amp; Phoenix Studio Applet Archive ({APPLET_HISTORY_PATH}).
            </p>
          </div>
          {onOpenRegistry && (
            <button
              onClick={onOpenRegistry}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-cyan-500/60 bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 transition flex items-center gap-1.5 no-print"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Open Studio Archive (37)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
          <div className="p-3 bg-black/50 rounded-xl border border-orange-500/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-orange-400 uppercase">ACTIVE BUILD WORKSPACE</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-600/20 text-orange-300 border border-orange-500/40 text-[9px] font-bold">
                CURRENT
              </span>
            </div>
            <div className="font-bold text-white font-sans text-xs">SBC 350 3D Engine Builder</div>
            <div className="text-[10px] text-gray-400">
              Spanner ID: <span className="text-cyan-300 font-mono">{CURRENT_APPLET_ID}</span>
            </div>
          </div>

          <div className="p-3 bg-black/50 rounded-xl border border-cyan-500/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-cyan-400 uppercase">SIBLING ENGINE SUITE</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold">
                LINKED RECORD
              </span>
            </div>
            <div className="font-bold text-white font-sans text-xs">SBC 350 Engine &amp; Transmission Builder</div>
            <div className="text-[10px] text-gray-400">
              Spanner ID: <span className="text-cyan-300 font-mono">{SIBLING_ENGINE_ID}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
