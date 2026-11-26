/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  EngineConfig,
  CoordinatedSpecs,
  InspectionData,
  TechDrawingSheet,
  TechDrawingCallout,
  TransmissionItem
} from '../types/engine';
import { TRANSMISSIONS_DB, VEHICLES_CATALOG } from '../data/engineData';
import { getTransmissionDrawingSheet } from '../data/techDrawingsCatalog';
import { Transmission3DScene } from './CADViewer/Transmission3DScene';
import { EngineViewMode } from './CADViewer/Engine3DScene';
import { InspectionHUD } from './CADViewer/InspectionHUD';
import { TechDrawingSpecsDrawer } from './TechDrawingSpecsDrawer';
import { SpecialModControlsStrip } from './SpecialModControlsStrip';
import { Car, Box, FileSpreadsheet } from 'lucide-react';

interface TabTransmissionProps {
  config: EngineConfig;
  specs: CoordinatedSpecs;
  onUpdateConfig: (newConfig: Partial<EngineConfig>) => void;
  transDrawingsById?: Record<string, TechDrawingSheet>;
  transOverridesById?: Record<string, Partial<TransmissionItem>>;
  onApplyTransDrawing?: (transId: string, sheet: TechDrawingSheet | null) => void;
  onOpenDrawingsTab?: () => void;
}

