/**
 * Quantum Aerospace Design Studio (SBC 350 v20.0.0)
 * Flat-Root Baseline: BM-04-FUTURE-TECH-V19
 * 100% Offline in Browser, Zero API Keys, Pinned 3D Viewport, Minimal Header
 */
import React, { useState } from 'react';
import { ThreeViewport } from './components/ThreeViewport';
import { PhotoScaleRoom } from './components/PhotoScaleRoom';
import { SketchBuildRoom } from './components/SketchBuildRoom';
import { InspectSliceRoom } from './components/InspectSliceRoom';
import { PartsMatrixRoom } from './components/PartsMatrixRoom';
import { ExportSpecsRoom } from './components/ExportSpecsRoom';
import { AboutStandardsDrawer } from './components/AboutStandardsDrawer';
import { ParametricPartConfig } from './engine/cadEngine';
import {
  Camera,
  Wrench,
  Eye,
  Grid,
  Download,
  BookOpen,
  SlidersHorizontal,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export type RoomTab =
  | 'PHOTO_SCALE'
  | 'SKETCH_BUILD'
  | 'INSPECT_SLICE'
  | 'PARTS_MATRIX'
  | 'EXPORT_SPECS'
  | 'ABOUT_STANDARDS';

export default function App() {
  const [activeRoom, setActiveRoom] = useState<RoomTab>('PHOTO_SCALE');
  const [displayMetric, setDisplayMetric] = useState(false);
  const [slicePercent, setSlicePercent] = useState(0);
  const [showCalibratedPhoto, setShowCalibratedPhoto] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [isViewportCollapsed, setIsViewportCollapsed] = useState(false);

  // Active Part Configuration (Defaults to SBC 350 Camless Flange Plate)
  const [partConfig, setPartConfig] = useState<ParametricPartConfig>({
    name: 'SBC 350 Camless Flange Plate',
    subsystem: 'Cylinder Head',
    widthIn: 19.685, // 500 mm head length
    heightIn: 4.4, // GM SBC bore spacing
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

  const handleBuildPart = () => {
    // Refresh part state or trigger build
    setPartConfig((prev) => ({ ...prev }));
  };

  const handleCalibrationUpdated = (pxPerIn: number, spanPx: number) => {
    // Keep internal calibration state
  };

  const ROOM_TABS: { id: RoomTab; label: string; icon: React.ReactNode }[] = [
    { id: 'PHOTO_SCALE', label: 'Photo Scale', icon: <Camera className="w-3.5 h-3.5" /> },
    { id: 'SKETCH_BUILD', label: 'Sketch & Build', icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'INSPECT_SLICE', label: '3D Inspect & Slice', icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'PARTS_MATRIX', label: 'Parts Matrix', icon: <Grid className="w-3.5 h-3.5" /> },
    { id: 'EXPORT_SPECS', label: 'Export & Specs', icon: <Download className="w-3.5 h-3.5" /> },
    { id: 'ABOUT_STANDARDS', label: 'About & Standards', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* MINIMAL HEADER (3 Elements Only) */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-30 select-none">
        {/* 1. Left: Quantum Aerospace Design Studio */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center font-mono font-black text-white text-sm shadow-md shadow-sky-950">
            QA
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-bold text-sm tracking-wide text-white leading-tight">
              QUANTUM AEROSPACE DESIGN STUDIO
            </span>
            <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
              <span className="text-sky-400 font-semibold">SBC 350 v20.0.0</span>
              <span>•</span>
              <span className="text-slate-500">BM-04-FUTURE-TECH-V19</span>
            </div>
          </div>
        </div>

        {/* 2. Center: One-Click Step / Room Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
          {ROOM_TABS.map((tab) => {
            const isActive = activeRoom === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveRoom(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-mono text-xs transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 3. Right: Units Toggle (Inches vs. Metric Display) */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-950 p-1 rounded border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setDisplayMetric(false)}
              className={`px-2.5 py-1 rounded transition-colors ${
                !displayMetric
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Imperial (Internal Discipline: 1 in = 25.4 mm)"
            >
              INCHES
            </button>
            <button
              onClick={() => setDisplayMetric(true)}
              className={`px-2.5 py-1 rounded transition-colors ${
                displayMetric
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Metric Display Only (No Internal Metric Math)"
            >
              METRIC (MM)
            </button>
          </div>

          <button
            onClick={() => setIsViewportCollapsed(!isViewportCollapsed)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors hidden xl:block"
            title={isViewportCollapsed ? 'Expand 3D Viewport' : 'Minimize 3D Viewport'}
          >
            {isViewportCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MAIN STUDIO WORKSPACE (Room Panel + Pinned 3D Viewport) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Active Work Room (Left / Main Panel) */}
        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            isViewportCollapsed ? 'max-w-full' : 'max-w-full xl:max-w-[calc(100%-460px)] 2xl:max-w-[calc(100%-540px)]'
          }`}
        >
          {activeRoom === 'PHOTO_SCALE' && (
            <PhotoScaleRoom
              displayMetric={displayMetric}
              showOverlayOnBench={showCalibratedPhoto}
              onToggleOverlayOnBench={setShowCalibratedPhoto}
              onCalibrationUpdated={handleCalibrationUpdated}
              onNavigateToSketch={() => setActiveRoom('SKETCH_BUILD')}
            />
          )}

          {activeRoom === 'SKETCH_BUILD' && (
            <SketchBuildRoom
              config={partConfig}
              displayMetric={displayMetric}
              onConfigChange={setPartConfig}
              onBuildPart={handleBuildPart}
              onNavigateToInspect={() => setActiveRoom('INSPECT_SLICE')}
            />
          )}

          {activeRoom === 'INSPECT_SLICE' && (
            <InspectSliceRoom
              config={partConfig}
              displayMetric={displayMetric}
              slicePercent={slicePercent}
              onSliceChange={setSlicePercent}
              onNavigateToExport={() => setActiveRoom('EXPORT_SPECS')}
            />
          )}

          {activeRoom === 'PARTS_MATRIX' && (
            <PartsMatrixRoom
              displayMetric={displayMetric}
              onLoadPartToBench={(cfg) => {
                setPartConfig(cfg);
                setActiveRoom('SKETCH_BUILD');
              }}
              onNavigateToCalibration={() => setActiveRoom('PHOTO_SCALE')}
              onNavigateToInspect={() => setActiveRoom('INSPECT_SLICE')}
            />
          )}

          {activeRoom === 'EXPORT_SPECS' && (
            <ExportSpecsRoom config={partConfig} displayMetric={displayMetric} />
          )}

          {activeRoom === 'ABOUT_STANDARDS' && <AboutStandardsDrawer />}
        </main>

        {/* PINNED 3D VIEWPORT (Right Panel - Always visible alongside work panels on desktop) */}
        {!isViewportCollapsed && (
          <aside className="hidden xl:flex flex-col w-[460px] 2xl:w-[540px] border-l border-slate-800 bg-slate-950 shrink-0 p-3">
            <ThreeViewport
              config={partConfig}
              slicePercent={slicePercent}
              showCalibratedPhoto={showCalibratedPhoto}
              wireframe={wireframe}
              onSliceChange={setSlicePercent}
              onWireframeToggle={() => setWireframe(!wireframe)}
            />
          </aside>
        )}
      </div>

      {/* Studio Status Bar (Bottom) */}
      <footer className="h-7 bg-slate-950 border-t border-slate-800 px-4 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>100% OFFLINE BROWSER RUNTIME</span>
          </span>
          <span>|</span>
          <span>Zero External API Calls</span>
          <span>|</span>
          <span>Ray 500mm Baseline: 335.5 px = 19.685 in (17.043 px/in)</span>
        </div>

        <div className="flex items-center space-x-3 text-slate-500">
          <span>NIST SP 800-207 &amp; ISO 10303-242 Ref Only</span>
          <span>•</span>
          <button
            onClick={() => setActiveRoom('ABOUT_STANDARDS')}
            className="hover:text-sky-400 transition-colors"
          >
            Archive Manifest (13 Files)
          </button>
        </div>
      </footer>
    </div>
  );
}
