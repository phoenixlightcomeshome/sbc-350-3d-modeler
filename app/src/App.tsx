/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  EngineConfig,
  TabId,
  PartsGradeTier,
  StoreEngineSpec,
  StorePartOption,
  StoreVehicleModel,
  TechDrawingSheet,
  TransmissionItem,
  PartOverridesMap,
  DesignStudioSubPageId,
  CinematicLightingPreset,
  MountedStudioDesign
} from './types/engine';
import { RAY_BASELINE_CONFIG, ENGINE_CATALOG } from './data/engineData';
import { calculateCoordinatedSpecs } from './services/coordinationEngine';
import { loadStoredPartOverrides, loadStoredTransOverrides } from './data/partModifications';
import { Header } from './components/Header';
import { StudioSidebar } from './components/StudioSidebar';
import { TabDesignStudio } from './components/TabDesignStudio';
import { Tab3DBlock } from './components/Tab3DBlock';
import { TabRotatingAssembly } from './components/TabRotatingAssembly';
import { TabValvetrain } from './components/TabValvetrain';
import { TabInduction } from './components/TabInduction';
import { TabIgnition } from './components/TabIgnition';
import { TabTransmission } from './components/TabTransmission';
import { TabDynoCurves } from './components/TabDynoCurves';
import { TabMachineShop } from './components/TabMachineShop';
import { TabTechnicalDrawings } from './components/TabTechnicalDrawings';
import { TabEngConfig } from './components/TabEngConfig';
import { TabEngineeringConfig } from './components/TabEngineeringConfig';
import { TabMoreDrawings } from './components/TabMoreDrawings';
import { TabDrawingMatrix } from './components/TabDrawingMatrix';
import { TabAerospaceMatrix } from './components/TabAerospaceMatrix';
import { MatrixComponentKey } from './data/manufacturingMatrix';
import { EcosystemRegistryModal } from './components/EcosystemRegistryModal';
import { AutoPartsStorePanel, ActiveStoreSelection } from './components/AutoPartsStorePanel';
import { AutoTechKnowledgeDrawer } from './components/AutoTechKnowledgeDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { X } from 'lucide-react';

// StoreEngineSpec has no color property; map OEM-family block paint/casting finish
// explicitly here (flagged estimate for non-ENGINE_CATALOG store models).
function resolveStoreFamilyColor(engine: StoreEngineSpec): number {
  const make = engine.make.toLowerCase();
  const family = engine.family.toLowerCase();
  const pattern = engine.pattern.toLowerCase();
  if (pattern.includes('ls') || family.includes('ls') || family.includes('lt') || family.includes('coyote') || make.includes('honda') || make.includes('bmw')) {
    return 0x8a939e; // Cast aluminum block finish
  }
  if (make.includes('ford')) return 0x1e40af; // Ford Corporate Blue
  if (make.includes('dodge') || make.includes('chrysler') || make.includes('mopar') || make.includes('plymouth')) {
    return 0xea580c; // Mopar Street Hemi Orange
  }
  if (make.includes('toyota') || make.includes('nissan') || make.includes('subaru')) {
    return 0x334155; // JDM iron/slate casting finish
  }
  if (make.includes('chevrolet') || make.includes('gm') || make.includes('pontiac')) {
    return 0xd83b01; // Classic Chevy Orange
  }
  return 0x475569;
}