export const TabTransmission: React.FC<TabTransmissionProps> = ({
  config,
  specs,
  onUpdateConfig,
  transDrawingsById = {},
  transOverridesById = {},
  onApplyTransDrawing,
  onOpenDrawingsTab
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [show3DTrans, setShow3DTrans] = useState<boolean>(true);
  const [showTechDrawingPanel, setShowTechDrawingPanel] = useState<boolean>(true);
  const [transExploded, setTransExploded] = useState<number>(0);
  const [transRunning, setTransRunning] = useState<boolean>(false);
  const [transViewMode, setTransViewMode] = useState<EngineViewMode>('ghost');
  const [selectedTransPart, setSelectedTransPart] = useState<InspectionData | null>(null);
  const [focusPartRequest, setFocusPartRequest] = useState<{ key: string; nonce: number } | null>(null);

  const categories = [
    'ALL',
    'GM Classic Automatic',
    'GM Electronic Overdrive',
    'Classic Muscle Manual',
    'Modern Overdrive Manual',
    'Ford Automatic',
    'Mopar Automatic',
    'JDM & Exotic Swap'
  ];

  const baseTrans = TRANSMISSIONS_DB[config.selectedTrans] || TRANSMISSIONS_DB.th350;
  const currentTrans: TransmissionItem = useMemo(() => {
    const override = transOverridesById[baseTrans.id];
    return override ? { ...baseTrans, ...override } : baseTrans;
  }, [baseTrans, transOverridesById]);

  const builtInDrawing = useMemo(
    () => getTransmissionDrawingSheet(currentTrans),
    [currentTrans]
  );
  const customSheet = transDrawingsById[currentTrans.id] || null;
  const activeTransDrawing = customSheet || builtInDrawing;

  const currentVehicle = VEHICLES_CATALOG[config.selectedVehicle] || VEHICLES_CATALOG.camaro1969;

  const filteredTransmissions = useMemo(() => {
    if (categoryFilter === 'ALL') return Object.values(TRANSMISSIONS_DB);
    return Object.values(TRANSMISSIONS_DB).filter((t) => t.category === categoryFilter);
  }, [categoryFilter]);

  const handleApplySheetTo3D = (sheet: TechDrawingSheet) => {
    onApplyTransDrawing?.(currentTrans.id, sheet);
    if (sheet.dimensions?.defaultStall && currentTrans.type === 'Automatic') {
      onUpdateConfig({ stallSpeed: sheet.dimensions.defaultStall });
    }
  };

  const handleFocusCalloutIn3D = (callout: TechDrawingCallout, sheet: TechDrawingSheet) => {
    setShow3DTrans(true);
    setFocusPartRequest({ key: callout.targetSubassembly, nonce: Date.now() });
    setSelectedTransPart({
      name: callout.partName,
      category: callout.category,
      desc: callout.notes || sheet.unitSummary,
      spec: callout.clearanceSpec,
      torque: callout.torqueSpec,
      partNumber: callout.partNumber,
      drawingIndex: callout.indexCode,
      material: callout.material,
      sourceUrls: sheet.sourceUrls
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 font-mono text-xs text-gray-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-700/80">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-sans flex items-center gap-2">
            <Car className="w-5 h-5 text-orange-500" />
            28-TRANSMISSION COMPATIBILITY MATRIX &amp; DRIVELINE AUDIT
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 font-sans">
            MODSIM driveline coordination: Gear reduction ratios, exploded CAD drawings, online OEM specs &amp; diagram upload to 3D.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowTechDrawingPanel((v) => !v)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
              showTechDrawingPanel
                ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                : 'bg-[#181e24] border-gray-700 text-gray-300 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-orange-400" />
            <span>{showTechDrawingPanel ? 'HIDE TECH DRAWINGS & SPECS' : 'SHOW TECH DRAWINGS & SPECS'}</span>
          </button>

          <button
            onClick={() => setShow3DTrans(!show3DTrans)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
              show3DTrans
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-[#181e24] border-gray-700 text-gray-300 hover:text-white'
            }`}
          >
            <Box className="w-4 h-4 text-cyan-400" />
            <span>{show3DTrans ? 'HIDE 3D TRANSMISSION' : 'SHOW 3D TRANSMISSION'}</span>
          </button>
        </div>
      </div>

      <SpecialModControlsStrip
        config={config}
        specs={specs}
        onUpdateConfig={onUpdateConfig}
        variant="compact"
      />

      {/* 3D Transmission Viewport (Expandable) */}
      {show3DTrans && (
        <div className="relative w-full h-96 rounded-2xl overflow-hidden border border-gray-800 bg-[#11151a] shadow-2xl">
          <Transmission3DScene
            transmission={currentTrans}
            explodedAmount={transExploded}
            isRunning={transRunning}
            viewMode={transViewMode}
            techDrawing={activeTransDrawing}
            focusPartRequest={focusPartRequest}
            onSelectPart={setSelectedTransPart}
            onOpenDrawingsTab={onOpenDrawingsTab}
          />

          <InspectionHUD part={selectedTransPart} onClose={() => setSelectedTransPart(null)} />

          {/* 3D Top Overlay */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
            <div className="bg-black/90 border border-orange-500/60 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="text-[10px] text-amber-400 font-bold uppercase">ACTIVE UNIT:</span>
              <span className="text-white font-bold text-xs">{currentTrans.name}</span>
            </div>

            <div className="bg-[#1a2026]/95 border border-gray-700 p-0.5 rounded-lg flex gap-0.5">
              {(
                [
                  { id: 'realistic', label: 'Cast PBR' },
                  { id: 'drawing', label: 'Tech Drawing' },
                  { id: 'ghost', label: 'Ghost X-Ray' }
                ] as Array<{ id: EngineViewMode; label: string }>
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setTransViewMode(m.id)}
                  className={`px-2 py-1 rounded text-[10px] transition ${
                    transViewMode === m.id
                      ? 'bg-orange-600 text-white font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3D Controls Bottom Bar */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-3 bg-black/90 border border-gray-700 p-2.5 rounded-xl">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <span className="text-[10px] text-gray-400 font-bold uppercase whitespace-nowrap">
                BLOWN-APART DISASSEMBLY: {Math.round(transExploded * 100)}%
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={transExploded}
                onChange={(e) => setTransExploded(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-gray-800 rounded"
              />
            </div>

            <button
              onClick={() => setTransRunning(!transRunning)}
              className={`px-3 py-1 rounded text-[11px] font-bold border transition ${
                transRunning
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-[#181e24] border-gray-700 text-gray-300 hover:text-white'
              }`}
            >
              {transRunning ? 'STOP SHAFTS' : 'SPIN GEAR SHAFTS'}
            </button>
          </div>
        </div>
      )}

      {/* Technical Drawing BOM Sheet, Online Lookup & Upload-to-3D Panel */}
      {showTechDrawingPanel && (
        <TechDrawingSpecsDrawer
          key={`trans_drawer_${currentTrans.id}`}
          inlinePanel
          domain="transmission"
          activeSheet={activeTransDrawing}
          defaultQuery={currentTrans.name}
          contextSpecs={{
            id: currentTrans.id,
            type: currentTrans.type,
            ratios: currentTrans.ratios,
            lengthInches: currentTrans.lengthInches,
            nativePattern: currentTrans.nativePattern
          }}
          onApplySheetTo3D={handleApplySheetTo3D}
          onFocusCalloutIn3D={handleFocusCalloutIn3D}
          onResetCustomSheet={() => onApplyTransDrawing?.(currentTrans.id, null)}
          hasCustomApplied={Boolean(customSheet)}
        />
      )}

      {/* Transmission Family Filter Pills */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
          FILTER BY TRANSMISSION FAMILY (28 UNITS):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                categoryFilter === cat
                  ? 'bg-orange-600 text-white font-bold shadow'
                  : 'bg-[#181e24] text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Transmission Grid Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
        {filteredTransmissions.map((t) => (
          <div
            key={t.id}
            onClick={() => {
              setSelectedTransPart(null);
              onUpdateConfig({
                selectedTrans: t.id,
                stallSpeed: t.defaultStall || config.stallSpeed
              });
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
              config.selectedTrans === t.id
                ? 'bg-orange-950/40 border-orange-500 shadow-lg ring-1 ring-orange-500'
                : 'bg-[#181e24] border-gray-800 hover:border-gray-700'
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold">{t.category}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  t.type === 'Automatic' ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                }`}>
                  {t.type}
                </span>
              </div>
              <h3 className="font-bold text-sm text-white font-sans">{t.name}</h3>
              <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 font-sans">{t.desc}</p>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-800 text-[10px] flex justify-between items-center text-gray-400">
              <span>Ratios: <strong className="text-white">{t.ratios.join(', ')}</strong></span>
              {t.type === 'Automatic' && (
                <span className="text-emerald-400 font-bold">{t.defaultStall} RPM Stall</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Vehicle Chassis Tunnel Fitment & Compatibility Audit Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Compatibility Report */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white uppercase text-xs">CHASSIS &amp; MATING AUDIT</h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              specs.compatibility.isDirectBoltOn
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                : 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
            }`}>
              {specs.compatibility.isDirectBoltOn ? 'DIRECT OEM BOLT-ON' : 'SWAP ADAPTER REQUIRED'}
            </span>
          </div>

          {/* Vehicle Selector */}
          <div className="space-y-1">
            <label className="text-gray-400 text-[10px] uppercase font-bold block">TARGET VEHICLE CHASSIS:</label>
            <select
              value={config.selectedVehicle}
              onChange={(e) => onUpdateConfig({ selectedVehicle: e.target.value })}
              className="w-full bg-black/70 border border-gray-700 rounded p-2 text-white font-bold text-xs"
            >
              {Object.values(VEHICLES_CATALOG).map((v) => (
                <option key={v.id} value={v.id}>
                  [{v.make}] {v.model} ({v.gen})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-black/50 rounded-lg border border-gray-800 space-y-2 text-[11px]">
            <div>
              <span className="text-amber-400 font-bold block text-[10px] uppercase">BELLHOUSING &amp; HARDWARE:</span>
              <p className="text-gray-300 font-sans mt-0.5">{specs.compatibility.hardwareNotes}</p>
            </div>
            <div className="border-t border-gray-800 pt-1.5">
              <span className="text-cyan-400 font-bold block text-[10px] uppercase">FLOORPAN TRANSMISSION TUNNEL:</span>
              <p className="text-emerald-400 font-sans mt-0.5">{currentVehicle.tunnelSize}</p>
            </div>
          </div>
        </div>

        {/* Gear Reductions & Road Speed Table */}
        <div className="bg-[#181e24] p-4 rounded-xl border border-gray-800 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white uppercase text-xs">SPEED IN GEAR (REAR AXLE {config.rearGear}:1)</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-[10px]">AXLE RATIO:</span>
              <select
                value={config.rearGear}
                onChange={(e) => onUpdateConfig({ rearGear: parseFloat(e.target.value) })}
                className="bg-black/80 border border-gray-700 rounded px-1.5 py-0.5 text-amber-400 font-bold text-[10px]"
              >
                <option value={3.08}>3.08:1</option>
                <option value={3.42}>3.42:1</option>
                <option value={3.73}>3.73:1</option>
                <option value={4.10}>4.10:1</option>
                <option value={4.56}>4.56:1</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-black/60 text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="py-1 px-2">GEAR</th>
                  <th className="py-1 px-2">RATIO</th>
                  <th className="py-1 px-2">TOTAL REDUCTION</th>
                  <th className="py-1 px-2 text-emerald-400">MPH @ 5,500</th>
                  <th className="py-1 px-2 text-gray-400">RPM @ 65 MPH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {specs.speedInGearTable.map((r) => (
                  <tr key={r.gear}>
                    <td className="py-1 px-2 font-bold text-white">Gear {r.gear}</td>
                    <td className="py-1 px-2 text-amber-400">{r.ratio.toFixed(2)}:1</td>
                    <td className="py-1 px-2 text-gray-300">{r.totalReduction}:1</td>
                    <td className="py-1 px-2 text-emerald-400 font-bold">{r.mphAt5500} MPH</td>
                    <td className="py-1 px-2 text-gray-300">
                      {r.cruiseRpmAt65 > 6500 ? 'N/A' : `${r.cruiseRpmAt65} RPM`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
