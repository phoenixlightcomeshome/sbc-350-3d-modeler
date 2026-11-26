/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import {
  CoordinatedSpecs,
  EngineConfig,
  SelectedSubPartSpec
} from '../../types/engine';
import {
  ManufacturingMatrixEntry,
  MatrixComponentKey
} from '../../data/manufacturingMatrix';
import {
  applyTechnicalEdges,
  createARP12PointBolt,
  createCamLobeGeometry,
  createCounterweightGeometry,
  createCrankTriggerWheelGeometry,
  createDetailedPistonAssembly,
  createGearGeometry,
  createHBeamConnectingRod,
  createHelicalSpringGeometry,
  createHolley4150CarburetorGroup,
  createProceduralTextureSet,
  createRollerRockerGroup,
  createSplineShaftGeometry,
  createTimingCoverGroup,
  createV8BlockProfileGeometry
} from './mechanicalGeometry';
import { exportObject3DToSTL, exportPartProfileToDXF } from '../../utils/cadExporters';
import {
  Box,
  Crosshair,
  Download,
  Eye,
  FileCode2,
  Grid2x2,
  Maximize2,
  RotateCcw,
  Scissors,
  X
} from 'lucide-react';

export type ComponentRenderMode =
  | 'cinematic'
  | 'iso_paper'
  | 'pbr'
  | 'gdt'
  | 'stress'
  | 'thermal'
  | 'toolpath'
  | 'blueprint';

export type ComponentProjectionMode = 'perspective' | 'orthographic';
export type ComponentViewportLayout = 'single' | 'quad';
export type ComponentCameraPreset = 'iso' | 'front' | 'top' | 'right' | 'rear';
export type SectionAxis = 'none' | 'x' | 'y' | 'z';

interface SubPartAnchorEntry {
  spec: SelectedSubPartSpec;
  anchorObj: THREE.Object3D;
}

interface DimensionBarEntry {
  id: string;
  label: string;
  startObj: THREE.Object3D;
  endObj: THREE.Object3D;
  offsetX: number;
  offsetY: number;
}

interface Component3DTechRendererProps {
  partKey: MatrixComponentKey;
  entry: ManufacturingMatrixEntry;
  config: EngineConfig;
  specs: CoordinatedSpecs;
  renderMode: ComponentRenderMode;
  onChangeRenderMode: (mode: ComponentRenderMode) => void;
  projection: ComponentProjectionMode;
  onChangeProjection: (proj: ComponentProjectionMode) => void;
  viewportLayout: ComponentViewportLayout;
  onChangeViewportLayout: (layout: ComponentViewportLayout) => void;
  camRunning?: boolean;
  camStepoverPct?: number;
}

const _projVec = new THREE.Vector3();
const _projEnd = new THREE.Vector3();
const _boxTmp = new THREE.Box3();
const _sizeTmp = new THREE.Vector3();
const _centerTmp = new THREE.Vector3();
const _camGoalPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3(0, 0, 0);
const _rayNdc = new THREE.Vector2();

