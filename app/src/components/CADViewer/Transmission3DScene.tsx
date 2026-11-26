/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TransmissionItem, InspectionData, TechDrawingSheet } from '../../types/engine';
import {
  createProceduralTextureSet,
  createGearGeometry,
  createARP12PointBolt,
  createSplineShaftGeometry,
  applyTechnicalEdges
} from './mechanicalGeometry';
import { EngineViewMode } from './Engine3DScene';

interface Transmission3DSceneProps {
  transmission: TransmissionItem;
  explodedAmount: number;
  isRunning: boolean;
  viewMode?: EngineViewMode;
  techDrawing?: TechDrawingSheet | null;
  focusPartRequest?: { key: string; nonce: number } | null;
  onSelectPart: (data: InspectionData | null) => void;
  onOpenDrawingsTab?: () => void;
}

function detectSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext | null): boolean {
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

const _rayMouse = new THREE.Vector2();
const _focusBox = new THREE.Box3();
const _focusCenter = new THREE.Vector3();

export const Transmission3DScene: React.FC<Transmission3DSceneProps> = ({
  transmission,
  explodedAmount,
  isRunning,
  viewMode = 'realistic',
  techDrawing = null,
  focusPartRequest = null,
  onSelectPart,
  onOpenDrawingsTab
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState<number>(0);
  const explodedRef = useRef(explodedAmount);
  const isRunningRef = useRef(isRunning);
  const onSelectPartRef = useRef(onSelectPart);
  const transPartsRef = useRef<Record<string, THREE.Object3D | null>>({});
  const reticleStateRef = useRef<{
    reticle: THREE.Mesh;
    camera: THREE.PerspectiveCamera;
  } | null>(null);

  useEffect(() => { explodedRef.current = explodedAmount; }, [explodedAmount]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { onSelectPartRef.current = onSelectPart; }, [onSelectPart]);

  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 480;

    const isDrawing = viewMode === 'drawing';
    const isWire = viewMode === 'wireframe';
    const isGhost = viewMode === 'ghost';
    const isStudio = viewMode === 'realistic';

    let candidateRenderer = rendererRef.current;
    if (!candidateRenderer) {
      try {
        candidateRenderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: 'default'
        });
        rendererRef.current = candidateRenderer;
      } catch (err) {
        setWebglError(
          err instanceof Error
            ? err.message
            : 'WebGL 3D context could not be initialized by your browser.'
        );
        return;
      }
    }
    const renderer: THREE.WebGLRenderer = candidateRenderer;
    const initialGl = renderer.getContext();
    if (!initialGl) {
      setWebglError('WebGL rendering context is unavailable or was lost.');
      return;
    }
    setWebglError(null);

    const isSoftwareGl = detectSoftwareRenderer(initialGl);

    const scene = new THREE.Scene();
    const bgHex = isDrawing
      ? 0x091628
      : isWire
      ? 0x07111a
      : isStudio
      ? 0xdce1e7
      : 0x101419;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, isStudio ? 0.005 : 0.012);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if (renderer.domElement.parentNode !== container) {
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
    }

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 300);
    camera.position.set(14.5, 9.5, 17.0);
    camera.lookAt(0.5, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.target.set(0.5, 0, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(isStudio ? 0xffffff : 0xcbe4ff, isStudio ? 0x64748b : 0x241d17, isStudio ? 0.95 : 0.75));
    const keyLight = new THREE.DirectionalLight(0xfff5eb, isStudio ? 1.85 : 1.65);
    keyLight.position.set(16, 20, 16);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(isStudio ? 0xe0f2fe : 0x38bdf8, 0.85);
    rimLight.position.set(-14, 10, -14);
    scene.add(rimLight);

    const underLight = new THREE.DirectionalLight(0xffcf99, 0.45);
    underLight.position.set(2, -12, 8);
    scene.add(underLight);

    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const textures = createProceduralTextureSet(maxAniso);

    const stagePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshBasicMaterial({
        map: textures.blueprintScaleMap,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
      })
    );
    stagePlane.rotation.x = -Math.PI / 2;
    stagePlane.position.y = -3.78;
    scene.add(stagePlane);

    const grid = new THREE.GridHelper(
      28,
      28,
      isDrawing ? 0x38bdf8 : 0xe5a823,
      isDrawing ? 0x16324f : 0x1f2e3d
    );
    grid.position.y = -3.80;
    scene.add(grid);

    // Performance CAD Materials
    const mats = {
      castAlumCase: new THREE.MeshPhysicalMaterial({
        color: isDrawing ? 0x1a3352 : 0xa9b6c6,
        bumpMap: isDrawing ? null : textures.castIronBump,
        bumpScale: 0.02,
        normalMap: isDrawing ? null : textures.castIronNormal,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughness: 0.38,
        metalness: 0.68,
        wireframe: isWire,
        transparent: isGhost,
        opacity: isGhost ? 0.28 : 1.0,
        side: THREE.DoubleSide
      }),
      machinedSteel: new THREE.MeshPhysicalMaterial({
        color: isDrawing ? 0x2b4f75 : 0xdde3ea,
        map: isDrawing ? null : textures.machinedSwirl,
        normalMap: isDrawing ? null : textures.machinedNormal,
        normalScale: new THREE.Vector2(0.42, 0.42),
        roughness: 0.16,
        metalness: 0.94,
        anisotropy: 0.68,
        wireframe: isWire
      }),
      hardenedGear: new THREE.MeshPhysicalMaterial({
        color: 0x64748b,
        normalMap: isDrawing ? null : textures.machinedNormal,
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughness: 0.22,
        metalness: 0.92,
        anisotropy: 0.55,
        wireframe: isWire
      }),
      brassSynchro: new THREE.MeshStandardMaterial({
        color: 0xe5a823,
        roughness: 0.24,
        metalness: 0.90,
        wireframe: isWire
      }),
      converterGold: new THREE.MeshPhysicalMaterial({
        color: 0xd97706,
        normalMap: isDrawing ? null : textures.machinedNormal,
        normalScale: new THREE.Vector2(0.28, 0.28),
        roughness: 0.24,
        metalness: 0.88,
        clearcoat: 0.45,
        wireframe: isWire
      }),
      clutchFriction: new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.85,
        metalness: 0.08,
        wireframe: isWire
      }),
      arpBolt: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        bumpMap: isDrawing ? null : textures.boltThreadBump,
        bumpScale: 0.015,
        roughness: 0.24,
        metalness: 0.92,
        wireframe: isWire
      }),
      anodizedBlack: new THREE.MeshStandardMaterial({
        color: 0x151921,
        roughness: 0.34,
        metalness: 0.72,
        wireframe: isWire
      }),
      techEdge: new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.9
      })
    };

    const transGroup = new THREE.Group();

    // =========================================================================
    // 1. LATHE BELLHOUSING WITH FLANGE & STARTER POCKET
    // =========================================================================
    const bellPts = [
      new THREE.Vector2(4.25, -1.7),
      new THREE.Vector2(4.25, -1.4),
      new THREE.Vector2(3.9, -1.35),
      new THREE.Vector2(3.55, -0.3),
      new THREE.Vector2(2.65, 1.3),
      new THREE.Vector2(2.45, 1.7)
    ];
    const bellhousing = new THREE.Group();
    const bellMesh = new THREE.Mesh(
      new THREE.LatheGeometry(bellPts, 28),
      mats.castAlumCase
    );
    bellMesh.rotation.z = -Math.PI / 2;
    bellhousing.add(bellMesh);

    // 6 Chevy V8 Bellhousing Mount Bolts + 2 Dowel Alignment Pins + Radial Cooling Gussets
    for (let b = 0; b < 6; b++) {
      const a = (b / 6) * Math.PI * 2 + 0.3;
      const bolt = createARP12PointBolt(0.11, 0.45, mats.arpBolt);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(-1.6, Math.sin(a) * 4.0, Math.cos(a) * 4.0);
      bellhousing.add(bolt);

      const gusset = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.16, 0.36), mats.castAlumCase);
      gusset.position.set(0.05, Math.sin(a) * 3.15, Math.cos(a) * 3.15);
      gusset.rotation.x = -a;
      gusset.rotation.z = 0.32;
      bellhousing.add(gusset);
    }
    [-1, 1].forEach((dSign) => {
      const dowelPin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.42, 14, 1, true),
        mats.machinedSteel
      );
      dowelPin.rotation.z = Math.PI / 2;
      dowelPin.position.set(-1.72, -0.35, dSign * 3.72);
      bellhousing.add(dowelPin);
    });
    bellhousing.position.x = -4.6;
    bellhousing.userData = {
      name: `${transmission.name} SFI Bellhousing`,
      category: 'Transmission Housing',
      desc: `Native Pattern: ${transmission.nativePattern}. Precision dowel-pinned bellhousing alignment with structural ribs.`
    };
    transGroup.add(bellhousing);

    // =========================================================================
    // 2. INPUT COUPLER (FINNED TORQUE CONVERTER OR SFI FLYWHEEL + CLUTCH)
    // =========================================================================
    const inputCouplerGroup = new THREE.Group();
    if (transmission.type === 'Automatic') {
      const tcPts = [
        new THREE.Vector2(0.0, -0.9),
        new THREE.Vector2(3.15, -0.82),
        new THREE.Vector2(3.45, -0.45),
        new THREE.Vector2(3.45, 0.45),
        new THREE.Vector2(2.85, 0.85),
        new THREE.Vector2(0.78, 0.92),
        new THREE.Vector2(0.78, 1.55),
        new THREE.Vector2(0.0, 1.55)
      ];
      const converter = new THREE.Mesh(new THREE.LatheGeometry(tcPts, 36), mats.converterGold);
      converter.rotation.z = -Math.PI / 2;
      converter.userData = {
        name: `Finned Lockup Torque Converter (${transmission.defaultStall} RPM Stall)`,
        category: 'Torque Converter',
        desc: 'Furnace-brazed pump & turbine impeller fins with anti-ballooning front cover, pilot hub & NPT drain plug.'
      };
      inputCouplerGroup.add(converter);

      // Crank Pilot Hub + Circumferential Furnace-Brazed Seam + NPT Brass Drain Plug
      const tcPilot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.48, 0.55, 18),
        mats.machinedSteel
      );
      tcPilot.rotation.z = Math.PI / 2;
      tcPilot.position.x = -1.05;
      inputCouplerGroup.add(tcPilot);

      const weldSeam = new THREE.Mesh(
        new THREE.TorusGeometry(3.45, 0.055, 8, 36),
        mats.machinedSteel
      );
      weldSeam.rotation.y = Math.PI / 2;
      inputCouplerGroup.add(weldSeam);

      const drainPlug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.18, 6),
        mats.brassSynchro
      );
      drainPlug.rotation.z = Math.PI / 2;
      drainPlug.position.set(-0.92, -2.55, 0);
      inputCouplerGroup.add(drainPlug);

      // 3 Welded Flexplate Mounting Lugs + ARP Torque Converter Bolts
      for (let l = 0; l < 3; l++) {
        const a = (l / 3) * Math.PI * 2;
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 0.55), mats.machinedSteel);
        pad.position.set(-0.95, Math.cos(a) * 2.35, Math.sin(a) * 2.35);
        inputCouplerGroup.add(pad);

        const lugBolt = createARP12PointBolt(0.085, 0.34, mats.arpBolt);
        lugBolt.rotation.z = Math.PI / 2;
        lugBolt.position.set(-1.12, Math.cos(a) * 2.35, Math.sin(a) * 2.35);
        inputCouplerGroup.add(lugBolt);
      }
    } else {
      const flywheel = new THREE.Mesh(
        createGearGeometry(3.85, 64, 0.42, 0.55, 0.14),
        mats.machinedSteel
      );
      flywheel.rotation.y = Math.PI / 2;
      flywheel.position.x = -1.1;
      flywheel.userData = {
        name: '168-Tooth SFI Billet Steel Flywheel',
        category: 'Clutch Assembly',
        desc: 'CNC-machined billet chromoly flywheel, internal neutral balance.'
      };
      inputCouplerGroup.add(flywheel);

      for (let fb = 0; fb < 6; fb++) {
        const a = (fb / 6) * Math.PI * 2;
        const fwBolt = createARP12PointBolt(0.08, 0.25, mats.arpBolt);
        fwBolt.rotation.z = -Math.PI / 2;
        fwBolt.position.set(-0.88, Math.cos(a) * 0.85, Math.sin(a) * 0.85);
        inputCouplerGroup.add(fwBolt);
      }

      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(3.1, 3.1, 0.18, 28),
        mats.clutchFriction
      );
      disc.rotation.z = Math.PI / 2;
      disc.position.x = -0.68;
      inputCouplerGroup.add(disc);

      // Sprung hub damper springs inside clutch disc
      for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2;
        const damper = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 0.55, 10),
          mats.brassSynchro
        );
        damper.rotation.x = a;
        damper.position.set(-0.55, Math.cos(a) * 1.15, Math.sin(a) * 1.15);
        inputCouplerGroup.add(damper);
      }

      const pressurePlate = new THREE.Mesh(
        new THREE.CylinderGeometry(3.35, 3.55, 0.48, 24),
        mats.converterGold
      );
      pressurePlate.rotation.z = Math.PI / 2;
      pressurePlate.position.x = -0.22;
      pressurePlate.userData = {
        name: `Diaphragm Pressure Plate (${transmission.clutch})`,
        category: 'Clutch Assembly',
        desc: transmission.clutch
      };
      inputCouplerGroup.add(pressurePlate);

      // 12 Radial Diaphragm Spring Fingers
      for (let df = 0; df < 12; df++) {
        const a = (df / 12) * Math.PI * 2;
        const finger = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.05, 0.22), mats.machinedSteel);
        finger.position.set(0.05, Math.cos(a) * 1.35, Math.sin(a) * 1.35);
        finger.rotation.x = a;
        finger.rotation.z = -0.18;
        inputCouplerGroup.add(finger);
      }
    }
    inputCouplerGroup.position.x = -4.2;
    transGroup.add(inputCouplerGroup);

    // =========================================================================
    // 3. RIBBED ALUMINUM MAIN CASE + INTERNAL ROTATING GEAR TRAIN
    // =========================================================================
    const mainCaseGroup = new THREE.Group();
    const caseShape = new THREE.Shape();
    caseShape.moveTo(-2.1, -1.8);
    caseShape.lineTo(2.1, -1.8);
    caseShape.lineTo(2.35, 0.6);
    caseShape.lineTo(1.45, 2.05);
    caseShape.lineTo(-1.45, 2.05);
    caseShape.lineTo(-2.35, 0.6);
    caseShape.closePath();

    const mainCaseGeo = new THREE.ExtrudeGeometry(caseShape, {
      depth: 5.4,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.1,
      bevelSegments: 2
    });
    mainCaseGeo.rotateY(Math.PI / 2);
    mainCaseGeo.translate(-2.7, 0, 0);

    const mainCaseMesh = new THREE.Mesh(mainCaseGeo, mats.castAlumCase);
    mainCaseMesh.userData = {
      name: `${transmission.name} Ribbed Aluminum Case`,
      category: 'Transmission',
      desc: `Length: ${transmission.lengthInches}" | Forward Ratios: ${transmission.ratios.join(', ')} | Reverse: ${transmission.reverse}:1.`
    };
    mainCaseGroup.add(mainCaseMesh);

    // Cast Reinforcement Case Ribs + Side Cooler Line Brass Fittings + Selector Arm
    for (let r = -2; r <= 2; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 4.75), mats.castAlumCase);
      rib.position.set(r * 1.05, 0.1, 0);
      mainCaseGroup.add(rib);
    }

    // Twin AN-6 Brass Cooler Fittings on Right Side of Main Case
    [-1.4, 1.2].forEach((cx) => {
      const anFitting = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.42, 6),
        mats.brassSynchro
      );
      anFitting.rotation.x = Math.PI / 2;
      anFitting.position.set(cx, -0.55, 2.38);
      mainCaseGroup.add(anFitting);
    });

    // Manual Selector / Shifter Detent Lever Shaft on Left Case Side
    const detentLever = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.95, 0.28), mats.machinedSteel);
    detentLever.position.set(-1.1, -0.45, -2.42);
    detentLever.rotation.z = 0.35;
    mainCaseGroup.add(detentLever);

    // Internal Input / Output Mainshaft with 26-Spline Front Tip & 32-Spline Output Tail
    const inputShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 5.4, 20),
      mats.machinedSteel
    );
    inputShaft.rotation.z = Math.PI / 2;
    inputShaft.position.set(-0.6, 0.35, 0);

    const frontSpline = new THREE.Mesh(
      createSplineShaftGeometry(0.34, 1.55, 24),
      mats.machinedSteel
    );
    frontSpline.rotation.x = Math.PI / 2;
    frontSpline.position.y = 2.95;
    inputShaft.add(frontSpline);

    const rearSpline = new THREE.Mesh(
      createSplineShaftGeometry(0.36, 1.9, 28),
      mats.machinedSteel
    );
    rearSpline.rotation.x = Math.PI / 2;
    rearSpline.position.y = -3.45;
    inputShaft.add(rearSpline);
    mainCaseGroup.add(inputShaft);

    const gearRadii = [1.45, 1.18, 0.95, 0.78];
    const mainShaftGears: THREE.Mesh[] = [];
    const counterShaftGears: THREE.Mesh[] = [];

    gearRadii.forEach((rad, gIdx) => {
      const gx = -1.6 + gIdx * 1.08;
      const teeth = Math.round(rad * 18);
      const gear = new THREE.Mesh(
        createGearGeometry(rad, teeth, 0.46, 0.34, 0.11),
        mats.hardenedGear
      );
      gear.rotation.y = Math.PI / 2;
      gear.position.set(gx, 0.35, 0);
      mainCaseGroup.add(gear);
      mainShaftGears.push(gear);

      // Countershaft / Planetary Pinion gear below
      const cRad = 1.95 - rad;
      const cTeeth = Math.max(12, Math.round(cRad * 18));
      const cGear = new THREE.Mesh(
        createGearGeometry(cRad, cTeeth, 0.44, 0.28, 0.11),
        mats.hardenedGear
      );
      cGear.rotation.y = Math.PI / 2;
      cGear.position.set(gx, -1.18, 0);
      mainCaseGroup.add(cGear);
      counterShaftGears.push(cGear);

      // Brass Synchronizer Ring (Manual) or Clutch Drum (Auto)
      if (gIdx < 3) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(rad * 0.72, 0.08, 8, 22),
          mats.brassSynchro
        );
        ring.rotation.y = Math.PI / 2;
        ring.position.set(gx + 0.32, 0.35, 0);
        mainCaseGroup.add(ring);
      }
    });

    // Front Oil Pump Housing + Stator Support (Explodes forward from main case)
    const frontPumpGroup = new THREE.Group();
    const pumpFlange = new THREE.Mesh(
      new THREE.CylinderGeometry(2.05, 2.05, 0.55, 24),
      mats.machinedSteel
    );
    pumpFlange.rotation.z = Math.PI / 2;
    const statorSnout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.72, 1.35, 18),
      mats.machinedSteel
    );
    statorSnout.rotation.z = Math.PI / 2;
    statorSnout.position.x = -0.85;
    frontPumpGroup.add(pumpFlange, statorSnout);
    frontPumpGroup.position.set(-2.9, 0.35, 0);
    frontPumpGroup.userData = {
      name: 'Front Oil Pump & Stator Support Assembly',
      category: 'Hydraulics',
      desc: 'Gerotor / crescent front pump assembly pressurizing clutch packs and converter circuit.'
    };
    transGroup.add(frontPumpGroup);

    // Multi-Disc Clutch Pack & Planetary Carrier Exploded Stack
    const clutchPackGroup = new THREE.Group();
    for (let cp = 0; cp < 6; cp++) {
      const plate = new THREE.Mesh(
        new THREE.TorusGeometry(1.22, 0.09, 8, 24),
        cp % 2 === 0 ? mats.brassSynchro : mats.machinedSteel
      );
      plate.rotation.y = Math.PI / 2;
      plate.position.set(-0.2 + cp * 0.22, 0.35, 0);
      clutchPackGroup.add(plate);
    }
    const planetaryDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(1.52, 1.52, 1.15, 24, 1, true),
      mats.hardenedGear
    );
    planetaryDrum.rotation.z = Math.PI / 2;
    planetaryDrum.position.set(1.45, 0.35, 0);
    clutchPackGroup.add(planetaryDrum);
    clutchPackGroup.userData = {
      name: 'Multi-Disc Friction/Steel Clutch Pack & Planetary Carrier',
      category: 'Internal Gear Train',
      desc: 'Alternating high-energy friction & Kolene steel plates with sun/ring planetary carrier.'
    };
    mainCaseGroup.add(clutchPackGroup);

    let valveBodyGroup: THREE.Group | null = null;
    let panMesh: THREE.Mesh | null = null;
    if (transmission.type === 'Automatic') {
      valveBodyGroup = new THREE.Group();
      const vbPlate = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.42, 3.1), mats.machinedSteel);
      const filterPlate = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 2.4), mats.brassSynchro);
      filterPlate.position.y = -0.34;
      // Twin Shift Solenoids & Accumulator Piston Cylinders
      [-1.1, 0.8].forEach((sx) => {
        const solenoid = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 0.65, 14),
          mats.anodizedBlack
        );
        solenoid.rotation.z = Math.PI / 2;
        solenoid.position.set(sx, 0.26, 1.05);
        valveBodyGroup!.add(solenoid);
      });
      valveBodyGroup.add(vbPlate, filterPlate);
      valveBodyGroup.position.set(0, -1.65, 0);
      valveBodyGroup.userData = {
        name: 'Hydraulic Valve Body, Shift Solenoids & Filter',
        category: 'Hydraulics',
        desc: 'Precision-bored aluminum valve body regulating line pressure, shift accumulators, and lockup solenoid.'
      };
      transGroup.add(valveBodyGroup);

      panMesh = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.85, 3.7), mats.machinedSteel);
      // Cast Aluminum Bottom Cooling Fins + Magnetic Brass Drain Plug + 12 Pan Flange Bolts
      for (let cf = -1.4; cf <= 1.41; cf += 0.35) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.12, 0.08), mats.machinedSteel);
        fin.position.set(0, -0.46, cf);
        panMesh.add(fin);
      }
      const magDrain = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.16, 6), mats.brassSynchro);
      magDrain.position.set(1.85, -0.46, 0);
      panMesh.add(magDrain);
      for (let pb = 0; pb < 4; pb++) {
        const px = -1.9 + pb * 1.26;
        [-1.72, 1.72].forEach((pz) => {
          const pBolt = createARP12PointBolt(0.065, 0.24, mats.arpBolt);
          pBolt.rotation.x = Math.PI;
          pBolt.position.set(px, -0.42, pz);
          panMesh!.add(pBolt);
        });
      }
      panMesh.position.set(0, -2.28, 0);
      panMesh.userData = {
        name: 'Finned Cast-Aluminum Deep Sump Pan',
        category: 'Transmission',
        desc: 'Extra +2 Qt ATF cooling capacity with magnetic drain plug, cooling fins & 12-bolt rail.'
      };
      transGroup.add(panMesh);
    } else {
      const shifterTurret = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.3, 1.3),
        mats.machinedSteel
      );
      shifterTurret.position.set(1.6, 2.35, 0);
      shifterTurret.userData = {
        name: 'Hurst Competition Plus Shifter & Linkage',
        category: 'Shifter Assembly',
        desc: 'Short-throw billet gate with adjustable 3rd/4th gear over-shift stops.'
      };
      mainCaseGroup.add(shifterTurret);

      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 2.6, 12),
        mats.machinedSteel
      );
      stick.position.set(1.3, 3.85, 0);
      stick.rotation.z = 0.25;
      mainCaseGroup.add(stick);
    }

    transGroup.add(mainCaseGroup);

    // =========================================================================
    // 4. TAPERED TAILHOUSING & FORGED 1350 SLIP YOKE WITH U-JOINT
    // =========================================================================
    const tailPts = [
      new THREE.Vector2(2.3, -2.2),
      new THREE.Vector2(2.05, -0.8),
      new THREE.Vector2(1.45, 1.2),
      new THREE.Vector2(1.25, 2.2)
    ];
    const tailshaft = new THREE.Mesh(new THREE.LatheGeometry(tailPts, 28), mats.castAlumCase);
    tailshaft.rotation.z = -Math.PI / 2;
    tailshaft.position.x = 4.9;
    // VSS Output Speed Sensor Housing + Urethane Transmission Mount Pad + Rear Oil Seal
    const vssSensor = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.65, 12), mats.anodizedBlack);
    vssSensor.rotation.x = Math.PI / 2;
    vssSensor.position.set(0.4, 0.25, 1.85);
    tailshaft.add(vssSensor);

    const mountPad = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.35, 1.85), mats.anodizedBlack);
    mountPad.position.set(-1.52, 0.85, 0);
    tailshaft.add(mountPad);

    const rearSeal = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.14, 10, 24), mats.anodizedBlack);
    rearSeal.rotation.x = Math.PI / 2;
    rearSeal.position.y = 2.18;
    tailshaft.add(rearSeal);

    tailshaft.userData = {
      name: 'Ribbed Aluminum Extension Tailhousing',
      category: 'Driveline',
      desc: 'Houses rear output bushing, VSS speedometer sensor, Viton lip seal, and urethane mount pad.'
    };
    transGroup.add(tailshaft);

    const slipYokeGroup = new THREE.Group();
    const yokeBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.74, 2.4, 24),
      mats.machinedSteel
    );
    yokeBarrel.rotation.z = -Math.PI / 2;
    slipYokeGroup.add(yokeBarrel);

    const yokeEarTop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 1.25), mats.machinedSteel);
    yokeEarTop.position.set(1.5, 0.55, 0);
    const yokeEarBot = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 1.25), mats.machinedSteel);
    yokeEarBot.position.set(1.5, -0.55, 0);
    const uJointCross = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 1.25, 14),
      mats.brassSynchro
    );
    uJointCross.position.set(1.65, 0, 0);
    const uJointPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 1.25, 14),
      mats.brassSynchro
    );
    uJointPin.rotation.x = Math.PI / 2;
    uJointPin.position.set(1.65, 0, 0);
    [-0.64, 0.64].forEach((cy) => {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.14, 14), mats.arpBolt);
      cap.position.set(1.65, cy, 0);
      slipYokeGroup.add(cap);
    });
    slipYokeGroup.add(yokeEarTop, yokeEarBot, uJointCross, uJointPin);

    slipYokeGroup.position.x = 7.4;
    slipYokeGroup.userData = {
      name: 'Forged 1350 Series Driveshaft Slip Yoke',
      category: 'Driveline',
      desc: 'Chromoly 1350 U-joint yoke with full-circle bearing caps rotating at output shaft RPM.'
    };
    transGroup.add(slipYokeGroup);

    const edgeLines: THREE.LineSegments[] = [];
    if (isDrawing) {
      edgeLines.push(...applyTechnicalEdges(transGroup, mats.techEdge, 22));
    }

    scene.add(transGroup);

    // Register subassembly map for live Technical Drawing BOM binding
    const transParts: Record<string, THREE.Object3D | null> = {
      bellhousing,
      converter: inputCouplerGroup,
      frontPump: frontPumpGroup,
      clutchPack: clutchPackGroup,
      mainCase: mainCaseMesh,
      valveBody: valveBodyGroup,
      pan: panMesh,
      tailhousing: tailshaft,
      slipYoke: slipYokeGroup
    };
    Object.values(transParts).forEach((obj) => {
      if (obj && obj.userData?.name) {
        obj.userData._base = { ...obj.userData };
      }
    });
    if (!inputCouplerGroup.userData?.name) {
      const childWithData = inputCouplerGroup.children.find((c) => c.userData?.name);
      if (childWithData) {
        inputCouplerGroup.userData = { ...childWithData.userData, _base: { ...childWithData.userData } };
      }
    }
    transPartsRef.current = transParts;

    // Selection Reticle Ring
    const selectionRingMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthTest: false
    });
    const selectionReticle = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.65, 28),
      selectionRingMat
    );
    selectionReticle.visible = false;
    scene.add(selectionReticle);
    reticleStateRef.current = { reticle: selectionReticle, camera };

    // Raycasting
    const raycaster = new THREE.Raycaster();
    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(transGroup.children, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && obj !== transGroup) {
          if (obj.userData && obj.userData.name) break;
          obj = obj.parent;
        }
        if (obj?.userData?.name) {
          onSelectPartRef.current(obj.userData as InspectionData);
          selectionReticle.position.copy(hits[0].point);
          selectionReticle.lookAt(camera.position);
          selectionReticle.visible = true;
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Paced Animation Loop + Damped Explosion
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let smoothedExploded = explodedRef.current;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext | null;
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
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
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

      controls.update();

      if (selectionReticle.visible) {
        selectionReticle.lookAt(camera.position);
      }

      smoothedExploded = THREE.MathUtils.damp(smoothedExploded, explodedRef.current, 9, dt);
      const f = smoothedExploded;

      bellhousing.position.x = -4.6 - f * 6.0;
      inputCouplerGroup.position.x = -4.2 - f * 3.8;
      frontPumpGroup.position.x = -2.9 - f * 1.6;
      clutchPackGroup.position.x = f * 1.4;
      if (valveBodyGroup) valveBodyGroup.position.y = -1.65 - f * 1.6;
      if (panMesh) panMesh.position.y = -2.28 - f * 3.2;
      tailshaft.position.x = 4.9 + f * 4.4;
      slipYokeGroup.position.x = 7.4 + f * 7.2;

      if (isRunningRef.current) {
        const inputOmega = 2.8 * dt;
        const firstRatio = transmission.ratios[0] || 2.5;
        inputCouplerGroup.rotation.x += inputOmega;
        inputShaft.rotation.y += inputOmega;
        mainShaftGears.forEach((g) => { g.rotation.z += inputOmega / firstRatio; });
        counterShaftGears.forEach((g) => { g.rotation.z -= inputOmega * 0.75; });
        slipYokeGroup.rotation.x += inputOmega / firstRatio;
      }

      try {
        renderer.render(scene, camera);
      } catch (err) {
        disposed = true;
        setWebglError(
          err instanceof Error ? err.message : '3D Transmission WebGL frame rendering failed.'
        );
        return;
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
      setWebglError('3D WebGL context was interrupted by the browser.');
    };
    const onContextRestored = () => {
      setWebglError(null);
      setRetryNonce((n) => n + 1);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    return () => {
      disposed = true;
      transPartsRef.current = {};
      reticleStateRef.current = null;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      controls.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry?.dispose();
        }
      });
      selectionRingMat.dispose();
      Object.values(mats).forEach((m) => m.dispose());
      edgeLines.forEach((l) => l.geometry.dispose());
      textures.dispose();
      if (scene.environment) scene.environment.dispose();
      renderer.renderLists.dispose();
    };
  }, [transmission.id, transmission.type, transmission.lengthInches, transmission.defaultStall, transmission.ratios.join(','), viewMode, retryNonce]);

  // Lightweight live binding of Technical Drawing callouts without tearing down WebGL
  useEffect(() => {
    const parts = transPartsRef.current;
    Object.values(parts).forEach((obj) => {
      if (obj && obj.userData?._base) {
        const base = obj.userData._base as Record<string, unknown>;
        obj.userData = { ...base, _base: base };
      }
    });
    if (!techDrawing) return;

    for (const callout of techDrawing.callouts) {
      const target = parts[callout.targetSubassembly];
      if (!target) continue;
      const base = (target.userData?._base || target.userData || {}) as Record<string, unknown>;
      target.userData = {
        ...base,
        _base: base,
        name: callout.partName || (base.name as string),
        category: callout.category || (base.category as string),
        desc: callout.notes || (base.desc as string),
        spec: callout.clearanceSpec,
        torque: callout.torqueSpec,
        partNumber: callout.partNumber,
        drawingIndex: callout.indexCode,
        material: callout.material,
        sourceUrls: techDrawing.sourceUrls
      };
    }
  }, [techDrawing, transmission.id, viewMode]);

  // Focus & reticle highlight when user clicks a BOM row in the Technical Drawing drawer
  useEffect(() => {
    if (!focusPartRequest) return;
    const obj = transPartsRef.current[focusPartRequest.key];
    const reticleState = reticleStateRef.current;
    if (!obj || !reticleState) return;
    _focusBox.setFromObject(obj);
    _focusBox.getCenter(_focusCenter);
    reticleState.reticle.position.copy(_focusCenter);
    reticleState.reticle.lookAt(reticleState.camera.position);
    reticleState.reticle.visible = true;
  }, [focusPartRequest]);

  const handleRetryWebgl = () => {
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    setWebglError(null);
    setRetryNonce((n) => n + 1);
  };

  return (
    <div className="relative w-full h-full min-h-[480px]">
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing blueprint-grid overflow-hidden"
        style={{ minHeight: '480px' }}
      />
      {webglError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0d1014]/95 p-6">
          <div className="max-w-md w-full rounded-xl border border-slate-700 bg-[#12161c] p-5 text-center space-y-3">
            <h3 className="text-sm font-bold text-white">3D Transmission Viewport Temporarily Unavailable</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{webglError}</p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleRetryWebgl}
                className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition"
              >
                Retry 3D Viewport
              </button>
              {onOpenDrawingsTab && (
                <button
                  type="button"
                  onClick={onOpenDrawingsTab}
                  className="px-3.5 py-2 rounded-lg border border-cyan-500/60 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold transition"
                >
                  Open 2D Transmission Schematic
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
