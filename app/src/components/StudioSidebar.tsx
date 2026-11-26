/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TabId, CoordinatedSpecs, EngineConfig } from '../types/engine';
import {
  Box,
  Layers,
  Wind,
  Zap,
  Flame,
  Car,
  Activity,
  ClipboardList,
  Store,
  BookOpen,
  Archive,
  FileSpreadsheet,
  Sliders,
  Compass,
  Grid2x2,
  Cpu,
  Wrench,
  X
} from 'lucide-react';

interface StudioSidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  specs: CoordinatedSpecs;
  config: EngineConfig;
  activeStoreLabel?: string | null;
  archiveCount: number;
  onOpenPartsStore: () => void;
  onOpenKnowledge: () => void;
  onOpenRegistry: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const StudioSidebar: React.FC<StudioSidebarProps> = ({
  activeTab,
  onSelectTab,
  specs,
  config,
  activeStoreLabel,
  archiveCount,
  onOpenPartsStore,
  onOpenKnowledge,
  onOpenRegistry,
  mobileOpen,
  onCloseMobile
}) => {
  const workbenches: Array<{ id: TabId; index: string; label: string; icon: React.ReactNode }> = [
    { id: 'designstudio', index: '00', label: 'CAD / CAM Design Studio', icon: <Cpu className="w-4 h-4" /> },
    { id: 'block3d', index: '01', label: '3D Drafting & Rig', icon: <Box className="w-4 h-4" /> },
    { id: 'rotating', index: '02', label: 'Engine & Rotating', icon: <Layers className="w-4 h-4" /> },
    { id: 'valvetrain', index: '03', label: 'Valvetrain & Flow', icon: <Wind className="w-4 h-4" /> },
    { id: 'induction', index: '04', label: 'Induction & Fuel', icon: <Zap className="w-4 h-4" /> },
    { id: 'ignition', index: '05', label: 'Ignition & Timing', icon: <Flame className="w-4 h-4" /> },
    { id: 'trans', index: '06', label: 'Driveline Matrix', icon: <Car className="w-4 h-4" /> },
    { id: 'dyno', index: '07', label: 'Dyno & Curves', icon: <Activity className="w-4 h-4" /> },
    { id: 'shop', index: '08', label: 'Machine Shop BOM', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'drawings', index: '09', label: 'Tech Drawings', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'engconfig', index: '10', label: 'Engineering Config', icon: <Sliders className="w-4 h-4" /> },
    { id: 'drawings2', index: '11', label: 'More Drawings', icon: <Compass className="w-4 h-4" /> },
    { id: 'drawingmatrix', index: '12', label: 'Drawing & MFG Matrix', icon: <Grid2x2 className="w-4 h-4" /> },
    { id: 'modstudio', index: '13', label: 'Modification Studio', icon: <Wrench className="w-4 h-4" /> }
  ];

  const vitalsRows = [
    { label: 'Displacement', value: `${specs.displacementCi} CID`, tone: 'text-white' },
    { label: 'Bore × Stroke', value: `${config.bore.toFixed(3)}" × ${config.stroke.toFixed(3)}"`, tone: 'text-slate-200' },
    {
      label: 'Quench Distance',
      value: `${specs.quenchDistance}"`,
      tone: specs.quenchDistance <= 0.055 && specs.quenchDistance >= 0.038 ? 'text-emerald-400' : 'text-amber-400'
    },
    { label: 'Static CR', value: `${specs.staticCR}:1`, tone: 'text-amber-400' },
    { label: 'Dynamic CR', value: `${specs.dynamicCR}:1`, tone: 'text-cyan-400' },
    { label: 'Rod / Stroke', value: `${specs.rodStrokeRatio}:1`, tone: 'text-slate-200' },
    { label: 'Peak Output', value: `${specs.peakHp} HP / ${specs.peakTq} TQ`, tone: 'text-orange-400' }
  ];

  const railContent = (
    <div className="h-full flex flex-col bg-[#11151b] border-r border-slate-800/90 w-64 select-none">
      {/* Workbenches Navigation */}
      <div className="p-3 border-b border-slate-800/90 space-y-1">
        <div className="flex items-center justify-between px-2 pb-1.5">
          <span className="text-[11px] font-semibold text-slate-400">
            Engineering Workbenches
          </span>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-slate-400 hover:text-white"
            aria-label="Close Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {workbenches.map((wb) => {
          const isActive = activeTab === wb.id;
          return (
            <button
              key={wb.id}
              onClick={() => {
                onSelectTab(wb.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                isActive
                  ? 'bg-orange-600/15 text-white border border-orange-500/60 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <span className={`font-mono text-[11px] ${isActive ? 'text-orange-400' : 'text-slate-500'}`}>
                {wb.index}
              </span>
              <span className={isActive ? 'text-orange-400' : 'text-slate-400'}>
                {wb.icon}
              </span>
              <span className="truncate">{wb.label}</span>
            </button>
          );
        })}
      </div>

      {/* Live Engineering Spec Sheet */}
      <div className="p-3 border-b border-slate-800/90 space-y-2">
        <div className="px-1 text-[11px] font-semibold text-slate-400">
          Live Engine Blueprint
        </div>
        <div className="bg-[#0d1014] border border-slate-800/80 rounded-lg divide-y divide-slate-800/70">
          {vitalsRows.map((row) => (
            <div
              key={row.label}
              className="px-2.5 py-1.5 flex items-center justify-between text-[11px] gap-2"
            >
              <span className="text-slate-400 truncate">{row.label}</span>
              <span className={`font-mono font-semibold tabular-nums whitespace-nowrap ${row.tone}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
        {activeStoreLabel && (
          <div className="px-2.5 py-1.5 rounded-lg bg-[#0d1014] border border-slate-800 text-[11px] text-emerald-300 truncate">
            Fitment: {activeStoreLabel}
          </div>
        )}
      </div>

      {/* Global Studio Libraries */}
      <div className="p-3 space-y-1.5 mt-auto">
        <div className="px-1 pb-1 text-[11px] font-semibold text-slate-400">
          Global Knowledge &amp; Catalog
        </div>

        <button
          onClick={() => {
            onOpenPartsStore();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-800 bg-[#0d1014] hover:border-emerald-500/60 text-xs font-medium text-slate-200 hover:text-emerald-300 transition whitespace-nowrap"
        >
          <span className="flex items-center gap-2">
            <Store className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auto Parts Counter</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500">1955–2026</span>
        </button>

        <button
          onClick={() => {
            onOpenKnowledge();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-800 bg-[#0d1014] hover:border-amber-500/60 text-xs font-medium text-slate-200 hover:text-amber-300 transition whitespace-nowrap"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto Tech Encyclopedia</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500">8 Domains</span>
        </button>

        <button
          onClick={() => {
            onOpenRegistry();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-800 bg-[#0d1014] hover:border-cyan-500/60 text-xs font-medium text-slate-200 hover:text-cyan-300 transition whitespace-nowrap"
        >
          <span className="flex items-center gap-2">
            <Archive className="w-3.5 h-3.5 text-cyan-400" />
            <span>Studio Archive</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500">{archiveCount || 37}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Rail */}
      <aside className="hidden lg:block shrink-0 h-full overflow-y-auto">
        {railContent}
      </aside>

      {/* Mobile / Tablet Slide-Over Rail */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="relative z-10 h-full overflow-y-auto">{railContent}</div>
          <div
            className="flex-1 bg-black/70"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
        </div>
      )}
    </>
  );
};