export default function App() {
  const [config, setConfig] = useState<EngineConfig>(RAY_BASELINE_CONFIG);
  const [selectedEngineId, setSelectedEngineId] = useState<string>('sbc_350_ray');
  const [activeTab, setActiveTab] = useState<TabId>('block3d');
  const [isRegistryOpen, setIsRegistryOpen] = useState<boolean>(false);
  const [isPartsStoreOpen, setIsPartsStoreOpen] = useState<boolean>(false);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [archiveCount, setArchiveCount] = useState<number>(37);
  const [activeStoreSelection, setActiveStoreSelection] = useState<ActiveStoreSelection | null>(null);
  const [customEngineDrawing, setCustomEngineDrawing] = useState<TechDrawingSheet | null>(null);
  const [transDrawingsById, setTransDrawingsById] = useState<Record<string, TechDrawingSheet>>({});
  // Override baselines load from localStorage once, so overrides saved in
  // Tab 13 survive a reload instead of resetting to empty.
  const [transOverridesById, setTransOverridesById] = useState<Record<string, Partial<TransmissionItem>>>(() => loadStoredTransOverrides());
  const [partOverrides, setPartOverrides] = useState<PartOverridesMap>(() => loadStoredPartOverrides());
  const [selectedMatrixPart, setSelectedMatrixPart] = useState<MatrixComponentKey>('block');
  const [designStudioSubPage, setDesignStudioSubPage] = useState<DesignStudioSubPageId>('3d_creator');
  const [cinematicPreset, setCinematicPreset] = useState<CinematicLightingPreset>('dyno_cell');
  const [cinematicLaunchNonce, setCinematicLaunchNonce] = useState<number>(0);
  const [mountedStudioDesign, setMountedStudioDesign] = useState<MountedStudioDesign | null>(null);
  const [studioDesignsHistory, setStudioDesignsHistory] = useState<MountedStudioDesign[]>([]);

  const handleOpenMatrixForPart = (partKey: MatrixComponentKey) => {
    setSelectedMatrixPart(partKey);
    setActiveTab('drawingmatrix');
  };

  const handleSaveStudioDesign = (design: MountedStudioDesign) => {
    setStudioDesignsHistory((prev) => [
      design,
      ...prev.filter((item) => item.drawingNumber !== design.drawingNumber)
    ]);
  };

  const handleMountDesignToTestArea = (
    design: MountedStudioDesign,
    launchCinematic = false
  ) => {
    handleSaveStudioDesign(design);
    if (design.configUpdates) {
      handleUpdateConfig(design.configUpdates);
    }
    setCustomEngineDrawing(design.drawingSheet);
    setMountedStudioDesign(design);
    if (launchCinematic) {
      setCinematicLaunchNonce((n) => n + 1);
    }
    setActiveTab('block3d');
  };

  // Global keyboard shortcut: '?' opens Auto Tech Knowledge Encyclopedia
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA');
      if (isTyping) return;

      if (e.key === '?' || e.key === 'F1') {
        e.preventDefault();
        setIsKnowledgeOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsKnowledgeOpen(false);
        setIsPartsStoreOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Single common source of truth: MODSIM coordination engine
  const specs = useMemo(() => {
    return calculateCoordinatedSpecs(config, transOverridesById);
  }, [config, transOverridesById]);

  const handleApplyTransDrawing = (transId: string, sheet: TechDrawingSheet | null) => {
    if (!sheet) {
      setTransDrawingsById((prev) => {
        const next = { ...prev };
        delete next[transId];
        return next;
      });
      setTransOverridesById((prev) => {
        const next = { ...prev };
        delete next[transId];
        return next;
      });
      return;
    }

    setTransDrawingsById((prev) => ({ ...prev, [transId]: sheet }));
    const dims = sheet.dimensions;
    if (dims) {
      const override: Partial<TransmissionItem> = {};
      if (Array.isArray(dims.ratios) && dims.ratios.length >= 2) {
        override.ratios = dims.ratios.filter((n) => typeof n === 'number' && n > 0.2 && n < 8);
      }
      if (typeof dims.reverse === 'number' && dims.reverse > 0.5 && dims.reverse < 8) {
        override.reverse = dims.reverse;
      }
      if (typeof dims.lengthInches === 'number' && dims.lengthInches > 12 && dims.lengthInches < 60) {
        override.lengthInches = dims.lengthInches;
      }
      if (typeof dims.defaultStall === 'number' && dims.defaultStall >= 0 && dims.defaultStall <= 7000) {
        override.defaultStall = dims.defaultStall;
      }
      if (typeof dims.nativePattern === 'string' && dims.nativePattern.trim()) {
        override.nativePattern = dims.nativePattern.trim();
      }
      if (Object.keys(override).length > 0) {
        setTransOverridesById((prev) => ({ ...prev, [transId]: override }));
      }
    }
  };

  const handleUpdateConfig = (newConfig: Partial<EngineConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const handleResetRay = () => {
    setSelectedEngineId('sbc_350_ray');
    setActiveStoreSelection(null);
    setConfig(RAY_BASELINE_CONFIG);
    setPartOverrides({});
  };

  const handleSelectEnginePreset = (engineId: string) => {
    const catalogItem = ENGINE_CATALOG[engineId];
    if (!catalogItem) return;

    setSelectedEngineId(engineId);
    setActiveStoreSelection(null);
    const cyls = catalogItem.cylinders ?? 8;
    handleUpdateConfig({
      engineId: catalogItem.id,
      engineName: catalogItem.name,
      configLabel: catalogItem.configLabel ?? (cyls === 6 ? 'I6' : 'V8'),
      color: catalogItem.color,
      firingOrder: catalogItem.firingOrder,
      pattern: catalogItem.pattern,
      bellhousingPattern: catalogItem.pattern,
      balance: catalogItem.balance,
      flywheelTeeth: catalogItem.flywheelTeeth,
      boreSpacing: catalogItem.boreSpacing,
      valvetrainType: catalogItem.valvetrainType ?? (cyls === 6 ? 'DOHC' : 'OHV'),
      blockMaterial: catalogItem.blockMaterial ?? (catalogItem.color === 0x8a939e ? 'aluminum' : 'iron'),
      headMaterial: catalogItem.headMaterial ?? 'aluminum',
      intakeValveIn: catalogItem.intakeValveIn,
      exhaustValveIn: catalogItem.exhaustValveIn,
      valveAngleDeg: catalogItem.valveAngleDeg,
      bankAngleDeg: catalogItem.bankAngleDeg ?? (cyls === 6 ? 0 : 90),
      bore: catalogItem.bore,
      stroke: catalogItem.stroke,
      rodLength: catalogItem.rodLength,
      deckHeight: catalogItem.deckHeight,
      chamberCc: catalogItem.chamberCc,
      gasketThickness: catalogItem.gasketThickness,
      deckClearance: catalogItem.deckClearance,
      cylinders: cyls
    });
  };

  const handleApplyStoreEngine = (
    engine: StoreEngineSpec,
    vehicle: StoreVehicleModel | null,
    yearLabel: string,
    tier: PartsGradeTier,
    selectedParts: StorePartOption[]
  ) => {
    setActiveStoreSelection({
      yearLabel,
      vehicle,
      engine,
      tier,
      selectedParts
    });

    const catalogItem = ENGINE_CATALOG[engine.id];
    if (catalogItem) {
      setSelectedEngineId(engine.id);
    }

    const tierAlloy =
      tier === 'race_forged'
        ? '2618'
        : tier === 'oe_standard'
        ? 'hypereutectic'
        : '4032';

    const tierRing =
      tier === 'race_forged'
        ? 'nitrous'
        : tier === 'street_perf'
        ? 'street_strip'
        : 'street';

    const isInlineLayout = engine.configLabel === 'I6' || engine.configLabel === 'I4';
    const isDohcFamily =
      catalogItem?.valvetrainType ??
      (engine.configLabel === 'I6' || engine.family.toLowerCase().includes('dohc') || engine.family.toLowerCase().includes('coyote')
        ? 'DOHC'
        : 'OHV');

    handleUpdateConfig({
      engineId: engine.id,
      engineName: engine.name,
      configLabel: engine.configLabel,
      color: catalogItem?.color ?? resolveStoreFamilyColor(engine),
      firingOrder: engine.firingOrder,
      pattern: engine.pattern,
      bellhousingPattern: engine.pattern,
      balance: catalogItem?.balance ?? 'Internal / Factory Balance',
      flywheelTeeth: catalogItem?.flywheelTeeth ?? 'OEM Ring Gear',
      boreSpacing: catalogItem?.boreSpacing,
      valvetrainType: isDohcFamily,
      blockMaterial: catalogItem?.blockMaterial ?? (resolveStoreFamilyColor(engine) === 0x8a939e ? 'aluminum' : 'iron'),
      headMaterial: catalogItem?.headMaterial ?? 'aluminum',
      intakeValveIn: catalogItem?.intakeValveIn,
      exhaustValveIn: catalogItem?.exhaustValveIn,
      valveAngleDeg: catalogItem?.valveAngleDeg,
      bankAngleDeg: catalogItem?.bankAngleDeg ?? (isInlineLayout ? 0 : engine.configLabel === 'V6' ? 60 : 90),
      bore: engine.bore,
      stroke: engine.stroke,
      rodLength: engine.rodLength,
      deckHeight: engine.deckHeight,
      deckClearance: engine.deckClearance,
      gasketThickness: engine.gasketThickness,
      chamberCc: engine.chamberCc,
      pistonReliefCc: engine.pistonReliefCc,
      cylinders: engine.cylinders,
      pistonAlloy: tierAlloy,
      ringApplication: tierRing,
      selectedVehicle: vehicle ? vehicle.id : config.selectedVehicle,
      selectedTrans: engine.recommendedTransId || config.selectedTrans
    });

    setIsPartsStoreOpen(false);
  };

  const handleUpdateStoreParts = (parts: StorePartOption[], tier: PartsGradeTier) => {
    setActiveStoreSelection((prev) =>
      prev
        ? { ...prev, tier, selectedParts: parts }
        : prev
    );
  };

  const activeStoreLabel = activeStoreSelection
    ? `${activeStoreSelection.yearLabel === 'ALL' ? '' : `${activeStoreSelection.yearLabel} `}${activeStoreSelection.engine.cid} CID (${activeStoreSelection.selectedParts.length} SKUs)`
    : null;

  return (
    <div className="w-full h-screen print:h-auto flex flex-col bg-[#0d1014] text-slate-200 overflow-hidden print:overflow-visible">
      {/* Clean Single-Row Studio Top Bar */}
      <Header
        selectedEngineId={selectedEngineId}
        onSelectEnginePreset={handleSelectEnginePreset}
        onResetRay={handleResetRay}
        onOpenPartsStore={() => setIsPartsStoreOpen(true)}
        onOpenKnowledge={() => setIsKnowledgeOpen(true)}
        onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
        activeStoreLabel={activeStoreLabel}
      />

      {/* CAD Studio Split Shell: Left Workbench Rail + Right Engineering Viewport */}
      <div className="flex-1 min-h-0 flex">
        <StudioSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          specs={specs}
          config={config}
          activeStoreLabel={activeStoreLabel}
          archiveCount={archiveCount}
          onOpenPartsStore={() => setIsPartsStoreOpen(true)}
          onOpenKnowledge={() => setIsKnowledgeOpen(true)}
          onOpenRegistry={() => setIsRegistryOpen(true)}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Dynamic Workspace (14 Coordinated Workbenches) */}
        <main
          className={`flex-1 min-w-0 h-full ${
            activeTab === 'block3d' ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          <ErrorBoundary
            resetKey={activeTab}
            fallbackTitle="Workbench Rendering Error"
            onReset={() => setActiveTab('engconfig')}
          >
          {activeTab === 'designstudio' && (
            <TabDesignStudio
              config={config}
              specs={specs}
              onUpdateConfig={handleUpdateConfig}
              activeSubPage={designStudioSubPage}
              onChangeSubPage={setDesignStudioSubPage}
              cinematicPreset={cinematicPreset}
              onChangeCinematicPreset={setCinematicPreset}
              mountedDesign={mountedStudioDesign}
              studioDesigns={studioDesignsHistory}
              onSaveStudioDesign={handleSaveStudioDesign}
              onMountDesignToTestArea={handleMountDesignToTestArea}
              onJumpToTab={setActiveTab}
            />
          )}

          {activeTab === 'block3d' && (
            <Tab3DBlock
              config={config}
              specs={specs}
              onUpdateConfig={handleUpdateConfig}
              onResetRay={handleResetRay}
              activeStoreSelection={activeStoreSelection}
              customEngineDrawing={customEngineDrawing}
              onApplyEngineDrawing={setCustomEngineDrawing}
              onOpenDrawingsTab={() => setActiveTab('drawings')}
              onOpenMatrixForPart={handleOpenMatrixForPart}
              cinematicPreset={cinematicPreset}
              onChangeCinematicPreset={setCinematicPreset}
              mountedDesign={mountedStudioDesign}
              onUnmountDesign={() => setMountedStudioDesign(null)}
              onOpenDesignStudio={(subPage) => {
                if (subPage) setDesignStudioSubPage(subPage);
                setActiveTab('designstudio');
              }}
              cinematicLaunchNonce={cinematicLaunchNonce}
            />
          )}

          {activeTab === 'rotating' && (
            <TabRotatingAssembly
              config={config}
              specs={specs}
              onUpdateConfig={handleUpdateConfig}
              onResetRay={handleResetRay}
              activeStoreSelection={activeStoreSelection}
              onApplyStoreEngine={handleApplyStoreEngine}
              onUpdateStoreParts={handleUpdateStoreParts}
            />
          )}

          {activeTab === 'valvetrain' && (
            <TabValvetrain
              config={config}
              specs={specs}
              onUpdateConfig={handleUpdateConfig}
            />
          )}

          {activeTab === 'induction' && (
            <TabInduction
              config={config}
              specs={specs}
              onUpdateConfig={handleUpdateConfig}
            />
          )}

          {activeTab === 'ignition' && (
            <TabIgnition
              config={config}
              specs={specs}
              onUpdateConfig={handleUpdateConfig}
            />
          )}

          {activeTab === 'trans' && (
            <TabTransmission
              config={config}
              specs={specs}
              onUpdateConfig={handleUpdateConfig}
              transDrawingsById={transDrawingsById}
              transOverridesById={transOverridesById}
              onApplyTransDrawing={handleApplyTransDrawing}
              onOpenDrawingsTab={() => setActiveTab('drawings')}
            />
          )}

          {activeTab === 'dyno' && (
            <TabDynoCurves
              config={config}
              specs={specs}
              onUpdateConfig={handleUpdateConfig}
            />
          )}

          {activeTab === 'shop' && (
            <TabMachineShop
              config={config}
              specs={specs}
              onUpdateConfig={handleUpdateConfig}
              onOpenRegistry={() => setIsRegistryOpen(true)}
              activeStoreSelection={activeStoreSelection}
            />
          )}

          {activeTab === 'drawings' && (
            <TabTechnicalDrawings
              config={config}
              specs={specs}
              onUpdateConfig={handleUpdateConfig}
              activeStoreSelection={activeStoreSelection}
              customEngineDrawing={customEngineDrawing}
              onApplyEngineDrawing={setCustomEngineDrawing}
              transDrawingsById={transDrawingsById}
              transOverridesById={transOverridesById}
              onApplyTransDrawing={handleApplyTransDrawing}
              onJumpToTab={setActiveTab}
              onOpenMatrixForPart={handleOpenMatrixForPart}
            />
          )}

          {activeTab === 'engconfig' && (
            <TabEngConfig
              config={config}
              specs={specs}
              onUpdateConfig={handleUpdateConfig}
            />
          )}

          {activeTab === 'modstudio' && (
            <TabEngineeringConfig
              config={config}
              specs={specs}
              onUpdateConfig={handleUpdateConfig}
              partOverrides={partOverrides}
              onUpdatePartOverrides={setPartOverrides}
              transOverridesById={transOverridesById}
              onUpdateTransOverrides={setTransOverridesById}
            />
          )}

          {activeTab === 'drawings2' && (
            <TabMoreDrawings
              config={config}
              specs={specs}
              onUpdateConfig={handleUpdateConfig}
              onApplyEngineDrawing={setCustomEngineDrawing}
              onJumpToTab={setActiveTab}
              onOpenMatrixForPart={handleOpenMatrixForPart}
            />
          )}

          {activeTab === 'drawingmatrix' && (
            <TabDrawingMatrix
              config={config}
              specs={specs}
              onUpdateConfig={handleUpdateConfig}
              selectedPartKey={selectedMatrixPart}
              onSelectPartKey={setSelectedMatrixPart}
              onJumpToTab={setActiveTab}
            />
          )}

          {activeTab === 'aerospace' && <TabAerospaceMatrix />}
          </ErrorBoundary>
        </main>
      </div>

      {/* Auto Parts Counter Modal Drawer (Accessible from Top Bar / Sidebar on Any Tab) */}
      {isPartsStoreOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl">
            <button
              onClick={() => setIsPartsStoreOpen(false)}
              title="Close Auto Parts Store"
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 hover:text-white hover:border-orange-500 transition"
            >
              <X className="w-4 h-4" />
            </button>
            <AutoPartsStorePanel
              config={config}
              activeSelection={activeStoreSelection}
              onApplyStoreEngine={handleApplyStoreEngine}
              onUpdateStoreParts={handleUpdateStoreParts}
              onResetRay={handleResetRay}
              compact
            />
          </div>
        </div>
      )}

      {/* Global Automotive & Motor Technology Encyclopedia Drawer */}
      <AutoTechKnowledgeDrawer
        isOpen={isKnowledgeOpen}
        onClose={() => setIsKnowledgeOpen(false)}
        specs={specs}
        config={config}
        onJumpToTab={setActiveTab}
      />

      {/* Ray & Phoenix Studio Applet Access History Registry */}
      <EcosystemRegistryModal
        isOpen={isRegistryOpen}
        onClose={() => setIsRegistryOpen(false)}
        onLoadedCount={setArchiveCount}
      />
    </div>
  );
}