function detectSoftwareRenderer(
  gl: WebGLRenderingContext | WebGL2RenderingContext | null
): boolean {
  if (!gl) return true;
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export const Component3DTechRenderer: React.FC<Component3DTechRendererProps> = ({
  partKey,
  entry,
  config,
  specs,
  renderMode,
  onChangeRenderMode,
  projection,
  onChangeProjection,
  viewportLayout,
  onChangeViewportLayout,
  camRunning = true,
  camStepoverPct = 15
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const partGroupRef = useRef<THREE.Group | null>(null);
  const highlightMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const captureFnRef = useRef<(() => void) | null>(null);

  const [cameraPreset, setCameraPreset] = useState<{
    id: ComponentCameraPreset;
    nonce: number;
  }>({ id: 'iso', nonce: 0 });
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [sectionAxis, setSectionAxis] = useState<SectionAxis>('none');
  const [sectionPercent, setSectionPercent] = useState<number>(0);
  const [showCallouts, setShowCallouts] = useState<boolean>(true);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState<number>(0);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const [subPartCatalog, setSubPartCatalog] = useState<SelectedSubPartSpec[]>([]);
  const [dimensionBarsMeta, setDimensionBarsMeta] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedSubPartId, setSelectedSubPartId] = useState<string | null>(null);

  // SVG DOM references for zero-rerender 60fps leader & dimension projection
  const leaderGroupRefs = useRef<Record<string, SVGGElement | null>>({});
  const leaderDotRefs = useRef<Record<string, SVGCircleElement | null>>({});
  const leaderPathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const leaderTextRefs = useRef<Record<string, SVGTextElement | null>>({});
  const dimGroupRefs = useRef<Record<string, SVGGElement | null>>({});
  const dimExt1Refs = useRef<Record<string, SVGLineElement | null>>({});
  const dimExt2Refs = useRef<Record<string, SVGLineElement | null>>({});
  const dimBarRefs = useRef<Record<string, SVGLineElement | null>>({});
  const dimLabelBgRefs = useRef<Record<string, SVGRectElement | null>>({});
  const dimTextRefs = useRef<Record<string, SVGTextElement | null>>({});

  const autoRotateRef = useRef(autoRotate);
  const sectionAxisRef = useRef(sectionAxis);
  const sectionPercentRef = useRef(sectionPercent);
  const viewportLayoutRef = useRef(viewportLayout);
  const showCalloutsRef = useRef(showCallouts);
  const selectedSubPartIdRef = useRef<string | null>(selectedSubPartId);
  const camRunningRef = useRef<boolean>(camRunning);

  useEffect(() => {
    camRunningRef.current = camRunning;
  }, [camRunning]);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);
  useEffect(() => {
    sectionAxisRef.current = sectionAxis;
  }, [sectionAxis]);
  useEffect(() => {
    sectionPercentRef.current = sectionPercent;
  }, [sectionPercent]);
  useEffect(() => {
    viewportLayoutRef.current = viewportLayout;
  }, [viewportLayout]);
  useEffect(() => {
    showCalloutsRef.current = showCallouts;
  }, [showCallouts]);
  useEffect(() => {
    selectedSubPartIdRef.current = selectedSubPartId;
  }, [selectedSubPartId]);

  // Reset selected sub-part when changing major assembly
  useEffect(() => {
    setSelectedSubPartId(null);
  }, [partKey]);

  const selectedSubPart = useMemo(
    () => subPartCatalog.find((s) => s.id === selectedSubPartId) || null,
    [subPartCatalog, selectedSubPartId]
  );

  const camGoalRef = useRef<{ active: boolean; pos: THREE.Vector3 }>({
    active: false,
    pos: new THREE.Vector3(8.8, 6.0, 9.8)
  });

  useEffect(() => {
    const presetMap: Record<ComponentCameraPreset, [number, number, number]> = {
      iso: [8.8, 6.0, 9.8],
      front: [0, 0.5, 13.0],
      top: [0, 13.5, 0.05],
      right: [13.0, 0.5, 0],
      rear: [0, 0.8, -13.0]
    };
    const [x, y, z] = presetMap[cameraPreset.id];
    camGoalRef.current.pos.set(x, y, z);
    camGoalRef.current.active = true;
  }, [cameraPreset]);

  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  // Immediate lightweight highlight swap on 3D sub-part selection (no geometry rebuild)
  useEffect(() => {
    const partGroup = partGroupRef.current;
    const hiMat = highlightMatRef.current;
    if (!partGroup || !hiMat) return;

    partGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.userData._origMat) {
          child.userData._origMat = child.material;
        }
        const orig = child.userData._origMat as THREE.Material;
        const subId = child.userData.subPartId as string | undefined;
        if (selectedSubPartId && subId === selectedSubPartId) {
          child.material = hiMat;
        } else {
          child.material = orig;
        }
      }
    });
  }, [selectedSubPartId, partKey, renderMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 760;
    const height = container.clientHeight || 500;

    let renderer = rendererRef.current;
    if (!renderer) {
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: 'default',
          preserveDrawingBuffer: true
        });
        rendererRef.current = renderer;
      } catch (err) {
        setWebglError(
          err instanceof Error ? err.message : 'Unable to initialize 3D WebGL context.'
        );
        return;
      }
    }

    const initialGl = renderer.getContext();
    if (!initialGl) {
      setWebglError('WebGL context unavailable.');
      return;
    }
    setWebglError(null);
    const isSoftwareGl = detectSoftwareRenderer(initialGl);

    const isIsoPaper = renderMode === 'iso_paper';
    const isBlueprint = renderMode === 'blueprint';
    const isToolpath = renderMode === 'toolpath';
    const isCinematic = renderMode === 'cinematic';

    const scene = new THREE.Scene();
    const bgHex = isIsoPaper
      ? 0xf5f6f8
      : isBlueprint
      ? 0x091628
      : isToolpath
      ? 0x071018
      : isCinematic
      ? 0x06080d
      : 0x0e1319;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, isIsoPaper ? 0.0022 : isCinematic ? 0.015 : 0.011);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isIsoPaper ? 1.15 : isCinematic ? 1.24 : 1.12;
    renderer.localClippingEnabled = true;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = false;

    if (renderer.domElement.parentNode !== container) {
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
    }

    // Studio Environment & High-Key Technical Lighting
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    const envTarget = pmrem.fromScene(envScene, 0.04);
    scene.environment = envTarget.texture;
    envScene.dispose();
    pmrem.dispose();

    const hemiLight = new THREE.HemisphereLight(
      isIsoPaper ? 0xffffff : isCinematic ? 0xe0f2fe : 0xdbeafe,
      isIsoPaper ? 0x94a3b8 : isCinematic ? 0x0f172a : 0x1e293b,
      isIsoPaper ? 1.3 : isCinematic ? 0.92 : 0.85
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(
      isIsoPaper ? 0xffffff : 0xfff4e6,
      isIsoPaper ? 2.0 : isCinematic ? 2.3 : 1.85
    );
    keyLight.position.set(10, 15, 12);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(
      isIsoPaper ? 0xe2e8f0 : isCinematic ? 0x38bdf8 : 0x38bdf8,
      isIsoPaper ? 0.95 : isCinematic ? 1.45 : 0.9
    );
    rimLight.position.set(-10, -4, -9);
    scene.add(rimLight);

    if (isCinematic && !isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const overheadBox = new THREE.RectAreaLight(0xffffff, 4.2, 12, 5);
      overheadBox.position.set(0, 9.5, 2.5);
      overheadBox.lookAt(0, 0, 0);
      scene.add(overheadBox);

      const kickerBox = new THREE.RectAreaLight(0xf97316, 2.1, 8, 4);
      kickerBox.position.set(9, 2.5, -7);
      kickerBox.lookAt(0, 0, 0);
      scene.add(kickerBox);
    }

    // Subtle Drafting Grid Floor (hidden in clean publication iso_paper or ultra-light)
    const gridHelper = new THREE.GridHelper(
      18,
      24,
      isIsoPaper ? 0xcbd5e1 : isBlueprint ? 0x38bdf8 : 0x334155,
      isIsoPaper ? 0xe2e8f0 : isBlueprint ? 0x102945 : 0x1e293b
    );
    gridHelper.position.y = -3.85;
    gridHelper.userData._excludeExport = true;
    if (isIsoPaper) {
      const gridMat = gridHelper.material as THREE.Material;
      gridMat.transparent = true;
      gridMat.opacity = 0.45;
    }
    scene.add(gridHelper);

    // Section Clipping Plane
    const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 100);
    const activeClips = [clipPlane];

    const maxAniso = isSoftwareGl ? 1 : Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const textures = createProceduralTextureSet(maxAniso);

    const mkPhysMat = (opts: THREE.MeshPhysicalMaterialParameters) =>
      new THREE.MeshPhysicalMaterial({
        ...opts,
        side: THREE.DoubleSide,
        clippingPlanes: activeClips,
        clipShadows: false,
        wireframe: isToolpath
      });

    const ironColor =
      renderMode === 'stress'
        ? 0x2563eb
        : renderMode === 'thermal'
        ? 0x7c2d12
        : isBlueprint
        ? 0x102845
        : isIsoPaper
        ? 0x8b95a3
        : 0x3b424c;
    const alumColor =
      renderMode === 'stress'
        ? 0x10b981
        : renderMode === 'thermal'
        ? 0xd97706
        : isBlueprint
        ? 0x15355a
        : isIsoPaper
        ? 0xd5dce4
        : 0xc8d0da;
    const steelColor =
      renderMode === 'stress'
        ? 0xef4444
        : renderMode === 'thermal'
        ? 0xf59e0b
        : isBlueprint
        ? 0x1e4976
        : isIsoPaper
        ? 0xcbd5e1
        : 0xcbd5e1;

    const useDetailMaps = renderMode === 'pbr' || renderMode === 'gdt' || renderMode === 'cinematic';

    const mats = {
      iron: mkPhysMat({
        color: ironColor,
        roughness: isIsoPaper ? 0.42 : 0.68,
        metalness: isIsoPaper ? 0.55 : 0.42,
        bumpMap: useDetailMaps ? textures.castIronBump : null,
        bumpScale: 0.032,
        normalMap: useDetailMaps ? textures.castIronNormal : null,
        normalScale: new THREE.Vector2(0.85, 0.85)
      }),
      alum: mkPhysMat({
        color: alumColor,
        roughness: isIsoPaper ? 0.24 : 0.26,
        metalness: isIsoPaper ? 0.82 : 0.88,
        anisotropy: 0.72,
        clearcoat: 0.14,
        map: useDetailMaps ? textures.machinedSwirl : null,
        normalMap: useDetailMaps ? textures.machinedNormal : null,
        normalScale: new THREE.Vector2(0.45, 0.45)
      }),
      ghostBaseBlock: mkPhysMat({
        color: isIsoPaper ? 0xe2e8f0 : 0x334155,
        roughness: 0.45,
        metalness: 0.25,
        transparent: true,
        opacity: isIsoPaper ? 0.32 : 0.24,
        depthWrite: false
      }),
      clearHousing: mkPhysMat({
        color: isIsoPaper ? 0xeaf0f6 : 0xcbe4ff,
        roughness: 0.12,
        metalness: 0.08,
        clearcoat: 0.85,
        transparent: true,
        opacity: isIsoPaper ? 0.34 : 0.32,
        depthWrite: false
      }),
      pistonAlum: mkPhysMat({
        color:
          renderMode === 'stress'
            ? 0xfacc15
            : renderMode === 'thermal'
            ? 0xf97316
            : alumColor,
        roughness: 0.22,
        metalness: 0.86,
        anisotropy: 0.75,
        map: useDetailMaps ? textures.pistonSkirtMoly : null,
        normalMap: useDetailMaps ? textures.machinedNormal : null,
        normalScale: new THREE.Vector2(0.35, 0.35)
      }),
      steel: mkPhysMat({
        color: steelColor,
        roughness: 0.18,
        metalness: 0.94,
        anisotropy: 0.85,
        clearcoat: 0.18,
        normalMap: useDetailMaps ? textures.machinedNormal : null,
        normalScale: new THREE.Vector2(0.32, 0.32)
      }),
      honed: mkPhysMat({
        color: renderMode === 'thermal' ? 0xf97316 : 0xb0bac5,
        roughness: 0.16,
        metalness: 0.92,
        anisotropy: 0.8,
        map: useDetailMaps ? textures.crosshatchHone : null
      }),
      damperTape: mkPhysMat({
        color: 0xffffff,
        roughness: 0.32,
        metalness: 0.55,
        map: useDetailMaps ? textures.harmonicTimingTape : null
      }),
      bronze: mkPhysMat({
        color: 0xd97706,
        roughness: 0.26,
        metalness: 0.90,
        anisotropy: 0.55
      }),
      copperCoil: mkPhysMat({
        color: 0xc26d27,
        roughness: 0.24,
        metalness: 0.90,
        anisotropy: 0.62
      }),
      anBlue: mkPhysMat({
        color: renderMode === 'stress' ? 0xf59e0b : 0x0284c7,
        roughness: 0.22,
        metalness: 0.84,
        anisotropy: 0.6,
        clearcoat: 0.35
      }),
      anRed: mkPhysMat({
        color: 0xdc2626,
        roughness: 0.24,
        metalness: 0.82,
        clearcoat: 0.35
      }),
      goldZinc: mkPhysMat({
        color: 0xd4a938,
        roughness: 0.30,
        metalness: 0.82,
        clearcoat: 0.25
      }),
      darkSteel: mkPhysMat({
        color: isIsoPaper ? 0x334155 : 0x1e242d,
        roughness: 0.42,
        metalness: 0.78,
        bumpMap: useDetailMaps ? textures.boltThreadBump : null,
        bumpScale: 0.018
      }),
      ceramic: mkPhysMat({
        color: 0xf8fafc,
        roughness: 0.14,
        metalness: 0.06,
        clearcoat: 0.85
      }),
      highlight: mkPhysMat({
        color: 0xf97316,
        emissive: 0x9a3412,
        emissiveIntensity: 0.45,
        roughness: 0.22,
        metalness: 0.65,
        clearcoat: 0.35
      }),
      techLine: new THREE.LineBasicMaterial({
        color: isIsoPaper ? 0x1e293b : isBlueprint ? 0x38bdf8 : isToolpath ? 0x22d3ee : 0x64748b,
        transparent: true,
        opacity: isIsoPaper ? 0.78 : isBlueprint ? 0.92 : 0.45
      })
    };
    highlightMatRef.current = mats.highlight;

    // Build Part Assembly + Sub-Part Catalog & 3D Anchor Nodes
    const partGroup = new THREE.Group();
    const subPartEntries: SubPartAnchorEntry[] = [];
    const dimBarEntries: DimensionBarEntry[] = [];

    const registerSubPart = (
      obj: THREE.Object3D,
      spec: SelectedSubPartSpec,
      anchorLocal: [number, number, number]
    ) => {
      obj.userData.subPart = spec;
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.userData.subPartId = spec.id;
          child.userData._origMat = child.material;
        }
      });
      if (!subPartEntries.some((s) => s.spec.id === spec.id)) {
        const anchorObj = new THREE.Object3D();
        anchorObj.position.set(anchorLocal[0], anchorLocal[1], anchorLocal[2]);
        partGroup.add(anchorObj);
        subPartEntries.push({ spec, anchorObj });
      }
    };

    const registerDimension = (
      id: string,
      label: string,
      start: [number, number, number],
      end: [number, number, number],
      offsetX = 0,
      offsetY = 0
    ) => {
      const startObj = new THREE.Object3D();
      startObj.position.set(start[0], start[1], start[2]);
      const endObj = new THREE.Object3D();
      endObj.position.set(end[0], end[1], end[2]);
      partGroup.add(startObj, endObj);
      dimBarEntries.push({ id, label, startObj, endObj, offsetX, offsetY });
    };

    const boreR = (config.bore / 4.0) * 0.92;
    const strokeScale = config.stroke / 3.48;
    const rodScale = config.rodLength / 5.7;
    const cylCount = config.cylinders ?? 8;
    const intakePortCc = config.intakePortCc ?? 185;
    const intakeValveIn = config.intakeValveIn ?? 2.02;
    const exhaustPortCc = config.exhaustPortCc ?? 68;
    const exhaustPortShape = config.exhaustPortShape || 'd_port';
    const exhaustValveIn = config.exhaustValveIn ?? 1.6;
    const headerPrimaryIn = config.headerPrimaryIn ?? 1.625;
    const carbStyle = config.carbStyle || '4150_dp';
    const carbVenturiIn = config.carbVenturiIn ?? 1.375;
    const airBonus = config.airFilterCfmBonus ?? 15;

    if (partKey === 'block') {
      const lengthZ = cylCount <= 4 ? 5.6 : cylCount <= 6 ? 7.6 : 9.8;
      const blockMesh = new THREE.Mesh(createV8BlockProfileGeometry(lengthZ), mats.iron);
      partGroup.add(blockMesh);
      registerSubPart(
        blockMesh,
        {
          id: 'block_casting',
          label: 'HIGH-NICKEL CAST BLOCK',
          category: 'Cylinder Block',
          material: 'SAE J431 Class 35 Iron (or 356-T6 Aluminum)',
          dimensions: `Deck ${config.deckHeight.toFixed(3)}" · 4.400" Bore Spacing`,
          tolerance: 'Deck Flatness 0.0010" TIR',
          flowOrTorque: 'Head Studs: 70 ft-lbs ARP',
          notes: 'Siamese-wall cylinder webs with priority main oiling galleys.',
          sideHint: 'left'
        },
        [-2.2, 0.2, 2.2]
      );

      [-1, 1].forEach((side) => {
        const bankRot = -side * (Math.PI / 4);
        const deckPlate = new THREE.Mesh(
          new THREE.BoxGeometry(2.7, 0.12, lengthZ - 0.15),
          mats.alum
        );
        deckPlate.position.set(side * 1.48, 1.88, 0);
        deckPlate.rotation.z = bankRot;
        partGroup.add(deckPlate);
        if (side === 1) {
          registerSubPart(
            deckPlate,
            {
              id: 'block_deck',
              label: 'MACHINED DECK SURFACE',
              category: 'Cylinder Block',
              material: 'CNC Fly-Cut Datum B',
              dimensions: `${config.deckHeight.toFixed(3)}" Centerline-to-Deck`,
              tolerance: 'Ra ≤ 30 µin MLS Finish',
              flowOrTorque: `Quench: ${specs.quenchDistance}"`,
              notes: 'MLS-ready surface perpendicular to main bearing line bore.',
              sideHint: 'right'
            },
            [1.65, 2.05, 1.4]
          );
        }

        [-lengthZ * 0.33, 0, lengthZ * 0.33].forEach((pz, pi) => {
          const freezePlug = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.40, 0.16, 22),
            mats.bronze
          );
          freezePlug.rotation.z = Math.PI / 2;
          freezePlug.position.set(side * 3.12, -0.55, pz);
          partGroup.add(freezePlug);
          if (side === 1 && pi === 1) {
            registerSubPart(
              freezePlug,
              {
                id: 'block_freeze_plugs',
                label: 'BRASS CORE FREEZE PLUGS',
                category: 'Cooling Jacket',
                material: 'C260 Cartridge Brass (1-5/8" Cup)',
                dimensions: 'Ø 1.625" Deep-Cup Press Fit',
                tolerance: '+0.002"/-0.001" Press',
                flowOrTorque: '15 PSI Coolant Seal',
                notes: 'Corrosion-resistant brass water-jacket expansion plugs.',
                sideHint: 'right'
              },
              [3.2, -0.55, 0]
            );
          }
        });
      });

      const sleevesPerSide = Math.max(2, Math.min(4, Math.floor(cylCount / 2)));
      const sleeveGroup = new THREE.Group();
      for (let i = 0; i < sleevesPerSide; i++) {
        const zOff = -((sleevesPerSide - 1) * 1.15) + i * 2.3;
        [-1, 1].forEach((side) => {
          const bankRot = -side * (Math.PI / 4);
          const liner = new THREE.Mesh(
            new THREE.CylinderGeometry(boreR, boreR, 2.95, 34, 1, true),
            mats.honed
          );
          liner.position.set(side * 1.38, 0.95, zOff);
          liner.rotation.z = bankRot;
          sleeveGroup.add(liner);

          const fireRing = new THREE.Mesh(
            new THREE.TorusGeometry(boreR + 0.04, 0.032, 8, 32),
            mats.bronze
          );
          fireRing.position.set(side * 2.15, 1.72, zOff);
          fireRing.rotation.set(Math.PI / 2, 0, bankRot);
          sleeveGroup.add(fireRing);
        });
      }
      partGroup.add(sleeveGroup);
      registerSubPart(
        sleeveGroup,
        {
          id: 'block_bores',
          label: 'PLATEAU-HONED CYLINDER BORE',
          category: 'Cylinder Wall',
          material: '45° Crosshatch Torque-Plate Honed',
          dimensions: `Ø ${config.bore.toFixed(3)}" Bore × ${specs.displacementCi} CID`,
          tolerance: '⌭ 0.0004" Taper / Out-of-Round',
          flowOrTorque: `PTW: ${specs.ptwClearance}`,
          notes: '280/400-grit plateau hone for rapid moly ring seating.',
          sideHint: 'left'
        },
        [-2.05, 1.85, -1.15]
      );

      const camBearing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.56, 0.56, 0.42, 24, 1, true),
        mats.bronze
      );
      camBearing.rotation.x = Math.PI / 2;
      camBearing.position.set(0, 0.62, lengthZ * 0.48);
      partGroup.add(camBearing);
      registerSubPart(
        camBearing,
        {
          id: 'block_cam_tunnel',
          label: 'CAM TUNNEL & OIL GALLERY',
          category: 'Oiling System',
          material: 'Babbitt-Lined Steel Cam Bearing',
          dimensions: 'Ø 2.000" Cam Tunnel · 3/8" NPT Galley',
          tolerance: '0.0015"–0.0025" Radial Clear',
          flowOrTorque: '65 PSI Priority Main Feed',
          notes: 'Indexed oil feed holes aligned to main bulkhead drillings.',
          sideHint: 'right'
        },
        [0, 0.62, lengthZ * 0.48]
      );

      const capGroup = new THREE.Group();
      for (let m = 0; m < 4; m++) {
        const mz = -3.4 + m * 2.25;
        const cap = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.72, 0.74), mats.steel);
        cap.position.set(0, -1.65, mz);
        capGroup.add(cap);
        [-0.78, 0.78].forEach((bx) => {
          const stud = createARP12PointBolt(0.08, 0.75, mats.anBlue);
          stud.position.set(bx, -2.02, mz);
          stud.rotation.x = Math.PI;
          capGroup.add(stud);
        });
        [-1.22, 1.22].forEach((sx, si) => {
          const splayed = createARP12PointBolt(0.072, 0.8, mats.darkSteel);
          splayed.position.set(sx, -1.96, mz);
          splayed.rotation.set(Math.PI, 0, si === 0 ? -0.26 : 0.26);
          capGroup.add(splayed);
        });
      }
      partGroup.add(capGroup);
      registerSubPart(
        capGroup,
        {
          id: 'block_main_caps',
          label: 'SPLAYED 4-BOLT MAIN CAPS',
          category: 'Bottom End',
          material: '1045 Billet Steel Caps + ARP 8740 Studs',
          dimensions: 'Ø 2.6410" Main Housing Bore',
          tolerance: '◎ 0.0005" Line Hone Datum A',
          flowOrTorque: 'Inner: 70 ft-lbs · Outer Splayed: 65 ft-lbs',
          notes: '16° splayed outer fasteners tie into pan rail webbing.',
          sideHint: 'left'
        },
        [0, -2.0, 2.8]
      );

      registerDimension('dim_bore', `Ø ${config.bore.toFixed(3)} IN. BORE`, [-1.6, 2.1, -1.15], [-0.95, 2.5, -1.15], -34, -22);
      registerDimension('dim_deck', `${config.deckHeight.toFixed(3)} IN. DECK HT`, [0, -1.65, 3.6], [1.9, 1.9, 3.6], 42, 0);
    } else if (partKey === 'crank') {
      const throwR = 0.85 * strokeScale;
      const snoutGroup = new THREE.Group();
      const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 1.45, 28), mats.steel);
      snout.rotation.x = Math.PI / 2;
      snout.position.z = 4.55;
      snoutGroup.add(snout);
      const keyway = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 1.1), mats.darkSteel);
      keyway.position.set(0, 0.45, 4.65);
      snoutGroup.add(keyway);
      const snoutSpline = new THREE.Mesh(createSplineShaftGeometry(0.47, 0.55, 20), mats.steel);
      snoutSpline.position.z = 4.1;
      snoutGroup.add(snoutSpline);
      partGroup.add(snoutGroup);
      registerSubPart(
        snoutGroup,
        {
          id: 'crank_snout',
          label: 'KEYED DAMPER SNOUT',
          category: 'Front Drive',
          material: '4340 Forged Chromoly (Rc 38–42)',
          dimensions: 'Ø 1.2485" Snout · Dual 3/16" Keyways',
          tolerance: '-0.0008" Damper Press Fit',
          flowOrTorque: 'Balancer Bolt: 65 ft-lbs (7/16-20)',
          notes: 'Dual Woodruff key slots resist blower / high-RPM hub slip.',
          sideHint: 'right'
        },
        [0, 0.45, 4.6]
      );

      const flangeGroup = new THREE.Group();
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.34, 32), mats.steel);
      flange.rotation.x = Math.PI / 2;
      flange.position.z = -4.55;
      flangeGroup.add(flange);
      const pilotBushing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.38, 20, 1, true),
        mats.bronze
      );
      pilotBushing.rotation.x = Math.PI / 2;
      pilotBushing.position.z = -4.56;
      flangeGroup.add(pilotBushing);
      for (let fb = 0; fb < 6; fb++) {
        const ang = (fb / 6) * Math.PI * 2;
        const fBolt = createARP12PointBolt(0.065, 0.35, mats.anBlue);
        fBolt.position.set(Math.cos(ang) * 0.86, Math.sin(ang) * 0.86, -4.74);
        fBolt.rotation.x = -Math.PI / 2;
        flangeGroup.add(fBolt);
      }
      partGroup.add(flangeGroup);
      registerSubPart(
        flangeGroup,
        {
          id: 'crank_flange',
          label: 'REAR FLEXPLATE FLANGE',
          category: 'Driveline Interface',
          material: '4340 Integral Flange + Bronze Pilot',
          dimensions: '3.58" 6-Bolt Circle · 1-Piece/2-Piece Seal',
          tolerance: '0.0005" Face Runout',
          flowOrTorque: 'Flexplate ARP Bolts: 74 ft-lbs',
          notes: 'Oilite bronze pilot bushing bore concentric to main axis.',
          sideHint: 'left'
        },
        [0, 0.9, -4.65]
      );

      const mainGroup = new THREE.Group();
      for (let j = 0; j < 5; j++) {
        const mz = -3.6 + j * 1.8;
        const main = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.68, 32), mats.honed);
        main.rotation.x = Math.PI / 2;
        main.position.z = mz;
        mainGroup.add(main);
        const oilHole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.28, 12), mats.darkSteel);
        oilHole.position.set(0, 0, mz);
        mainGroup.add(oilHole);
        if (j === 4) {
          [-0.36, 0.36].forEach((tz) => {
            const thrust = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.07, 28), mats.bronze);
            thrust.rotation.x = Math.PI / 2;
            thrust.position.z = mz + tz;
            mainGroup.add(thrust);
          });
        }
      }
      partGroup.add(mainGroup);
      registerSubPart(
        mainGroup,
        {
          id: 'crank_mains',
          label: 'CROSS-DRILLED MAIN JOURNALS',
          category: 'Hydrodynamic Bearing',
          material: 'Nitride-Hardened Micro-Polished Journals',
          dimensions: 'Ø 2.4488" Main Journal · 0.0022" Clearance',
          tolerance: '⌰ 0.0003" Total Runout · Ra ≤ 8 µin',
          flowOrTorque: 'Endplay: 0.004"–0.006"',
          notes: 'Chamfered 180° cross-drillings feed continuous oil wedge to rod pins.',
          sideHint: 'right'
        },
        [0, 0.62, 1.8]
      );

      const pinGroup = new THREE.Group();
      const cwGroup = new THREE.Group();
      const phases = [0, Math.PI / 2, (3 * Math.PI) / 2, Math.PI];
      for (let t = 0; t < 4; t++) {
        const tz = -2.7 + t * 1.8;
        const angle = phases[t];
        const px = Math.cos(angle) * throwR;
        const py = Math.sin(angle) * throwR;

        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.92, 28), mats.honed);
        pin.rotation.x = Math.PI / 2;
        pin.position.set(px, py, tz);
        pinGroup.add(pin);

        const pinOilHole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 1.08, 10),
          mats.darkSteel
        );
        pinOilHole.position.set(px, py, tz);
        pinOilHole.rotation.z = angle;
        pinGroup.add(pinOilHole);

        [-0.58, 0.58].forEach((czOff) => {
          const cw = new THREE.Mesh(createCounterweightGeometry(1.65, 0.34), mats.steel);
          cw.position.z = tz + czOff;
          cw.rotation.z = angle + Math.PI / 2;
          cwGroup.add(cw);

          const mallory = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.16, 0.36, 14),
            mats.goldZinc
          );
          mallory.rotation.x = Math.PI / 2;
          mallory.position.set(
            Math.cos(angle + Math.PI) * 1.15,
            Math.sin(angle + Math.PI) * 1.15,
            tz + czOff
          );
          cwGroup.add(mallory);
        });
      }
      partGroup.add(pinGroup, cwGroup);
      registerSubPart(
        pinGroup,
        {
          id: 'crank_rod_pins',
          label: 'CRANKPIN THROW JOURNALS',
          category: 'Stroke Throw',
          material: 'Induction-Fillet Rolled 4340',
          dimensions: `Ø 2.0998" Pin · ${config.stroke.toFixed(3)}" Total Stroke`,
          tolerance: '○ 0.0002" Roundness · 0.125" Radius Fillet',
          flowOrTorque: `Throw Radius: ${(config.stroke * 0.5).toFixed(3)}"`,
          notes: '90° cross-plane V8 phasing balanced within 0.5 gram.',
          sideHint: 'left'
        },
        [0, throwR, -0.9]
      );
      registerSubPart(
        cwGroup,
        {
          id: 'crank_counterweights',
          label: 'PROFILING & MALLORY WEIGHTS',
          category: 'Dynamic Balance',
          material: 'Knife-Edged Webs + Tungsten Inserts',
          dimensions: '6.85" Swing Diameter · 1,780g Bobweight',
          tolerance: 'ISO 1940 G1.0 Internal Balance',
          flowOrTorque: 'Balanced to 8,500 RPM',
          notes: 'Heavy-metal Mallory slugs allow zero external flywheel imbalance.',
          sideHint: 'right'
        },
        [0, -1.25, 0.32]
      );

      registerDimension('dim_stroke', `${config.stroke.toFixed(3)} IN. STROKE THROW`, [0, -throwR, -0.9], [0, throwR, 0.9], -40, 0);
      registerDimension('dim_crank_len', '24.750 IN. OVERALL LENGTH', [0, 1.35, -4.6], [0, 1.35, 4.7], 0, -28);
    } else if (partKey === 'rotating_rod') {
      const rodC2C = 4.2 * rodScale;
      const rod = createHBeamConnectingRod(rodC2C, 0.85, 0.44, mats.steel, mats.bronze, mats.anBlue);
      rod.position.y = -rodC2C * 0.45;
      partGroup.add(rod);

      // Register distinct clickable overlays on rod zones
      const pinZone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.46, 0.92, 20),
        mats.bronze
      );
      pinZone.rotation.x = Math.PI / 2;
      pinZone.position.y = rodC2C * 0.55;
      partGroup.add(pinZone);
      registerSubPart(
        pinZone,
        {
          id: 'rod_small_end',
          label: 'SILICON-BRONZE PIN BUSHING',
          category: 'Small End',
          material: 'Ampco-45 Silicon Bronze Bushing',
          dimensions: 'Ø 0.9272" Full-Floating Pin Bore',
          tolerance: '∥ 0.0008" Parallel to Big End',
          flowOrTorque: 'Pin Oil Clearance: 0.0007"',
          notes: 'Figure-8 oil groove honed to fit DLC-coated 9310 wrist pin.',
          sideHint: 'left'
        },
        [0, rodC2C * 0.55, 0.46]
      );

      const beamZone = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, rodC2C * 0.56, 0.46),
        mats.steel
      );
      beamZone.position.y = rodC2C * 0.06;
      partGroup.add(beamZone);
      registerSubPart(
        beamZone,
        {
          id: 'rod_hbeam',
          label: '4340 H-BEAM SHANK',
          category: 'Column Section',
          material: 'Vacuum-Degassed 4340 Forged Billet',
          dimensions: `${config.rodLength.toFixed(3)}" C-to-C · ${specs.rodStrokeRatio}:1 R/S`,
          tolerance: '±0.5g Total / ±0.3g End-to-End',
          flowOrTorque: 'Max Angle: ' + specs.maxRodAngleDeg + '°',
          notes: 'Shot-peened and 100% Mag-fluxed for 1,200+ HP compressive stability.',
          sideHint: 'right'
        },
        [0.32, rodC2C * 0.06, 0]
      );

      const bigEndZone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.88, 0.88, 0.92, 24),
        mats.steel
      );
      bigEndZone.rotation.x = Math.PI / 2;
      bigEndZone.position.y = -rodC2C * 0.45;
      partGroup.add(bigEndZone);
      registerSubPart(
        bigEndZone,
        {
          id: 'rod_big_end',
          label: 'HOUSED BIG END & ARP 2000 BOLTS',
          category: 'Cap & Fasteners',
          material: 'Precision Cap-Screw Dowel Alignment',
          dimensions: 'Ø 2.2250" Housing Bore (2.100" Journal)',
          tolerance: '⌭ 0.0002" Roundness · 0.0023" Oil Clear',
          flowOrTorque: 'ARP 2000: 63 ft-lbs (0.0055" Stretch)',
          notes: 'Dual precision hollow dowels prevent cap walk at 8,000+ RPM.',
          sideHint: 'left'
        },
        [-0.85, -rodC2C * 0.45, 0.25]
      );

      registerDimension('dim_rod_c2c', `${config.rodLength.toFixed(3)} IN. C-TO-C`, [0.95, -rodC2C * 0.45, 0], [0.95, rodC2C * 0.55, 0], 45, 0);
      registerDimension('dim_rod_big', 'Ø 2.2250 IN. BIG END', [-0.88, -rodC2C * 0.45, 0], [0.88, -rodC2C * 0.45, 0], 0, 32);
    } else if (partKey === 'rotating_piston') {
      const pR = boreR * 1.65;
      const pistonAsm = createDetailedPistonAssembly(
        pR,
        mats.pistonAlum,
        mats.darkSteel,
        mats.honed,
        mats.darkSteel,
        mats.bronze,
        mats.steel,
        mats.anRed
      );
      pistonAsm.scale.setScalar(1.35);
      partGroup.add(pistonAsm);

      const crownAnchorMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(pR * 1.32, pR * 1.32, 0.22, 32),
        mats.pistonAlum
      );
      crownAnchorMesh.position.y = 1.05;
      partGroup.add(crownAnchorMesh);
      registerSubPart(
        crownAnchorMesh,
        {
          id: 'piston_crown',
          label: 'FORGED CROWN & VALVE RELIEFS',
          category: 'Combustion Crown',
          material: `${config.pistonAlloy.toUpperCase()} Aerospace Forging`,
          dimensions: `Ø ${config.bore.toFixed(3)}" Bore · -${config.pistonReliefCc.toFixed(1)} cc Relief`,
          tolerance: '⏥ 0.0015" Deck-Parallel Crown',
          flowOrTorque: `Static CR: ${specs.staticCR}:1 · Quench: ${specs.quenchDistance}"`,
          notes: 'CNC radial pockets clear oversized 2.02"–2.125" intake valves.',
          sideHint: 'left'
        },
        [-pR * 0.9, 1.15, 0.5]
      );

      const ringZone = new THREE.Mesh(
        new THREE.TorusGeometry(pR * 1.34, 0.05, 8, 32),
        mats.darkSteel
      );
      ringZone.rotation.x = Math.PI / 2;
      ringZone.position.y = 0.78;
      partGroup.add(ringZone);
      registerSubPart(
        ringZone,
        {
          id: 'piston_rings',
          label: 'PLASMA-MOLY RING PACK',
          category: 'Ring Package',
          material: 'Ductile Plasma-Moly Top / Napier 2nd',
          dimensions: '1/16" · 1/16" · 3/16" Low-Tension',
          tolerance: `Top Gap: ${specs.topRingGap}" · 2nd: ${specs.secondRingGap}"`,
          flowOrTorque: `App: ${config.ringApplication.replace('_', ' ').toUpperCase()}`,
          notes: 'File-fit end gaps prevent ring-end butting under peak cylinder pressure.',
          sideHint: 'right'
        },
        [pR * 1.34, 0.78, 0]
      );

      const skirtZone = new THREE.Mesh(
        new THREE.CylinderGeometry(pR * 1.28, pR * 1.28, 0.95, 28, 1, true),
        mats.pistonAlum
      );
      skirtZone.position.y = -0.35;
      partGroup.add(skirtZone);
      registerSubPart(
        skirtZone,
        {
          id: 'piston_skirt',
          label: 'MOLY-COATED CAM-GROUND SKIRT',
          category: 'Skirt & Pin Boss',
          material: '2618/4032 Elliptical Profile + Dry-Film Lube',
          dimensions: `Ø ${(config.bore - (config.pistonAlloy === '2618' ? 0.0045 : 0.002)).toFixed(4)}" Gauge OD`,
          tolerance: `PTW Clearance: ${specs.ptwClearance}`,
          flowOrTorque: '9310 Tool-Steel .927" Pin',
          notes: 'Thermal barrel-cam profile expands round at 200°F operating temp.',
          sideHint: 'right'
        },
        [pR * 1.25, -0.45, 0.3]
      );

      registerDimension('dim_piston_od', `Ø ${config.bore.toFixed(3)} IN. BORE FIT`, [-pR * 1.35, 1.3, 0], [pR * 1.35, 1.3, 0], 0, -28);
      registerDimension('dim_ring_gap', `TOP GAP ${specs.topRingGap} IN.`, [-pR * 1.35, 0.78, 0], [pR * 1.35, 0.78, 0], 0, -14);
    } else if (partKey === 'heads') {
      // =========================================================================
      // PUBLICATION-GRADE TWIN V-BANK BILLET HEAD UNIT WITH CUTAWAY SOLENOID/ACTUATOR CHAMBERS
      // =========================================================================
      const intPortScale = Math.sqrt(intakePortCc / 185);
      const exhPortScale = Math.sqrt(exhaustPortCc / 68);
      const exhRaisedY = exhaustPortShape === 'raised_runner' || exhaustPortShape === 'cnc_race' ? 0.16 : 0;
      const intValveR = (intakeValveIn / 2.02) * 0.42;
      const exhValveR = (exhaustValveIn / 1.60) * 0.34;

      // Translucent ghost engine block deck underneath so twin heads orient like an authentic isometric V-bank cutaway
      const ghostBlockBase = new THREE.Mesh(
        new THREE.BoxGeometry(6.8, 2.2, 8.8),
        mats.ghostBaseBlock
      );
      ghostBlockBase.position.set(0, -1.75, 0);
      partGroup.add(ghostBlockBase);

      const mainHeadGroup = new THREE.Group();
      const runnersGroup = new THREE.Group();
      const intakePortGroup = new THREE.Group();
      const exhaustPortGroup = new THREE.Group();
      const valveSeatsGroup = new THREE.Group();
      const stemGuidesGroup = new THREE.Group();
      const springsGroup = new THREE.Group();
      const clearChamberGroup = new THREE.Group();
      const solenoidCoilGroup = new THREE.Group();
      const armatureGroup = new THREE.Group();
      const plugWellGroup = new THREE.Group();
      const plugCoilGroup = new THREE.Group();
      const fuelRailGroup = new THREE.Group();

      // V-bank companion angle so Front-Left Head shows detailed exhaust ports & actuator stack,
      // while Rear-Right Bank displays straight-cut intake runners, intake/exhaust ports & valve seats!
      [-1, 1].forEach((bankSide) => {
        const bankRoot = new THREE.Group();
        bankRoot.position.set(bankSide * 2.15, 0.1, 0);
        bankRoot.rotation.z = -bankSide * 0.42;

        // Billet Aluminum Head Casting
        const headCasting = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.55, 8.6), mats.alum);
        headCasting.position.set(0, 0, 0);
        bankRoot.add(headCasting);

        // Valve cover / actuator deck rail
        const deckLip = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.16, 8.66), mats.steel);
        deckLip.position.set(0, 0.82, 0);
        bankRoot.add(deckLip);

        // 4 cylinder stations along Z
        for (let i = 0; i < 4; i++) {
          const z = -3.05 + i * 2.03;

          // Intake Port Boss (inner valley side of head) scaled dynamically with intakePortCc
          const intPort = new THREE.Mesh(
            new THREE.BoxGeometry(
              0.52,
              0.68 * intPortScale,
              0.78 * intPortScale
            ),
            mats.darkSteel
          );
          intPort.position.set(-bankSide * 1.38, 0.08, z);
          bankRoot.add(intPort);
          if (bankSide === 1 && i === 1) {
            intakePortGroup.add(intPort);
          }

          // Straight-cut machined Intake Runner tube bridging across valley
          const runner = new THREE.Mesh(
            new THREE.CylinderGeometry(
              0.31 * intPortScale,
              0.34 * intPortScale,
              1.45,
              18
            ),
            mats.alum
          );
          runner.rotation.z = Math.PI / 2 - bankSide * 0.22;
          runner.position.set(-bankSide * 2.05, 0.28, z);
          bankRoot.add(runner);
          if (bankSide === 1 && i === 2) {
            runnersGroup.add(runner);
          }

          // Exhaust Port Boss (outer header side of head) shaped by exhaustPortShape & exhaustPortCc
          const isDPort = exhaustPortShape === 'd_port' || exhaustPortShape === 'raised_runner';
          const isCncOval = exhaustPortShape === 'cnc_race';
          const exGeo = isCncOval
            ? new THREE.CylinderGeometry(0.36 * exhPortScale, 0.38 * exhPortScale, 0.48, 18)
            : new THREE.BoxGeometry(
                0.46,
                (isDPort ? 0.64 : 0.56) * exhPortScale,
                (isDPort ? 0.88 : 0.82) * exhPortScale
              );
          const exPort = new THREE.Mesh(exGeo, mats.darkSteel);
          if (isCncOval) exPort.rotation.z = Math.PI / 2;
          exPort.position.set(bankSide * 1.36, -0.05 + exhRaisedY, z);
          bankRoot.add(exPort);
          if (bankSide === 1 && i === 1) {
            exhaustPortGroup.add(exPort);
          }

          // Short Stubby Exhaust Flange Collar showing primary OD scaling
          const headerStub = new THREE.Mesh(
            new THREE.CylinderGeometry(
              (headerPrimaryIn / 1.625) * 0.31,
              (headerPrimaryIn / 1.625) * 0.31,
              0.32,
              18
            ),
            mats.steel
          );
          headerStub.rotation.z = Math.PI / 2;
          headerStub.position.set(bankSide * 1.54, -0.05 + exhRaisedY, z);
          bankRoot.add(headerStub);

          // Intake + Exhaust Valves, Linear Valve Stem Guides, Springs, Pneumatic Chambers, Copper Solenoid Coils & Armatures
          [-0.45, 0.45].forEach((vzOff, vi) => {
            const zValve = z + vzOff * 0.65;
            const xValve = vi === 0 ? -bankSide * 0.36 : bankSide * 0.36;

            // Valve Face & 5-Angle Seat protruding slightly under deck
            const seat = new THREE.Mesh(
              new THREE.TorusGeometry(vi === 0 ? intValveR : exhValveR, 0.05, 10, 22),
              mats.bronze
            );
            seat.rotation.x = Math.PI / 2;
            seat.position.set(xValve, -0.82, zValve);
            bankRoot.add(seat);

            const valveFace = new THREE.Mesh(
              new THREE.CylinderGeometry(
                vi === 0 ? intValveR : exhValveR,
                (vi === 0 ? intValveR : exhValveR) * 0.72,
                0.12,
                22
              ),
              mats.honed
            );
            valveFace.position.set(xValve, -0.90, zValve);
            bankRoot.add(valveFace);
            if (bankSide === 1 && i === 2 && vi === 0) {
              valveSeatsGroup.add(valveFace);
            }

            // Bronze Linear Valve Stem Guide
            const stemGuide = new THREE.Mesh(
              new THREE.CylinderGeometry(0.16, 0.18, 0.68, 16),
              mats.bronze
            );
            stemGuide.position.set(xValve, 0.92, zValve);
            bankRoot.add(stemGuide);
            if (bankSide === 1 && i === 2 && vi === 1) {
              stemGuidesGroup.add(stemGuide);
            }

            // Polished Valve Stem / Armature Shaft
            const stem = new THREE.Mesh(
              new THREE.CylinderGeometry(0.065, 0.065, 2.75, 12),
              mats.honed
            );
            stem.position.set(xValve, 0.55, zValve);
            bankRoot.add(stem);

            // Helical Valve Spring & Titanium Retainer
            const spring = new THREE.Mesh(
              createHelicalSpringGeometry(0.24, 0.04, 0.78, 5),
              mats.steel
            );
            spring.position.set(xValve, 1.18, zValve);
            bankRoot.add(spring);

            const retainer = new THREE.Mesh(
              new THREE.CylinderGeometry(0.27, 0.19, 0.11, 18),
              mats.anBlue
            );
            retainer.position.set(xValve, 1.56, zValve);
            bankRoot.add(retainer);
            if (bankSide === -1 && i === 2 && vi === 0) {
              springsGroup.add(spring);
            }

            // Internal Steel Armature Disk & Plunger above spring
            const armature = new THREE.Mesh(
              new THREE.CylinderGeometry(0.22, 0.22, 0.36, 18),
              mats.steel
            );
            armature.position.set(xValve, 1.98, zValve);
            bankRoot.add(armature);
            if (bankSide === 1 && i === 0 && vi === 0) {
              armatureGroup.add(armature);
            }

            // Wound Copper Solenoid Coil inside Cutaway Pneumatic Cushioning Housing
            const copperSolenoid = new THREE.Mesh(
              new THREE.CylinderGeometry(0.26, 0.26, 0.54, 20),
              mats.copperCoil
            );
            copperSolenoid.position.set(xValve, 2.38, zValve);
            bankRoot.add(copperSolenoid);
            if (bankSide === 1 && i === 0 && vi === 1) {
              solenoidCoilGroup.add(copperSolenoid);
            }

            // Translucent Cutaway Pneumatic Cushioning Chamber Shell
            const chamberShell = new THREE.Mesh(
              new THREE.BoxGeometry(0.68, 1.25, 0.68),
              mats.clearHousing
            );
            chamberShell.position.set(xValve, 2.18, zValve);
            bankRoot.add(chamberShell);
            if (bankSide === 1 && i === 1 && vi === 0) {
              clearChamberGroup.add(chamberShell);
            }

            // Actuator Cap & Electrical Lead Nipple
            const capTop = new THREE.Mesh(
              new THREE.CylinderGeometry(0.22, 0.28, 0.18, 16),
              mats.darkSteel
            );
            capTop.position.set(xValve, 2.86, zValve);
            bankRoot.add(capTop);
          });

          // Spark Plug Well + Coil Pack mounted along outer face
          const plugWell = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.16, 0.56, 14),
            mats.steel
          );
          plugWell.rotation.z = -bankSide * 0.85;
          plugWell.position.set(bankSide * 1.48, 0.52, z + 0.36);
          bankRoot.add(plugWell);
          if (bankSide === 1 && i === 2) {
            plugWellGroup.add(plugWell);
          }

          const plugCoil = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.44, 0.42),
            mats.darkSteel
          );
          plugCoil.position.set(bankSide * 1.72, 0.82, z + 0.36);
          bankRoot.add(plugCoil);
          if (bankSide === 1 && i === 2) {
            plugCoilGroup.add(plugCoil);
          }
        }

        // Top Billet Fuel Rail + AN Fuel Line Connectors arching across twin banks
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 8.2), mats.darkSteel);
        rail.position.set(-bankSide * 0.95, 2.95, 0);
        bankRoot.add(rail);

        const anConn = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.16, 0.42, 6),
          mats.anBlue
        );
        anConn.rotation.x = Math.PI / 2;
        anConn.position.set(-bankSide * 0.95, 2.95, 4.25);
        bankRoot.add(anConn);
        if (bankSide === 1) {
          fuelRailGroup.add(anConn);
        }

        if (bankSide === -1) {
          mainHeadGroup.add(headCasting);
        }
        partGroup.add(bankRoot);
      });

      // Overhead Crossover Fuel Harness Tube connecting twin head rails
      const crossoverCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.35, 3.35, 3.8),
        new THREE.Vector3(0, 3.72, 4.05),
        new THREE.Vector3(1.35, 3.35, 3.8)
      ]);
      const crossoverLine = new THREE.Mesh(
        new THREE.TubeGeometry(crossoverCurve, 18, 0.08, 8, false),
        mats.darkSteel
      );
      partGroup.add(crossoverLine);

      // Register individual selectable components & SVG leader anchor points matching reference illustration
      registerSubPart(
        mainHeadGroup,
        {
          id: 'head_billet_casting',
          label: 'BILLET ALUMINUM HEAD',
          category: 'Cylinder Head Structure',
          material: '6061-T6 / A356-T6 Aerospace Billet Casting',
          dimensions: `12.000" Head Width · ${config.chamberCc.toFixed(1)} cc Chamber`,
          tolerance: '⏥ 0.0015" Deck Flatness · Ra ≤ 24 µin',
          flowOrTorque: `7.750" Chamber Height · ARP 70 ft-lbs`,
          notes: 'CNC-machined twin-bank cylinder head with 4.400" bore spacing.',
          sideHint: 'right'
        },
        [2.7, -0.5, 3.9]
      );

      registerSubPart(
        fuelRailGroup,
        {
          id: 'head_fuel_connectors',
          label: 'EFI / FUEL LINE CONNECTORS',
          category: 'Fuel Distribution',
          material: '6061-T6 Anodized Billet -8 AN Fittings',
          dimensions: '8.500" Injector Rail Spacing',
          tolerance: '±0.002" Rail Bore Concentricity',
          flowOrTorque: '60 PSI Operating Rail Pressure',
          notes: 'Quick-disconnect billet AN fuel line junctions and braided crossover.',
          sideHint: 'right'
        },
        [0.45, 3.55, 4.1]
      );

      registerSubPart(
        solenoidCoilGroup,
        {
          id: 'head_solenoid_coil',
          label: 'SOLENOID COIL',
          category: 'Electro-Pneumatic Valve Actuator',
          material: 'High-Temp Polyimide Magnet Copper Winding',
          dimensions: 'Ø 0.520" Coil Stack · 48V High-Speed Driver',
          tolerance: '±0.015 ms Response Jitter',
          flowOrTorque: 'Max 9,500 RPM Valve Control',
          notes: 'Cutaway housing reveals copper actuator windings driving camless/linear stem.',
          sideHint: 'right'
        },
        [2.75, 2.5, -2.6]
      );

      registerSubPart(
        armatureGroup,
        {
          id: 'head_armature',
          label: 'ARMATURE',
          category: 'Actuator Plunger',
          material: 'Permendur High-Flux Cobalt Iron',
          dimensions: '0.440" Plunger Diameter · 0.550" Stroke',
          tolerance: '0.0004" Radial Air Gap',
          flowOrTorque: `Max Lift: ${specs.totalValveLift}"`,
          notes: 'Low-mass ferromagnetic armature coupled directly to valve keeper collar.',
          sideHint: 'right'
        },
        [2.85, 1.9, -2.0]
      );

      registerSubPart(
        clearChamberGroup,
        {
          id: 'head_cushion_chamber',
          label: 'PNEUMATIC CUSHIONING CHAMBER',
          category: 'Cutaway Actuator Housing',
          material: 'Clear Polycarbonate Inspection Cutaway / 7075 Housing',
          dimensions: '14.375" Actuator Array Height',
          tolerance: '0.0005" Bore Concentricity',
          flowOrTorque: '120 PSI Nitrogen Return Assist',
          notes: 'Damps valve seating velocity below 0.15 m/s to prevent seat bounce.',
          sideHint: 'right'
        },
        [2.95, 1.7, -0.8]
      );

      registerSubPart(
        stemGuidesGroup,
        {
          id: 'head_stem_guide',
          label: 'LINEAR VALVE STEM GUIDE',
          category: 'Valvetrain Guide',
          material: 'Manganese-Bronze C67400 Precision Sleeve',
          dimensions: 'Ø 0.3415" ID (11/32" Stem)',
          tolerance: '0.0012"–0.0018" Stem-to-Guide Clear',
          flowOrTorque: 'Viton Positive Stem Seals',
          notes: 'Spiral-honed bronze guide maintains concentric valve seating under heat.',
          sideHint: 'right'
        },
        [2.65, 0.85, 0.9]
      );

      registerSubPart(
        valveSeatsGroup,
        {
          id: 'head_valve_face_seat',
          label: 'VALVE FACE AND SEAT',
          category: 'Combustion Seal',
          material: 'Inconel 751 / Stainless Valves + Sintered Powder Seats',
          dimensions: `Ø ${intakeValveIn.toFixed(3)}" Int / Ø ${exhaustValveIn.toFixed(3)}" Exh`,
          tolerance: '5-Angle CNC Seat Profile (30°/45°/60°)',
          flowOrTorque: `${specs.intakeFlowPeakCfm} CFM Int / ${specs.exhaustFlowPeakCfm} CFM Exh`,
          notes: 'Multi-angle Serdi-cut valve job maximizes low-lift curtain flow.',
          sideHint: 'right'
        },
        [2.45, -0.7, 1.1]
      );

      registerSubPart(
        runnersGroup,
        {
          id: 'head_straight_runner',
          label: 'STRAIGHT-CUT INTAKE RUNNER',
          category: 'Air / Port Modification',
          material: '5-Axis CNC Ported Aluminum Runner',
          dimensions: `${intakePortCc} cc Runner Volume · ${specs.intakeVelocityFps} ft/s`,
          tolerance: '±1.5 cc Runner-to-Runner Balance',
          flowOrTorque: `${specs.intakeFlowPeakCfm} CFM @ 28" H2O`,
          notes: 'Straight-shot line-of-sight entry reduces wet-flow fuel separation.',
          sideHint: 'right'
        },
        [1.15, 0.65, 1.3]
      );

      registerSubPart(
        intakePortGroup,
        {
          id: 'head_intake_port',
          label: 'INTAKE PORT',
          category: 'Air / Intake Port Mod',
          material: 'CNC Ported Rectangle / Raised Runner',
          dimensions: `${intakePortCc} cc Volume · ${intakeValveIn.toFixed(2)}" Valve`,
          tolerance: 'Ra 60–90 µin Textured Atomization',
          flowOrTorque: `${specs.intakeFlowPeakCfm} CFM Peak Flow`,
          notes: 'Adjust Intake Port cc and Valve Dia in tuning bar to resize port cross-section.',
          sideHint: 'right'
        },
        [1.9, 0.2, -0.9]
      );

      registerSubPart(
        exhaustPortGroup,
        {
          id: 'head_exhaust_port',
          label: 'EXHAUST PORT',
          category: 'Exhaust Port & Header Mod',
          material: `${exhaustPortShape.replace('_', '-').toUpperCase()} Port Casting`,
          dimensions: `${exhaustPortCc} cc · ${exhaustValveIn.toFixed(2)}" Valve · ${headerPrimaryIn.toFixed(3)}" Pri`,
          tolerance: 'Ra ≤ 32 µin Mirror-Polished Chamber',
          flowOrTorque: `${specs.exhaustFlowPeakCfm} CFM (${specs.eiFlowRatioPct}% E/I)`,
          notes: 'Adjust Exhaust Port Shape, Volume & Primary Header OD to reshape port.',
          sideHint: 'right'
        },
        [3.35, -0.15 + exhRaisedY, -0.9]
      );

      registerSubPart(
        plugWellGroup,
        {
          id: 'head_spark_plug_well',
          label: 'SPARK PLUG WELL',
          category: 'Ignition Chamber',
          material: 'Machined 14mm Gasketed Taper/Seat Bore',
          dimensions: '0.750" Reach · Gap ' + config.sparkPlugGap.toFixed(3) + '"',
          tolerance: '15–20 ft-lbs Anti-Seize Torque',
          flowOrTorque: `Total Timing: ${config.ignitionTiming}° BTDC`,
          notes: 'Angled plug boss centralizes flame kernel travel across chamber.',
          sideHint: 'left'
        },
        [-3.25, 0.25, 1.4]
      );

      registerSubPart(
        plugCoilGroup,
        {
          id: 'head_spark_plug_coil',
          label: 'SPARK PLUG COIL',
          category: 'Direct Ignition',
          material: 'High-Output Inductive Smart Coil',
          dimensions: '115 mJ Spark Energy · 40 kV Peak',
          tolerance: 'Dwell ±0.05 ms',
          flowOrTorque: `${config.targetAFR}:1 Target AFR`,
          notes: 'Individual direct coil eliminates distributor cap crossfire.',
          sideHint: 'left'
        },
        [-3.55, 0.65, 1.4]
      );

      registerSubPart(
        springsGroup,
        {
          id: 'head_valve_spring',
          label: 'VALVE SPRING & RETAINER',
          category: 'Spring Pack',
          material: 'PAC-1200 Ovate-Wire Chrome Silicon + Titanium Retainer',
          dimensions: `145 lb Seat / 390 lb Open @ ${specs.totalValveLift}"`,
          tolerance: '1.800" Installed Height ±0.015"',
          flowOrTorque: 'Coil Bind: 1.110"',
          notes: 'Nitrided dual spring prevents harmonic surge above 7,200 RPM.',
          sideHint: 'left'
        },
        [-2.3, 1.55, 1.0]
      );

      // ASME Double-Arrow Extension Dimension Lines matching reference aesthetic
      registerDimension('dim_bore_spacing', '4.400 IN. BORE SPACING', [3.2, -0.95, 1.02], [3.2, -0.95, 3.05], 30, 34);
      registerDimension('dim_head_width', '12.000 IN. HEAD WIDTH', [-3.4, -0.95, 4.3], [3.4, -0.95, 4.3], 0, 44);
      registerDimension('dim_port_size', `${intakePortCc}CC INT / ${exhaustPortCc}CC EXH`, [-3.55, -0.35, -3.05], [-3.55, 0.45, -3.05], -56, 0);
      registerDimension('dim_act_height', '14.375 IN. ACTUATOR STACK', [-3.3, -0.85, -3.05], [-3.3, 2.85, -3.05], -64, 0);
    } else if (partKey === 'cam') {
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 9.4, 28), mats.steel);
      core.rotation.x = Math.PI / 2;
      partGroup.add(core);
      registerSubPart(
        core,
        {
          id: 'cam_core',
          label: '8620 BILLET CAM CORE',
          category: 'Camshaft Core',
          material: '8620 Carburized Steel Core (Rc 60–62)',
          dimensions: 'Ø 1.060" Base Barrel · Gun-Drilled',
          tolerance: '0.0005" Straightness',
          flowOrTorque: `Firing Order: ${config.firingOrder || '1-8-4-3-6-5-7-2'}`,
          notes: 'Hollow gun-drilled core reduces valvetrain rotational inertia.',
          sideHint: 'left'
        },
        [0, 0.36, 0.3]
      );

      const noseGroup = new THREE.Group();
      const camNose = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.28, 28), mats.steel);
      camNose.rotation.x = Math.PI / 2;
      camNose.position.z = 4.78;
      noseGroup.add(camNose);
      for (let cb = 0; cb < 3; cb++) {
        const ang = (cb / 3) * Math.PI * 2;
        const cBolt = createARP12PointBolt(0.06, 0.25, mats.anBlue);
        cBolt.position.set(Math.cos(ang) * 0.45, Math.sin(ang) * 0.45, 4.94);
        cBolt.rotation.x = Math.PI / 2;
        noseGroup.add(cBolt);
      }
      partGroup.add(noseGroup);
      registerSubPart(
        noseGroup,
        {
          id: 'cam_nose',
          label: '3-BOLT TIMING DOWEL NOSE',
          category: 'Sprocket Drive',
          material: 'ARP 3/8-16 Cam Bolts + Index Dowel',
          dimensions: '5/16" Dowel Index Pin',
          tolerance: '±0.25° Cam Phasing Accuracy',
          flowOrTorque: 'Cam Bolts: 25 ft-lbs w/ Loctite',
          notes: 'Interfaces with billet double-roller timing gear.',
          sideHint: 'right'
        },
        [0, 0.68, 4.82]
      );

      const journalGroup = new THREE.Group();
      for (let j = 0; j < 5; j++) {
        const jz = -4.0 + j * 2.0;
        const journal = new THREE.Mesh(new THREE.CylinderGeometry(0.60, 0.60, 0.48, 28), mats.honed);
        journal.rotation.x = Math.PI / 2;
        journal.position.z = jz;
        journalGroup.add(journal);
      }
      partGroup.add(journalGroup);
      registerSubPart(
        journalGroup,
        {
          id: 'cam_journals',
          label: 'PRECISION CAM JOURNALS (×5)',
          category: 'Bearing Surface',
          material: 'Centerless-Ground Bearing Journals',
          dimensions: 'Ø 1.8682" Journal OD',
          tolerance: '⌰ 0.0003" Concentricity',
          flowOrTorque: 'Cam Bearing Clear: 0.0020"',
          notes: 'Full-round oil groove feeds overhead valvetrain galleries.',
          sideHint: 'left'
        },
        [0, -0.60, -2.0]
      );

      const lobeGroup = new THREE.Group();
      const lobeLift = config.camProfile === 'radical' ? 0.48 : config.camProfile === 'street' ? 0.40 : 0.32;
      for (let l = 0; l < 12; l++) {
        const lz = -3.45 + l * 0.62;
        const lobe = new THREE.Mesh(createCamLobeGeometry(0.49, lobeLift, 0.36), mats.honed);
        lobe.position.z = lz;
        lobe.rotation.z = (l * Math.PI) / 4;
        lobeGroup.add(lobe);
      }
      partGroup.add(lobeGroup);
      registerSubPart(
        lobeGroup,
        {
          id: 'cam_lobes',
          label: `${config.camProfile.toUpperCase()} CNC CAM LOBES`,
          category: 'Lobe Profile',
          material: 'CBN-Ground Asymmetric Lobe Ramp',
          dimensions: `Lobe ${specs.camData.lobeLift}" · Net ${specs.totalValveLift}" @ ${config.rockerRatio}:1`,
          tolerance: '±0.0005" Profile Envelope',
          flowOrTorque: `${specs.camData.intakeDur050}°/${specs.camData.exhDur050}° @ .050"`,
          notes: 'Asymmetric closing ramp cushions valve onto seat to prevent bounce.',
          sideHint: 'right'
        },
        [0.4, 0.82, 1.5]
      );

      const gear = new THREE.Mesh(createGearGeometry(1.15, 32, 0.38, 0.36, 0.11), mats.bronze);
      gear.position.z = -4.55;
      partGroup.add(gear);
      registerSubPart(
        gear,
        {
          id: 'cam_dist_gear',
          label: 'BRONZE DISTRIBUTOR DRIVE GEAR',
          category: 'Ignition Drive',
          material: 'Ampco Aluminum-Bronze Composite Gear',
          dimensions: 'Ø 2.30" OD · Compatible w/ Steel Roller Cam',
          tolerance: '0.004"–0.007" Backlash',
          flowOrTorque: '2:1 Cam-to-Distributor Synchronization',
          notes: 'Sacrificial bronze teeth protect hardened steel billet cam drive.',
          sideHint: 'left'
        },
        [0, 1.1, -4.55]
      );

      registerDimension('dim_cam_len', '19.350 IN. CAM LENGTH', [0, 1.35, -4.7], [0, 1.35, 4.9], 0, -28);
      registerDimension('dim_cam_lift', `NET LIFT ${specs.totalValveLift} IN.`, [0, -0.5, 1.5], [0, 0.85, 1.5], 38, 0);
    } else if (partKey === 'valvetrain_rocker') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 5.4, 24), mats.steel);
      shaft.rotation.x = Math.PI / 2;
      partGroup.add(shaft);
      registerSubPart(
        shaft,
        {
          id: 'vt_shaft',
          label: 'CENTERLESS-GROUND TRUNNION SHAFT',
          category: 'Pivot Axis',
          material: '8620 Hardened Trunnion Alloy',
          dimensions: 'Ø 0.480" Trunnion Axis · Caged Needle Bearings',
          tolerance: '◎ 0.0004" Coaxiality',
          flowOrTorque: 'Polylock: 28 ft-lbs',
          notes: 'Eliminates ball-stud friction and reduces valve guide side-loading.',
          sideHint: 'left'
        },
        [0, 0.2, 2.2]
      );

      const girdle = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.36, 5.1), mats.anBlue);
      girdle.position.y = 0.72;
      partGroup.add(girdle);
      registerSubPart(
        girdle,
        {
          id: 'vt_girdle',
          label: 'ANODIZED BILLET STUD GIRDLE',
          category: 'Rigidity Brace',
          material: '6061-T6 CNC Blue Anodized Bar',
          dimensions: '1.15" × 0.65" Solid Billet Clamp',
          tolerance: '±0.001" Stud Center Pitch',
          flowOrTorque: 'Polylock Clamp: 25 ft-lbs',
          notes: 'Ties adjacent rocker studs together to eliminate high-RPM stud deflection.',
          sideHint: 'right'
        },
        [0, 0.9, 0]
      );

      const rockerGroup = new THREE.Group();
      const springGroup = new THREE.Group();
      const pushrodGroup = new THREE.Group();
      [-1.8, -0.6, 0.6, 1.8].forEach((rz, idx) => {
        const rocker = createRollerRockerGroup(mats.anBlue, mats.steel);
        rocker.position.set(0, 0, rz);
        rocker.scale.setScalar(2.0);
        rocker.rotation.z = idx % 2 === 0 ? 0.12 : -0.1;
        rockerGroup.add(rocker);

        const spring = new THREE.Mesh(createHelicalSpringGeometry(0.45, 0.072, 1.5, 6), mats.steel);
        spring.position.set(1.25, -1.1, rz);
        springGroup.add(spring);

        const retainer = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.34, 0.2, 20), mats.anRed);
        retainer.position.set(1.25, -0.32, rz);
        springGroup.add(retainer);

        const valveHead = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.45, 0.18, 24), mats.honed);
        valveHead.position.set(1.25, -2.15, rz);
        springGroup.add(valveHead);

        const pushrod = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 3.0, 14), mats.honed);
        pushrod.position.set(-1.1, -1.5, rz);
        pushrodGroup.add(pushrod);

        const ballEnd = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), mats.steel);
        ballEnd.position.set(-1.1, -0.02, rz);
        pushrodGroup.add(ballEnd);
      });
      partGroup.add(rockerGroup, springGroup, pushrodGroup);

      registerSubPart(
        rockerGroup,
        {
          id: 'vt_rockers',
          label: `${config.rockerRatio.toFixed(2)}:1 ROLLER ROCKER ARMS`,
          category: 'Rocker Assembly',
          material: '7075-T6 Extruded Billet + 8620 Roller Tip',
          dimensions: `Ratio ${config.rockerRatio.toFixed(2)}:1 · Net Lift ${specs.totalValveLift}"`,
          tolerance: '⌖ 0.0015" Tip Sweep Width',
          flowOrTorque: 'Max Spring Load: 450+ lbs',
          notes: 'Needle-bearing roller tip scrubs squarely across valve stem tip.',
          sideHint: 'right'
        },
        [0.95, 0.15, 0.6]
      );
      registerSubPart(
        springGroup,
        {
          id: 'vt_springs',
          label: 'OVATE DUAL VALVE SPRINGS & TI RETAINERS',
          category: 'Spring & Valve',
          material: 'PAC Chrome-Silicon + 7° Titanium Retainer',
          dimensions: 'Ø 1.550" OD · 390 lb/in Spring Rate',
          tolerance: '1.800" Installed Height',
          flowOrTorque: '8,200 RPM Float Threshold',
          notes: 'Internal flat-wire damper absorbs secondary surge harmonics.',
          sideHint: 'right'
        },
        [1.55, -1.2, 1.8]
      );
      registerSubPart(
        pushrodGroup,
        {
          id: 'vt_pushrods',
          label: '4130 CHROMOLY PUSHRODS',
          category: 'Pushrod Train',
          material: '5/16" × 0.080" Wall 4130 Swedged Ends',
          dimensions: '7.800" Standard Length · 210° Ball Seat',
          tolerance: '0.002" Straightness TIR',
          flowOrTorque: 'Zero Column Buckling to 800 lb',
          notes: 'Heat-treated ball tips oil-feed rocker cups under full lift.',
          sideHint: 'left'
        },
        [-1.1, -1.4, -0.6]
      );

      registerDimension('dim_vt_lift', `NET LIFT ${specs.totalValveLift} IN.`, [1.25, -2.15, 1.8], [1.25, -0.32, 1.8], 42, 0);
    } else if (partKey === 'intake') {
      const intRunnerScale = Math.sqrt(intakePortCc / 185);
      const plenum = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 1.2, 6.2),
        isIsoPaper ? mats.clearHousing : mats.alum
      );
      plenum.position.y = -0.3;
      partGroup.add(plenum);
      registerSubPart(
        plenum,
        {
          id: 'int_plenum',
          label: `${specs.intakeData.name.toUpperCase()} PLENUM`,
          category: 'Intake Manifold',
          material: 'A356-T6 Permanent-Mold / Billet Aluminum',
          dimensions: `${specs.intakeData.style} · ${specs.intakeData.flowCfm} CFM`,
          tolerance: '⏥ 0.0020" Carb Pad Flatness',
          flowOrTorque: 'Manifold Bolts: 30 ft-lbs',
          notes: 'Cutaway plenum shell displays internal air-fuel distribution divider.',
          sideHint: 'left'
        },
        [-1.9, -0.3, 1.4]
      );

      const tStatGroup = new THREE.Group();
      const tStatNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.85, 20), mats.steel);
      tStatNeck.position.set(0, 0.45, 2.75);
      tStatGroup.add(tStatNeck);
      const tempSensor = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 6), mats.bronze);
      tempSensor.position.set(0.65, 0.42, 2.65);
      tStatGroup.add(tempSensor);
      partGroup.add(tStatGroup);
      registerSubPart(
        tStatGroup,
        {
          id: 'int_water_neck',
          label: 'COOLANT CROSSOVER & CTS SENSOR',
          category: 'Thermal Crossover',
          material: 'Billet Thermostat Neck + Brass 3/8 NPT CTS',
          dimensions: '180°F High-Flow Thermostat Housing',
          tolerance: 'O-Ring Face Seal',
          flowOrTorque: '20 ft-lbs Stainless Bolts',
          notes: 'Balances front cylinder head coolant temperatures.',
          sideHint: 'right'
        },
        [0.4, 0.65, 2.75]
      );

      const runnerGroup = new THREE.Group();
      for (let r = 0; r < 4; r++) {
        const rz = -2.2 + r * 1.45;
        [-1, 1].forEach((s) => {
          const runner = new THREE.Mesh(
            new THREE.BoxGeometry(1.85, 0.72 * intRunnerScale, 0.95 * intRunnerScale),
            mats.alum
          );
          runner.position.set(s * 2.2, -0.75, rz);
          runner.rotation.z = -s * 0.42;
          runnerGroup.add(runner);

          const flangeBolt = createARP12PointBolt(0.065, 0.45, mats.anBlue);
          flangeBolt.position.set(s * 2.85, -0.45, rz);
          flangeBolt.rotation.z = -s * 0.42;
          runnerGroup.add(flangeBolt);
        });
      }
      partGroup.add(runnerGroup);
      registerSubPart(
        runnerGroup,
        {
          id: 'int_runners',
          label: `PORT-MATCHED RUNNERS (${intakePortCc} CC)`,
          category: 'Air / Port Modification',
          material: 'Port-Matched Tapered Aluminum Runners',
          dimensions: `${intakePortCc} cc Runner · ${specs.intakeVelocityFps} ft/s Velocity`,
          tolerance: '±0.015" Head Port Match',
          flowOrTorque: `${specs.intakeFlowPeakCfm} CFM Peak Head Flow`,
          notes: 'Cross-section scales live with Intake Port cc modification.',
          sideHint: 'right'
        },
        [2.6, -0.75, -0.75]
      );

      const carb = createHolley4150CarburetorGroup(
        mats.goldZinc,
        mats.alum,
        mats.darkSteel,
        mats.bronze,
        mats.anRed,
        mats.anBlue,
        mats.steel,
        {
          style: carbStyle,
          venturiRatio: carbVenturiIn / 1.375,
          cfm: config.carbCfm,
          airBonus
        }
      );
      carb.position.y = 1.25;
      carb.scale.setScalar(1.1);
      partGroup.add(carb);
      registerSubPart(
        carb,
        {
          id: 'int_carburetor',
          label: `${carbStyle.replace('_', ' ').toUpperCase()} (${config.carbCfm} CFM)`,
          category: 'Carburetor / Venturi Mod',
          material: 'Dichromate Zinc / CNC Billet Metering Blocks',
          dimensions: `Ø ${carbVenturiIn.toFixed(3)}" Venturi · ${specs.effectiveCarbCfm} Eff CFM`,
          tolerance: '±0.001" Jet & Air Bleed Cal',
          flowOrTorque: `Demand: ${specs.peakCfmDemand} CFM · AFR ${config.targetAFR}:1`,
          notes: `Air cleaner delta ${airBonus >= 0 ? '+' : ''}${airBonus} CFM (${specs.carbSizingStatus}).`,
          sideHint: 'left'
        },
        [-0.95, 2.0, 0.2]
      );

      registerDimension('dim_carb_cfm', `${config.carbCfm} CFM / Ø ${carbVenturiIn.toFixed(3)}" VENTURI`, [-1.1, 2.3, 0], [1.1, 2.3, 0], 0, -32);
      registerDimension('dim_int_span', '9.250 IN. PORT-TO-PORT', [-3.0, -1.0, 0.7], [3.0, -1.0, 0.7], 0, 34);
    } else if (partKey === 'timingCover') {
      const cover = createTimingCoverGroup(
        isIsoPaper ? mats.clearHousing : mats.alum,
        mats.darkSteel,
        mats.anBlue,
        mats.anRed
      );
      cover.scale.setScalar(1.15);
      partGroup.add(cover);
      registerSubPart(
        cover,
        {
          id: 'tc_cover',
          label: 'BILLET 2-PIECE TIMING COVER',
          category: 'Timing Housing',
          material: '6061-T6 CNC Cover + Cam Button Stop',
          dimensions: 'Ø 2.125" Crank Seal Bore',
          tolerance: '◎ 0.002" Seal Concentricity',
          flowOrTorque: 'Cover Bolts: 15 ft-lbs',
          notes: 'Quick-access front plate enables cam degreeing without dropping pan.',
          sideHint: 'left'
        },
        [-1.3, 0.6, 0.4]
      );

      const trigger = new THREE.Mesh(
        createCrankTriggerWheelGeometry(1.5, 60, 2, 0.18, 0.6),
        mats.steel
      );
      trigger.position.set(0, -1.15, 0.9);
      partGroup.add(trigger);
      registerSubPart(
        trigger,
        {
          id: 'tc_trigger',
          label: '60-2 CNC RELUCTOR WHEEL',
          category: 'Crank Trigger',
          material: '4140 Laser/Wire-EDM Trigger Wheel',
          dimensions: '60-2 Tooth Index · Ø 6.25" OD',
          tolerance: '±0.1° Tooth Spacing',
          flowOrTorque: '0.040" Sensor Air Gap',
          notes: 'Missing 2-tooth gap establishes TDC #1 synchronization.',
          sideHint: 'right'
        },
        [1.1, -1.65, 0.9]
      );

      const hallGroup = new THREE.Group();
      const hallBracket = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.72), mats.anBlue);
      hallBracket.position.set(1.78, -0.35, 0.85);
      hallBracket.rotation.z = 0.45;
      hallGroup.add(hallBracket);
      const hallSensor = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.58, 14), mats.darkSteel);
      hallSensor.rotation.z = Math.PI / 2 - 0.45;
      hallSensor.position.set(1.58, -0.42, 0.90);
      hallGroup.add(hallSensor);
      partGroup.add(hallGroup);
      registerSubPart(
        hallGroup,
        {
          id: 'tc_hall_sensor',
          label: 'HALL-EFFECT CRANK SENSOR',
          category: 'Ignition Sync',
          material: 'Flying-Magnet Digital Hall Pickup',
          dimensions: '5V Square-Wave · 0.040" Air Gap',
          tolerance: '⊥ 0.002" Bracket Squareness',
          flowOrTorque: `Total Advance: ${config.ignitionTiming}° BTDC`,
          notes: 'Zero-latency crank timing feedback above 9,000 RPM.',
          sideHint: 'right'
        },
        [1.8, -0.35, 0.9]
      );

      registerDimension('dim_tc_seal', 'Ø 2.125 IN. SEAL BORE', [-0.9, -1.15, 0.9], [0.9, -1.15, 0.9], 0, 38);
    } else if (partKey === 'lubrication') {
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 2.2, 2.2),
        isIsoPaper ? mats.clearHousing : mats.iron
      );
      partGroup.add(housing);
      registerSubPart(
        housing,
        {
          id: 'oil_housing',
          label: 'HIGH-VOLUME OIL PUMP HOUSING',
          category: 'Pump Body',
          material: 'CNC-Milled Cast Iron / Billet Plate',
          dimensions: '1.50" Tall High-Volume Gear Cavity',
          tolerance: '∥ 0.0003" End-Cover Flatness',
          flowOrTorque: 'Pump-to-Cap Bolt: 65 ft-lbs',
          notes: 'Cutaway body reveals spur-gear rotor cavity and bypass port.',
          sideHint: 'left'
        },
        [-1.3, 0.6, 0.4]
      );

      const coverPlate = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.05, 0.22), mats.clearHousing);
      coverPlate.position.z = 1.2;
      partGroup.add(coverPlate);

      const reliefPlug = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.36, 6), mats.bronze);
      reliefPlug.rotation.z = Math.PI / 2;
      reliefPlug.position.set(1.42, -0.62, 0.2);
      partGroup.add(reliefPlug);
      registerSubPart(
        reliefPlug,
        {
          id: 'oil_relief',
          label: '65 PSI BYPASS RELIEF VALVE',
          category: 'Pressure Regulation',
          material: 'Hardened Steel Plunger + Calibrated Spring',
          dimensions: '65–72 PSI Bypass Cracking Pressure',
          tolerance: '±2 PSI Spring Rate',
          flowOrTorque: 'Hex Plug: 30 ft-lbs',
          notes: 'Prevents filter blow-off during cold 20W-50 startup.',
          sideHint: 'right'
        },
        [1.55, -0.62, 0.2]
      );

      const driveSpline = new THREE.Mesh(createSplineShaftGeometry(0.24, 1.45, 16), mats.steel);
      driveSpline.rotation.x = Math.PI / 2;
      driveSpline.position.set(-0.35, 1.65, 0);
      partGroup.add(driveSpline);
      registerSubPart(
        driveSpline,
        {
          id: 'oil_driveshaft',
          label: '4130 STEEL INTERMEDIATE DRIVE',
          category: 'Pump Drive',
          material: 'Pinned 4130 Chromoly w/ Steel Collar',
          dimensions: 'Ø 0.480" Tang Drive Shaft',
          tolerance: '0.002" Collar Fit',
          flowOrTorque: 'Driven at 1/2 Crank Speed',
          notes: 'Pinned steel sleeve replaces brittle stock nylon retainer.',
          sideHint: 'left'
        },
        [-0.35, 1.85, 0]
      );

      const gearSet = new THREE.Group();
      const outerGear = new THREE.Mesh(createGearGeometry(0.95, 10, 0.9, 0.45, 0.18), mats.steel);
      outerGear.position.set(-0.35, 0.1, 0.65);
      gearSet.add(outerGear);
      const innerGear = new THREE.Mesh(createGearGeometry(0.65, 8, 0.9, 0.25, 0.15), mats.bronze);
      innerGear.position.set(0.65, 0.1, 0.65);
      gearSet.add(innerGear);
      partGroup.add(gearSet);
      registerSubPart(
        gearSet,
        {
          id: 'oil_rotors',
          label: 'BLUEPRINTED SPUR ROTOR SET',
          category: 'Pumping Elements',
          material: 'Powder-Metal Alloy Gears',
          dimensions: '0.0015"–0.003" Rotor End Clearance',
          tolerance: '±0.0002" Gear Thickness',
          flowOrTorque: '8.5 GPM @ 6,000 RPM',
          notes: 'Precision-deburred tooth tips prevent cavitation above 7,000 RPM.',
          sideHint: 'right'
        },
        [0.85, 0.2, 0.8]
      );

      const pickupGroup = new THREE.Group();
      const pickupTube = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 3.2, 16), mats.steel);
      pickupTube.rotation.z = Math.PI / 3;
      pickupTube.position.set(-1.6, -1.6, 0);
      pickupGroup.add(pickupTube);
      const screen = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.74, 0.48, 24), mats.alum);
      screen.position.set(-2.9, -2.35, 0);
      pickupGroup.add(screen);
      partGroup.add(pickupGroup);
      registerSubPart(
        pickupGroup,
        {
          id: 'oil_pickup',
          label: 'TIG-WELDED 3/4" PICKUP & SCREEN',
          category: 'Sump Suction',
          material: '304 Stainless Mesh + Mandrel 3/4" Tube',
          dimensions: '0.375" Pan-Floor Clearance',
          tolerance: '±0.030" Sump Depth',
          flowOrTorque: 'TIG-Braced to Pump Cover',
          notes: 'Deep-sump screen positioned 3/8" off pan bottom for anti-starvation.',
          sideHint: 'left'
        },
        [-2.9, -2.35, 0]
      );

      registerDimension('dim_oil_pickup', '0.375 IN. SUMP CLEAR', [-3.4, -2.55, 0], [-2.4, -2.55, 0], 0, 30);
    } else if (partKey === 'bellhousing') {
      const cone = new THREE.Mesh(
        new THREE.CylinderGeometry(2.3, 3.4, 2.8, 36, 1, true),
        isIsoPaper ? mats.alum : mats.alum
      );
      cone.rotation.x = Math.PI / 2;
      partGroup.add(cone);

      for (let r = 0; r < 8; r++) {
        const ang = (r / 8) * Math.PI * 2;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 2.7), mats.alum);
        rib.position.set(Math.cos(ang) * 2.88, Math.sin(ang) * 2.88, 0);
        rib.rotation.z = ang;
        rib.rotation.x = 0.36;
        partGroup.add(rib);
      }
      registerSubPart(
        cone,
        {
          id: 'bh_shell',
          label: 'SFI 6.1 SCATTERSHIELD CONE',
          category: 'Driveline Housing',
          material: 'Hydroformed 4130 / Cast 356-T6 Aluminum',
          dimensions: `Pattern: ${config.bellhousingPattern || 'GM Chevy V8'}`,
          tolerance: '⊥ 0.0030" Face Parallelism',
          flowOrTorque: '35 ft-lbs Perimeter Bolts',
          notes: 'External structural ribs eliminate clutch-fork deflection.',
          sideHint: 'left'
        },
        [-2.8, 1.1, 0]
      );

      const registerRing = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.22, 14, 40), mats.steel);
      registerRing.position.z = 1.4;
      partGroup.add(registerRing);
      registerSubPart(
        registerRing,
        {
          id: 'bh_register',
          label: 'TRANS INPUT REGISTER BORE',
          category: 'Pilot Register',
          material: 'CNC-Turned Datum A Bore',
          dimensions: 'Ø 4.684" Transmission Register',
          tolerance: '◎ 0.0030" TIR to Crank Centerline',
          flowOrTorque: 'Offset Dowel Indexed',
          notes: 'Dial-indicated within 0.005" TIR to protect transmission input bearing.',
          sideHint: 'right'
        },
        [2.2, 0.4, 1.4]
      );

      const rearFlangeGroup = new THREE.Group();
      const rearFlange = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.28, 14, 40), mats.alum);
      rearFlange.position.z = -1.4;
      rearFlangeGroup.add(rearFlange);
      for (let b = 0; b < 6; b++) {
        const ang = (b / 6) * Math.PI * 2;
        const dowel = createARP12PointBolt(0.11, 0.65, mats.anRed);
        dowel.position.set(Math.cos(ang) * 3.25, Math.sin(ang) * 3.25, -1.25);
        dowel.rotation.x = Math.PI / 2;
        rearFlangeGroup.add(dowel);
      }
      partGroup.add(rearFlangeGroup);
      registerSubPart(
        rearFlangeGroup,
        {
          id: 'bh_block_flange',
          label: 'BLOCK DOWEL & BOLT FLANGE',
          category: 'Block Interface',
          material: '6-Bolt + 2× 0.620" Index Dowels',
          dimensions: 'Ø 6.80" Flange Sweep',
          tolerance: '±0.001" Dowel Pin Pitch',
          flowOrTorque: 'ARP 3/8-16: 35 ft-lbs',
          notes: 'Matches selected vehicle transmission in Matrix tab.',
          sideHint: 'right'
        },
        [3.1, -1.4, -1.3]
      );

      registerDimension('dim_bh_reg', 'Ø 4.684 IN. REGISTER BORE', [-2.3, 0, 1.4], [2.3, 0, 1.4], 0, -40);
      registerDimension('dim_bh_depth', '6.250 IN. HOUSING DEPTH', [0, 3.4, -1.4], [0, 3.4, 1.4], 0, -34);
    } else {
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 2.65, 1.35, 44), mats.damperTape);
      shell.rotation.x = Math.PI / 2;
      partGroup.add(shell);
      registerSubPart(
        shell,
        {
          id: 'dm_ring',
          label: 'LASER-ETCHED INERTIA RING',
          category: 'Harmonic Inertia Mass',
          material: '1045 Heat-Treated Steel Ring + 360° Marks',
          dimensions: 'Ø 6.750" OD · 0°–60° BTDC Timing Marks',
          tolerance: 'SFI 18.1 Rated to 12,500 RPM',
          flowOrTorque: 'Dynamic Balance: 0.25 oz-in',
          notes: 'Degreed 360° circumference lets mechanic verify total timing at a glance.',
          sideHint: 'left'
        },
        [-2.5, 1.1, 0.2]
      );

      const frontFace = new THREE.Mesh(new THREE.CylinderGeometry(2.60, 2.60, 0.14, 40), mats.darkSteel);
      frontFace.rotation.x = Math.PI / 2;
      frontFace.position.z = 0.66;
      partGroup.add(frontFace);

      const elastomer = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.22, 12, 40), mats.anRed);
      elastomer.position.z = 0.72;
      partGroup.add(elastomer);
      registerSubPart(
        elastomer,
        {
          id: 'dm_elastomer',
          label: 'HIGH-DAMPING FLUOROSILICONE BOND',
          category: 'Torsional Damping',
          material: 'Bonded Viton / Fluorosilicone Ring',
          dimensions: '48 Durometer Tuned Torsional Absorb',
          tolerance: '±2 Hz Natural Frequency Tuning',
          flowOrTorque: 'Cancels 3rd/4th Order Crank Harmonics',
          notes: 'Absorbs torsional crank twist to protect timing chain and oil pump gears.',
          sideHint: 'right'
        },
        [1.75, 0.3, 0.75]
      );

      const hubGroup = new THREE.Group();
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.72, 32), mats.steel);
      hub.rotation.x = Math.PI / 2;
      hubGroup.add(hub);
      const keySlot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 1.75), mats.darkSteel);
      keySlot.position.y = 0.45;
      hubGroup.add(keySlot);
      partGroup.add(hubGroup);
      registerSubPart(
        hubGroup,
        {
          id: 'dm_hub',
          label: 'BILLET HUB & BROACHED KEYWAY',
          category: 'Crank Snout Interface',
          material: '4140 Billet Center Hub',
          dimensions: 'Ø 1.2477" ID · 3/16" Keyway',
          tolerance: '-0.0008" Interference Press Fit',
          flowOrTorque: 'Center Bolt: 65 ft-lbs',
          notes: 'Honed hub bore prevents crank snout galling during press installation.',
          sideHint: 'left'
        },
        [0, 0.45, 0.85]
      );

      const trigger = new THREE.Mesh(
        createCrankTriggerWheelGeometry(2.8, 36, 1, 0.16, 2.55),
        mats.anBlue
      );
      trigger.position.z = -0.75;
      partGroup.add(trigger);
      registerSubPart(
        trigger,
        {
          id: 'dm_trigger',
          label: '36-1 BILLET TRIGGER FLANGE',
          category: 'EFI Crank Index',
          material: '7075-T6 Anodized Billet Reluctor',
          dimensions: 'Ø 7.10" OD · 36-1 Tooth Pattern',
          tolerance: '◎ 0.0005" Concentric to Hub',
          flowOrTorque: '8× Perimeter Torx Fasteners',
          notes: 'Bolt-on CNC trigger ring supports sequential EFI / coil-near-plug.',
          sideHint: 'right'
        },
        [2.75, -0.6, -0.75]
      );

      registerDimension('dim_dm_od', 'Ø 6.750 IN. DAMPER OD', [-2.65, 0, 0.65], [2.65, 0, 0.65], 0, -40);
    }

    // Crisp EdgesGeometry technical CAD linework (publication-grade in iso_paper)
    const edgeLines: THREE.LineSegments[] = [];
    if (isIsoPaper || isBlueprint || isToolpath || renderMode === 'gdt') {
      edgeLines.push(...applyTechnicalEdges(partGroup, mats.techLine, isIsoPaper ? 18 : 24));
    }

    // Center partGroup cleanly around (0,0,0) while preserving child anchorObj positions
    _boxTmp.setFromObject(partGroup);
    _boxTmp.getCenter(_centerTmp);
    _boxTmp.getSize(_sizeTmp);
    partGroup.position.sub(_centerTmp);
    const boundingRadius = Math.max(2.6, _sizeTmp.length() * 0.5);

    // Sync React metadata catalogs for Quick Sub-Part Rail & Dimension Bars
    setSubPartCatalog(subPartEntries.map((e) => e.spec));
    setDimensionBarsMeta(dimBarEntries.map((d) => ({ id: d.id, label: d.label })));

    // Explicit 3D GD&T Datum Planes (A/B/C) when renderMode === 'gdt'
    const gdtGroup = new THREE.Group();
    gdtGroup.userData._excludeExport = true;
    if (renderMode === 'gdt') {
      const planeSize = boundingRadius * 2.05;
      const makeDatumPlane = (color: number, rotX: number, rotY: number, offset: THREE.Vector3) => {
        const pMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.16,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeSize, planeSize), pMat);
        mesh.rotation.set(rotX, rotY, 0);
        mesh.position.copy(offset);
        const border = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.PlaneGeometry(planeSize, planeSize)),
          new THREE.LineBasicMaterial({ color })
        );
        mesh.add(border);
        return mesh;
      };

      gdtGroup.add(makeDatumPlane(0x38bdf8, Math.PI / 2, 0, new THREE.Vector3(0, -_sizeTmp.y * 0.52, 0)));
      gdtGroup.add(makeDatumPlane(0xf97316, 0, 0, new THREE.Vector3(0, 0, -_sizeTmp.z * 0.52)));
      gdtGroup.add(makeDatumPlane(0x10b981, 0, Math.PI / 2, new THREE.Vector3(-_sizeTmp.x * 0.52, 0, 0)));
    }

    // Live CNC Helical Contour Toolpath + Animated Carbide Endmill Spindle when renderMode === 'toolpath'
    const toolpathGroup = new THREE.Group();
    toolpathGroup.userData._excludeExport = true;
    let camCurve: THREE.CatmullRomCurve3 | null = null;
    let spindleAssembly: THREE.Group | null = null;
    if (isToolpath) {
      const pathPts: THREE.Vector3[] = [];
      const rx = Math.max(1.4, _sizeTmp.x * 0.56);
      const ry = Math.max(1.2, _sizeTmp.y * 0.54);
      const rz = Math.max(1.4, _sizeTmp.z * 0.56);
      const passes = Math.max(8, Math.min(20, Math.round(260 / Math.max(8, camStepoverPct))));
      const totalSamples = passes * 24;
      for (let i = 0; i <= totalSamples; i++) {
        const u = i / totalSamples;
        const theta = u * passes * Math.PI * 2;
        const yPass = ry - u * (ry * 1.9);
        const radiusWave = 1.0 + 0.08 * Math.sin(theta * 4);
        pathPts.push(
          new THREE.Vector3(
            Math.cos(theta) * rx * radiusWave,
            yPass,
            Math.sin(theta) * rz * radiusWave
          )
        );
      }
      camCurve = new THREE.CatmullRomCurve3(pathPts, true);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(camCurve.getPoints(360));
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.78
      });
      toolpathGroup.add(new THREE.Line(lineGeo, lineMat));

      // Stock bounding wireframe cage
      const stockBox = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(_sizeTmp.x * 1.12, _sizeTmp.y * 1.12, _sizeTmp.z * 1.12)),
        new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.45 })
      );
      toolpathGroup.add(stockBox);

      // Carbide Ball-Nose Endmill + HSK-63A Collet Chuck
      spindleAssembly = new THREE.Group();
      const chuck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.32, 1.1, 20),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.22 })
      );
      chuck.position.y = 1.35;
      spindleAssembly.add(chuck);

      const flute = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 1.35, 16),
        new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          emissive: 0xd97706,
          emissiveIntensity: 0.45,
          metalness: 0.95,
          roughness: 0.15
        })
      );
      flute.position.y = 0.68;
      spindleAssembly.add(flute);

      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee })
      );
      tip.position.y = 0;
      spindleAssembly.add(tip);

      toolpathGroup.add(spindleAssembly);
    }

    const assemblyRoot = new THREE.Group();
    assemblyRoot.add(partGroup);
    assemblyRoot.add(gdtGroup);
    assemblyRoot.add(toolpathGroup);
    scene.add(assemblyRoot);
    partGroupRef.current = partGroup;

    // Cameras
    const aspect = width / height;
    const perspCam = new THREE.PerspectiveCamera(34, aspect, 0.1, 200);
    const orthoHalf = boundingRadius * 1.48;
    const orthoCam = new THREE.OrthographicCamera(
      -orthoHalf * aspect,
      orthoHalf * aspect,
      orthoHalf,
      -orthoHalf,
      -100,
      200
    );

    const activeCam: THREE.Camera = projection === 'orthographic' ? orthoCam : perspCam;
    const initDist = boundingRadius * 2.75;
    perspCam.position.set(initDist * 0.74, initDist * 0.52, initDist * 0.80);
    orthoCam.position.copy(perspCam.position);
    perspCam.lookAt(0, 0, 0);
    orthoCam.lookAt(0, 0, 0);

    const quadTopCam = new THREE.OrthographicCamera(-orthoHalf, orthoHalf, orthoHalf, -orthoHalf, -100, 200);
    quadTopCam.position.set(0, initDist, 0.01);
    quadTopCam.lookAt(0, 0, 0);

    const quadFrontCam = new THREE.OrthographicCamera(-orthoHalf, orthoHalf, orthoHalf, -orthoHalf, -100, 200);
    quadFrontCam.position.set(0, 0, initDist);
    quadFrontCam.lookAt(0, 0, 0);

    const quadRightCam = new THREE.OrthographicCamera(-orthoHalf, orthoHalf, orthoHalf, -orthoHalf, -100, 200);
    quadRightCam.position.set(initDist, 0, 0);
    quadRightCam.lookAt(0, 0, 0);

    const controls = new OrbitControls(activeCam, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 2.0;
    controls.maxDistance = 48.0;
    controls.target.set(0, 0, 0);

    // Click Raycaster Selection (distinguishing click vs orbit drag)
    const raycaster = new THREE.Raycaster();
    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (viewportLayoutRef.current !== 'single') return;
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 6) return;

      const rect = renderer!.domElement.getBoundingClientRect();
      _rayNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayNdc, activeCam);

      const hits = raycaster.intersectObjects(partGroup.children, true);
      let pickedId: string | null = null;
      for (let i = 0; i < hits.length; i++) {
        let cur: THREE.Object3D | null = hits[i].object;
        while (cur && cur !== partGroup) {
          if (cur.userData?.subPartId) {
            pickedId = cur.userData.subPartId as string;
            break;
          }
          if (cur.userData?.subPart?.id) {
            pickedId = cur.userData.subPart.id as string;
            break;
          }
          cur = cur.parent;
        }
        if (pickedId) break;
      }

      if (pickedId) {
        setSelectedSubPartId((prev) => (prev === pickedId ? null : pickedId));
      } else {
        setSelectedSubPartId(null);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    captureFnRef.current = () => {
      renderer!.render(scene, activeCam);
      const url = renderer!.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${entry.drawingNumber}-${renderMode}.png`;
      link.click();
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      const asp = w / h;
      perspCam.aspect = asp;
      perspCam.updateProjectionMatrix();
      orthoCam.left = -orthoHalf * asp;
      orthoCam.right = orthoHalf * asp;
      orthoCam.top = orthoHalf;
      orthoCam.bottom = -orthoHalf;
      orthoCam.updateProjectionMatrix();
      renderer!.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer!.getContext() as WebGL2RenderingContext | null;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const st = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = (now: number) => {
      if (disposed) return;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (autoRotateRef.current && !camGoalRef.current.active && viewportLayoutRef.current === 'single') {
        assemblyRoot.rotation.y += dt * 0.24;
      }

      if (camCurve && spindleAssembly && camRunningRef.current) {
        const camT = (now * 0.000045) % 1;
        camCurve.getPointAt(camT, _projVec);
        spindleAssembly.position.copy(_projVec);
        spindleAssembly.rotation.y += dt * 18.0;
      }

      if (camGoalRef.current.active) {
        _camGoalPos.copy(camGoalRef.current.pos).normalize().multiplyScalar(initDist);
        activeCam.position.x = THREE.MathUtils.damp(activeCam.position.x, _camGoalPos.x, 8, dt);
        activeCam.position.y = THREE.MathUtils.damp(activeCam.position.y, _camGoalPos.y, 8, dt);
        activeCam.position.z = THREE.MathUtils.damp(activeCam.position.z, _camGoalPos.z, 8, dt);
        controls.target.lerp(_camTarget, 0.2);
        if (activeCam.position.distanceTo(_camGoalPos) < 0.06) {
          activeCam.position.copy(_camGoalPos);
          controls.target.copy(_camTarget);
          camGoalRef.current.active = false;
        }
      }

      const ax = sectionAxisRef.current;
      const pct = sectionPercentRef.current;
      if (ax === 'none') {
        clipPlane.normal.set(-1, 0, 0);
        clipPlane.constant = 100;
      } else if (ax === 'x') {
        clipPlane.normal.set(-1, 0, 0);
        clipPlane.constant = pct * (_sizeTmp.x * 0.55);
      } else if (ax === 'y') {
        clipPlane.normal.set(0, -1, 0);
        clipPlane.constant = pct * (_sizeTmp.y * 0.55);
      } else {
        clipPlane.normal.set(0, 0, -1);
        clipPlane.constant = pct * (_sizeTmp.z * 0.55);
      }

      controls.update();
      assemblyRoot.updateMatrixWorld(true);

      const w = container.clientWidth || width;
      const h = container.clientHeight || height;

      try {
        if (viewportLayoutRef.current === 'quad') {
          renderer!.setScissorTest(true);
          const halfW = Math.floor(w / 2);
          const halfH = Math.floor(h / 2);
          const qAsp = halfW / Math.max(1, halfH);

          const renderQuad = (cam: THREE.Camera, vx: number, vy: number) => {
            if (cam instanceof THREE.OrthographicCamera) {
              cam.left = -orthoHalf * qAsp;
              cam.right = orthoHalf * qAsp;
              cam.top = orthoHalf;
              cam.bottom = -orthoHalf;
              cam.updateProjectionMatrix();
            } else if (cam instanceof THREE.PerspectiveCamera) {
              cam.aspect = qAsp;
              cam.updateProjectionMatrix();
            }
            renderer!.setViewport(vx, vy, halfW, halfH);
            renderer!.setScissor(vx, vy, halfW, halfH);
            renderer!.render(scene, cam);
          };

          renderQuad(activeCam, 0, halfH);
          renderQuad(quadTopCam, halfW, halfH);
          renderQuad(quadFrontCam, 0, 0);
          renderQuad(quadRightCam, halfW, 0);
          renderer!.setScissorTest(false);
        } else {
          renderer!.setScissorTest(false);
          renderer!.setViewport(0, 0, w, h);
          renderer!.render(scene, activeCam);
        }
      } catch (err) {
        disposed = true;
        setWebglError(err instanceof Error ? err.message : 'Component WebGL render failed.');
        return;
      }

      // 60fps Orthogonal Elbow Leader & ASME Dimension Projection (Zero React state churn)
      if (viewportLayoutRef.current === 'single' && showCalloutsRef.current) {
        const currentSelected = selectedSubPartIdRef.current;
        const leftColumn: Array<{ id: string; ax: number; ay: number }> = [];
        const rightColumn: Array<{ id: string; ax: number; ay: number }> = [];

        for (let i = 0; i < subPartEntries.length; i++) {
          const item = subPartEntries[i];
          item.anchorObj.getWorldPosition(_projVec);
          _projVec.project(activeCam);
          if (_projVec.z > 1) {
            const gEl = leaderGroupRefs.current[item.spec.id];
            if (gEl) gEl.style.opacity = '0';
            continue;
          }
          const px = (_projVec.x * 0.5 + 0.5) * w;
          const py = (-_projVec.y * 0.5 + 0.5) * h;

          const preferRight =
            item.spec.sideHint === 'right'
              ? true
              : item.spec.sideHint === 'left'
              ? false
              : px >= w * 0.48;

          if (preferRight) {
            rightColumn.push({ id: item.spec.id, ax: px, ay: py });
          } else {
            leftColumn.push({ id: item.spec.id, ax: px, ay: py });
          }
        }

        const placeColumn = (
          items: Array<{ id: string; ax: number; ay: number }>,
          isRight: boolean
        ) => {
          items.sort((a, b) => a.ay - b.ay);
          const minGap = items.length > 9 ? 19 : 23;
          const topBound = isIsoPaper ? 44 : 28;
          const botBound = h - 38;
          let prevY = topBound - minGap;

          const resolvedY: number[] = items.map((it) => {
            const targetY = Math.max(it.ay, prevY + minGap);
            const clamped = Math.min(botBound, targetY);
            prevY = clamped;
            return clamped;
          });

          // Bottom-up pass if pushed past bottom boundary
          for (let i = resolvedY.length - 2; i >= 0; i--) {
            if (resolvedY[i + 1] - resolvedY[i] < minGap) {
              resolvedY[i] = Math.max(topBound, resolvedY[i + 1] - minGap);
            }
          }

          const shelfX = isRight ? w - 168 : 168;
          const kneeBaseX = isRight ? w - 208 : 208;

          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const ly = resolvedY[i];
            const gEl = leaderGroupRefs.current[it.id];
            const dotEl = leaderDotRefs.current[it.id];
            const pathEl = leaderPathRefs.current[it.id];
            const textEl = leaderTextRefs.current[it.id];
            if (!gEl || !dotEl || !pathEl || !textEl) continue;

            const isSel = currentSelected === it.id;
            const strokeColor = isSel
              ? '#ea580c'
              : isIsoPaper
              ? '#1e293b'
              : '#94a3b8';
            const textColor = isSel
              ? '#ea580c'
              : isIsoPaper
              ? '#0f172a'
              : '#f1f5f9';

            gEl.style.opacity = currentSelected && !isSel ? '0.62' : '1';
            dotEl.setAttribute('cx', it.ax.toFixed(1));
            dotEl.setAttribute('cy', it.ay.toFixed(1));
            dotEl.setAttribute('r', isSel ? '4.5' : '3');
            dotEl.setAttribute('fill', strokeColor);

            const kneeX = isRight ? Math.max(it.ax + 16, kneeBaseX) : Math.min(it.ax - 16, kneeBaseX);
            pathEl.setAttribute(
              'd',
              `M ${it.ax.toFixed(1)} ${it.ay.toFixed(1)} L ${kneeX.toFixed(1)} ${ly.toFixed(1)} L ${shelfX.toFixed(1)} ${ly.toFixed(1)}`
            );
            pathEl.setAttribute('stroke', strokeColor);
            pathEl.setAttribute('stroke-width', isSel ? '1.8' : '1.15');

            const tx = isRight ? shelfX + 6 : shelfX - 6;
            textEl.setAttribute('x', tx.toFixed(1));
            textEl.setAttribute('y', (ly + 3.5).toFixed(1));
            textEl.setAttribute('text-anchor', isRight ? 'start' : 'end');
            textEl.setAttribute('fill', textColor);
            textEl.setAttribute('font-weight', isSel ? '800' : '600');
          }
        };

        placeColumn(leftColumn, false);
        placeColumn(rightColumn, true);

        // Project ASME Double-Arrow Dimension Bars
        for (let d = 0; d < dimBarEntries.length; d++) {
          const dim = dimBarEntries[d];
          const gEl = dimGroupRefs.current[dim.id];
          const ext1 = dimExt1Refs.current[dim.id];
          const ext2 = dimExt2Refs.current[dim.id];
          const bar = dimBarRefs.current[dim.id];
          const bgRect = dimLabelBgRefs.current[dim.id];
          const txt = dimTextRefs.current[dim.id];
          if (!gEl || !ext1 || !ext2 || !bar || !bgRect || !txt) continue;

          dim.startObj.getWorldPosition(_projVec);
          _projVec.project(activeCam);
          dim.endObj.getWorldPosition(_projEnd);
          _projEnd.project(activeCam);

          if (_projVec.z > 1 || _projEnd.z > 1) {
            gEl.style.opacity = '0';
            continue;
          }

          const x1 = (_projVec.x * 0.5 + 0.5) * w;
          const y1 = (-_projVec.y * 0.5 + 0.5) * h;
          const x2 = (_projEnd.x * 0.5 + 0.5) * w;
          const y2 = (-_projEnd.y * 0.5 + 0.5) * h;

          const bx1 = x1 + dim.offsetX;
          const by1 = y1 + dim.offsetY;
          const bx2 = x2 + dim.offsetX;
          const by2 = y2 + dim.offsetY;

          gEl.style.opacity = '1';
          ext1.setAttribute('x1', x1.toFixed(1));
          ext1.setAttribute('y1', y1.toFixed(1));
          ext1.setAttribute('x2', bx1.toFixed(1));
          ext1.setAttribute('y2', by1.toFixed(1));

          ext2.setAttribute('x1', x2.toFixed(1));
          ext2.setAttribute('y1', y2.toFixed(1));
          ext2.setAttribute('x2', bx2.toFixed(1));
          ext2.setAttribute('y2', by2.toFixed(1));

          bar.setAttribute('x1', bx1.toFixed(1));
          bar.setAttribute('y1', by1.toFixed(1));
          bar.setAttribute('x2', bx2.toFixed(1));
          bar.setAttribute('y2', by2.toFixed(1));

          const mx = (bx1 + bx2) * 0.5;
          const my = (by1 + by2) * 0.5;
          const estW = Math.max(76, dim.label.length * 6.0 + 12);
          bgRect.setAttribute('x', (mx - estW * 0.5).toFixed(1));
          bgRect.setAttribute('y', (my - 8).toFixed(1));
          bgRect.setAttribute('width', estW.toFixed(1));
          bgRect.setAttribute('height', '16');

          txt.setAttribute('x', mx.toFixed(1));
          txt.setAttribute('y', (my + 3.5).toFixed(1));
        }
      }

      if (isSoftwareGl) {
        afterDraw(() => tick(performance.now()));
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      tick(performance.now());
    } else {
      frameId = requestAnimationFrame(tick);
    }

    const onContextLost = (e: Event) => {
      e.preventDefault();
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      setWebglError('3D WebGL context was interrupted.');
    };
    const onContextRestored = () => {
      setWebglError(null);
      setRetryNonce((n) => n + 1);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    return () => {
      disposed = true;
      partGroupRef.current = null;
      highlightMatRef.current = null;
      captureFnRef.current = null;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer?.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer?.domElement.removeEventListener('pointerup', onPointerUp);
      renderer?.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer?.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      controls.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material?.dispose();
        }
      });
      Object.values(mats).forEach((m) => m.dispose());
      edgeLines.forEach((l) => l.geometry.dispose());
      textures.dispose();
      if (scene.environment) scene.environment.dispose();
      renderer?.renderLists.dispose();
    };
  }, [
    partKey,
    config.bore,
    config.stroke,
    config.rodLength,
    config.deckHeight,
    config.chamberCc,
    config.pistonReliefCc,
    config.pistonAlloy,
    config.ringApplication,
    config.camProfile,
    config.rockerRatio,
    config.carbCfm,
    config.carbStyle,
    config.carbVenturiIn,
    config.airFilterCfmBonus,
    config.intakePortCc,
    config.intakeValveIn,
    config.exhaustPortCc,
    config.exhaustPortShape,
    config.exhaustValveIn,
    config.headerPrimaryIn,
    config.cylinders,
    config.ignitionTiming,
    config.sparkPlugGap,
    config.targetAFR,
    config.firingOrder,
    config.bellhousingPattern,
    specs.displacementCi,
    specs.quenchDistance,
    specs.ptwClearance,
    specs.rodStrokeRatio,
    specs.maxRodAngleDeg,
    specs.staticCR,
    specs.topRingGap,
    specs.secondRingGap,
    specs.totalValveLift,
    specs.intakeFlowPeakCfm,
    specs.exhaustFlowPeakCfm,
    specs.eiFlowRatioPct,
    specs.intakeVelocityFps,
    specs.effectiveCarbCfm,
    specs.peakCfmDemand,
    specs.carbSizingStatus,
    specs.camData.lobeLift,
    specs.camData.intakeDur050,
    specs.camData.exhDur050,
    specs.intakeData.name,
    specs.intakeData.style,
    specs.intakeData.flowCfm,
    renderMode,
    projection,
    retryNonce,
    entry.drawingNumber,
    camStepoverPct
  ]);

  const handleExportSTL = () => {
    if (!partGroupRef.current) return;
    const tris = exportObject3DToSTL(
      partGroupRef.current,
      `${entry.drawingNumber}-${partKey}.stl`
    );
    setExportStatus(`Exported ${tris.toLocaleString()} STL triangles (${entry.drawingNumber}.stl)`);
    setTimeout(() => setExportStatus(null), 4000);
  };

  const handleExportDXF = () => {
    exportPartProfileToDXF({
      drawingNumber: entry.drawingNumber,
      title: entry.partName,
      partKey,
      bore: config.bore,
      stroke: config.stroke,
      rodLength: config.rodLength,
      deckHeight: config.deckHeight,
      chamberCc: config.chamberCc,
      filename: `${entry.drawingNumber}-${partKey}.dxf`
    });
    setExportStatus(`Exported AutoCAD R12 DXF (${entry.drawingNumber}.dxf)`);
    setTimeout(() => setExportStatus(null), 4000);
  };

  const isIsoPaper = renderMode === 'iso_paper';

  return (
    <div className="bg-[#12161c] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* Top Individual Part CAD Toolbar */}
      <div className="px-3 py-2 border-b border-slate-800 bg-[#0d1014] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Render / Engineering Mode */}
          <div className="flex flex-wrap items-center gap-0.5 bg-[#12161c] border border-slate-800 p-0.5 rounded-md">
            {(
              [
                { id: 'cinematic', label: 'Cinematic PBR' },
                { id: 'iso_paper', label: 'Tech Paper ISO' },
                { id: 'pbr', label: 'Studio PBR' },
                { id: 'gdt', label: 'GD&T Datums' },
                { id: 'stress', label: 'FEA Stress' },
                { id: 'thermal', label: 'Thermal' },
                { id: 'toolpath', label: 'CNC Toolpath' },
                { id: 'blueprint', label: 'Blueprint' }
              ] as Array<{ id: ComponentRenderMode; label: string }>
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onChangeRenderMode(m.id)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap ${
                  renderMode === m.id
                    ? 'bg-orange-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Projection Mode */}
          <div className="flex items-center gap-0.5 bg-[#12161c] border border-slate-800 p-0.5 rounded-md">
            {(
              [
                { id: 'perspective', label: 'Persp' },
                { id: 'orthographic', label: 'Ortho CAD' }
              ] as Array<{ id: ComponentProjectionMode; label: string }>
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onChangeProjection(p.id)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap ${
                  projection === p.id
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Single vs 4-Viewport Quad Ortho */}
          <button
            type="button"
            onClick={() =>
              onChangeViewportLayout(viewportLayout === 'single' ? 'quad' : 'single')
            }
            className={`px-2.5 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1.5 transition whitespace-nowrap ${
              viewportLayout === 'quad'
                ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-semibold'
                : 'bg-[#12161c] border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {viewportLayout === 'quad' ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Grid2x2 className="w-3.5 h-3.5" />
            )}
            <span>{viewportLayout === 'quad' ? 'Quad 4-View Active' : 'Quad 4-View'}</span>
          </button>

          {/* Camera Views */}
          {viewportLayout === 'single' && (
            <div className="flex items-center gap-0.5 bg-[#12161c] border border-slate-800 p-0.5 rounded-md">
              {(['iso', 'front', 'top', 'right', 'rear'] as ComponentCameraPreset[]).map((cam) => (
                <button
                  key={cam}
                  type="button"
                  onClick={() => setCameraPreset({ id: cam, nonce: Date.now() })}
                  className={`px-2 py-1 rounded text-[11px] font-medium uppercase transition whitespace-nowrap ${
                    cameraPreset.id === cam
                      ? 'bg-slate-700 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cam}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Exports & Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {viewportLayout === 'single' && (
            <button
              type="button"
              onClick={() => setShowCallouts((v) => !v)}
              className={`px-2.5 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1 transition whitespace-nowrap ${
                showCallouts
                  ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300'
                  : 'bg-[#12161c] border-slate-700 text-slate-400'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Leaders &amp; Dims</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1 transition whitespace-nowrap ${
              autoRotate
                ? 'bg-orange-500/15 border-orange-500/60 text-orange-300'
                : 'bg-[#12161c] border-slate-700 text-slate-400'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Orbit Spin</span>
          </button>

          <button
            type="button"
            onClick={handleExportSTL}
            className="px-2.5 py-1 rounded-md border border-slate-700 bg-[#12161c] hover:border-orange-500/60 text-slate-200 hover:text-orange-300 text-[11px] font-medium flex items-center gap-1 transition whitespace-nowrap"
          >
            <Box className="w-3.5 h-3.5 text-orange-400" />
            <span>Export .STL</span>
          </button>

          <button
            type="button"
            onClick={handleExportDXF}
            className="px-2.5 py-1 rounded-md border border-slate-700 bg-[#12161c] hover:border-cyan-500/60 text-slate-200 hover:text-cyan-300 text-[11px] font-medium flex items-center gap-1 transition whitespace-nowrap"
          >
            <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export .DXF</span>
          </button>

          <button
            type="button"
            onClick={() => captureFnRef.current?.()}
            className="px-2.5 py-1 rounded-md border border-slate-700 bg-[#12161c] hover:border-emerald-500/60 text-slate-200 hover:text-emerald-300 text-[11px] font-medium flex items-center gap-1 transition whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>PNG</span>
          </button>
        </div>
      </div>

      {/* Interactive 3D Viewport + SVG Elbow Leader & Dimension Overlay */}
      <div
        className={`relative w-full h-[520px] overflow-hidden ${
          isIsoPaper ? 'bg-[#f5f6f8]' : 'bg-[#0e1319]'
        }`}
      >
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Publication Technical Drawing Top Header (visible on ISO Paper mode) */}
        {isIsoPaper && !webglError && (
          <div className="pointer-events-none absolute top-2.5 inset-x-0 text-center z-10 px-4">
            <div className="inline-block px-3 py-0.5 text-xs sm:text-sm font-extrabold tracking-wide uppercase text-slate-900">
              {entry.partName.split('(')[0].trim()} — {specs.displacementCi} CID, ISOMETRIC TECHNICAL DRAWING
            </div>
          </div>
        )}

        {/* 60fps Interactive SVG Orthogonal Leader Callouts & ASME Dimension Lines */}
        {viewportLayout === 'single' && showCallouts && !webglError && (
          <svg
            className="pointer-events-none absolute inset-0 w-full h-full z-10"
            aria-label="Technical Drawing Leader Callouts and Dimensions"
          >
            <defs>
              <marker
                id="dim-arrow-start"
                viewBox="0 0 10 10"
                refX="1"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path
                  d="M 9 2 L 1 5 L 9 8 z"
                  fill={isIsoPaper ? '#0f172a' : '#38bdf8'}
                />
              </marker>
              <marker
                id="dim-arrow-end"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path
                  d="M 1 2 L 9 5 L 1 8 z"
                  fill={isIsoPaper ? '#0f172a' : '#38bdf8'}
                />
              </marker>
            </defs>

            {/* Double-Arrow Extension Dimension Lines */}
            {dimensionBarsMeta.map((dim) => (
              <g
                key={dim.id}
                ref={(el) => {
                  dimGroupRefs.current[dim.id] = el;
                }}
                style={{ opacity: 0 }}
              >
                <line
                  ref={(el) => {
                    dimExt1Refs.current[dim.id] = el;
                  }}
                  stroke={isIsoPaper ? '#475569' : '#64748b'}
                  strokeWidth="0.9"
                  strokeDasharray="3 2"
                />
                <line
                  ref={(el) => {
                    dimExt2Refs.current[dim.id] = el;
                  }}
                  stroke={isIsoPaper ? '#475569' : '#64748b'}
                  strokeWidth="0.9"
                  strokeDasharray="3 2"
                />
                <line
                  ref={(el) => {
                    dimBarRefs.current[dim.id] = el;
                  }}
                  stroke={isIsoPaper ? '#0f172a' : '#38bdf8'}
                  strokeWidth="1.25"
                  markerStart="url(#dim-arrow-start)"
                  markerEnd="url(#dim-arrow-end)"
                />
                <rect
                  ref={(el) => {
                    dimLabelBgRefs.current[dim.id] = el;
                  }}
                  rx="2"
                  fill={isIsoPaper ? 'rgba(245,246,248,0.92)' : 'rgba(13,16,20,0.88)'}
                />
                <text
                  ref={(el) => {
                    dimTextRefs.current[dim.id] = el;
                  }}
                  textAnchor="middle"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontSize="9.5"
                  fontWeight="700"
                  fill={isIsoPaper ? '#0f172a' : '#7dd3fc'}
                >
                  {dim.label}
                </text>
              </g>
            ))}

            {/* Clickable Orthogonal Elbow Leader Callouts */}
            {subPartCatalog.map((sp) => (
              <g
                key={sp.id}
                ref={(el) => {
                  leaderGroupRefs.current[sp.id] = el;
                }}
                style={{ opacity: 0 }}
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSubPartId((prev) => (prev === sp.id ? null : sp.id));
                }}
              >
                <circle
                  ref={(el) => {
                    leaderDotRefs.current[sp.id] = el;
                  }}
                  r="3"
                />
                <path
                  ref={(el) => {
                    leaderPathRefs.current[sp.id] = el;
                  }}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text
                  ref={(el) => {
                    leaderTextRefs.current[sp.id] = el;
                  }}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fontSize="9.5"
                  letterSpacing="0.03em"
                >
                  {sp.label}
                </text>
              </g>
            ))}
          </svg>
        )}

        {/* Quad-View Quadrant Crosshair & Labels */}
        {viewportLayout === 'quad' && !webglError && (
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute inset-y-0 left-1/2 w-px bg-cyan-500/40" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-500/40" />
            <span className="absolute top-2 left-2.5 font-mono text-[10px] font-bold text-orange-300 bg-[#0d1014]/90 px-2 py-0.5 rounded border border-slate-700">
              ISO ({projection.toUpperCase()})
            </span>
            <span className="absolute top-2 left-[calc(50%+10px)] font-mono text-[10px] font-bold text-cyan-300 bg-[#0d1014]/90 px-2 py-0.5 rounded border border-slate-700">
              TOP PLAN (ORTHO)
            </span>
            <span className="absolute top-[calc(50%+8px)] left-2.5 font-mono text-[10px] font-bold text-emerald-300 bg-[#0d1014]/90 px-2 py-0.5 rounded border border-slate-700">
              FRONT ELEVATION (ORTHO)
            </span>
            <span className="absolute top-[calc(50%+8px)] left-[calc(50%+10px)] font-mono text-[10px] font-bold text-amber-300 bg-[#0d1014]/90 px-2 py-0.5 rounded border border-slate-700">
              RIGHT PROFILE (ORTHO)
            </span>
          </div>
        )}

        {/* Title Block HUD Overlay (Bottom Right) */}
        <div
          className={`pointer-events-none absolute bottom-2.5 right-3 z-10 rounded-md px-2.5 py-1.5 font-mono text-[10px] space-y-0.5 hidden sm:block border ${
            isIsoPaper
              ? 'bg-white/90 border-slate-300 text-slate-800'
              : 'bg-[#0d1014]/90 border-slate-700/80 text-slate-300'
          }`}
        >
          <div className={`font-bold ${isIsoPaper ? 'text-slate-900' : 'text-white'}`}>
            {entry.drawingNumber} · {entry.revision}
          </div>
          <div className={isIsoPaper ? 'text-slate-600' : 'text-slate-400'}>
            {entry.materialStandard} · {entry.surfaceFinishRa.split('|')[0]}
          </div>
        </div>

        {/* GD&T Datum Legend when active */}
        {renderMode === 'gdt' && (
          <div className="pointer-events-none absolute bottom-2.5 left-3 z-10 bg-[#0d1014]/90 border border-slate-700/80 rounded-md px-2.5 py-1.5 font-mono text-[10px] flex items-center gap-3">
            <span className="text-sky-400 font-semibold">DATUM A (Base)</span>
            <span className="text-orange-400 font-semibold">DATUM B (Rear)</span>
            <span className="text-emerald-400 font-semibold">DATUM C (Side)</span>
          </div>
        )}

        {exportStatus && (
          <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-md bg-emerald-950/95 border border-emerald-500/60 text-emerald-200 font-mono text-[11px]">
            {exportStatus}
          </div>
        )}

        {webglError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0d1014]/95 p-6">
            <div className="max-w-sm text-center space-y-2.5">
              <div className="text-sm font-bold text-white">3D Component Viewport Unavailable</div>
              <p className="text-xs text-slate-400">{webglError}</p>
              <button
                type="button"
                onClick={() => {
                  rendererRef.current?.dispose();
                  rendererRef.current = null;
                  setWebglError(null);
                  setRetryNonce((n) => n + 1);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition"
              >
                Retry 3D Render
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Individual Sub-Part Quick Selector Rail & Selected Component Inspection Spec Sheet */}
      {subPartCatalog.length > 0 && (
        <div className="px-3 py-2.5 border-t border-slate-800 bg-[#10141b] space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
              <Crosshair className="w-3.5 h-3.5 text-orange-400" />
              <span>Select Individual Component:</span>
            </span>
            {subPartCatalog.map((sp) => {
              const active = selectedSubPartId === sp.id;
              return (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => setSelectedSubPartId((prev) => (prev === sp.id ? null : sp.id))}
                  className={`px-2 py-1 rounded-md border font-mono text-[10px] transition whitespace-nowrap ${
                    active
                      ? 'bg-orange-600 border-orange-400 text-white font-bold'
                      : 'bg-[#0d1014] border-slate-700 text-slate-300 hover:border-orange-500/60 hover:text-white'
                  }`}
                >
                  {sp.label}
                </button>
              );
            })}
          </div>

          {selectedSubPart ? (
            <div className="bg-[#0d1014] border border-orange-500/50 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[10px] text-orange-400 font-bold uppercase">
                    SELECTED COMPONENT · {selectedSubPart.category}
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    {selectedSubPart.label}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubPartId(null)}
                  className="p-1 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition"
                  title="Clear component selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-[#12161c] border border-slate-800 rounded px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-400 uppercase">Material Spec</div>
                  <div className="text-slate-100 font-medium mt-0.5">{selectedSubPart.material}</div>
                </div>
                <div className="bg-[#12161c] border border-slate-800 rounded px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-400 uppercase">Parametric Dimensions</div>
                  <div className="font-mono text-cyan-300 font-semibold tabular-nums mt-0.5">
                    {selectedSubPart.dimensions}
                  </div>
                </div>
                <div className="bg-[#12161c] border border-slate-800 rounded px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-400 uppercase">GD&amp;T Tolerance</div>
                  <div className="font-mono text-amber-300 font-semibold tabular-nums mt-0.5">
                    {selectedSubPart.tolerance}
                  </div>
                </div>
                <div className="bg-[#12161c] border border-slate-800 rounded px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-400 uppercase">Flow / Torque Rating</div>
                  <div className="font-mono text-emerald-300 font-semibold tabular-nums mt-0.5">
                    {selectedSubPart.flowOrTorque}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed border-t border-slate-800 pt-1.5">
                {selectedSubPart.notes}
              </p>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">
              Click any 3D sub-part mesh, any leader callout label, or any component button above to inspect its material, tolerance band, and live modification geometry.
            </div>
          )}
        </div>
      )}

      {/* Bottom Live Cross-Section Plane Slicer Bar */}
      <div className="px-3 py-2 border-t border-slate-800 bg-[#0d1014] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Scissors className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-300 font-medium">Section Cut Plane:</span>
          {(['none', 'x', 'y', 'z'] as SectionAxis[]).map((ax) => (
            <button
              key={ax}
              type="button"
              onClick={() => setSectionAxis(ax)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase transition whitespace-nowrap ${
                sectionAxis === ax
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-[#12161c] border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {ax === 'none' ? 'Off' : `${ax}-Axis`}
            </button>
          ))}
        </div>

        {sectionAxis !== 'none' ? (
          <div className="flex items-center gap-3 flex-1 max-w-sm">
            <input
              type="range"
              min="-1"
              max="1"
              step="0.02"
              value={sectionPercent}
              onChange={(e) => setSectionPercent(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded"
            />
            <span className="font-mono text-[11px] text-cyan-300 tabular-nums w-14 text-right">
              {Math.round(sectionPercent * 100)}%
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">
            Drag to orbit · Scroll to zoom · Select X/Y/Z axis to inspect internal walls &amp; oil galleries
          </span>
        )}
      </div>
    </div>
  );
};
