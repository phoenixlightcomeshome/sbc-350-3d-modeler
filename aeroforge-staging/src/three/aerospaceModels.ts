import * as THREE from 'three';
import { DEFAULT_CUSTOM_DESIGN } from '../data/materials';
import {
  AssemblyId,
  CustomDesignConfig,
  MaterialId,
  ParametricConfig,
  RenderOverlayMode,
  SbcBlockLiveConfig,
  SubsystemKey,
  SubsystemMaterials,
} from '../types/aerospace';
import {
  createEngineFinishMaterial,
  createMaterialFromSpec,
  EngineFinishKind,
  getSolarArrayTexture,
  getSpinnerSpiralTexture,
} from './proceduralTextures';
import {
  BORE_IN,
  camAngleDeg,
  DECK_CLEARANCE_IN,
  GASKET_IN,
  phaseForCylinder,
  ROD_IN,
  STROKE_IN,
  valveLiftInFor,
} from './engineKinetics';
import {
  createCamberedAirfoilGeometry,
  createDetailMaterial,
  createGearGeometry,
  createHexFlangeBoltGeometry,
  createHollowCylinderGeometry,
  createPunchedBorePlateGeometry,
  createSplinedShaftGeometry,
  createThreadedStudGeometry,
  DetailMaterialKind,
} from './mechanicalDetail';

export interface BuiltAssembly {
  root: THREE.Group;
  parts: THREE.Object3D[];
  animatedSpinners: THREE.Object3D[];
  exhaustPlumes: THREE.Mesh[];
  navStrobes: THREE.Mesh[];
  selectableMeshes: THREE.Mesh[];
  applyMaterials: (
    materials: SubsystemMaterials,
    overlayMode: RenderOverlayMode,
    thermalMat: THREE.Material
  ) => void;
  updateExploded: (factor: number) => void;
  /** Live engine kinematics (V6/V8/V10/V12): drives crank, cam (÷2), pistons, articulated rods, rockers & valves from crank angle. */
  updateEngineKinematics?: (crankAngleDeg: number) => void;
  /** Live throttle butterfly rotation (0..100%). */
  updateThrottle?: (throttlePct: number) => void;
  dispose: () => void;
}

function tagPart(
  obj: THREE.Object3D,
  subsystem: SubsystemKey,
  partName: string,
  partCode: string,
  massSharePct: number,
  explodeVec: THREE.Vector3,
  isGlass = false
) {
  obj.userData.subsystem = subsystem;
  obj.userData.partName = partName;
  obj.userData.partCode = partCode;
  obj.userData.massSharePct = massSharePct;
  obj.userData.basePos = obj.position.clone();
  obj.userData.explodeVec = explodeVec;
  obj.userData.isGlass = isGlass;
}

function setDetailKind(obj: THREE.Object3D, kind: DetailMaterialKind) {
  obj.userData.detailMatKind = kind;
}

function setEngineFinish(obj: THREE.Object3D, kind: EngineFinishKind) {
  obj.userData.engineFinishKind = kind;
}

/**
 * 60-2 Crankshaft Trigger Wheel (58 teeth + 2 consecutive missing teeth at TDC index).
 * UNVERIFIED: OD, bore ID & tooth height are visual proportions from reference 05.
 */
function createTriggerWheel60Minus2Geometry(
  outerR: number,
  boreR: number,
  thickness: number
): THREE.BufferGeometry {
  const slots = 60;
  const rootR = outerR * 0.88;
  const step = (Math.PI * 2) / slots;
  const shape = new THREE.Shape();

  for (let i = 0; i < slots; i++) {
    const a0 = i * step;
    const isMissingGap = i >= 58;
    if (isMissingGap) {
      const x = Math.cos(a0) * rootR;
      const y = Math.sin(a0) * rootR;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
      shape.lineTo(Math.cos(a0 + step * 0.8) * rootR, Math.sin(a0 + step * 0.8) * rootR);
    } else {
      const a1 = a0 + step * 0.18;
      const a2 = a0 + step * 0.28;
      const a3 = a0 + step * 0.62;
      const a4 = a0 + step * 0.72;
      const x0 = Math.cos(a0) * rootR;
      const y0 = Math.sin(a0) * rootR;
      if (i === 0) shape.moveTo(x0, y0);
      else shape.lineTo(x0, y0);
      shape.lineTo(Math.cos(a1) * rootR, Math.sin(a1) * rootR);
      shape.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
      shape.lineTo(Math.cos(a3) * outerR, Math.sin(a3) * outerR);
      shape.lineTo(Math.cos(a4) * rootR, Math.sin(a4) * rootR);
    }
  }
  shape.closePath();

  if (boreR > 0.005 && boreR < rootR - 0.01) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, boreR, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    steps: 1,
    curveSegments: 6,
    bevelEnabled: true,
    bevelThickness: Math.min(0.003, thickness * 0.15),
    bevelSize: 0.002,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -thickness / 2);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Slider-crank pin height for arbitrary stroke throw (inches). */
function pinHeightInForThrow(crankDeg: number, throwIn: number): number {
  const th = (crankDeg * Math.PI) / 180;
  const s = Math.sin(th);
  return throwIn * Math.cos(th) + Math.sqrt(Math.max(0.01, ROD_IN * ROD_IN - throwIn * throwIn * s * s));
}

function createSweptWingGeometry(
  halfSpan: number,
  rootChord: number,
  tipChord: number,
  sweepDist: number,
  thickness: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(rootChord, 0);
  shape.lineTo(sweepDist + tipChord, halfSpan);
  shape.lineTo(sweepDist, halfSpan);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 2,
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.45,
    bevelSize: 0.08,
    bevelSegments: 3,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function createWingletGeometry(height: number, rootChord: number, tipChord: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(rootChord, 0);
  shape.lineTo(rootChord * 0.45 + tipChord, height);
  shape.lineTo(rootChord * 0.45, height);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  geo.computeVertexNormals();
  return geo;
}

export function buildAerospaceAssembly(
  assemblyId: AssemblyId,
  params: ParametricConfig,
  materials: SubsystemMaterials,
  maxAnisotropy: number,
  isSoftwareGl: boolean,
  clippingPlanes: THREE.Plane[],
  customDesign?: CustomDesignConfig,
  sbcBlockConfig?: SbcBlockLiveConfig
): BuiltAssembly {
  const root = new THREE.Group();
  root.name = `Assembly_${assemblyId}`;

  const parts: THREE.Object3D[] = [];
  const animatedSpinners: THREE.Object3D[] = [];
  const exhaustPlumes: THREE.Mesh[] = [];
  const navStrobes: THREE.Mesh[] = [];
  const selectableMeshes: THREE.Mesh[] = [];
  const createdGeometries: THREE.BufferGeometry[] = [];
  const createdMaterials: THREE.Material[] = [];
  const kinematicRootObjects: THREE.Object3D[] = [];
  let updateEngineKinematics: ((crankAngleDeg: number) => void) | undefined;
  let updateThrottle: ((throttlePct: number) => void) | undefined;
  let lastCrankAngleDeg = 0;

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    createdGeometries.push(g);
    return g;
  };

  const registerMesh = (
    mesh: THREE.Mesh,
    subsystem: SubsystemKey,
    partName: string,
    partCode: string,
    massSharePct: number,
    explodeVec: THREE.Vector3,
    isGlass = false
  ) => {
    mesh.castShadow = !isGlass;
    mesh.receiveShadow = true;
    mesh.layers.enable(1);
    tagPart(mesh, subsystem, partName, partCode, massSharePct, explodeVec, isGlass);
    parts.push(mesh);
    selectableMeshes.push(mesh);
  };

  const exhaustMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#38bdf8'),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  createdMaterials.push(exhaustMat);

  const placeholderMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
  createdMaterials.push(placeholderMat);

  if (assemblyId === 'sbc350') {
    const lengthScale = params.fuselageLengthM / 28.4;
    const halfSpan = (params.wingspanM / 19.6) * 4.85;
    const sweepRad = THREE.MathUtils.degToRad(params.sweepDeg);
    const sweepDist = Math.tan(sweepRad) * halfSpan * 0.72;
    const nacScale = params.nacelleScale;

    // 1. Primary Sears-Haack Fuselage via LatheGeometry
    const fusePts: THREE.Vector2[] = [];
    const fuseSteps = 28;
    const halfLen = 5.4 * lengthScale;
    for (let i = 0; i <= fuseSteps; i++) {
      const t = i / fuseSteps;
      const x = -halfLen + t * halfLen * 2;
      let r = 0.0;
      if (t < 0.22) {
        const nt = t / 0.22;
        r = 0.62 * Math.pow(nt, 0.68);
      } else if (t < 0.72) {
        const mt = (t - 0.22) / 0.5;
        r = 0.62 + Math.sin(mt * Math.PI) * 0.055;
      } else {
        const tt = (t - 0.72) / 0.28;
        r = 0.62 * (1 - Math.pow(tt, 1.35) * 0.88);
      }
      fusePts.push(new THREE.Vector2(Math.max(0.015, r), x));
    }
    const fuseGeo = trackGeo(new THREE.LatheGeometry(fusePts, 36));
    fuseGeo.rotateZ(-Math.PI / 2);
    fuseGeo.scale(1, 1.06, 0.94);
    const fuseMesh = new THREE.Mesh(fuseGeo, placeholderMat);
    fuseMesh.position.set(0, 0.95, 0);
    registerMesh(fuseMesh, 'airframe', 'Sears-Haack Pressure Fuselage', 'SBC-101', 30, new THREE.Vector3(0, 0.35, 0));
    root.add(fuseMesh);

    // 2. Nose Titanium Radome Tip + Machined Collar + Pitot Probe
    const radomeGroup = new THREE.Group();
    radomeGroup.position.set(-halfLen - 0.32 * lengthScale, 0.94, 0);
    const radomeGeo = trackGeo(new THREE.ConeGeometry(0.18, 1.15 * lengthScale, 24));
    radomeGeo.rotateZ(Math.PI / 2);
    const radomeMesh = new THREE.Mesh(radomeGeo, placeholderMat);
    radomeGroup.add(radomeMesh);

    const pitotGeo = trackGeo(new THREE.CylinderGeometry(0.012, 0.02, 0.55, 10));
    pitotGeo.rotateZ(Math.PI / 2);
    const pitotMesh = new THREE.Mesh(pitotGeo, placeholderMat);
    pitotMesh.position.set(-0.62 * lengthScale, 0, 0);
    setDetailKind(pitotMesh, 'chrome_shaft');
    radomeGroup.add(pitotMesh);

    const radomeCollarGeo = trackGeo(createHollowCylinderGeometry(0.195, 0.16, 0.06, 24, 'x', 0.006));
    const radomeCollar = new THREE.Mesh(radomeCollarGeo, placeholderMat);
    radomeCollar.position.set(0.55 * lengthScale, 0, 0);
    setDetailKind(radomeCollar, 'black_oxide');
    radomeGroup.add(radomeCollar);

    tagPart(radomeGroup, 'propulsion', 'Nose Stagnation Cone & Pitot Boom', 'SBC-104', 3, new THREE.Vector3(-1.35, 0.1, 0));
    parts.push(radomeGroup);
    selectableMeshes.push(radomeMesh);
    radomeMesh.userData = radomeGroup.userData;
    root.add(radomeGroup);

    // 3. Optical Sapphire Cockpit Canopy
    const canopyGeo = trackGeo(new THREE.SphereGeometry(0.58, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.52));
    canopyGeo.scale(2.3 * lengthScale, 0.72, 0.84);
    const canopyMesh = new THREE.Mesh(canopyGeo, placeholderMat);
    canopyMesh.position.set(-2.95 * lengthScale, 1.24, 0);
    registerMesh(canopyMesh, 'airframe', 'Sapphire Heated Cockpit Windshield', 'SBC-108', 4, new THREE.Vector3(-0.6, 1.15, 0), true);
    root.add(canopyMesh);

    // 4. Dorsal Avionics Spine Fairing
    const spineGeo = trackGeo(new THREE.CapsuleGeometry(0.18, 4.4 * lengthScale, 8, 16));
    spineGeo.rotateZ(Math.PI / 2);
    spineGeo.scale(1, 0.7, 0.85);
    const spineMesh = new THREE.Mesh(spineGeo, placeholderMat);
    spineMesh.position.set(0.35 * lengthScale, 1.56, 0);
    registerMesh(spineMesh, 'airframe', 'Dorsal SATCOM & Avionics Spine', 'SBC-112', 4, new THREE.Vector3(0, 1.1, 0));
    root.add(spineMesh);

    // 5. Internal Titanium Ring Bulkheads & Carry-Through Spar
    const ribCount = Math.round(params.ribDensity);
    const ringGeo = trackGeo(new THREE.TorusGeometry(0.52, 0.032, 8, 24));
    ringGeo.rotateY(Math.PI / 2);
    const ringInst = new THREE.InstancedMesh(ringGeo, placeholderMat, ribCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < ribCount; i++) {
      const frac = (i + 1) / (ribCount + 1);
      const rx = -2.4 * lengthScale + frac * 5.2 * lengthScale;
      dummy.position.set(rx, 0.95, 0);
      const taper = 1 - Math.abs(frac - 0.45) * 0.3;
      dummy.scale.set(1, taper, taper * 0.92);
      dummy.updateMatrix();
      ringInst.setMatrixAt(i, dummy.matrix);
    }
    ringInst.instanceMatrix.needsUpdate = true;
    ringInst.computeBoundingSphere();
    ringInst.layers.enable(1);
    tagPart(ringInst, 'internal', 'Pressurized Titanium Ring Frames', 'SBC-401', 9, new THREE.Vector3(0, -0.55, 0));
    parts.push(ringInst);
    root.add(ringInst);

    const sparGeo = trackGeo(new THREE.BoxGeometry(0.52, 0.14, halfSpan * 1.45));
    const sparMesh = new THREE.Mesh(sparGeo, placeholderMat);
    // Carry-through spar must sit inside the swept wing box: the wing leading
    // edge sweeps aft outboard, so the old x (0.25) left the spar ahead of the
    // leading edge (and below the wing) for f > 0.23. Local x 2.04 is the
    // straight-spar window inside the planform at default sweep 38 deg; y 0.74
    // centres it in the wing thickness (<=0.03 sliver at the extremes — a flat
    // spar cannot perfectly follow the 0.04 rad dihedral).
    sparMesh.position.set(2.04 - 0.65 * lengthScale, 0.74, 0);
    registerMesh(sparMesh, 'internal', 'Carry-Through Wing Box Main Spar', 'SBC-402', 6, new THREE.Vector3(0, -0.85, 0));
    root.add(sparMesh);

    // 6. Port & Starboard Supercritical Swept Wings + Blended Winglets
    const wingGeo = trackGeo(createSweptWingGeometry(halfSpan, 2.35, 0.72, sweepDist, 0.11));
    [-1, 1].forEach((side) => {
      const wingGroup = new THREE.Group();
      const wingMesh = new THREE.Mesh(wingGeo, placeholderMat);
      if (side === -1) {
        wingMesh.scale.z = -1;
      }
      wingGroup.position.set(-0.65 * lengthScale, 0.62, side * 0.44);
      wingMesh.rotation.x = side * 0.04;
      wingGroup.add(wingMesh);
      registerMesh(
        wingMesh,
        'wings',
        side === 1 ? 'Starboard Supercritical Wing' : 'Port Supercritical Wing',
        side === 1 ? 'SBC-201R' : 'SBC-201L',
        12,
        new THREE.Vector3(0.2, -0.1, side * 1.45)
      );
      root.add(wingGroup);

      const wletGeo = trackGeo(createWingletGeometry(0.75, 0.72, 0.28));
      const wletMesh = new THREE.Mesh(wletGeo, placeholderMat);
      // Winglet sits at its own wingtip: the swept-wing geometry extends toward
      // -z (flipped for port), so the tip is at side*(0.44 - halfSpan). The old
      // +halfSpan put each winglet 9.70 units away, floating past the far wingtip.
      wletMesh.position.set(-0.65 * lengthScale + sweepDist, 0.65 + halfSpan * 0.04, side * (0.44 - halfSpan));
      wletMesh.rotation.x = side * -0.22;
      registerMesh(
        wletMesh,
        'wings',
        side === 1 ? 'Starboard Drag-Reduction Winglet' : 'Port Drag-Reduction Winglet',
        side === 1 ? 'SBC-204R' : 'SBC-204L',
        2,
        new THREE.Vector3(0.4, 0.55, side * 2.15)
      );
      root.add(wletMesh);

      const strobeGeo = trackGeo(new THREE.SphereGeometry(0.055, 12, 12));
      const strobeMat = new THREE.MeshBasicMaterial({ color: side === 1 ? 0x22c55e : 0xef4444 });
      createdMaterials.push(strobeMat);
      const strobe = new THREE.Mesh(strobeGeo, strobeMat);
      strobe.position.set(-0.65 * lengthScale + sweepDist + 0.15, 0.68 + halfSpan * 0.04, side * (0.44 - halfSpan - 0.04));
      navStrobes.push(strobe);
      root.add(strobe);
    });

    // 7. V-Tail Stabilizers
    const vTailGeo = trackGeo(createWingletGeometry(1.45, 1.15, 0.42));
    [-1, 1].forEach((side) => {
      const tailMesh = new THREE.Mesh(vTailGeo, placeholderMat);
      // V-tail fin seated on the tail cone: at the old (1.32, +/-0.24) the aft
      // ~0.95 of the base chord floated above the tapering fuselage (worst
      // containment 3.9x outside the lathe profile). At (1.12, +/-0.08) the
      // base stays inside the fuselage profile along its full chord.
      tailMesh.position.set(3.55 * lengthScale, 1.12, side * 0.08);
      tailMesh.rotation.x = side * 0.62;
      registerMesh(
        tailMesh,
        'wings',
        side === 1 ? 'Starboard Ruddervator Fin' : 'Port Ruddervator Fin',
        side === 1 ? 'SBC-210R' : 'SBC-210L',
        4,
        new THREE.Vector3(1.1, 0.85, side * 0.95)
      );
      root.add(tailMesh);
    });

    // 8. Twin Rear-Mounted Turbofan Nacelles
    const spinnerTex = getSpinnerSpiralTexture(maxAnisotropy);
    const spinnerMat = new THREE.MeshStandardMaterial({ map: spinnerTex, roughness: 0.35, metalness: 0.4 });
    createdMaterials.push(spinnerMat);

    const nacPts = [
      new THREE.Vector2(0.24 * nacScale, -1.25),
      new THREE.Vector2(0.35 * nacScale, -1.0),
      new THREE.Vector2(0.39 * nacScale, -0.2),
      new THREE.Vector2(0.36 * nacScale, 0.85),
      new THREE.Vector2(0.25 * nacScale, 1.35),
    ];
    const nacGeo = trackGeo(new THREE.LatheGeometry(nacPts, 28));
    nacGeo.rotateZ(-Math.PI / 2);

    const bladeGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.24 * nacScale, 0.02));
    const fanConeGeo = trackGeo(new THREE.ConeGeometry(0.11 * nacScale, 0.28, 20));
    fanConeGeo.rotateZ(Math.PI / 2);

    const pylonGeo = trackGeo(new THREE.BoxGeometry(1.1, 0.1, 0.55));
    const plumeGeo = trackGeo(new THREE.ConeGeometry(0.22 * nacScale, 2.2, 20, 1, true));
    plumeGeo.rotateZ(-Math.PI / 2);

    [-1, 1].forEach((side) => {
      const nacGroup = new THREE.Group();
      nacGroup.position.set(2.35 * lengthScale, 1.18, side * 0.92);
      const nacMesh = new THREE.Mesh(nacGeo, placeholderMat);
      nacGroup.add(nacMesh);
      const pylonMesh = new THREE.Mesh(pylonGeo, placeholderMat);
      pylonMesh.position.set(0, -0.05, -side * 0.38);
      nacGroup.add(pylonMesh);

      const fanGroup = new THREE.Group();
      fanGroup.position.set(-1.02, 0, 0);
      const cone = new THREE.Mesh(fanConeGeo, spinnerMat);
      fanGroup.add(cone);

      const bladeInst = new THREE.InstancedMesh(bladeGeo, placeholderMat, 16);
      for (let b = 0; b < 16; b++) {
        const angle = (b / 16) * Math.PI * 2;
        dummy.position.set(0, Math.cos(angle) * 0.14 * nacScale, Math.sin(angle) * 0.14 * nacScale);
        dummy.rotation.set(angle, 0.42, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bladeInst.setMatrixAt(b, dummy.matrix);
      }
      bladeInst.instanceMatrix.needsUpdate = true;
      bladeInst.computeBoundingSphere();
      fanGroup.add(bladeInst);
      nacGroup.add(fanGroup);
      animatedSpinners.push(fanGroup);

      const plume = new THREE.Mesh(plumeGeo, exhaustMat);
      plume.position.set(2.35, 0, 0);
      plume.visible = false;
      exhaustPlumes.push(plume);
      nacGroup.add(plume);

      tagPart(
        nacGroup,
        'propulsion',
        side === 1 ? 'Starboard Turbofan Nacelle' : 'Port Turbofan Nacelle',
        side === 1 ? 'SBC-301R' : 'SBC-301L',
        8,
        new THREE.Vector3(0.95, 0.35, side * 1.1)
      );
      parts.push(nacGroup);
      selectableMeshes.push(nacMesh);
      nacMesh.userData = nacGroup.userData;
      root.add(nacGroup);
    });

    // 9. Twin-Wheel Tricycle Landing Gear with Oleo Pistons, Torque Links & Brake Hubs
    const wheelGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.18, 0.085, 22));
    wheelGeo.rotateX(Math.PI / 2);
    const rimHubGeo = trackGeo(new THREE.CylinderGeometry(0.095, 0.095, 0.092, 16));
    rimHubGeo.rotateX(Math.PI / 2);
    const outerStrutGeo = trackGeo(new THREE.CylinderGeometry(0.048, 0.048, 0.48, 12));
    const innerPistonGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.34, 12));
    const axleGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 12));
    axleGeo.rotateX(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.85, metalness: 0.1 });
    createdMaterials.push(tireMat);

    const gearPositions: Array<{ x: number; z: number; label: string; code: string }> = [
      { x: -3.25 * lengthScale, z: 0, label: 'Nose Landing Gear Bogie', code: 'SBC-410N' },
      { x: 0.45 * lengthScale, z: 1.15, label: 'Starboard Main Gear Strut', code: 'SBC-411R' },
      { x: 0.45 * lengthScale, z: -1.15, label: 'Port Main Gear Strut', code: 'SBC-411L' },
    ];
    gearPositions.forEach((gp) => {
      const gearGroup = new THREE.Group();
      gearGroup.position.set(gp.x, 0.2, gp.z);
      const strut = new THREE.Mesh(outerStrutGeo, placeholderMat);
      strut.position.set(0, 0.44, 0);
      gearGroup.add(strut);

      const piston = new THREE.Mesh(innerPistonGeo, placeholderMat);
      piston.position.set(0, 0.16, 0);
      setDetailKind(piston, 'chrome_shaft');
      gearGroup.add(piston);

      const axle = new THREE.Mesh(axleGeo, placeholderMat);
      setDetailKind(axle, 'black_oxide');
      gearGroup.add(axle);

      [-0.075, 0.075].forEach((wz) => {
        const wheel = new THREE.Mesh(wheelGeo, tireMat);
        wheel.position.set(0, 0, wz);
        wheel.userData.keepMaterial = true;
        wheel.castShadow = true;
        gearGroup.add(wheel);

        const rim = new THREE.Mesh(rimHubGeo, placeholderMat);
        rim.position.set(0, 0, wz);
        setDetailKind(rim, 'chrome_shaft');
        gearGroup.add(rim);
      });

      tagPart(gearGroup, 'internal', gp.label, gp.code, 2, new THREE.Vector3(0, -0.55, gp.z * 0.4));
      parts.push(gearGroup);
      selectableMeshes.push(strut);
      strut.userData = gearGroup.userData;
      root.add(gearGroup);
    });
  } else if (assemblyId === 'hx900') {
    const cy = 1.85;
    const lenScale = params.fuselageLengthM / 5.4;
    const fanR = (params.wingspanM / 3.1) * 1.28;
    const coreR = fanR * 0.48 * params.nacelleScale;
    const stages = Math.round(params.ribDensity);
    const bladeTwist = THREE.MathUtils.degToRad(params.sweepDeg);

    // 1. Acoustic Bypass Fan Cowl + Bolted Case Flange
    const cowlPts = [
      new THREE.Vector2(fanR * 0.88, -1.9 * lenScale),
      new THREE.Vector2(fanR * 1.04, -1.45 * lenScale),
      new THREE.Vector2(fanR * 1.06, -0.35 * lenScale),
      new THREE.Vector2(fanR * 0.96, 0.75 * lenScale),
      new THREE.Vector2(fanR * 0.84, 1.05 * lenScale),
    ];
    const cowlGeo = trackGeo(new THREE.LatheGeometry(cowlPts, 44));
    cowlGeo.rotateZ(-Math.PI / 2);
    const cowlGroup = new THREE.Group();
    cowlGroup.position.set(0, cy, 0);
    const cowlMesh = new THREE.Mesh(cowlGeo, placeholderMat);
    cowlGroup.add(cowlMesh);

    const lipRingGeo = trackGeo(createHollowCylinderGeometry(fanR * 0.92, fanR * 0.84, 0.08, 40, 'x', 0.01));
    const lipRing = new THREE.Mesh(lipRingGeo, placeholderMat);
    lipRing.position.set(-1.9 * lenScale, 0, 0);
    setDetailKind(lipRing, 'chrome_shaft');
    cowlGroup.add(lipRing);

    const flangeBoltGeo = trackGeo(createHexFlangeBoltGeometry(0.022, 0.032));
    const flangeInst = new THREE.InstancedMesh(flangeBoltGeo, placeholderMat, 24);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      dummy.position.set(-0.35 * lenScale, Math.cos(a) * fanR * 1.06, Math.sin(a) * fanR * 1.06);
      dummy.rotation.set(a, 0, 0);
      dummy.updateMatrix();
      flangeInst.setMatrixAt(i, dummy.matrix);
    }
    flangeInst.instanceMatrix.needsUpdate = true;
    flangeInst.computeBoundingSphere();
    setDetailKind(flangeInst, 'black_oxide');
    cowlGroup.add(flangeInst);

    tagPart(cowlGroup, 'airframe', 'Composite Acoustic Bypass Duct & Lip', 'HX-101', 32, new THREE.Vector3(-1.35, 0.55, 0));
    parts.push(cowlGroup);
    selectableMeshes.push(cowlMesh);
    cowlMesh.userData = cowlGroup.userData;
    root.add(cowlGroup);

    // 2. Inlet Spinner Cone + 22-Blade Swept Fan + Titanium Leading-Edge Retaining Ring
    const spinnerTex = getSpinnerSpiralTexture(maxAnisotropy);
    const spinnerMat = new THREE.MeshStandardMaterial({ map: spinnerTex, roughness: 0.28, metalness: 0.45 });
    createdMaterials.push(spinnerMat);

    const spinnerGroup = new THREE.Group();
    spinnerGroup.position.set(-1.32 * lenScale, cy, 0);

    const noseConeGeo = trackGeo(new THREE.ConeGeometry(fanR * 0.3, 0.78, 32));
    noseConeGeo.rotateZ(Math.PI / 2);
    const noseCone = new THREE.Mesh(noseConeGeo, spinnerMat);
    noseCone.position.set(-0.32, 0, 0);
    spinnerGroup.add(noseCone);

    const fanBladeGeo = trackGeo(new THREE.BoxGeometry(0.24, fanR * 0.64, 0.032));
    const fanInst = new THREE.InstancedMesh(fanBladeGeo, placeholderMat, 22);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      dummy.position.set(0.15, Math.cos(a) * fanR * 0.56, Math.sin(a) * fanR * 0.56);
      dummy.rotation.set(a, bladeTwist, 0.08);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      fanInst.setMatrixAt(i, dummy.matrix);
    }
    fanInst.instanceMatrix.needsUpdate = true;
    fanInst.computeBoundingSphere();
    spinnerGroup.add(fanInst);

    // Outlet Guide Vane (OGV) static ring aft of fan
    const ogvGeo = trackGeo(new THREE.BoxGeometry(0.14, fanR * 0.52, 0.022));
    const ogvInst = new THREE.InstancedMesh(ogvGeo, placeholderMat, 28);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      dummy.position.set(0.42, Math.cos(a) * fanR * 0.6, Math.sin(a) * fanR * 0.6);
      dummy.rotation.set(a, -0.18, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ogvInst.setMatrixAt(i, dummy.matrix);
    }
    ogvInst.instanceMatrix.needsUpdate = true;
    ogvInst.computeBoundingSphere();
    spinnerGroup.add(ogvInst);

    animatedSpinners.push(spinnerGroup);
    tagPart(spinnerGroup, 'wings', '22-Blade Wide-Chord Titanium Fan Stage', 'HX-201', 24, new THREE.Vector3(-2.1, 0, 0));
    parts.push(spinnerGroup);
    selectableMeshes.push(noseCone);
    noseCone.userData = spinnerGroup.userData;
    root.add(spinnerGroup);

    // 3. Multi-Stage Compressor Drum, Toothed Planetary Sun Gear & Discs
    const compGroup = new THREE.Group();
    compGroup.position.set(-0.2 * lenScale, cy, 0);
    const shaftGeo = trackGeo(new THREE.CylinderGeometry(coreR * 0.35, coreR * 0.35, 3.3 * lenScale, 24));
    shaftGeo.rotateZ(Math.PI / 2);
    const shaftMesh = new THREE.Mesh(shaftGeo, placeholderMat);
    shaftMesh.position.set(0.45 * lenScale, 0, 0);
    setDetailKind(shaftMesh, 'chrome_shaft');
    compGroup.add(shaftMesh);

    const sunGearGeo = trackGeo(createGearGeometry(coreR * 0.52, 24, 0.18, 18, coreR * 0.34, 'x'));
    const sunGearMesh = new THREE.Mesh(sunGearGeo, placeholderMat);
    sunGearMesh.position.set(-0.78 * lenScale, 0, 0);
    setDetailKind(sunGearMesh, 'bronze_bearing');
    compGroup.add(sunGearMesh);

    const discGeo = trackGeo(new THREE.CylinderGeometry(coreR * 0.92, coreR * 0.85, 0.08, 28));
    discGeo.rotateZ(Math.PI / 2);
    const discInst = new THREE.InstancedMesh(discGeo, placeholderMat, stages);
    for (let s = 0; s < stages; s++) {
      const sx = (-0.55 + (s / Math.max(1, stages - 1)) * 1.45) * lenScale;
      const taper = 1.0 - s * 0.032;
      dummy.position.set(sx, 0, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, taper, taper);
      dummy.updateMatrix();
      discInst.setMatrixAt(s, dummy.matrix);
    }
    discInst.instanceMatrix.needsUpdate = true;
    discInst.computeBoundingSphere();
    compGroup.add(discInst);
    tagPart(compGroup, 'internal', `${stages}-Stage Axial Compressor & Geared Shaft`, 'HX-401', 16, new THREE.Vector3(0.35, -0.65, 0));
    parts.push(compGroup);
    selectableMeshes.push(shaftMesh);
    shaftMesh.userData = compGroup.userData;
    root.add(compGroup);

    // 4. Annular Combustor & Chevron Exhaust Nozzle
    const nozzlePts = [
      new THREE.Vector2(coreR * 1.05, 0.65 * lenScale),
      new THREE.Vector2(coreR * 1.18, 1.35 * lenScale),
      new THREE.Vector2(coreR * 0.92, 2.15 * lenScale),
      new THREE.Vector2(coreR * 0.68, 2.55 * lenScale),
    ];
    const nozzleGeo = trackGeo(new THREE.LatheGeometry(nozzlePts, 32));
    nozzleGeo.rotateZ(-Math.PI / 2);
    const nozzleMesh = new THREE.Mesh(nozzleGeo, placeholderMat);
    nozzleMesh.position.set(0.15 * lenScale, cy, 0);
    registerMesh(nozzleMesh, 'propulsion', 'Annular Combustor & Chevron Exhaust Nozzle', 'HX-301', 22, new THREE.Vector3(1.85, 0, 0));
    root.add(nozzleMesh);

    const plugGeo = trackGeo(new THREE.ConeGeometry(coreR * 0.46, 1.15, 24));
    plugGeo.rotateZ(-Math.PI / 2);
    const plugMesh = new THREE.Mesh(plugGeo, placeholderMat);
    plugMesh.position.set(2.75 * lenScale, cy, 0);
    registerMesh(plugMesh, 'propulsion', 'Acoustic Core Exhaust Plug', 'HX-304', 6, new THREE.Vector3(2.65, 0, 0));
    root.add(plugMesh);

    const pipeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.1 * lenScale, cy - fanR * 0.95, 0.25),
      new THREE.Vector3(0.0, cy - coreR * 1.15, 0.45),
      new THREE.Vector3(1.4 * lenScale, cy - coreR * 1.05, 0.28),
    ]);
    const pipeGeo = trackGeo(new THREE.TubeGeometry(pipeCurve, 28, 0.045, 8, false));
    const pipeMesh = new THREE.Mesh(pipeGeo, placeholderMat);
    registerMesh(pipeMesh, 'internal', 'FADEC Fuel & Hydraulic Manifold Assembly', 'HX-408', 4, new THREE.Vector3(0, -1.1, 0.85));
    root.add(pipeMesh);

    const cradleGeo = trackGeo(new THREE.BoxGeometry(2.6 * lenScale, 0.16, 1.65));
    const cradleMesh = new THREE.Mesh(cradleGeo, placeholderMat);
    cradleMesh.position.set(0, 0.08, 0);
    registerMesh(cradleMesh, 'internal', 'Ground Static Thrust Test Cradle', 'HX-490', 4, new THREE.Vector3(0, -0.5, 0));
    root.add(cradleMesh);

    const pylonLeft = trackGeo(new THREE.BoxGeometry(0.32, cy - fanR * 0.88, 0.16));
    [-0.58, 0.58].forEach((zOff) => {
      const leg = new THREE.Mesh(pylonLeft, placeholderMat);
      leg.position.set(-0.2, (cy - fanR * 0.88) / 2 + 0.08, zOff);
      registerMesh(leg, 'internal', 'Cradle Mount Stanchion', 'HX-492', 2, new THREE.Vector3(0, -0.5, zOff));
      root.add(leg);
    });

    const plumeGeo = trackGeo(new THREE.ConeGeometry(coreR * 0.65, 3.2, 24, 1, true));
    plumeGeo.rotateZ(-Math.PI / 2);
    const plume = new THREE.Mesh(plumeGeo, exhaustMat);
    plume.position.set(3.8 * lenScale, cy, 0);
    plume.visible = false;
    exhaustPlumes.push(plume);
    root.add(plume);
  } else if (assemblyId === 'ares4') {
    const cy = 2.15;
    const lenScale = params.fuselageLengthM / 8.6;
    const solarSpan = (params.wingspanM / 14.8) * 3.8;
    const coneRatio = Math.tan(THREE.MathUtils.degToRad(params.sweepDeg));

    const capPts = [
      new THREE.Vector2(0.55, -2.8 * lenScale),
      new THREE.Vector2(0.55 + coneRatio * 1.15, -1.65 * lenScale),
      new THREE.Vector2(1.48, -0.82 * lenScale),
      new THREE.Vector2(1.52, -0.58 * lenScale),
    ];
    const capGeo = trackGeo(new THREE.LatheGeometry(capPts, 36));
    capGeo.rotateZ(-Math.PI / 2);
    const capMesh = new THREE.Mesh(capGeo, placeholderMat);
    capMesh.position.set(0, cy, 0);
    registerMesh(capMesh, 'airframe', 'Titanium Crew Pressure Capsule', 'AR-101', 28, new THREE.Vector3(-1.35, 0.25, 0));
    root.add(capMesh);

    const shieldPts = [
      new THREE.Vector2(0.02, -0.35 * lenScale),
      new THREE.Vector2(1.48, -0.56 * lenScale),
      new THREE.Vector2(1.52, -0.58 * lenScale),
    ];
    const shieldGeo = trackGeo(new THREE.LatheGeometry(shieldPts, 36));
    shieldGeo.rotateZ(-Math.PI / 2);
    const shieldMesh = new THREE.Mesh(shieldGeo, placeholderMat);
    shieldMesh.position.set(0, cy, 0);
    registerMesh(shieldMesh, 'airframe', 'PICA-X Ablative Thermal Heatshield', 'AR-105', 12, new THREE.Vector3(-0.75, -0.55, 0));
    root.add(shieldMesh);

    // IDSS Docking Ring + Latch Petals & Bolt Circle
    const collarGroup = new THREE.Group();
    collarGroup.position.set(-2.85 * lenScale, cy, 0);
    const collarGeo = trackGeo(createHollowCylinderGeometry(0.58, 0.44, 0.18, 32, 'x', 0.015));
    const collarMesh = new THREE.Mesh(collarGeo, placeholderMat);
    collarGroup.add(collarMesh);
    const sealGeo = trackGeo(new THREE.TorusGeometry(0.51, 0.018, 10, 32));
    sealGeo.rotateY(Math.PI / 2);
    const dockSeal = new THREE.Mesh(sealGeo, placeholderMat);
    dockSeal.position.set(-0.09, 0, 0);
    setDetailKind(dockSeal, 'viton_seal');
    collarGroup.add(dockSeal);

    const dockBoltGeo = trackGeo(createHexFlangeBoltGeometry(0.022, 0.032));
    dockBoltGeo.rotateZ(Math.PI / 2);
    const dockBolts = new THREE.InstancedMesh(dockBoltGeo, placeholderMat, 16);
    const dDummy = new THREE.Object3D();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      dDummy.position.set(-0.09, Math.cos(a) * 0.54, Math.sin(a) * 0.54);
      dDummy.updateMatrix();
      dockBolts.setMatrixAt(i, dDummy.matrix);
    }
    dockBolts.instanceMatrix.needsUpdate = true;
    dockBolts.computeBoundingSphere();
    setDetailKind(dockBolts, 'black_oxide');
    collarGroup.add(dockBolts);

    tagPart(collarGroup, 'internal', 'IDSS Autonomous Docking Mechanism', 'AR-401', 8, new THREE.Vector3(-2.35, 0, 0));
    parts.push(collarGroup);
    selectableMeshes.push(collarMesh);
    collarMesh.userData = collarGroup.userData;
    root.add(collarGroup);

    const winGeo = trackGeo(new THREE.CylinderGeometry(0.22, 0.24, 0.14, 20));
    const winMesh = new THREE.Mesh(winGeo, placeholderMat);
    winMesh.position.set(-1.65 * lenScale, cy + 0.92, 0);
    winMesh.rotation.z = 0.55;
    registerMesh(winMesh, 'airframe', 'Triple-Pane Sapphire Crew Viewport', 'AR-110', 3, new THREE.Vector3(-1.2, 0.95, 0), true);
    root.add(winMesh);

    const smGeo = trackGeo(new THREE.CylinderGeometry(1.36, 1.32, 2.55 * lenScale, 32));
    smGeo.rotateZ(Math.PI / 2);
    const smMesh = new THREE.Mesh(smGeo, placeholderMat);
    smMesh.position.set(0.85 * lenScale, cy, 0);
    registerMesh(smMesh, 'internal', 'Pressurized Service Module & Propellant Bay', 'AR-405', 18, new THREE.Vector3(0.55, 0, 0));
    root.add(smMesh);

    const solarTex = getSolarArrayTexture(maxAnisotropy);
    const solarPanelMat = new THREE.MeshPhysicalMaterial({
      map: solarTex,
      roughness: 0.18,
      metalness: 0.35,
      clearcoat: 0.9,
      envMapIntensity: 1.3,
    });
    createdMaterials.push(solarPanelMat);

    const wingFrameGeo = trackGeo(new THREE.BoxGeometry(1.05, 0.05, solarSpan));
    const cellFaceGeo = trackGeo(new THREE.PlaneGeometry(0.95, solarSpan * 0.94));
    cellFaceGeo.rotateX(-Math.PI / 2);

    [-1, 1].forEach((side) => {
      const arrayGroup = new THREE.Group();
      arrayGroup.position.set(1.05 * lenScale, cy, side * (1.42 + solarSpan * 0.5));
      const frame = new THREE.Mesh(wingFrameGeo, placeholderMat);
      arrayGroup.add(frame);
      const cells = new THREE.Mesh(cellFaceGeo, solarPanelMat);
      cells.position.y = 0.032;
      arrayGroup.add(cells);

      tagPart(
        arrayGroup,
        'wings',
        side === 1 ? 'Starboard Gallium-Arsenide Solar Wing' : 'Port Gallium-Arsenide Solar Wing',
        side === 1 ? 'AR-201R' : 'AR-201L',
        10,
        new THREE.Vector3(0.45, 0.3, side * 1.85)
      );
      parts.push(arrayGroup);
      selectableMeshes.push(frame);
      frame.userData = arrayGroup.userData;
      root.add(arrayGroup);
    });

    const bellPts = [
      new THREE.Vector2(0.24, 2.05 * lenScale),
      new THREE.Vector2(0.32, 2.25 * lenScale),
      new THREE.Vector2(0.68, 3.05 * lenScale),
      new THREE.Vector2(0.84, 3.65 * lenScale),
    ];
    const bellGeo = trackGeo(new THREE.LatheGeometry(bellPts, 32));
    bellGeo.rotateZ(-Math.PI / 2);
    const bellMesh = new THREE.Mesh(bellGeo, placeholderMat);
    bellMesh.position.set(0, cy, 0);
    registerMesh(bellMesh, 'propulsion', 'Regenerative Cooled Orbital Bell Nozzle', 'AR-301', 14, new THREE.Vector3(2.2, 0, 0));
    root.add(bellMesh);

    const rcsGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.24, 0.24));
    const rcsBellGeo = trackGeo(new THREE.ConeGeometry(0.065, 0.14, 14, 1, true));
    [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((ang, idx) => {
      const podGroup = new THREE.Group();
      podGroup.position.set(1.75 * lenScale, cy + Math.cos(ang) * 1.42, Math.sin(ang) * 1.42);
      const pod = new THREE.Mesh(rcsGeo, placeholderMat);
      podGroup.add(pod);
      const thrBell = new THREE.Mesh(rcsBellGeo, placeholderMat);
      thrBell.rotation.z = -Math.PI / 2;
      thrBell.position.set(0.24, 0, 0);
      setDetailKind(thrBell, 'chrome_shaft');
      podGroup.add(thrBell);
      tagPart(podGroup, 'propulsion', `RCS Attitude Thruster Quad ${idx + 1}`, `AR-31${idx + 1}`, 2, new THREE.Vector3(0.8, Math.cos(ang) * 0.9, Math.sin(ang) * 0.9));
      parts.push(podGroup);
      selectableMeshes.push(pod);
      pod.userData = podGroup.userData;
      root.add(podGroup);
    });

    const plumeGeo = trackGeo(new THREE.ConeGeometry(0.75, 3.6, 24, 1, true));
    plumeGeo.rotateZ(-Math.PI / 2);
    const plume = new THREE.Mesh(plumeGeo, exhaustMat);
    plume.position.set(5.3 * lenScale, cy, 0);
    plume.visible = false;
    exhaustPlumes.push(plume);
    root.add(plume);
  } else if (assemblyId === 'sbc350_v8') {
    // =========================================================================
    // SBC-350 5.7L V8 (and V6/V10/V12) — Precision Real-World Mechanical Detail
    // True-scale kinematics at KIN_SCALE = 0.11 units/inch:
    //  - Bore: 4.000 in published SBC spec (live-synced from Engine Block steppers)
    //  - Bore spacing: 4.400 in (111.76 mm, GM-3970010 spec) -> 0.484 units * lenScale
    //  - Deck height: 9.025 in (229.24 mm, GM-3970010 spec) -> DECK_Y = 0.99275 units from crank CL
    //  - Stroke: 3.480 in published SBC spec (live-synced from Engine Block steppers)
    //  - Rod length: 5.700 in (0.627 units center-to-center)
    //  - Deck clearance: 0.015 in (Ray's number, live-synced)
    //  - Head gasket: 0.039 in (Ray's number, live-synced)
    //  - Camshaft: Crower 00980 0.459 in max lift, 2:1 timing sprockets (cam = crank x 0.5)
    //  - Design Variants: Cammed OHV (default live engine) vs Camless Billet Solenoid Heads;
    //    Weiand 6-71 Concept Blower + One-Piece Manifold vs Cross-Ram Carbon Plenum
    // =========================================================================
    const liveBoreIn = sbcBlockConfig?.boreIn ?? BORE_IN;
    const liveStrokeIn = sbcBlockConfig?.strokeIn ?? STROKE_IN;
    const liveThrowIn = liveStrokeIn / 2;
    const liveDeckClrIn = sbcBlockConfig?.deckClearanceIn ?? DECK_CLEARANCE_IN;
    const liveGasketIn = sbcBlockConfig?.gasketIn ?? GASKET_IN;
    const headVariant = sbcBlockConfig?.headVariant ?? 'cammed_ohv';
    const inductionStyle = sbcBlockConfig?.inductionStyle ?? 'blower_671';

    const cy = 1.65;
    const crankCenterY = cy - 0.2; // 1.45 in world Y
    const KIN_SCALE = 0.11;
    const BORE_R = (liveBoreIn / 2) * KIN_SCALE; // 0.220 at 4.000 in stock
    const PIN_R = liveThrowIn * KIN_SCALE; // 0.1914 at 3.480 in stock
    const DECK_Y = 9.025 * KIN_SCALE; // 0.99275 along bank ray from crank CL
    const TDC_PIN_Y = pinHeightInForThrow(0, liveThrowIn) * KIN_SCALE;
    const COMP_HEIGHT_U = Math.max(0.055, DECK_Y - TDC_PIN_Y - liveDeckClrIn * KIN_SCALE);
    const GASKET_VISUAL_THICK = Math.max(0.008, liveGasketIn * KIN_SCALE * 2.5);

    const lenScale = params.fuselageLengthM / 0.78;
    const bankScale = params.wingspanM / 0.72;
    const vHalfAngle = THREE.MathUtils.degToRad(params.sweepDeg); // default 45 deg -> 90 deg V8
    const cylCount = Math.max(4, Math.round(params.ribDensity));
    const perBank = Math.max(2, Math.floor(cylCount / 2));

    // Bore spacing: published 4.400" GM-3970010 = 0.484 units (stretched proportionally with slider lenScale)
    const borePitch = 0.484 * lenScale;
    const boreSpanX = (perBank - 1) * borePitch;
    const boreXs = Array.from({ length: perBank }, (_, i) => -boreSpanX / 2 + i * borePitch);
    const safeHoleR = Math.min(BORE_R, borePitch * 0.465);
    const safePistonR = Math.min(BORE_R * 0.96, borePitch * 0.445);
    const blockLen = boreSpanX + 0.831 * lenScale; // matches 527.1 mm / 20.75 in for V8 at default scale
    const bankLen = boreSpanX + 0.64 * lenScale;
    const headLen = boreSpanX + 0.66 * lenScale; // matches 482.6 mm / 19.00 in scaled envelope

    const dummy = new THREE.Object3D();
    const hexBoltGeo = trackGeo(createHexFlangeBoltGeometry(0.022, 0.032));
    const smallBoltGeo = trackGeo(createHexFlangeBoltGeometry(0.016, 0.024));
    const studGeo = trackGeo(createThreadedStudGeometry(0.017, 0.13, 8));

    // 1. Machined CNC Dyno Mounting Cradle + Vertical Stanchions Bolted to Block Motor Mounts
    const standGroup = new THREE.Group();
    const standBaseGeo = trackGeo(new THREE.BoxGeometry(blockLen + 0.9, 0.12, 2.05));
    const standBase = new THREE.Mesh(standBaseGeo, placeholderMat);
    standBase.position.set(0, 0.06, 0);
    setEngineFinish(standBase, 'polished_billet');
    standGroup.add(standBase);

    const railGeo = trackGeo(new THREE.BoxGeometry(blockLen + 0.65, 0.06, 0.14));
    [-0.78, 0.78].forEach((rz) => {
      const rail = new THREE.Mesh(railGeo, placeholderMat);
      rail.position.set(0, 0.15, rz);
      setEngineFinish(rail, 'anodized_black');
      standGroup.add(rail);
    });

    // Vertical cradle arms connecting stand (y=0.18) up to SBC side motor mount bosses
    const armH = crankCenterY - 0.22;
    const standArmGeo = trackGeo(new THREE.BoxGeometry(0.16, armH, 0.12));
    const mountPadGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.16, 0.14));
    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(standArmGeo, placeholderMat);
      arm.position.set(0, 0.18 + armH / 2, side * (0.64 * bankScale + 0.06));
      arm.rotation.x = side * 0.14;
      setEngineFinish(arm, 'polished_billet');
      standGroup.add(arm);

      const pad = new THREE.Mesh(mountPadGeo, placeholderMat);
      pad.position.set(0, crankCenterY - 0.06, side * 0.56 * bankScale);
      setEngineFinish(pad, 'chevy_orange');
      standGroup.add(pad);

      // 3-bolt SBC motor mount triangular pattern
      [
        [-0.06, 0.035],
        [0.06, 0.035],
        [0, -0.04],
      ].forEach(([ox, oy]) => {
        const mb = new THREE.Mesh(smallBoltGeo, placeholderMat);
        mb.rotation.x = side * (Math.PI / 2);
        mb.position.set(ox, crankCenterY - 0.06 + oy, side * (0.63 * bankScale));
        setDetailKind(mb, 'black_oxide');
        standGroup.add(mb);
      });
    });

    tagPart(standGroup, 'internal', 'CNC Dyno Mounting Cradle & SBC 3-Bolt Mounts', 'SBC-490', 6, new THREE.Vector3(0, -0.5, 0));
    parts.push(standGroup);
    selectableMeshes.push(standBase);
    standBase.userData = standGroup.userData;
    root.add(standGroup);

    // 2. Baffled Dry-Sump Oil Pan, Viton Pan Rail Gasket, Brass Drain Plug & AN-12 Scavenge Ports
    const panGroup = new THREE.Group();
    panGroup.position.set(0, crankCenterY - 0.34, 0);

    const panRailGeo = trackGeo(new THREE.BoxGeometry(blockLen * 0.96, 0.035, 0.96 * bankScale));
    const panRail = new THREE.Mesh(panRailGeo, placeholderMat);
    panRail.position.set(0, -0.02, 0);
    setEngineFinish(panRail, 'polished_billet');
    panGroup.add(panRail);

    const panGasketGeo = trackGeo(new THREE.BoxGeometry(blockLen * 0.97, 0.012, 0.97 * bankScale));
    const panGasket = new THREE.Mesh(panGasketGeo, placeholderMat);
    panGasket.position.set(0, 0.004, 0);
    setDetailKind(panGasket, 'viton_seal');
    panGroup.add(panGasket);

    const sumpBodyGeo = trackGeo(new THREE.BoxGeometry(blockLen * 0.88, 0.38, 0.84 * bankScale));
    const sumpBody = new THREE.Mesh(sumpBodyGeo, placeholderMat);
    sumpBody.position.set(0.04, -0.22, 0);
    setEngineFinish(sumpBody, 'polished_billet');
    panGroup.add(sumpBody);

    const deepSumpGeo = trackGeo(new THREE.BoxGeometry(blockLen * 0.42, 0.18, 0.82 * bankScale));
    const deepSump = new THREE.Mesh(deepSumpGeo, placeholderMat);
    deepSump.position.set(blockLen * 0.2, -0.46, 0);
    setEngineFinish(deepSump, 'polished_billet');
    panGroup.add(deepSump);

    // Brass magnetic drain plug & 2 anodized dry-sump scavenge AN-12 fittings
    const drainPlug = new THREE.Mesh(smallBoltGeo, placeholderMat);
    drainPlug.rotation.z = -Math.PI / 2;
    drainPlug.position.set(blockLen * 0.42, -0.5, 0);
    setDetailKind(drainPlug, 'brass_fitting');
    panGroup.add(drainPlug);

    const fittingGeo = trackGeo(createHexFlangeBoltGeometry(0.026, 0.05));
    [-0.25, 0.25].forEach((fx) => {
      const anFit = new THREE.Mesh(fittingGeo, placeholderMat);
      anFit.rotation.x = Math.PI / 2;
      anFit.position.set(fx, -0.32, 0.44 * bankScale);
      setDetailKind(anFit, 'anodized_blue');
      panGroup.add(anFit);
    });

    // Pan rail perimeter hex bolts (8 per side)
    const panBoltInst = new THREE.InstancedMesh(smallBoltGeo, placeholderMat, 16);
    for (let i = 0; i < 8; i++) {
      const bxPos = -blockLen * 0.44 + (i / 7) * (blockLen * 0.88);
      [-1, 1].forEach((side, sIdx) => {
        dummy.position.set(bxPos, -0.042, side * 0.44 * bankScale);
        dummy.rotation.set(Math.PI, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        panBoltInst.setMatrixAt(i * 2 + sIdx, dummy.matrix);
      });
    }
    panBoltInst.instanceMatrix.needsUpdate = true;
    panBoltInst.computeBoundingSphere();
    setDetailKind(panBoltInst, 'black_oxide');
    panGroup.add(panBoltInst);

    tagPart(panGroup, 'airframe', 'Baffled Dry-Sump Oil Pan & AN-12 Scavenge Ports', 'GM-3970010-SUMP', 10, new THREE.Vector3(0, -1.15, 0));
    parts.push(panGroup);
    selectableMeshes.push(sumpBody);
    sumpBody.userData = panGroup.userData;
    root.add(panGroup);

    // 3. Chevy Engine Orange Painted GM-3970010 Crankcase, 5 Main Saddles, 4-Bolt Main Caps & Bellhousing Flange
    const caseGroup = new THREE.Group();
    caseGroup.position.set(0, crankCenterY, 0);

    // Side crankcase skirt rails in glossy Chevy Engine Orange enamel
    const skirtGeo = trackGeo(new THREE.BoxGeometry(blockLen, 0.48, 0.14));
    [-1, 1].forEach((side) => {
      const skirt = new THREE.Mesh(skirtGeo, placeholderMat);
      skirt.position.set(0, -0.1, side * 0.46 * bankScale);
      setEngineFinish(skirt, 'chevy_orange');
      caseGroup.add(skirt);
    });

    // Valley lifter deck tray & cam tunnel ribs
    const valleyFloorGeo = trackGeo(new THREE.BoxGeometry(blockLen * 0.92, 0.08, 0.36 * bankScale));
    const valleyFloor = new THREE.Mesh(valleyFloorGeo, placeholderMat);
    valleyFloor.position.set(0, 0.4, 0);
    setEngineFinish(valleyFloor, 'chevy_orange');
    caseGroup.add(valleyFloor);

    // 5 Main Bearing Web Bulkheads + 4-Bolt Main Caps + Tri-Metal Bronze Bearing Shells + 20 ARP Main Bolts
    const mainCount = perBank + 1;
    const bulkheadGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.56, 0.92 * bankScale));
    const capGeo = trackGeo(new THREE.BoxGeometry(0.13, 0.18, 0.66 * bankScale));
    // UNVERIFIED: SBC main bearing shell wall thickness, OD & axial width visually scaled (0.155/0.132 x 0.12);
    // needs Clevite/ACL SBC-350 main bearing shell catalog dims & crank thrust-flange width to confirm against Ø62.205 mm housing bore.
    const mainBrgGeo = trackGeo(createHollowCylinderGeometry(0.155, 0.132, 0.12, 24, 'x'));
    const mainBoltInst = new THREE.InstancedMesh(hexBoltGeo, placeholderMat, mainCount * 4);
    let mbIdx = 0;

    for (let m = 0; m < mainCount; m++) {
      const mx =
        m === 0
          ? boreXs[0] - borePitch * 0.58
          : m === mainCount - 1
          ? boreXs[perBank - 1] + borePitch * 0.58
          : (boreXs[m - 1] + boreXs[m]) * 0.5;

      const bulkhead = new THREE.Mesh(bulkheadGeo, placeholderMat);
      bulkhead.position.set(mx, 0.08, 0);
      setEngineFinish(bulkhead, 'chevy_orange');
      caseGroup.add(bulkhead);

      const cap = new THREE.Mesh(capGeo, placeholderMat);
      cap.position.set(mx, -0.18, 0);
      cap.userData.customMaterialId = 'forged_4340';
      caseGroup.add(cap);

      const brg = new THREE.Mesh(mainBrgGeo, placeholderMat);
      brg.position.set(mx, 0, 0);
      setDetailKind(brg, 'bronze_bearing');
      caseGroup.add(brg);

      // 4-bolt splayed main fastener array per cap
      [-0.24 * bankScale, -0.14 * bankScale, 0.14 * bankScale, 0.24 * bankScale].forEach((bz) => {
        dummy.position.set(mx, -0.275, bz);
        dummy.rotation.set(Math.PI, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mainBoltInst.setMatrixAt(mbIdx++, dummy.matrix);
      });
    }
    mainBoltInst.instanceMatrix.needsUpdate = true;
    mainBoltInst.computeBoundingSphere();
    setDetailKind(mainBoltInst, 'black_oxide');
    caseGroup.add(mainBoltInst);

    // Front Timing Cover (Chevy Orange painted) + Rear SFI Bellhousing Flange (6-bolt + Dowels + Viton RMS)
    const frontCoverGeo = trackGeo(new THREE.BoxGeometry(0.1, 0.78, 0.72));
    const frontCover = new THREE.Mesh(frontCoverGeo, placeholderMat);
    frontCover.position.set(-blockLen / 2 - 0.06, 0.18, 0);
    setEngineFinish(frontCover, 'chevy_orange');
    caseGroup.add(frontCover);

    // Timing cover perimeter bolts
    const tcBoltPositions: Array<[number, number]> = [
      [0.48, -0.26],
      [0.48, 0.26],
      [0.24, -0.31],
      [0.24, 0.31],
      [-0.08, -0.31],
      [-0.08, 0.31],
    ];
    tcBoltPositions.forEach(([ty, tz]) => {
      const tb = new THREE.Mesh(smallBoltGeo, placeholderMat);
      tb.rotation.z = Math.PI / 2;
      tb.position.set(-blockLen / 2 - 0.11, ty, tz);
      setDetailKind(tb, 'chrome_shaft');
      caseGroup.add(tb);
    });

    const rearFlangeGeo = trackGeo(createHollowCylinderGeometry(0.58, 0.21, 0.09, 32, 'x', 0.008));
    const rearFlange = new THREE.Mesh(rearFlangeGeo, placeholderMat);
    rearFlange.position.set(blockLen / 2 + 0.04, 0, 0);
    setEngineFinish(rearFlange, 'chevy_orange');
    caseGroup.add(rearFlange);

    // UNVERIFIED: Rear main seal OD/ID/lip width visually proportioned (0.21/0.15 x 0.045);
    // needs Fel-Pro / GM SBC 1-piece or 2-piece RMS seal ID, housing bore OD, and axial thickness per Ray's block crank flange.
    const rmsGeo = trackGeo(createHollowCylinderGeometry(0.21, 0.15, 0.045, 24, 'x'));
    const rmsMesh = new THREE.Mesh(rmsGeo, placeholderMat);
    rmsMesh.position.set(blockLen / 2 + 0.07, 0, 0);
    setDetailKind(rmsMesh, 'viton_seal');
    caseGroup.add(rmsMesh);

    const dowelGeo = trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.09, 12));
    dowelGeo.rotateZ(Math.PI / 2);
    [-0.44, 0.44].forEach((dz) => {
      const dowel = new THREE.Mesh(dowelGeo, placeholderMat);
      dowel.position.set(blockLen / 2 + 0.1, -0.06, dz);
      setDetailKind(dowel, 'chrome_shaft');
      caseGroup.add(dowel);
    });

    // Brass coolant freeze plugs along block skirts
    const freezeGeo = trackGeo(new THREE.CylinderGeometry(0.065, 0.06, 0.025, 16));
    freezeGeo.rotateX(Math.PI / 2);
    [-1, 1].forEach((side) => {
      boreXs.slice(0, 3).forEach((fx) => {
        const fp = new THREE.Mesh(freezeGeo, placeholderMat);
        fp.position.set(fx, -0.06, side * 0.535 * bankScale);
        setDetailKind(fp, 'brass_fitting');
        caseGroup.add(fp);
      });
    });

    // Stationary Copper Magneto Stator Ring + Driver-Controlled Voltage Leads (mounted to front cover around crank)
    // UNVERIFIED: Stator carrier OD, 12 copper stator coil dimensions & voltage plug geometry are visual proportions from reference 02/05.
    const statorX = -blockLen / 2 - 0.135;
    const statorCarrierGeo = trackGeo(createHollowCylinderGeometry(0.235, 0.155, 0.028, 28, 'x', 0.003));
    const statorCarrier = new THREE.Mesh(statorCarrierGeo, placeholderMat);
    statorCarrier.position.set(statorX, 0, 0);
    setEngineFinish(statorCarrier, 'polished_billet');
    caseGroup.add(statorCarrier);

    const coilCoreGeo = trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.065, 14));
    coilCoreGeo.rotateZ(Math.PI / 2);
    const coilCapGeo = trackGeo(new THREE.BoxGeometry(0.022, 0.038, 0.044));
    const coilInst = new THREE.InstancedMesh(coilCoreGeo, placeholderMat, 12);
    const poleInst = new THREE.InstancedMesh(coilCapGeo, placeholderMat, 12);
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const rCoil = 0.21;
      dummy.position.set(statorX - 0.045, Math.cos(ang) * rCoil, Math.sin(ang) * rCoil);
      dummy.rotation.set(ang, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      coilInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(statorX - 0.072, Math.cos(ang) * (rCoil + 0.028), Math.sin(ang) * (rCoil + 0.028));
      dummy.updateMatrix();
      poleInst.setMatrixAt(i, dummy.matrix);
    }
    coilInst.instanceMatrix.needsUpdate = true;
    coilInst.computeBoundingSphere();
    setEngineFinish(coilInst, 'copper_coil');
    caseGroup.add(coilInst);

    poleInst.instanceMatrix.needsUpdate = true;
    poleInst.computeBoundingSphere();
    setDetailKind(poleInst, 'black_oxide');
    caseGroup.add(poleInst);

    // Driver-controlled stator voltage leads + waterproof plug on lower timing cover
    const leadCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(statorX - 0.02, -0.19, 0.07),
      new THREE.Vector3(statorX - 0.04, -0.27, 0.2),
      new THREE.Vector3(statorX + 0.02, -0.22, 0.34),
    ]);
    const leadGeo = trackGeo(new THREE.TubeGeometry(leadCurve1, 14, 0.011, 8, false));
    const leadMesh = new THREE.Mesh(leadGeo, placeholderMat);
    setDetailKind(leadMesh, 'anodized_red');
    caseGroup.add(leadMesh);

    const wpPlugGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.045, 0.065));
    const wpPlug = new THREE.Mesh(wpPlugGeo, placeholderMat);
    wpPlug.position.set(statorX + 0.02, -0.22, 0.35);
    setEngineFinish(wpPlug, 'anodized_black');
    caseGroup.add(wpPlug);

    tagPart(caseGroup, 'airframe', 'Chevy-Orange SBC-350 Block, 4-Bolt Mains & Copper Magneto Stator', 'GM-3970010-CNC', 30, new THREE.Vector3(0, -0.2, 0));
    parts.push(caseGroup);
    selectableMeshes.push(rearFlange);
    rearFlange.userData = caseGroup.userData;
    root.add(caseGroup);

    // 4. Dual V-Bank Cylinder Sleeves + Honed Liners + Punched Decks + MLS Head Gaskets + Heads (Cammed OHV vs Camless Billet Variant)
    const bankOuterSleeveGeo = trackGeo(createHollowCylinderGeometry(safeHoleR + 0.042, safeHoleR + 0.005, 0.62, 28, 'y', 0.006));
    const bankLinerGeo = trackGeo(createHollowCylinderGeometry(safeHoleR + 0.005, safeHoleR, 0.635, 32, 'y', 0.003));
    const bankDeckGeo = trackGeo(createPunchedBorePlateGeometry(bankLen, 0.58, 0.055, boreXs, safeHoleR, 0.035, 0.006));

    // MLS Head Gasket (Ray's live thickness) + Copper fire-rings
    const gasketPlateGeo = trackGeo(createPunchedBorePlateGeometry(headLen * 0.98, 0.59, GASKET_VISUAL_THICK, boreXs, safeHoleR + 0.004, 0.03, 0.001));
    const fireRingGeo = trackGeo(new THREE.TorusGeometry(safeHoleR + 0.006, 0.007, 8, 28));
    fireRingGeo.rotateX(Math.PI / 2);

    // Sculpted Cylinder Head casting
    const headBasePlateGeo = trackGeo(createPunchedBorePlateGeometry(headLen, 0.62, 0.16, boreXs, Math.min(safeHoleR * 0.9, borePitch * 0.41), 0.04, 0.01));
    const headRailGeo = trackGeo(new THREE.BoxGeometry(headLen * 0.96, headVariant === 'camless_billet' ? 0.17 : 0.24, 0.58));
    const guideGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.036, 0.16, 12));
    // UNVERIFIED: Valve spring coil OD, wire diameter, free height & 4-coil count are visual approximations;
    // needs Crower / PAC / Ray's valve spring spec sheet (OD, ID, wire gauge, installed height, coil bind height, active coils).
    const springCoilGeo = trackGeo(new THREE.TorusGeometry(0.054, 0.012, 8, 18));
    springCoilGeo.rotateX(Math.PI / 2);
    const retainerGeo = trackGeo(new THREE.CylinderGeometry(0.058, 0.045, 0.025, 16));
    const rockerArmGeo = trackGeo(new THREE.BoxGeometry(0.055, 0.042, 0.19));

    // Cammed OHV Valve Cover geometries
    const coverShellGeo = trackGeo(new THREE.BoxGeometry(headLen * 0.94, 0.22, 0.52));
    const coverFlangeGeo = trackGeo(new THREE.BoxGeometry(headLen * 0.96, 0.03, 0.56));
    const coverGasketGeo = trackGeo(new THREE.BoxGeometry(headLen * 0.96, 0.014, 0.56));
    const breatherCapGeo = trackGeo(new THREE.CylinderGeometry(0.075, 0.068, 0.06, 16));
    const vcFinGeo = trackGeo(new THREE.BoxGeometry(headLen * 0.88, 0.014, 0.024));

    // Camless Billet Solenoid Actuator + Direct Injector + Spark Plug Well geometries (Reference 01, 03, 04)
    // UNVERIFIED: Solenoid actuator tower height/diameter, pneumatic cushion boss & direct injector envelope are look references only.
    const solLowerGeo = trackGeo(new THREE.CylinderGeometry(0.056, 0.06, 0.11, 18));
    const solMidCollarGeo = trackGeo(new THREE.CylinderGeometry(0.066, 0.066, 0.042, 18));
    const solUpperGeo = trackGeo(new THREE.CylinderGeometry(0.052, 0.056, 0.13, 18));
    const solCapGeo = trackGeo(new THREE.CylinderGeometry(0.046, 0.052, 0.045, 16));
    const wpConnGeo = trackGeo(new THREE.BoxGeometry(0.038, 0.042, 0.048));
    const efiRailGeo = trackGeo(new THREE.BoxGeometry(headLen * 0.9, 0.052, 0.058));
    const injBodyGeo = trackGeo(new THREE.CylinderGeometry(0.024, 0.018, 0.13, 12));
    const sparkWellGeo = trackGeo(createHollowCylinderGeometry(0.052, 0.032, 0.09, 16, 'y', 0.004));
    const sparkBootGeo = trackGeo(new THREE.CylinderGeometry(0.026, 0.03, 0.11, 12));

    const v8BankGroups: THREE.Group[] = [];
    const v8HeadGroups: THREE.Group[] = [];
    const VALVE_SEAT_Y = DECK_Y + GASKET_VISUAL_THICK; // exact chamber roof above MLS gasket
    const VALVE_BASE_Y = VALVE_SEAT_Y + 0.18;

    [-1, 1].forEach((side) => {
      // Cylinder Bank anchored at Crank Centerline (0, crankCenterY, 0) rotated by side * vHalfAngle
      const bankGroup = new THREE.Group();
      bankGroup.position.set(0, crankCenterY, 0);
      bankGroup.rotation.x = side * vHalfAngle;

      // Top machined deck plate flush at y = DECK_Y (machined billet face)
      const deckPlate = new THREE.Mesh(bankDeckGeo, placeholderMat);
      deckPlate.position.set(0, DECK_Y - 0.0275, 0);
      setEngineFinish(deckPlate, 'polished_billet');
      bankGroup.add(deckPlate);

      // Painted Chevy-orange outer cylinder sleeves & honed metallic liners
      const sleeveInst = new THREE.InstancedMesh(bankOuterSleeveGeo, placeholderMat, perBank);
      const linerInst = new THREE.InstancedMesh(bankLinerGeo, placeholderMat, perBank);
      boreXs.forEach((bx, idx) => {
        dummy.position.set(bx, DECK_Y - 0.31, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        sleeveInst.setMatrixAt(idx, dummy.matrix);
        linerInst.setMatrixAt(idx, dummy.matrix);
      });
      sleeveInst.instanceMatrix.needsUpdate = true;
      sleeveInst.computeBoundingSphere();
      setEngineFinish(sleeveInst, 'chevy_orange');
      linerInst.instanceMatrix.needsUpdate = true;
      linerInst.computeBoundingSphere();
      setDetailKind(linerInst, 'honed_iron');
      bankGroup.add(sleeveInst);
      bankGroup.add(linerInst);

      // Bank side water-jacket casting walls in glossy Chevy Engine Orange
      const jacketGeo = trackGeo(new THREE.BoxGeometry(bankLen * 0.96, 0.58, 0.1));
      [-0.24, 0.24].forEach((jz) => {
        const jMesh = new THREE.Mesh(jacketGeo, placeholderMat);
        jMesh.position.set(0, DECK_Y - 0.33, jz);
        setEngineFinish(jMesh, 'chevy_orange');
        bankGroup.add(jMesh);
      });

      tagPart(
        bankGroup,
        'airframe',
        side === 1
          ? `Right Cylinder Bank & Honed Bores (${Array.from({ length: perBank }, (_, i) => 2 * i + 2).join('-')})`
          : `Left Cylinder Bank & Honed Bores (${Array.from({ length: perBank }, (_, i) => 2 * i + 1).join('-')})`,
        side === 1 ? 'SBC-BLK-R' : 'SBC-BLK-L',
        12,
        new THREE.Vector3(0, 0.35, side * 0.85)
      );
      parts.push(bankGroup);
      selectableMeshes.push(deckPlate);
      deckPlate.userData = bankGroup.userData;
      root.add(bankGroup);
      v8BankGroups.push(bankGroup);

      // MLS Head Gasket (live thickness) sitting right at y = DECK_Y
      const gasketGroup = new THREE.Group();
      gasketGroup.position.set(0, crankCenterY, 0);
      gasketGroup.rotation.x = side * vHalfAngle;
      const gPlate = new THREE.Mesh(gasketPlateGeo, placeholderMat);
      gPlate.position.set(0, DECK_Y + GASKET_VISUAL_THICK * 0.5, 0);
      setDetailKind(gPlate, 'mls_steel');
      gasketGroup.add(gPlate);

      const fireRingInst = new THREE.InstancedMesh(fireRingGeo, placeholderMat, perBank);
      boreXs.forEach((bx, idx) => {
        dummy.position.set(bx, DECK_Y + GASKET_VISUAL_THICK * 0.5, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        fireRingInst.setMatrixAt(idx, dummy.matrix);
      });
      fireRingInst.instanceMatrix.needsUpdate = true;
      fireRingInst.computeBoundingSphere();
      setDetailKind(fireRingInst, 'copper_gasket');
      gasketGroup.add(fireRingInst);

      tagPart(
        gasketGroup,
        'internal',
        `${liveGasketIn.toFixed(3)}" MLS Head Gasket & Copper Fire-Rings (${side === 1 ? 'Right' : 'Left'})`,
        side === 1 ? 'SBC-HG-R' : 'SBC-HG-L',
        2,
        new THREE.Vector3(0, 0.65, side * 1.1)
      );
      parts.push(gasketGroup);
      selectableMeshes.push(gPlate);
      gPlate.userData = gasketGroup.userData;
      root.add(gasketGroup);

      // Cylinder Head (Standard Cammed 23° OHV OR Camless Billet Solenoid Design Variant)
      const headGroup = new THREE.Group();
      headGroup.position.set(0, crankCenterY, 0);
      headGroup.rotation.x = side * vHalfAngle;

      const headBase = new THREE.Mesh(headBasePlateGeo, placeholderMat);
      headBase.position.set(0, VALVE_SEAT_Y + 0.08, 0);
      setEngineFinish(headBase, 'polished_billet');
      headGroup.add(headBase);

      const headBody = new THREE.Mesh(headRailGeo, placeholderMat);
      headBody.position.set(0, VALVE_SEAT_Y + (headVariant === 'camless_billet' ? 0.24 : 0.28), 0);
      setEngineFinish(headBody, 'polished_billet');
      headGroup.add(headBody);

      // 17-stud SBC ARP cylinder head stud row
      const studCount = (perBank + 1) * 2;
      const headStudInst = new THREE.InstancedMesh(studGeo, placeholderMat, studCount);
      let sIdx = 0;
      for (let i = 0; i <= perBank; i++) {
        const sx = i === 0 ? boreXs[0] - borePitch * 0.45 : i === perBank ? boreXs[perBank - 1] + borePitch * 0.45 : (boreXs[i - 1] + boreXs[i]) * 0.5;
        [-0.23, 0.23].forEach((sz) => {
          dummy.position.set(sx, VALVE_SEAT_Y + 0.37, sz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          headStudInst.setMatrixAt(sIdx++, dummy.matrix);
        });
      }
      headStudInst.instanceMatrix.needsUpdate = true;
      headStudInst.computeBoundingSphere();
      setDetailKind(headStudInst, 'black_oxide');
      headGroup.add(headStudInst);

      // Bronze valve guides (2 per cylinder)
      const guideInst = new THREE.InstancedMesh(guideGeo, placeholderMat, perBank * 2);
      let gIdx = 0;
      boreXs.forEach((bx) => {
        [-0.125, 0.125].forEach((vz) => {
          dummy.position.set(bx, VALVE_SEAT_Y + 0.24, vz);
          dummy.rotation.set(headVariant === 'camless_billet' ? 0 : side * -0.18, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          guideInst.setMatrixAt(gIdx++, dummy.matrix);
        });
      });
      guideInst.instanceMatrix.needsUpdate = true;
      guideInst.computeBoundingSphere();
      setDetailKind(guideInst, 'bronze_bearing');
      headGroup.add(guideInst);

      // Integrated Spark Plug Wells & Porcelain Spark Plugs (visible on exhaust face of both, prominent on camless billet)
      boreXs.forEach((bx) => {
        const well = new THREE.Mesh(sparkWellGeo, placeholderMat);
        well.position.set(bx + 0.08, VALVE_SEAT_Y + 0.17, side * 0.29);
        well.rotation.x = side * 0.68;
        setEngineFinish(well, 'polished_billet');
        headGroup.add(well);

        const plug = new THREE.Mesh(sparkBootGeo, placeholderMat);
        plug.position.set(bx + 0.08, VALVE_SEAT_Y + 0.2, side * 0.34);
        plug.rotation.x = side * 0.68;
        setDetailKind(plug, 'anodized_red');
        headGroup.add(plug);
      });

      if (headVariant === 'camless_billet') {
        // DESIGN VARIANT: Machined billet camless head with vertical solenoid valve actuators,
        // pneumatic cushioning chambers, top-mounted direct injectors, black EFI rail, blue AN fittings & waterproof connectors.
        const railZ = -side * 0.24; // inner valley intake side
        const efiRail = new THREE.Mesh(efiRailGeo, placeholderMat);
        efiRail.position.set(0, VALVE_SEAT_Y + 0.42, railZ);
        setEngineFinish(efiRail, 'anodized_black');
        headGroup.add(efiRail);

        // Blue AN-8 rail end fittings & crossover port
        [-headLen * 0.46, headLen * 0.46].forEach((ax) => {
          const anEnd = new THREE.Mesh(fittingGeo, placeholderMat);
          anEnd.rotation.z = Math.PI / 2;
          anEnd.position.set(ax, VALVE_SEAT_Y + 0.42, railZ);
          setDetailKind(anEnd, 'anodized_blue');
          headGroup.add(anEnd);
        });

        // Solenoid actuator towers (vertical above intake & exhaust valves) + top-mounted direct fuel injectors
        boreXs.forEach((bx) => {
          [-0.125, 0.125].forEach((vz) => {
            const towerX = bx + (vz < 0 ? -0.045 : 0.045);
            const cushion = new THREE.Mesh(solLowerGeo, placeholderMat);
            cushion.position.set(towerX, VALVE_SEAT_Y + 0.39, vz);
            setEngineFinish(cushion, 'polished_billet');
            headGroup.add(cushion);

            const coilRing = new THREE.Mesh(solMidCollarGeo, placeholderMat);
            coilRing.position.set(towerX, VALVE_SEAT_Y + 0.46, vz);
            setEngineFinish(coilRing, 'copper_coil');
            headGroup.add(coilRing);

            const upper = new THREE.Mesh(solUpperGeo, placeholderMat);
            upper.position.set(towerX, VALVE_SEAT_Y + 0.54, vz);
            setEngineFinish(upper, 'polished_billet');
            headGroup.add(upper);

            const cap = new THREE.Mesh(solCapGeo, placeholderMat);
            cap.position.set(towerX, VALVE_SEAT_Y + 0.62, vz);
            setEngineFinish(cap, 'anodized_black');
            headGroup.add(cap);

            // Waterproof electrical connector on actuator top
            const conn = new THREE.Mesh(wpConnGeo, placeholderMat);
            conn.position.set(towerX, VALVE_SEAT_Y + 0.59, vz + side * 0.055);
            setEngineFinish(conn, 'anodized_black');
            headGroup.add(conn);
          });

          // Top-mounted direct injector feeding from black EFI rail
          const inj = new THREE.Mesh(injBodyGeo, placeholderMat);
          inj.position.set(bx, VALVE_SEAT_Y + 0.34, railZ * 0.86);
          inj.rotation.x = side * 0.28;
          setEngineFinish(inj, 'anodized_black');
          headGroup.add(inj);

          const injClip = new THREE.Mesh(wpConnGeo, placeholderMat);
          injClip.scale.set(0.7, 0.7, 0.7);
          injClip.position.set(bx, VALVE_SEAT_Y + 0.39, railZ * 1.04);
          setDetailKind(injClip, 'anodized_blue');
          headGroup.add(injClip);
        });
      }

      tagPart(
        headGroup,
        'wings',
        headVariant === 'camless_billet'
          ? `Camless Billet Solenoid Head & EFI Rail (${side === 1 ? 'Right' : 'Left'} · Design Variant)`
          : side === 1
          ? 'CNC-Ported 23° Head & ARP Studs (Right)'
          : 'CNC-Ported 23° Head & ARP Studs (Left)',
        headVariant === 'camless_billet' ? 'SBC-CAMLESS-VAR' : 'GM-12556127',
        10,
        new THREE.Vector3(0, 0.95, side * 1.35)
      );
      parts.push(headGroup);
      selectableMeshes.push(headBody);
      headBody.userData = headGroup.userData;
      root.add(headGroup);
      v8HeadGroups.push(headGroup);

      // Standard Cammed OHV Valve Cover (polished finned billet + Viton seal + breather)
      if (headVariant === 'cammed_ohv') {
        const coverGroup = new THREE.Group();
        coverGroup.position.set(0, crankCenterY, 0);
        coverGroup.rotation.x = side * vHalfAngle;

        const vcGasket = new THREE.Mesh(coverGasketGeo, placeholderMat);
        vcGasket.position.set(0, VALVE_SEAT_Y + 0.405, 0);
        setDetailKind(vcGasket, 'viton_seal');
        coverGroup.add(vcGasket);

        const vcFlange = new THREE.Mesh(coverFlangeGeo, placeholderMat);
        vcFlange.position.set(0, VALVE_SEAT_Y + 0.425, 0);
        setEngineFinish(vcFlange, 'polished_billet');
        coverGroup.add(vcFlange);

        const vcShell = new THREE.Mesh(coverShellGeo, placeholderMat);
        vcShell.position.set(0, VALVE_SEAT_Y + 0.54, 0);
        coverGroup.add(vcShell);

        // Top machined cooling fins along valve cover
        [-0.14, -0.05, 0.05, 0.14].forEach((fz) => {
          const fin = new THREE.Mesh(vcFinGeo, placeholderMat);
          fin.position.set(0, VALVE_SEAT_Y + 0.655, fz);
          setEngineFinish(fin, 'polished_billet');
          coverGroup.add(fin);
        });

        const breather = new THREE.Mesh(breatherCapGeo, placeholderMat);
        breather.position.set(-headLen * 0.34, VALVE_SEAT_Y + 0.68, 0);
        setEngineFinish(breather, 'polished_billet');
        coverGroup.add(breather);

        // Perimeter valve cover bolts (4 per rail)
        const vcBolts = new THREE.InstancedMesh(smallBoltGeo, placeholderMat, 8);
        for (let i = 0; i < 4; i++) {
          const vx = -headLen * 0.4 + (i / 3) * (headLen * 0.8);
          [-0.25, 0.25].forEach((vz, sIdx) => {
            dummy.position.set(vx, VALVE_SEAT_Y + 0.44, vz);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            vcBolts.setMatrixAt(i * 2 + sIdx, dummy.matrix);
          });
        }
        vcBolts.instanceMatrix.needsUpdate = true;
        vcBolts.computeBoundingSphere();
        setDetailKind(vcBolts, 'black_oxide');
        coverGroup.add(vcBolts);

        tagPart(
          coverGroup,
          'wings',
          side === 1 ? 'Finned Billet/Carbon Valve Cover & Viton Seal (Right)' : 'Finned Billet/Carbon Valve Cover & Viton Seal (Left)',
          'SBC-VC-CF',
          4,
          new THREE.Vector3(0, 1.55, side * 1.75)
        );
        parts.push(coverGroup);
        selectableMeshes.push(vcShell);
        vcShell.userData = coverGroup.userData;
        root.add(coverGroup);
      }

      // 4-into-1 Tubular Inconel/Stainless Exhaust Headers (E-I-I-E-E-I-I-E port spacing for V8!)
      const headerGroup = new THREE.Group();
      const portWorldOffsetY = crankCenterY + (VALVE_SEAT_Y + 0.19) * Math.cos(vHalfAngle);
      const portWorldOffsetZ = side * (VALVE_SEAT_Y + 0.19 + 0.24) * Math.sin(vHalfAngle);
      const exhFlangeGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.14, 0.032));
      const exhaustPortXs =
        perBank === 4
          ? [boreXs[0] - 0.05, boreXs[1] + 0.09, boreXs[2] - 0.09, boreXs[3] + 0.05]
          : boreXs;

      exhaustPortXs.forEach((px) => {
        const flange = new THREE.Mesh(exhFlangeGeo, placeholderMat);
        flange.position.set(px, portWorldOffsetY, portWorldOffsetZ * 0.96);
        flange.rotation.x = side * (vHalfAngle - Math.PI / 2);
        headerGroup.add(flange);

        [-0.08, 0.08].forEach((bxOff) => {
          const hb = new THREE.Mesh(smallBoltGeo, placeholderMat);
          hb.position.set(px + bxOff, portWorldOffsetY + 0.02, portWorldOffsetZ * 0.99);
          hb.rotation.x = side * (Math.PI / 2);
          setDetailKind(hb, 'black_oxide');
          headerGroup.add(hb);
        });

        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(px, portWorldOffsetY, portWorldOffsetZ),
          new THREE.Vector3(px * 0.88, cy + 0.42, side * 1.38 * bankScale),
          new THREE.Vector3(0.55 * lenScale, cy - 0.18, side * 1.32 * bankScale),
          new THREE.Vector3(blockLen * 0.68, cy - 0.24, side * 1.05 * bankScale),
        ]);
        const tubeGeo = trackGeo(new THREE.TubeGeometry(curve, 24, 0.056 * params.nacelleScale, 10, false));
        const tubeMesh = new THREE.Mesh(tubeGeo, placeholderMat);
        headerGroup.add(tubeMesh);
      });

      const collectorGeo = trackGeo(new THREE.CylinderGeometry(0.11 * params.nacelleScale, 0.14 * params.nacelleScale, 0.34, 18));
      collectorGeo.rotateZ(Math.PI / 2);
      const collector = new THREE.Mesh(collectorGeo, placeholderMat);
      collector.position.set(blockLen * 0.78, cy - 0.24, side * 1.02 * bankScale);
      headerGroup.add(collector);

      tagPart(
        headerGroup,
        'propulsion',
        side === 1 ? 'Inconel 4-into-1 Header & Merge (Right)' : 'Inconel 4-into-1 Header & Merge (Left)',
        'INC-350-HDR-41',
        8,
        new THREE.Vector3(0.4, -0.1, side * 1.95)
      );
      parts.push(headerGroup);
      if (headerGroup.children[0]) {
        const firstFlange = headerGroup.children[0] as THREE.Mesh;
        selectableMeshes.push(firstFlange);
        firstFlange.userData = headerGroup.userData;
      }
      root.add(headerGroup);
    });

    // 5. Induction Assembly: One-Piece Bolt-On Finned 6-71 Blower & Billet Manifold (Design Concept) OR Cross-Ram Carbon Intake
    const intakeGroup = new THREE.Group();
    intakeGroup.position.set(0, crankCenterY + 0.94, 0);
    const blowerPulleyGroup = new THREE.Group();
    const butterflyMeshes: THREE.Mesh[] = [];
    const beltX = -blockLen / 2 - 0.345;

    if (inductionStyle === 'blower_671') {
      // UNVERIFIED: Weiand 6-71 Roots supercharger housing, one-piece bolted billet manifold & dual-bore scoop
      // dimensions are modelled as a design concept from reference 01, 02 & 04 (matches EngineBlockView Flows tab).
      const manBaseGeo = trackGeo(new THREE.BoxGeometry(headLen * 0.9, 0.16, 0.68 * bankScale));
      const manBase = new THREE.Mesh(manBaseGeo, placeholderMat);
      manBase.position.set(0, -0.14, 0);
      setEngineFinish(manBase, 'polished_billet');
      intakeGroup.add(manBase);

      // Straight-cut paired intake runners (E-I-I-E-E-I-I-E paired inlet alignment)
      const runnerGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.13, 0.24 * bankScale));
      const runnerOffsets =
        perBank === 4
          ? [boreXs[0] + 0.14, boreXs[1] - 0.08, boreXs[2] + 0.08, boreXs[3] - 0.14]
          : boreXs;
      [-1, 1].forEach((side) => {
        runnerOffsets.forEach((rx) => {
          const runner = new THREE.Mesh(runnerGeo, placeholderMat);
          runner.position.set(rx, -0.16, side * 0.36 * bankScale);
          runner.rotation.x = side * 0.32;
          setEngineFinish(runner, 'polished_billet');
          intakeGroup.add(runner);
        });
      });

      // Bolted manifold perimeter flange & socket bolts
      const manBoltInst = new THREE.InstancedMesh(smallBoltGeo, placeholderMat, 12);
      for (let i = 0; i < 6; i++) {
        const bx = -headLen * 0.4 + (i / 5) * (headLen * 0.8);
        [-1, 1].forEach((side, sIdx) => {
          dummy.position.set(bx, -0.06, side * 0.31 * bankScale);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          manBoltInst.setMatrixAt(i * 2 + sIdx, dummy.matrix);
        });
      }
      manBoltInst.instanceMatrix.needsUpdate = true;
      manBoltInst.computeBoundingSphere();
      setDetailKind(manBoltInst, 'black_oxide');
      intakeGroup.add(manBoltInst);

      // Polished aluminum twin-lobe finned Roots 6-71 supercharger housing
      const blowerCoreGeo = trackGeo(new THREE.BoxGeometry(headLen * 0.76, 0.34, 0.48));
      const blowerCore = new THREE.Mesh(blowerCoreGeo, placeholderMat);
      blowerCore.position.set(0.02, 0.11, 0);
      setEngineFinish(blowerCore, 'polished_billet');
      intakeGroup.add(blowerCore);

      const lobeCylGeo = trackGeo(new THREE.CylinderGeometry(0.155, 0.155, headLen * 0.74, 24));
      lobeCylGeo.rotateZ(Math.PI / 2);
      [-0.125, 0.125].forEach((lz) => {
        const lobe = new THREE.Mesh(lobeCylGeo, placeholderMat);
        lobe.position.set(0.02, 0.11, lz);
        setEngineFinish(lobe, 'polished_billet');
        intakeGroup.add(lobe);
      });

      // Machined horizontal cooling ribs wrapping blower case
      const finRibGeo = trackGeo(new THREE.BoxGeometry(headLen * 0.72, 0.018, 0.54));
      for (let f = 0; f < 6; f++) {
        const fin = new THREE.Mesh(finRibGeo, placeholderMat);
        fin.position.set(0.02, -0.01 + f * 0.048, 0);
        setEngineFinish(fin, 'polished_billet');
        intakeGroup.add(fin);
      }

      // Bolted front & rear blower end plates + anodized pulley flange bolts
      const endPlateGeo = trackGeo(new THREE.BoxGeometry(0.055, 0.38, 0.54));
      [-headLen * 0.38 + 0.02, headLen * 0.38 + 0.02].forEach((ex) => {
        const ep = new THREE.Mesh(endPlateGeo, placeholderMat);
        ep.position.set(ex, 0.11, 0);
        setEngineFinish(ep, 'polished_billet');
        intakeGroup.add(ep);
      });

      // Fluted front blower snout housing extending forward to drive belt plane
      const snoutStart = -headLen * 0.38;
      const snoutEnd = beltX + 0.04;
      const snoutLen = Math.max(0.28, snoutStart - snoutEnd);
      const snoutGeo = trackGeo(new THREE.CylinderGeometry(0.088, 0.115, snoutLen, 20));
      snoutGeo.rotateZ(Math.PI / 2);
      const snoutMesh = new THREE.Mesh(snoutGeo, placeholderMat);
      snoutMesh.position.set(snoutEnd + snoutLen * 0.5, 0.11, 0);
      setEngineFinish(snoutMesh, 'polished_billet');
      intakeGroup.add(snoutMesh);

      // Rotating Blower Drive Pulley at belt plane (spins proportional to crank!)
      blowerPulleyGroup.position.set(beltX, 0.11, 0);
      const bPulleyGeo = trackGeo(createGearGeometry(0.185, 32, 0.075, 0, 0.06, 'x'));
      const bPulleyMesh = new THREE.Mesh(bPulleyGeo, placeholderMat);
      setEngineFinish(bPulleyMesh, 'polished_billet');
      blowerPulleyGroup.add(bPulleyMesh);
      const bPulleyHub = new THREE.Mesh(hexBoltGeo, placeholderMat);
      bPulleyHub.rotation.z = Math.PI / 2;
      bPulleyHub.position.set(-0.045, 0, 0);
      bPulleyHub.scale.set(1.4, 1.4, 1.4);
      setDetailKind(bPulleyHub, 'black_oxide');
      blowerPulleyGroup.add(bPulleyHub);
      intakeGroup.add(blowerPulleyGroup);

      // Dual-Bore Shotgun / Bug-Catcher Billet Scoop + Red Butterfly Throttle Plates
      const scoopBaseGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.055, 0.42));
      const scoopBase = new THREE.Mesh(scoopBaseGeo, placeholderMat);
      scoopBase.position.set(0, 0.31, 0);
      setEngineFinish(scoopBase, 'polished_billet');
      intakeGroup.add(scoopBase);

      const scoopBodyGeo = trackGeo(new THREE.BoxGeometry(0.56, 0.24, 0.44));
      const scoopBody = new THREE.Mesh(scoopBodyGeo, placeholderMat);
      scoopBody.position.set(-0.04, 0.45, 0);
      setEngineFinish(scoopBody, 'polished_billet');
      intakeGroup.add(scoopBody);

      const boreTunnelGeo = trackGeo(createHollowCylinderGeometry(0.095, 0.076, 0.18, 20, 'x', 0.005));
      const butterflyGeo = trackGeo(new THREE.CylinderGeometry(0.072, 0.072, 0.008, 16));
      butterflyGeo.rotateZ(Math.PI / 2);
      [-0.105, 0.105].forEach((bz) => {
        const bezel = new THREE.Mesh(boreTunnelGeo, placeholderMat);
        bezel.position.set(-0.34, 0.46, bz);
        setEngineFinish(bezel, 'polished_billet');
        intakeGroup.add(bezel);

        const disc = new THREE.Mesh(butterflyGeo, placeholderMat);
        disc.position.set(-0.37, 0.46, bz);
        setDetailKind(disc, 'anodized_red');
        butterflyMeshes.push(disc);
        intakeGroup.add(disc);
      });

      tagPart(intakeGroup, 'wings', 'Weiand 6-71 Finned Billet Blower, One-Piece Manifold & Dual-Bore Scoop (Concept)', 'WEIAND-671-7587P', 10, new THREE.Vector3(0, 1.9, 0));
      parts.push(intakeGroup);
      selectableMeshes.push(blowerCore);
      blowerCore.userData = intakeGroup.userData;
      root.add(intakeGroup);
    } else {
      // Cross-Ram Carbon Intake Plenum + Machined Base Runners + 8 Velocity Stacks + Red Anodized Fuel Rails
      const intakeBaseGeo = trackGeo(new THREE.BoxGeometry(headLen * 0.88, 0.12, 0.62 * bankScale));
      const intakeBase = new THREE.Mesh(intakeBaseGeo, placeholderMat);
      intakeBase.position.set(0, -0.08, 0);
      setEngineFinish(intakeBase, 'polished_billet');
      intakeGroup.add(intakeBase);

      const plenumGeo = trackGeo(new THREE.BoxGeometry(headLen * 0.84, 0.26, 0.76 * bankScale));
      const plenumMesh = new THREE.Mesh(plenumGeo, placeholderMat);
      plenumMesh.position.set(0, 0.2, 0);
      intakeGroup.add(plenumMesh);

      const stackGeo = trackGeo(createHollowCylinderGeometry(0.068, 0.052, 0.16, 18, 'y', 0.008));
      const fuelRailGeo = trackGeo(new THREE.CylinderGeometry(0.026, 0.026, headLen * 0.82, 12));
      fuelRailGeo.rotateZ(Math.PI / 2);
      const injectorGeo = trackGeo(new THREE.CylinderGeometry(0.018, 0.014, 0.11, 10));

      [-0.21, 0.21].forEach((rz) => {
        const rail = new THREE.Mesh(fuelRailGeo, placeholderMat);
        rail.position.set(0, 0.06, rz * bankScale);
        setDetailKind(rail, 'anodized_red');
        intakeGroup.add(rail);

        boreXs.forEach((bx) => {
          const stack = new THREE.Mesh(stackGeo, placeholderMat);
          stack.position.set(bx, 0.38, rz * bankScale);
          setDetailKind(stack, 'chrome_shaft');
          intakeGroup.add(stack);

          const inj = new THREE.Mesh(injectorGeo, placeholderMat);
          inj.position.set(bx, 0, rz * 1.15 * bankScale);
          inj.rotation.x = Math.sign(rz) * 0.35;
          setDetailKind(inj, 'viton_seal');
          intakeGroup.add(inj);
        });
      });

      const tbGeo = trackGeo(createHollowCylinderGeometry(0.11, 0.088, 0.16, 20, 'x', 0.008));
      const tbMesh = new THREE.Mesh(tbGeo, placeholderMat);
      tbMesh.position.set(-headLen * 0.48, 0.2, 0);
      setDetailKind(tbMesh, 'chrome_shaft');
      intakeGroup.add(tbMesh);

      const tbDiscGeo = trackGeo(new THREE.CylinderGeometry(0.082, 0.082, 0.008, 16));
      tbDiscGeo.rotateZ(Math.PI / 2);
      const tbDisc = new THREE.Mesh(tbDiscGeo, placeholderMat);
      tbDisc.position.set(-headLen * 0.52, 0.2, 0);
      setDetailKind(tbDisc, 'anodized_red');
      butterflyMeshes.push(tbDisc);
      intakeGroup.add(tbDisc);

      tagPart(intakeGroup, 'wings', 'Cross-Ram Carbon Intake, Billet Fuel Rails & Velocity Stacks', 'SBC-INT-CR', 8, new THREE.Vector3(0, 1.85, 0));
      parts.push(intakeGroup);
      selectableMeshes.push(plenumMesh);
      plenumMesh.userData = intakeGroup.userData;
      root.add(intakeGroup);
    }

    // 6. Ribbed Polished Billet Alternator & Drive Belt Loop (mounted front-left on block)
    const altGroup = new THREE.Group();
    const altY = crankCenterY + 0.44;
    const altZ = -0.58 * bankScale;
    const altPulleyGroup = new THREE.Group();
    altPulleyGroup.position.set(beltX, altY, altZ);

    const altBracketGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.06, 0.34));
    const altBracket = new THREE.Mesh(altBracketGeo, placeholderMat);
    altBracket.position.set(-blockLen / 2 - 0.16, altY - 0.08, altZ * 0.72);
    setEngineFinish(altBracket, 'polished_billet');
    altGroup.add(altBracket);

    const altBodyGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.28, 22));
    altBodyGeo.rotateZ(Math.PI / 2);
    const altBody = new THREE.Mesh(altBodyGeo, placeholderMat);
    altBody.position.set(beltX + 0.22, altY, altZ);
    setEngineFinish(altBody, 'polished_billet');
    altGroup.add(altBody);

    // Alternator cooling ribs & copper winding peek slots
    const altCorePeekGeo = trackGeo(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 20));
    altCorePeekGeo.rotateZ(Math.PI / 2);
    const altCore = new THREE.Mesh(altCorePeekGeo, placeholderMat);
    altCore.position.set(beltX + 0.18, altY, altZ);
    setEngineFinish(altCore, 'copper_coil');
    altGroup.add(altCore);

    const altPulleyGeo = trackGeo(new THREE.CylinderGeometry(0.085, 0.085, 0.055, 20));
    altPulleyGeo.rotateZ(Math.PI / 2);
    const altPulleyMesh = new THREE.Mesh(altPulleyGeo, placeholderMat);
    altPulleyGroup.add(altPulleyMesh);
    setEngineFinish(altPulleyMesh, 'polished_billet');
    const altNut = new THREE.Mesh(hexBoltGeo, placeholderMat);
    altNut.rotation.z = Math.PI / 2;
    altNut.position.set(-0.032, 0, 0);
    setDetailKind(altNut, 'black_oxide');
    altPulleyGroup.add(altNut);
    altGroup.add(altPulleyGroup);

    // Closed-loop ribbed drive belt connecting Crank Pulley -> Alternator -> Blower Snout (if blower active)
    const beltPts =
      inductionStyle === 'blower_671'
        ? [
            new THREE.Vector3(beltX, crankCenterY - 0.21, 0),
            new THREE.Vector3(beltX, crankCenterY + 0.08, 0.22),
            new THREE.Vector3(beltX, crankCenterY + 1.05 + 0.14, 0.14),
            new THREE.Vector3(beltX, crankCenterY + 1.05 + 0.18, -0.06),
            new THREE.Vector3(beltX, altY + 0.06, altZ - 0.06),
            new THREE.Vector3(beltX, crankCenterY - 0.08, -0.2),
          ]
        : [
            new THREE.Vector3(beltX, crankCenterY - 0.2, 0.05),
            new THREE.Vector3(beltX, crankCenterY + 0.18, 0.16),
            new THREE.Vector3(beltX, altY + 0.085, altZ),
            new THREE.Vector3(beltX, altY - 0.06, altZ - 0.08),
            new THREE.Vector3(beltX, crankCenterY - 0.14, -0.16),
          ];
    const beltCurve = new THREE.CatmullRomCurve3(beltPts, true);
    const beltGeo = trackGeo(new THREE.TubeGeometry(beltCurve, 44, 0.022, 8, true));
    const beltMesh = new THREE.Mesh(beltGeo, placeholderMat);
    setDetailKind(beltMesh, 'viton_seal');
    altGroup.add(beltMesh);

    tagPart(altGroup, 'internal', 'Ribbed Billet Alternator & Front Drive Belt', 'SBC-ALT-BIL', 4, new THREE.Vector3(-1.2, 0.4, -1.2));
    parts.push(altGroup);
    selectableMeshes.push(altBody);
    altBody.userData = altGroup.userData;
    root.add(altGroup);

    // 7. Forged 4340 Crankshaft, Magnetic Harmonic Balancer + 60-2 Trigger Wheel, Billet Flywheel + 64T Starter Ring Gear
    const crankGroup = new THREE.Group();
    crankGroup.position.set(0, crankCenterY, 0);

    // Main journal spine (Ø62.20 mm scaled ~0.134 radius)
    const crankCoreGeo = trackGeo(new THREE.CylinderGeometry(0.132, 0.132, blockLen + 0.56, 24));
    crankCoreGeo.rotateZ(Math.PI / 2);
    const crankMesh = new THREE.Mesh(crankCoreGeo, placeholderMat);
    setDetailKind(crankMesh, 'chrome_shaft');
    crankGroup.add(crankMesh);

    // Rotating Magnetic Harmonic Balancer + Segmented Magnet Blocks + 60-2 Trigger Wheel + Crank Pulley (Reference 05)
    // UNVERIFIED: Balancer outer ring OD, magnet count/dims, 60-2 trigger wheel OD & pulley groove profile are look proportions from reference 05.
    const damperX = -blockLen / 2 - 0.21;
    const crankHubGeo = trackGeo(new THREE.CylinderGeometry(0.148, 0.148, 0.15, 28));
    crankHubGeo.rotateZ(Math.PI / 2);
    const crankHub = new THREE.Mesh(crankHubGeo, placeholderMat);
    crankHub.position.set(damperX - 0.01, 0, 0);
    setDetailKind(crankHub, 'chrome_shaft');
    crankGroup.add(crankHub);

    // Outer rotating harmonic balancer ring surrounding stationary stator coils (clean air gap!)
    const balRingGeo = trackGeo(createHollowCylinderGeometry(0.345, 0.272, 0.11, 32, 'x', 0.006));
    const balRing = new THREE.Mesh(balRingGeo, placeholderMat);
    balRing.position.set(damperX, 0, 0);
    setEngineFinish(balRing, 'polished_billet');
    crankGroup.add(balRing);

    // 12 Internal Super-Magnet Blocks orbiting outside copper coils
    const magBlockGeo = trackGeo(new THREE.BoxGeometry(0.085, 0.042, 0.058));
    const magInst = new THREE.InstancedMesh(magBlockGeo, placeholderMat, 12);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      dummy.position.set(damperX + 0.005, Math.cos(a) * 0.258, Math.sin(a) * 0.258);
      dummy.rotation.set(a, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      magInst.setMatrixAt(i, dummy.matrix);
    }
    magInst.instanceMatrix.needsUpdate = true;
    magInst.computeBoundingSphere();
    setDetailKind(magInst, 'black_oxide');
    crankGroup.add(magInst);

    // Front balancer retaining spider plate + 6 hub-flange bolts
    const hubFlangeGeo = trackGeo(createHollowCylinderGeometry(0.34, 0.12, 0.022, 28, 'x', 0.003));
    const hubFlange = new THREE.Mesh(hubFlangeGeo, placeholderMat);
    hubFlange.position.set(damperX - 0.062, 0, 0);
    setEngineFinish(hubFlange, 'polished_billet');
    crankGroup.add(hubFlange);

    const hubBolts = new THREE.InstancedMesh(smallBoltGeo, placeholderMat, 6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      dummy.position.set(damperX - 0.078, Math.cos(a) * 0.115, Math.sin(a) * 0.115);
      dummy.rotation.set(a, 0, Math.PI / 2);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      hubBolts.setMatrixAt(i, dummy.matrix);
    }
    hubBolts.instanceMatrix.needsUpdate = true;
    hubBolts.computeBoundingSphere();
    setDetailKind(hubBolts, 'black_oxide');
    crankGroup.add(hubBolts);

    // 60-2 Crank Trigger Wheel (58 teeth + 2 missing teeth)
    const triggerWheelGeo = trackGeo(createTriggerWheel60Minus2Geometry(0.365, 0.22, 0.018));
    const triggerWheel = new THREE.Mesh(triggerWheelGeo, placeholderMat);
    triggerWheel.position.set(damperX - 0.088, 0, 0);
    setDetailKind(triggerWheel, 'black_oxide');
    crankGroup.add(triggerWheel);

    // Multi-Rib Crankshaft Drive Pulley aligned with beltX
    const crankPulleyGeo = trackGeo(createHollowCylinderGeometry(0.215, 0.08, 0.068, 28, 'x', 0.005));
    const crankPulley = new THREE.Mesh(crankPulleyGeo, placeholderMat);
    crankPulley.position.set(beltX, 0, 0);
    setEngineFinish(crankPulley, 'polished_billet');
    crankGroup.add(crankPulley);

    const crankBolt = new THREE.Mesh(hexBoltGeo, placeholderMat);
    crankBolt.rotation.z = Math.PI / 2;
    crankBolt.position.set(beltX - 0.04, 0, 0);
    crankBolt.scale.set(1.65, 1.65, 1.65);
    setDetailKind(crankBolt, 'black_oxide');
    crankGroup.add(crankBolt);

    // Rear Billet Flywheel + Friction Face + Toothed Starter Ring Gear + 6 Crank Flange Bolts
    const flywheelX = blockLen / 2 + 0.17;
    const flywheelGeo = trackGeo(new THREE.CylinderGeometry(0.56, 0.56, 0.09, 36));
    flywheelGeo.rotateZ(Math.PI / 2);
    const flywheelMesh = new THREE.Mesh(flywheelGeo, placeholderMat);
    flywheelMesh.position.set(flywheelX, 0, 0);
    setEngineFinish(flywheelMesh, 'polished_billet');
    crankGroup.add(flywheelMesh);

    const frictionRingGeo = trackGeo(createHollowCylinderGeometry(0.52, 0.22, 0.024, 32, 'x'));
    const frictionRing = new THREE.Mesh(frictionRingGeo, placeholderMat);
    frictionRing.position.set(flywheelX + 0.048, 0, 0);
    setDetailKind(frictionRing, 'chrome_shaft');
    crankGroup.add(frictionRing);

    const ringGearGeo = trackGeo(createGearGeometry(0.585, 64, 0.055, 0, 0.54, 'x'));
    const ringGearMesh = new THREE.Mesh(ringGearGeo, placeholderMat);
    ringGearMesh.position.set(flywheelX - 0.015, 0, 0);
    setDetailKind(ringGearMesh, 'black_oxide');
    crankGroup.add(ringGearMesh);

    const fwBolts = new THREE.InstancedMesh(hexBoltGeo, placeholderMat, 6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      dummy.position.set(flywheelX + 0.055, Math.cos(a) * 0.14, Math.sin(a) * 0.14);
      dummy.rotation.set(a, 0, -Math.PI / 2);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      fwBolts.setMatrixAt(i, dummy.matrix);
    }
    fwBolts.instanceMatrix.needsUpdate = true;
    fwBolts.computeBoundingSphere();
    setDetailKind(fwBolts, 'black_oxide');
    crankGroup.add(fwBolts);

    // 18T Crank Timing Sprocket (spins with crank -> meshes 2:1 with 36T cam sprocket)
    const camCenterY = crankCenterY + 0.49; // 4.521 in standard SBC center dist (~0.497 units)
    const crankSprocketX = -blockLen / 2 - 0.01;
    const crankSprocketGeo = trackGeo(createGearGeometry(0.14, 18, 0.06, 0, 0.06, 'x'));
    const crankSprocket = new THREE.Mesh(crankSprocketGeo, placeholderMat);
    crankSprocket.position.set(crankSprocketX, 0, 0);
    setDetailKind(crankSprocket, 'black_oxide');
    crankGroup.add(crankSprocket);

    animatedSpinners.push(crankGroup);
    tagPart(crankGroup, 'internal', 'Forged 4340 Crankshaft, Magnetic Harmonic Balancer, 60-2 Trigger & 64T Flywheel', 'SCAT-43503480-TI', 12, new THREE.Vector3(-1.65, 0, 0));
    parts.push(crankGroup);
    selectableMeshes.push(flywheelMesh);
    flywheelMesh.userData = crankGroup.userData;
    root.add(crankGroup);

    // 8. Camshaft (Ø47.47 mm scaled) turning at EXACT cam = crank × 0.5 + 36T Cam Sprocket (in Cammed OHV mode)
    const camGroup = new THREE.Group();
    camGroup.position.set(0, camCenterY, 0);

    if (headVariant === 'cammed_ohv') {
      const camShaftGeo = trackGeo(new THREE.CylinderGeometry(0.075, 0.075, blockLen * 0.94, 18));
      camShaftGeo.rotateZ(Math.PI / 2);
      const camShaftMesh = new THREE.Mesh(camShaftGeo, placeholderMat);
      setDetailKind(camShaftMesh, 'chrome_shaft');
      camGroup.add(camShaftMesh);

      const camSprocketGeo = trackGeo(createGearGeometry(0.24, 36, 0.055, 0, 0.075, 'x'));
      const camSprocket = new THREE.Mesh(camSprocketGeo, placeholderMat);
      camSprocket.position.set(crankSprocketX, 0, 0);
      setDetailKind(camSprocket, 'black_oxide');
      camGroup.add(camSprocket);

      // UNVERIFIED: Cam lobe base-circle radius, asymmetric ramp flanks, lobe width & lobe separation phasing are visual ellipses (1.38 x 0.96);
      // needs Crower 00980 cam card (intake/exhaust lobe lift, duration @ 0.050", LSA 114°, base-circle diameter, lobe width & journal spacing).
      const camLobeGeo = trackGeo(new THREE.CylinderGeometry(0.088, 0.088, 0.036, 16));
      camLobeGeo.rotateZ(Math.PI / 2);
      camLobeGeo.scale(1, 1.38, 0.96);
      boreXs.forEach((bx, idx) => {
        [-0.07, 0.07].forEach((off, lIdx) => {
          const lobe = new THREE.Mesh(camLobeGeo, placeholderMat);
          lobe.position.set(bx + off, 0, 0);
          lobe.rotation.x = (idx * 90 + lIdx * 110) * (Math.PI / 180);
          setDetailKind(lobe, 'chrome_shaft');
          camGroup.add(lobe);
        });
      });

      tagPart(camGroup, 'internal', 'Crower Billet Roller Camshaft (2:1 Timing Drive)', 'CMP-08-432-8-BIL', 5, new THREE.Vector3(-1.35, 0.5, 0));
      parts.push(camGroup);
      selectableMeshes.push(camSprocket);
      camSprocket.userData = camGroup.userData;
      root.add(camGroup);
    }

    // 9. Live Engine Kinematics — Honed Pistons with 3 Rings & Floating Wrist Pins, Articulated Forged Rods + Big-End Caps/Bolts, Valves + Compressing Springs + Rockers (or Solenoid Plungers)
    if (perBank >= 2 && perBank <= 6 && v8BankGroups.length === 2 && v8HeadGroups.length === 2) {
      const CYL_COUNT = perBank * 2;
      const LEFT_CYLS = Array.from({ length: perBank }, (_, i) => 2 * i + 1);
      const RIGHT_CYLS = Array.from({ length: perBank }, (_, i) => 2 * i + 2);

      root.updateMatrixWorld(true);

      interface PistonRig {
        group: THREE.Group;
        phase: number;
      }
      interface ValveRig {
        group: THREE.Group;
        springGroup: THREE.Group;
        rockerMesh?: THREE.Mesh;
        cylinder: number;
        which: 'intake' | 'exhaust';
        side: number;
      }
      interface RodRig {
        shankMesh: THREE.Mesh;
        bigEndGroup: THREE.Group;
        smallEndGroup: THREE.Group;
        pistonGroup: THREE.Group;
        pinLocal: THREE.Vector3;
      }
      const pistons: PistonRig[] = [];
      const valves: ValveRig[] = [];
      const rods: RodRig[] = [];

      // Precision piston components
      const pistonCrownGeo = trackGeo(new THREE.CylinderGeometry(safePistonR, safePistonR, COMP_HEIGHT_U, 24));
      const pistonSkirtGeo = trackGeo(new THREE.CylinderGeometry(safePistonR * 0.98, safePistonR * 0.95, 0.14, 24, 1, true));
      const compRingGeo = trackGeo(new THREE.TorusGeometry(safePistonR * 1.015, 0.009, 8, 24));
      compRingGeo.rotateX(Math.PI / 2);
      const wristPinGeo = trackGeo(createHollowCylinderGeometry(0.056, 0.032, safePistonR * 1.62, 16, 'x'));

      // Precision articulated connecting rod components
      const rodShankGeo = trackGeo(new THREE.BoxGeometry(0.042, 1, 0.088));
      const bigEndBoreGeo = trackGeo(createHollowCylinderGeometry(0.132, 0.095, 0.092, 22, 'x', 0.006));
      const bigEndBrgGeo = trackGeo(createHollowCylinderGeometry(0.095, 0.078, 0.098, 20, 'x'));
      const smallEndGeo = trackGeo(createHollowCylinderGeometry(0.076, 0.056, 0.088, 18, 'x', 0.005));
      const smallBushGeo = trackGeo(createHollowCylinderGeometry(0.056, 0.044, 0.092, 16, 'x'));

      // Valve & counterweight geometries
      const valveStemGeo = trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.36, 10));
      const valveHeadGeo = trackGeo(new THREE.CylinderGeometry(0.088, 0.032, 0.026, 18));
      const pinGeo = trackGeo(new THREE.CylinderGeometry(0.074, 0.074, 0.25, 16));
      pinGeo.rotateZ(Math.PI / 2);
      const counterweightGeo = trackGeo(new THREE.CylinderGeometry(0.29, 0.25, 0.055, 18, 1, false, -0.8, 1.6));
      counterweightGeo.rotateZ(Math.PI / 2);

      const upAxis = new THREE.Vector3(0, 1, 0);
      const tmpP = new THREE.Vector3();
      const tmpQ = new THREE.Vector3();
      const tmpDir = new THREE.Vector3();
      const tmpQuat = new THREE.Quaternion();

      [0, 1].forEach((bankIdx) => {
        const side = bankIdx === 0 ? -1 : 1;
        const bankGroup = v8BankGroups[bankIdx];
        const headGroup = v8HeadGroups[bankIdx];
        const cyls = side === -1 ? LEFT_CYLS : RIGHT_CYLS;

        for (let i = 0; i < perBank; i++) {
          const cyl = cyls[i];
          const bx = boreXs[i];
          const phase = phaseForCylinder(CYL_COUNT, cyl);

          // 1. Machined Forged Piston + 3 Rings + Floating 4340 Wrist Pin
          const pGroup = new THREE.Group();
          pGroup.position.set(bx, pinHeightInForThrow(-phase, liveThrowIn) * KIN_SCALE, 0);

          const crown = new THREE.Mesh(pistonCrownGeo, placeholderMat);
          crown.position.y = COMP_HEIGHT_U * 0.5;
          crown.userData.customMaterialId = 'al_7075';
          pGroup.add(crown);

          const skirt = new THREE.Mesh(pistonSkirtGeo, placeholderMat);
          skirt.position.y = -0.055;
          skirt.userData.customMaterialId = 'al_7075';
          pGroup.add(skirt);

          [COMP_HEIGHT_U * 0.82, COMP_HEIGHT_U * 0.62, COMP_HEIGHT_U * 0.42].forEach((ry, rIdx) => {
            const ring = new THREE.Mesh(compRingGeo, placeholderMat);
            ring.position.y = ry;
            setDetailKind(ring, rIdx === 0 ? 'chrome_shaft' : 'black_oxide');
            pGroup.add(ring);
          });

          const wPin = new THREE.Mesh(wristPinGeo, placeholderMat);
          setDetailKind(wPin, 'chrome_shaft');
          pGroup.add(wPin);

          bankGroup.add(pGroup);
          pistons.push({ group: pGroup, phase });

          // 2. Intake & Exhaust Valves + Stacked Helical Valve Springs + Retainers (+ Roller Rockers in Cammed OHV)
          (['intake', 'exhaust'] as const).forEach((which) => {
            const vz = which === 'intake' ? -0.125 : 0.125;
            const xOffset = headVariant === 'camless_billet' ? (vz < 0 ? -0.045 : 0.045) : 0;
            const valve = new THREE.Group();
            const stem = new THREE.Mesh(valveStemGeo, placeholderMat);
            stem.position.y = 0.04;
            setDetailKind(stem, 'chrome_shaft');
            const vHead = new THREE.Mesh(valveHeadGeo, placeholderMat);
            vHead.position.y = -0.15;
            setDetailKind(vHead, 'chrome_shaft');
            const retainer = new THREE.Mesh(retainerGeo, placeholderMat);
            retainer.position.y = 0.21;
            retainer.userData.customMaterialId = 'ti_6al4v';
            valve.add(stem, vHead, retainer);
            valve.position.set(bx + xOffset, VALVE_BASE_Y, vz);
            headGroup.add(valve);

            const springGroup = new THREE.Group();
            springGroup.position.set(bx + xOffset, VALVE_SEAT_Y + 0.24, vz);
            for (let c = 0; c < 4; c++) {
              const coil = new THREE.Mesh(springCoilGeo, placeholderMat);
              coil.position.y = c * 0.036;
              setDetailKind(coil, headVariant === 'camless_billet' ? 'chrome_shaft' : 'black_oxide');
              springGroup.add(coil);
            }
            headGroup.add(springGroup);

            let rockerMesh: THREE.Mesh | undefined;
            if (headVariant === 'cammed_ohv') {
              const rocker = new THREE.Mesh(rockerArmGeo, placeholderMat);
              rocker.position.set(bx, VALVE_SEAT_Y + 0.43, vz * 0.65);
              rocker.userData.customMaterialId = 'al_7075';
              headGroup.add(rocker);
              rockerMesh = rocker;
            }

            valves.push({ group: valve, springGroup, rockerMesh, cylinder: cyl, which, side });
          });

          // 3. Crankpin + Opposed Forged Counterweight (children of crankGroup)
          const alpha0 = side * vHalfAngle - (phase * Math.PI) / 180;
          const pinLocal = new THREE.Vector3(bx + side * 0.055, PIN_R * Math.cos(alpha0), PIN_R * Math.sin(alpha0));

          const pin = new THREE.Mesh(pinGeo, placeholderMat);
          setDetailKind(pin, 'chrome_shaft');
          pin.position.copy(pinLocal);
          crankGroup.add(pin);

          const cw = new THREE.Mesh(counterweightGeo, placeholderMat);
          cw.userData.customMaterialId = 'forged_4340';
          cw.position.set(pinLocal.x - side * 0.09, 0, 0);
          cw.rotation.x = alpha0 + Math.PI;
          crankGroup.add(cw);

          // 4. Articulated Forged H-Beam Connecting Rod
          const rodShank = new THREE.Mesh(rodShankGeo, placeholderMat);
          rodShank.userData.customMaterialId = 'forged_4340';
          root.add(rodShank);
          kinematicRootObjects.push(rodShank);

          const bigEndGroup = new THREE.Group();
          const beHousing = new THREE.Mesh(bigEndBoreGeo, placeholderMat);
          beHousing.userData.customMaterialId = 'forged_4340';
          const beBrg = new THREE.Mesh(bigEndBrgGeo, placeholderMat);
          setDetailKind(beBrg, 'bronze_bearing');
          const beBolt1 = new THREE.Mesh(smallBoltGeo, placeholderMat);
          beBolt1.rotation.z = Math.PI;
          beBolt1.position.set(0, -0.13, -0.098);
          setDetailKind(beBolt1, 'black_oxide');
          const beBolt2 = new THREE.Mesh(smallBoltGeo, placeholderMat);
          beBolt2.rotation.z = Math.PI;
          beBolt2.position.set(0, -0.13, 0.098);
          setDetailKind(beBolt2, 'black_oxide');
          bigEndGroup.add(beHousing, beBrg, beBolt1, beBolt2);
          root.add(bigEndGroup);
          kinematicRootObjects.push(bigEndGroup);

          const smallEndGroup = new THREE.Group();
          const seEye = new THREE.Mesh(smallEndGeo, placeholderMat);
          seEye.userData.customMaterialId = 'forged_4340';
          const seBush = new THREE.Mesh(smallBushGeo, placeholderMat);
          setDetailKind(seBush, 'bronze_bearing');
          smallEndGroup.add(seEye, seBush);
          root.add(smallEndGroup);
          kinematicRootObjects.push(smallEndGroup);

          rods.push({ shankMesh: rodShank, bigEndGroup, smallEndGroup, pistonGroup: pGroup, pinLocal });
        }
      });

      crankGroup.userData.engineCrank = true;

      updateEngineKinematics = (crankDeg: number) => {
        lastCrankAngleDeg = crankDeg;
        const crankRad = (crankDeg * Math.PI) / 180;
        crankGroup.rotation.x = crankRad;
        camGroup.rotation.x = (camAngleDeg(crankDeg) * Math.PI) / 180;
        altPulleyGroup.rotation.x = crankRad * 2.1;
        if (inductionStyle === 'blower_671') {
          blowerPulleyGroup.rotation.x = crankRad * 1.15;
        }

        for (const p of pistons) {
          p.group.position.y = pinHeightInForThrow(crankDeg - p.phase, liveThrowIn) * KIN_SCALE;
        }

        for (const v of valves) {
          const liftIn = valveLiftInFor(CYL_COUNT, crankDeg, v.cylinder, v.which);
          const lift = liftIn * KIN_SCALE;
          v.group.position.y = VALVE_BASE_Y - lift;
          const compressScale = Math.max(0.55, 1 - lift * 4.5);
          v.springGroup.scale.y = compressScale;
          if (v.rockerMesh) {
            v.rockerMesh.rotation.x = (v.which === 'intake' ? 1 : -1) * liftIn * 0.45;
          }
        }

        for (const r of rods) {
          r.pistonGroup.getWorldPosition(tmpP);
          root.worldToLocal(tmpP);
          tmpQ.copy(r.pinLocal);
          crankGroup.localToWorld(tmpQ);
          root.worldToLocal(tmpQ);

          tmpP.x = tmpQ.x;
          tmpDir.copy(tmpP).sub(tmpQ);
          const len = Math.max(tmpDir.length(), 0.001);
          const rodDir = tmpDir.clone().normalize();
          tmpQuat.setFromUnitVectors(upAxis, rodDir);

          r.shankMesh.position.copy(tmpQ).addScaledVector(tmpDir, 0.5);
          r.shankMesh.quaternion.copy(tmpQuat);
          r.shankMesh.scale.set(1, Math.max(0.05, len - 0.14), 1);

          r.bigEndGroup.position.copy(tmpQ);
          r.bigEndGroup.quaternion.copy(tmpQuat);

          r.smallEndGroup.position.copy(tmpP);
          r.smallEndGroup.quaternion.copy(tmpQuat);
        }
      };

      updateThrottle = (pct: number) => {
        const tilt = THREE.MathUtils.degToRad((Math.max(0, Math.min(100, pct)) / 100) * 82);
        for (const b of butterflyMeshes) {
          b.rotation.z = tilt;
        }
      };

      updateEngineKinematics(0);
      updateThrottle(0);
    }
  } else if (assemblyId === 'transmission_t56') {
    // =========================================================================
    // Tremec T-56 Magnum — 22° Helical Gear Teeth, 26/31-Spline Shafts,
    // SFI 6.1 Pilot Bore (Ø119.00 mm), Synchro Rings, Bearing Races & Cradle
    // =========================================================================
    const cy = 1.65;
    const lenScale = params.fuselageLengthM / 0.84;
    const bellR = (params.wingspanM / 0.44) * 0.92;
    const helixDeg = params.sweepDeg; // 22 deg default
    const gearCount = Math.max(6, Math.min(8, Math.round(params.ribDensity / 1.5)));
    const dummy = new THREE.Object3D();
    const hexBoltGeo = trackGeo(createHexFlangeBoltGeometry(0.022, 0.032));

    // 1. Grounded CNC Transmission Fixture + Cradle Arms supporting bellhousing & rear mount pad
    const fixtureGroup = new THREE.Group();
    const standGeo = trackGeo(new THREE.BoxGeometry(3.6 * lenScale, 0.12, 1.9));
    const standMesh = new THREE.Mesh(standGeo, placeholderMat);
    standMesh.position.set(0, 0.06, 0);
    fixtureGroup.add(standMesh);

    const frontStanchionGeo = trackGeo(new THREE.BoxGeometry(0.14, cy - bellR * 0.55, 0.72));
    const frontStanchion = new THREE.Mesh(frontStanchionGeo, placeholderMat);
    frontStanchion.position.set(-1.35 * lenScale, (cy - bellR * 0.55) / 2 + 0.12, 0);
    fixtureGroup.add(frontStanchion);

    const rearStanchionGeo = trackGeo(new THREE.BoxGeometry(0.18, cy - 0.34, 0.36));
    const rearStanchion = new THREE.Mesh(rearStanchionGeo, placeholderMat);
    rearStanchion.position.set(0.92 * lenScale, (cy - 0.34) / 2 + 0.12, 0);
    fixtureGroup.add(rearStanchion);

    tagPart(fixtureGroup, 'internal', 'Transmission Test Bench Fixture & Mount Stanchions', 'TRM-FIX-01', 6, new THREE.Vector3(0, -0.55, 0));
    parts.push(fixtureGroup);
    selectableMeshes.push(standMesh);
    standMesh.userData = fixtureGroup.userData;
    root.add(fixtureGroup);

    // 2. SFI 6.1 Hollow Bellhousing Dome + 6-Bolt SBC/LS Flange + Ø119.00 mm Pilot Collar + Dowel Pins
    const bellGroup = new THREE.Group();
    bellGroup.position.set(-1.35 * lenScale, cy, 0);

    const bellPts = [
      new THREE.Vector2(bellR * 1.04, -0.46 * lenScale),
      new THREE.Vector2(bellR * 0.96, -0.36 * lenScale),
      new THREE.Vector2(bellR * 0.78, 0.12 * lenScale),
      new THREE.Vector2(bellR * 0.58, 0.46 * lenScale),
    ];
    const bellShellGeo = trackGeo(new THREE.LatheGeometry(bellPts, 32));
    bellShellGeo.rotateZ(-Math.PI / 2);
    const bellMesh = new THREE.Mesh(bellShellGeo, placeholderMat);
    bellGroup.add(bellMesh);

    // Front SFI 6.1 mounting flange & bolt circle
    const flangeGeo = trackGeo(createHollowCylinderGeometry(bellR * 1.12, bellR * 0.72, 0.08, 32, 'x', 0.008));
    const bellFlange = new THREE.Mesh(flangeGeo, placeholderMat);
    bellFlange.position.set(-0.46 * lenScale, 0, 0);
    bellGroup.add(bellFlange);

    const bellBolts = new THREE.InstancedMesh(hexBoltGeo, placeholderMat, 6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      dummy.position.set(-0.505 * lenScale, Math.cos(a) * bellR * 0.96, Math.sin(a) * bellR * 0.96);
      dummy.rotation.set(a, 0, Math.PI / 2);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bellBolts.setMatrixAt(i, dummy.matrix);
    }
    bellBolts.instanceMatrix.needsUpdate = true;
    bellBolts.computeBoundingSphere();
    setDetailKind(bellBolts, 'black_oxide');
    bellGroup.add(bellBolts);

    // Ø119.00 mm SFI Pilot Bore collar & throwout sleeve
    const pilotGeo = trackGeo(createHollowCylinderGeometry(bellR * 0.34, bellR * 0.24, 0.24, 24, 'x', 0.005));
    const pilotMesh = new THREE.Mesh(pilotGeo, placeholderMat);
    pilotMesh.position.set(-0.18 * lenScale, 0, 0);
    setDetailKind(pilotMesh, 'chrome_shaft');
    bellGroup.add(pilotMesh);

    tagPart(bellGroup, 'wings', 'SFI 6.1 Bellhousing Flange, Pilot Bore & Bolts', 'TRM-BELL-61', 22, new THREE.Vector3(-1.35, 0, 0));
    parts.push(bellGroup);
    selectableMeshes.push(bellMesh);
    bellMesh.userData = bellGroup.userData;
    root.add(bellGroup);

    // 3. Ribbed 7075-T651 Main Gearbox Case + Case-to-Tail Seam Gasket + NPT Brass Plugs + Tailshaft Seal
    const caseGroup = new THREE.Group();
    caseGroup.position.set(-0.12 * lenScale, cy - 0.04, 0);

    const caseGeo = trackGeo(new THREE.BoxGeometry(1.55 * lenScale, 1.02 * bellR, 0.94 * bellR));
    const caseMesh = new THREE.Mesh(caseGeo, placeholderMat);
    caseGroup.add(caseMesh);

    // CNC cooling ribs along both case walls
    const ribGeo = trackGeo(new THREE.BoxGeometry(0.055, 0.94 * bellR, 1.03 * bellR));
    const ribInst = new THREE.InstancedMesh(ribGeo, placeholderMat, 7);
    for (let i = 0; i < 7; i++) {
      dummy.position.set(-0.54 * lenScale + (i / 6) * 1.08 * lenScale, 0, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ribInst.setMatrixAt(i, dummy.matrix);
    }
    ribInst.instanceMatrix.needsUpdate = true;
    ribInst.computeBoundingSphere();
    caseGroup.add(ribInst);

    // Side PTO / drain NPT brass plugs
    const plugGeo = trackGeo(createHexFlangeBoltGeometry(0.028, 0.036));
    const fillPlug = new THREE.Mesh(plugGeo, placeholderMat);
    fillPlug.rotation.x = Math.PI / 2;
    fillPlug.position.set(-0.2, 0.06, 0.51 * bellR);
    setDetailKind(fillPlug, 'brass_fitting');
    caseGroup.add(fillPlug);

    tagPart(caseGroup, 'airframe', '5-Axis Ribbed Main Gearbox Case & NPT Plugs', 'TUET-11009-CNC', 30, new THREE.Vector3(0, 0.45, 0));
    parts.push(caseGroup);
    selectableMeshes.push(caseMesh);
    caseMesh.userData = caseGroup.userData;
    root.add(caseGroup);

    const tailGroup = new THREE.Group();
    tailGroup.position.set(1.22 * lenScale, cy, 0);
    const tailGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.44 * bellR, 1.15 * lenScale, 24));
    tailGeo.rotateZ(-Math.PI / 2);
    const tailMesh = new THREE.Mesh(tailGeo, placeholderMat);
    tailGroup.add(tailMesh);

    // Tailhousing flange gasket + 8 perimeter bolts + rear Viton output shaft lip seal
    const tailFlangeGeo = trackGeo(createHollowCylinderGeometry(0.49 * bellR, 0.28, 0.07, 24, 'x', 0.005));
    const tailFlange = new THREE.Mesh(tailFlangeGeo, placeholderMat);
    tailFlange.position.set(-0.56 * lenScale, 0, 0);
    tailGroup.add(tailFlange);

    // UNVERIFIED: Tailhousing output shaft seal OD/ID/width (0.245/0.145 x 0.05) visually proportioned;
    // needs TREMEC T-56 tailhousing rear seal part number specs (extension housing bore OD, yoke barrel OD, seal width).
    const tailSealGeo = trackGeo(createHollowCylinderGeometry(0.245, 0.145, 0.05, 24, 'x'));
    const tailSeal = new THREE.Mesh(tailSealGeo, placeholderMat);
    tailSeal.position.set(0.57 * lenScale, 0, 0);
    setDetailKind(tailSeal, 'viton_seal');
    tailGroup.add(tailSeal);

    tagPart(tailGroup, 'airframe', 'Tapered Output Tailshaft Extension & Viton Lip Seal', 'TRM-TAIL-02', 12, new THREE.Vector3(1.2, 0, 0));
    parts.push(tailGroup);
    selectableMeshes.push(tailMesh);
    tailMesh.userData = tailGroup.userData;
    root.add(tailGroup);

    // 4. Billet Short-Throw Shift Tower, Rubber Boot, Chromoly Shifter Stalk & Shift Knob
    const towerGroup = new THREE.Group();
    towerGroup.position.set(1.05 * lenScale, cy + 0.4, 0);
    const towerGeo = trackGeo(new THREE.BoxGeometry(0.48, 0.24, 0.42));
    const towerMesh = new THREE.Mesh(towerGeo, placeholderMat);
    towerGroup.add(towerMesh);

    const bootGeo = trackGeo(new THREE.ConeGeometry(0.14, 0.16, 16));
    const bootMesh = new THREE.Mesh(bootGeo, placeholderMat);
    bootMesh.position.set(0, 0.18, 0);
    setDetailKind(bootMesh, 'viton_seal');
    towerGroup.add(bootMesh);

    const stalkGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.028, 0.44, 12));
    const stalkMesh = new THREE.Mesh(stalkGeo, placeholderMat);
    stalkMesh.position.set(-0.04, 0.36, 0);
    stalkMesh.rotation.z = 0.22;
    setDetailKind(stalkMesh, 'chrome_shaft');
    towerGroup.add(stalkMesh);

    const knobGeo = trackGeo(new THREE.SphereGeometry(0.075, 18, 16));
    const knobMesh = new THREE.Mesh(knobGeo, placeholderMat);
    knobMesh.position.set(-0.09, 0.58, 0);
    setDetailKind(knobMesh, 'black_oxide');
    towerGroup.add(knobMesh);

    tagPart(towerGroup, 'propulsion', 'Billet Short-Throw Shift Tower & Shifter Stalk', 'TRM-SHF-01', 10, new THREE.Vector3(0.4, 1.35, 0));
    parts.push(towerGroup);
    selectableMeshes.push(towerMesh);
    towerMesh.userData = towerGroup.userData;
    root.add(towerGroup);

    // 5. 26-Spline Input Shaft, 31-Spline Output Shaft, Tapered Bearing Races, Bronze Synchro Rings & True 22° Helical Gearsets
    const gearGroup = new THREE.Group();
    gearGroup.position.set(0, cy, 0);

    const mainShaftGeo = trackGeo(new THREE.CylinderGeometry(0.115, 0.115, 3.1 * lenScale, 20));
    mainShaftGeo.rotateZ(Math.PI / 2);
    const mainShaftMesh = new THREE.Mesh(mainShaftGeo, placeholderMat);
    setDetailKind(mainShaftMesh, 'chrome_shaft');
    gearGroup.add(mainShaftMesh);

    // 26-Spline Input Shaft (-X) + Pilot Tip
    const inSplineGeo = trackGeo(createSplinedShaftGeometry(0.145, 0.118, 26, 0.62 * lenScale, 'x'));
    const inSpline = new THREE.Mesh(inSplineGeo, placeholderMat);
    inSpline.position.set(-1.72 * lenScale, 0, 0);
    setDetailKind(inSpline, 'chrome_shaft');
    gearGroup.add(inSpline);

    // 31-Spline Output Yoke Shaft (+X)
    const outSplineGeo = trackGeo(createSplinedShaftGeometry(0.155, 0.125, 31, 0.58 * lenScale, 'x'));
    const outSpline = new THREE.Mesh(outSplineGeo, placeholderMat);
    outSpline.position.set(1.78 * lenScale, 0, 0);
    setDetailKind(outSpline, 'chrome_shaft');
    gearGroup.add(outSpline);

    // Countershaft centered at scaled 85.00 mm center distance (0.34 * bellR below mainshaft)
    const counterY = -0.34 * bellR;
    const counterShaftGeo = trackGeo(new THREE.CylinderGeometry(0.1, 0.1, 1.55 * lenScale, 16));
    counterShaftGeo.rotateZ(Math.PI / 2);
    const counterShaftMesh = new THREE.Mesh(counterShaftGeo, placeholderMat);
    counterShaftMesh.position.set(-0.12 * lenScale, counterY, 0);
    setDetailKind(counterShaftMesh, 'chrome_shaft');
    gearGroup.add(counterShaftMesh);

    // True Helical Gearsets + Bronze Synchronizer Blocker Rings + Roller Bearing Races
    const synchroGeo = trackGeo(createHollowCylinderGeometry(0.24 * bellR, 0.14, 0.04, 24, 'x'));
    // UNVERIFIED: Mainshaft tapered roller bearing OD/ID/width (0.24/0.15 x 0.09) & synchro ring OD/width visually scaled;
    // needs TREMEC T-56 Magnum service manual bearing cup/cone dimensions and synchronizer blocker ring dims.
    const bearingOuterGeo = trackGeo(createHollowCylinderGeometry(0.24, 0.15, 0.09, 24, 'x', 0.005));

    for (let i = 0; i < gearCount; i++) {
      const gx = (-0.68 + (i / Math.max(1, gearCount - 1)) * 1.15) * lenScale;
      const gScale = 0.68 + (1 - i / gearCount) * 0.48;
      const mPitchR = 0.28 * bellR * gScale;
      // UNVERIFIED: Transmission gear tooth counts (interpolated 18T–32T and 0.8x countershaft) & pitch radii are visual CAD proportions;
      // needs TREMEC T-56 Magnum factory gear tooth count table & module/diametral pitch per ratio (e.g., 2.66/1.78/1.30/1.00/0.80/0.63 + Reverse).
      const toothCnt = Math.round(18 + (1 - i / gearCount) * 14);
      const mGearGeo = trackGeo(createGearGeometry(mPitchR, toothCnt, 0.11, helixDeg, 0.115, 'x'));
      const mGear = new THREE.Mesh(mGearGeo, placeholderMat);
      mGear.position.set(gx, 0, 0);
      gearGroup.add(mGear);

      // Meshing countershaft helical gear
      const cPitchR = Math.max(0.13, Math.abs(counterY) - mPitchR + 0.03);
      const cGearGeo = trackGeo(createGearGeometry(cPitchR, Math.max(14, Math.round(toothCnt * 0.8)), 0.105, -helixDeg, 0.1, 'x'));
      const cGear = new THREE.Mesh(cGearGeo, placeholderMat);
      cGear.position.set(gx, counterY, 0);
      gearGroup.add(cGear);

      // Bronze triple-cone synchro ring beside mainshaft gears
      if (i % 2 === 0) {
        const syn = new THREE.Mesh(synchroGeo, placeholderMat);
        syn.position.set(gx + 0.075, 0, 0);
        setDetailKind(syn, 'bronze_bearing');
        gearGroup.add(syn);
      }
    }

    // Mainshaft front & rear ball/roller bearing races
    [-0.88 * lenScale, 0.65 * lenScale].forEach((bx) => {
      const brg = new THREE.Mesh(bearingOuterGeo, placeholderMat);
      brg.position.set(bx, 0, 0);
      setDetailKind(brg, 'chrome_shaft');
      gearGroup.add(brg);
    });

    animatedSpinners.push(gearGroup);
    tagPart(gearGroup, 'internal', '26/31-Spline Shafts, Bronze Synchros & 22° Helical Gearset', 'AGMA-Q12-6SPD', 20, new THREE.Vector3(0, -0.95, 1.35));
    parts.push(gearGroup);
    selectableMeshes.push(mainShaftMesh);
    mainShaftMesh.userData = gearGroup.userData;
    root.add(gearGroup);
  } else if (assemblyId === 'ev_axial_drive') {
    // =========================================================================
    // 900V Dual Axial-Flux EV Drive — Bolted Endbells, Exposed Copper Stator
    // Hairpin Slots, Hybrid Bearings, Viton Axle Seals, 33-Spline Halfshafts,
    // AN-12 Coolant Fittings & HVIL Busbar Compression Glands
    // =========================================================================
    const cy = 1.65;
    const statorR = (params.wingspanM / 0.58) * 1.15;
    const lenScale = params.fuselageLengthM / 0.66;
    const finCount = Math.max(8, Math.round(params.ribDensity));
    const dummy = new THREE.Object3D();
    const m8BoltGeo = trackGeo(createHexFlangeBoltGeometry(0.022, 0.032));

    // 1. Finned Liquid-Cooled Stator Barrel + Bolted Endbells + Exposed Copper Windings + AN-12 Coolant Ports
    const statorGroup = new THREE.Group();
    statorGroup.position.set(0, cy, 0);

    const barrelGeo = trackGeo(createHollowCylinderGeometry(statorR, statorR * 0.86, 1.45 * lenScale, 36, 'x', 0.01));
    const barrelMesh = new THREE.Mesh(barrelGeo, placeholderMat);
    statorGroup.add(barrelMesh);

    const copperCoreGeo = trackGeo(createHollowCylinderGeometry(statorR * 0.85, statorR * 0.45, 1.15 * lenScale, 32, 'x'));
    const copperCore = new THREE.Mesh(copperCoreGeo, placeholderMat);
    setDetailKind(copperCore, 'copper_winding');
    statorGroup.add(copperCore);

    const endbellGeo = trackGeo(createHollowCylinderGeometry(statorR * 1.03, 0.25, 0.08, 32, 'x', 0.008));
    const endbellBolts = new THREE.InstancedMesh(m8BoltGeo, placeholderMat, 24);
    // UNVERIFIED: EV axle lip seal OD/ID/width (0.25/0.185 x 0.05) visually proportioned;
    // needs drive-unit halfshaft OD & endbell housing seal bore specification (e.g., SKF/Freudenberg metric lip seal table).
    const axleSealGeo = trackGeo(createHollowCylinderGeometry(0.25, 0.185, 0.05, 24, 'x'));

    [-0.74 * lenScale, 0.74 * lenScale].forEach((ex, eIdx) => {
      const bell = new THREE.Mesh(endbellGeo, placeholderMat);
      bell.position.set(ex, 0, 0);
      statorGroup.add(bell);

      const seal = new THREE.Mesh(axleSealGeo, placeholderMat);
      seal.position.set(ex + Math.sign(ex) * 0.04, 0, 0);
      setDetailKind(seal, 'viton_seal');
      statorGroup.add(seal);

      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        dummy.position.set(ex + Math.sign(ex) * 0.045, Math.cos(a) * statorR * 0.94, Math.sin(a) * statorR * 0.94);
        dummy.rotation.set(a, 0, Math.sign(ex) > 0 ? -Math.PI / 2 : Math.PI / 2);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        endbellBolts.setMatrixAt(eIdx * 12 + i, dummy.matrix);
      }
    });
    endbellBolts.instanceMatrix.needsUpdate = true;
    endbellBolts.computeBoundingSphere();
    setDetailKind(endbellBolts, 'black_oxide');
    statorGroup.add(endbellBolts);

    // Billet AN-12 liquid cooling inlet/outlet fittings
    const coolPortGeo = trackGeo(createHexFlangeBoltGeometry(0.036, 0.06));
    [-0.38 * lenScale, 0.38 * lenScale].forEach((cx) => {
      const cp = new THREE.Mesh(coolPortGeo, placeholderMat);
      cp.rotation.x = Math.PI / 2;
      cp.position.set(cx, -0.15, statorR * 1.02);
      setDetailKind(cp, 'anodized_blue');
      statorGroup.add(cp);
    });

    tagPart(statorGroup, 'airframe', '900V Stator Barrel, Copper Windings & Viton Seals', 'AXF-900-ST-01', 34, new THREE.Vector3(0, 0, 0));
    parts.push(statorGroup);
    selectableMeshes.push(barrelMesh);
    barrelMesh.userData = statorGroup.userData;
    root.add(statorGroup);

    const finGeo = trackGeo(new THREE.TorusGeometry(statorR * 1.03, 0.032, 8, 36));
    finGeo.rotateY(Math.PI / 2);
    const finInst = new THREE.InstancedMesh(finGeo, placeholderMat, finCount);
    for (let i = 0; i < finCount; i++) {
      const fx = (-0.6 + (i / Math.max(1, finCount - 1)) * 1.2) * lenScale;
      dummy.position.set(fx, cy, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      finInst.setMatrixAt(i, dummy.matrix);
    }
    finInst.instanceMatrix.needsUpdate = true;
    finInst.computeBoundingSphere();
    tagPart(finInst, 'airframe', 'Machined Radial Cooling Jacket Fins', 'AXF-COOL-02', 8, new THREE.Vector3(0, 0.4, 0));
    parts.push(finInst);
    root.add(finInst);

    // 2. Dual Carbon-Sleeved Axial Rotor Discs + 33-Spline Coaxial Output Halfshafts
    const rotorGroup = new THREE.Group();
    rotorGroup.position.set(0, cy, 0);
    const shaftGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.18, 3.3 * lenScale, 24));
    shaftGeo.rotateZ(Math.PI / 2);
    const shaftMesh = new THREE.Mesh(shaftGeo, placeholderMat);
    setDetailKind(shaftMesh, 'chrome_shaft');
    rotorGroup.add(shaftMesh);

    const splineStubGeo = trackGeo(createSplinedShaftGeometry(0.195, 0.165, 33, 0.48 * lenScale, 'x'));
    [-1.85 * lenScale, 1.85 * lenScale].forEach((sx) => {
      const stub = new THREE.Mesh(splineStubGeo, placeholderMat);
      stub.position.set(sx, 0, 0);
      setDetailKind(stub, 'chrome_shaft');
      rotorGroup.add(stub);
    });

    const discGeo = trackGeo(new THREE.CylinderGeometry(statorR * 0.88, statorR * 0.88, 0.14, 32));
    discGeo.rotateZ(Math.PI / 2);
    [-0.95 * lenScale, 0.95 * lenScale].forEach((dx) => {
      const disc = new THREE.Mesh(discGeo, placeholderMat);
      disc.position.set(dx, 0, 0);
      rotorGroup.add(disc);
    });

    animatedSpinners.push(rotorGroup);
    tagPart(rotorGroup, 'propulsion', 'Dual Axial Rotor Discs & 33-Spline Output Halfshafts', 'AXF-ROT-900', 24, new THREE.Vector3(0, 0, 1.65));
    parts.push(rotorGroup);
    selectableMeshes.push(shaftMesh);
    shaftMesh.userData = rotorGroup.userData;
    root.add(rotorGroup);

    // 3. Top 900V SiC Inverter + Machined Coldplate Seam Gasket + Cover Bolts + HVIL Busbar Glands
    const invGroup = new THREE.Group();
    invGroup.position.set(0, cy + statorR + 0.32, 0);
    const invGeo = trackGeo(new THREE.BoxGeometry(1.55 * lenScale, 0.44, 1.45 * statorR));
    const invMesh = new THREE.Mesh(invGeo, placeholderMat);
    invGroup.add(invMesh);

    const coldplateGeo = trackGeo(new THREE.BoxGeometry(1.62 * lenScale, 0.06, 1.52 * statorR));
    const coldplate = new THREE.Mesh(coldplateGeo, placeholderMat);
    coldplate.position.set(0, -0.24, 0);
    setDetailKind(coldplate, 'chrome_shaft');
    invGroup.add(coldplate);

    const invSealGeo = trackGeo(new THREE.BoxGeometry(1.58 * lenScale, 0.015, 1.48 * statorR));
    const invSeal = new THREE.Mesh(invSealGeo, placeholderMat);
    invSeal.position.set(0, -0.2, 0);
    setDetailKind(invSeal, 'viton_seal');
    invGroup.add(invSeal);

    const invBolts = new THREE.InstancedMesh(m8BoltGeo, placeholderMat, 8);
    for (let i = 0; i < 4; i++) {
      const bx = -0.64 * lenScale + (i / 3) * 1.28 * lenScale;
      [-0.64 * statorR, 0.64 * statorR].forEach((bz, zIdx) => {
        dummy.position.set(bx, 0.22, bz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        invBolts.setMatrixAt(i * 2 + zIdx, dummy.matrix);
      });
    }
    invBolts.instanceMatrix.needsUpdate = true;
    invBolts.computeBoundingSphere();
    setDetailKind(invBolts, 'black_oxide');
    invGroup.add(invBolts);

    tagPart(invGroup, 'wings', '900V SiC Dual-Bridge Inverter & Pin-Fin Coldplate', 'SIC-INV-900-G4', 22, new THREE.Vector3(0, 1.65, 0));
    parts.push(invGroup);
    selectableMeshes.push(invMesh);
    invMesh.userData = invGroup.userData;
    root.add(invGroup);

    const busMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35, metalness: 0.2 });
    createdMaterials.push(busMat);
    const glandGeo = trackGeo(createHollowCylinderGeometry(0.08, 0.055, 0.06, 14, 'x'));
    [-0.35, 0, 0.35].forEach((bz) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.55 * lenScale, cy + statorR + 0.25, bz),
        new THREE.Vector3(-0.95 * lenScale, cy + statorR * 0.6, bz * 1.1),
        new THREE.Vector3(-0.65 * lenScale, cy + statorR * 0.2, bz),
      ]);
      const busGeo = trackGeo(new THREE.TubeGeometry(curve, 20, 0.055, 8, false));
      const busMesh = new THREE.Mesh(busGeo, busMat);
      busMesh.userData.keepMaterial = true;
      root.add(busMesh);

      const gland = new THREE.Mesh(glandGeo, placeholderMat);
      gland.position.set(-0.78 * lenScale, cy + statorR + 0.25, bz);
      setDetailKind(gland, 'viton_seal');
      root.add(gland);
    });

    // 4. Hydro-Mount Subframe Cradle + Vertical Mount Stanchions Bolted to Stator Ears
    const cradleGroup = new THREE.Group();
    const mountGeo = trackGeo(new THREE.BoxGeometry(2.2 * lenScale, 0.18, 2.0));
    const mountMesh = new THREE.Mesh(mountGeo, placeholderMat);
    mountMesh.position.set(0, 0.09, 0);
    cradleGroup.add(mountMesh);

    const stanchionH = Math.max(0.2, cy - statorR * 0.72 - 0.18);
    const stanchionGeo = trackGeo(new THREE.BoxGeometry(0.22, stanchionH, 0.16));
    [
      [-0.55 * lenScale, -0.78],
      [-0.55 * lenScale, 0.78],
      [0.55 * lenScale, -0.78],
      [0.55 * lenScale, 0.78],
    ].forEach(([mx, mz]) => {
      const st = new THREE.Mesh(stanchionGeo, placeholderMat);
      st.position.set(mx, 0.18 + stanchionH * 0.5, mz);
      cradleGroup.add(st);
      const bush = new THREE.Mesh(m8BoltGeo, placeholderMat);
      bush.position.set(mx, 0.18 + stanchionH, mz);
      setDetailKind(bush, 'black_oxide');
      cradleGroup.add(bush);
    });

    tagPart(cradleGroup, 'internal', 'e-Axle Hydro-Mount Subframe Cradle & Isolators', 'AXF-MNT-01', 12, new THREE.Vector3(0, -0.65, 0));
    parts.push(cradleGroup);
    selectableMeshes.push(mountMesh);
    mountMesh.userData = cradleGroup.userData;
    root.add(cradleGroup);
  } else if (assemblyId === 'monoblock_brake') {
    // =========================================================================
    // 6-Piston Radi-CAL Monoblock, 390×36 mm Dual-Disc Ventilated C/SiC Rotor,
    // 130 mm BCD Floating Hat Bobbins, Sintered Pads & Ø90 mm H7 DMLS Upright
    // =========================================================================
    const cy = 1.95;
    const rotorR = (params.wingspanM / 0.42) * 1.55;
    const vaneCount = Math.max(12, Math.round(params.ribDensity) * 2);
    const dummy = new THREE.Object3D();
    const boltGeo = trackGeo(createHexFlangeBoltGeometry(0.024, 0.036));

    // 1. Ventilated Dual-Disc 390mm C/SiC Rotor + Internal Cooling Vanes + 7075-T6 Hat + Floating Bobbins + 5-Lug Hub
    const rotorGroup = new THREE.Group();
    rotorGroup.position.set(0, cy, 0);

    // Front & rear ventilated friction discs separated by air gap
    const faceRingGeo = trackGeo(createHollowCylinderGeometry(rotorR, rotorR * 0.61, 0.075, 48, 'z', 0.004));
    [-0.085, 0.085].forEach((fz) => {
      const disc = new THREE.Mesh(faceRingGeo, placeholderMat);
      disc.position.set(0, 0, fz);
      rotorGroup.add(disc);
    });

    // Swept internal rotor cooling vanes visible around perimeter
    const vaneGeo = trackGeo(new THREE.BoxGeometry(rotorR * 0.34, 0.025, 0.095));
    const vaneInst = new THREE.InstancedMesh(vaneGeo, placeholderMat, vaneCount);
    for (let i = 0; i < vaneCount; i++) {
      const a = (i / vaneCount) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * rotorR * 0.81, Math.sin(a) * rotorR * 0.81, 0);
      dummy.rotation.set(0, 0, a + THREE.MathUtils.degToRad(params.sweepDeg));
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      vaneInst.setMatrixAt(i, dummy.matrix);
    }
    vaneInst.instanceMatrix.needsUpdate = true;
    vaneInst.computeBoundingSphere();
    rotorGroup.add(vaneInst);

    // 7075-T6 Stepped Center Aluminum Hat + 5×114.3 Wheel Studs
    const hatGeo = trackGeo(createHollowCylinderGeometry(rotorR * 0.57, rotorR * 0.24, 0.34, 32, 'z', 0.01));
    const hatMesh = new THREE.Mesh(hatGeo, placeholderMat);
    hatMesh.position.set(0, 0, 0.14);
    hatMesh.userData.customMaterialId = 'al_7075';
    rotorGroup.add(hatMesh);

    const studGeo = trackGeo(createThreadedStudGeometry(0.028, 0.18, 9));
    studGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const ws = new THREE.Mesh(studGeo, placeholderMat);
      ws.position.set(Math.cos(a) * rotorR * 0.36, Math.sin(a) * rotorR * 0.36, 0.33);
      setDetailKind(ws, 'black_oxide');
      rotorGroup.add(ws);
    }

    // Floating H-bobbin hardware at 130 mm BCD (slotted stainless steel)
    const bobbinCount = 10;
    const bobbinGeo = trackGeo(createHollowCylinderGeometry(0.055, 0.022, 0.28, 16, 'z', 0.004));
    const bobbinInst = new THREE.InstancedMesh(bobbinGeo, placeholderMat, bobbinCount);
    for (let i = 0; i < bobbinCount; i++) {
      const a = (i / bobbinCount) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * rotorR * 0.6, Math.sin(a) * rotorR * 0.6, 0.05);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bobbinInst.setMatrixAt(i, dummy.matrix);
    }
    bobbinInst.instanceMatrix.needsUpdate = true;
    bobbinInst.computeBoundingSphere();
    setDetailKind(bobbinInst, 'chrome_shaft');
    rotorGroup.add(bobbinInst);

    rotorGroup.userData.spinAxis = 'z';
    animatedSpinners.push(rotorGroup);
    tagPart(rotorGroup, 'airframe', '390×36 mm Dual-Disc C/SiC Rotor, Vanes & Floating Bobbins', 'BRM-CCB-390X36', 38, new THREE.Vector3(0, 0, 1.45));
    parts.push(rotorGroup);
    selectableMeshes.push(hatMesh);
    hatMesh.userData = rotorGroup.userData;
    root.add(rotorGroup);

    // 2. Open-Window 6-Piston Monoblock Caliper + Bolted Stiffness Bridges + Bleed Nipple & AN-3 Brake Line
    const calGroup = new THREE.Group();
    calGroup.position.set(0, cy, 0);
    calGroup.rotation.z = 0.25;

    const calHalfShape = new THREE.Shape();
    calHalfShape.absarc(0, 0, rotorR * 1.13, -0.58, 0.58, false);
    calHalfShape.absarc(0, 0, rotorR * 0.72, 0.58, -0.58, true);
    calHalfShape.closePath();
    const calHalfGeo = trackGeo(
      new THREE.ExtrudeGeometry(calHalfShape, {
        depth: 0.2 * params.nacelleScale,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 2,
      })
    );
    calHalfGeo.translate(0, 0, -0.1 * params.nacelleScale);
    [-0.24, 0.24].forEach((cz) => {
      const half = new THREE.Mesh(calHalfGeo, placeholderMat);
      half.position.set(0, 0, cz);
      calGroup.add(half);
    });

    // Outer open-window structural caliper bridges + titanium bridge bolts
    const bridgeGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.14, 0.68 * params.nacelleScale));
    [-0.44, 0, 0.44].forEach((ang) => {
      const br = new THREE.Mesh(bridgeGeo, placeholderMat);
      br.position.set(Math.cos(ang) * rotorR * 1.07, Math.sin(ang) * rotorR * 1.07, 0);
      br.rotation.z = ang;
      calGroup.add(br);

      const bb = new THREE.Mesh(boltGeo, placeholderMat);
      bb.rotation.x = Math.PI / 2;
      bb.position.set(Math.cos(ang) * rotorR * 1.08, Math.sin(ang) * rotorR * 1.08, 0.36 * params.nacelleScale);
      setDetailKind(bb, 'black_oxide');
      calGroup.add(bb);
    });

    // Top brass bleed nipple & AN-3 anodized-blue inlet fitting
    const bleed = new THREE.Mesh(boltGeo, placeholderMat);
    bleed.position.set(Math.cos(0.5) * rotorR * 1.16, Math.sin(0.5) * rotorR * 1.16, -0.2);
    setDetailKind(bleed, 'brass_fitting');
    calGroup.add(bleed);

    const banjo = new THREE.Mesh(boltGeo, placeholderMat);
    banjo.rotation.z = -Math.PI / 2;
    banjo.position.set(rotorR * 0.85, 0, -0.34);
    setDetailKind(banjo, 'anodized_blue');
    calGroup.add(banjo);

    tagPart(calGroup, 'wings', '6-Piston Open-Window Billet Monoblock Caliper', 'AP-CP9660-CNC', 28, new THREE.Vector3(1.55, 0.55, 0));
    parts.push(calGroup);
    selectableMeshes.push(calGroup.children[0] as THREE.Mesh);
    (calGroup.children[0] as THREE.Mesh).userData = calGroup.userData;
    root.add(calGroup);

    // 3. Staggered 30/34/38 mm Ventilated Ti-6Al-4V Pistons + Viton Dust Seals + Carbon-Metallic Brake Pads
    const pistonGroup = new THREE.Group();
    const padShape = new THREE.Shape();
    padShape.absarc(0, 0, rotorR * 0.99, -0.46, 0.46, false);
    padShape.absarc(0, 0, rotorR * 0.72, 0.46, -0.46, true);
    padShape.closePath();
    const padGeo = trackGeo(new THREE.ExtrudeGeometry(padShape, { depth: 0.055, bevelEnabled: false }));
    [-0.145, 0.09].forEach((pz) => {
      const pad = new THREE.Mesh(padGeo, placeholderMat);
      pad.position.set(0, cy, pz);
      pad.rotation.z = 0.25;
      setDetailKind(pad, 'brake_pad');
      pistonGroup.add(pad);
    });

    const pRadii = [0.09, 0.105, 0.118]; // Ø30 / Ø34 / Ø38 mm stepped piston progression
    pRadii.forEach((pr, idx) => {
      const pGeo = trackGeo(createHollowCylinderGeometry(pr, pr * 0.62, 0.14, 18, 'z', 0.004));
      const ang = (idx - 1) * 0.3 + 0.25;
      [-0.19, 0.19].forEach((side) => {
        const pist = new THREE.Mesh(pGeo, placeholderMat);
        pist.position.set(Math.cos(ang) * rotorR * 0.87, cy + Math.sin(ang) * rotorR * 0.87, side);
        setDetailKind(pist, 'chrome_shaft');
        pistonGroup.add(pist);
      });
    });

    tagPart(pistonGroup, 'propulsion', 'Ø30/34/38 mm Ti-6Al-4V Pistons & Carbon-Metallic Pads', 'AP-PISTON-TI', 12, new THREE.Vector3(1.1, 0.3, -0.8));
    parts.push(pistonGroup);
    selectableMeshes.push(pistonGroup.children[0] as THREE.Mesh);
    (pistonGroup.children[0] as THREE.Mesh).userData = pistonGroup.userData;
    root.add(pistonGroup);

    // 4. DMLS Ti-6Al-4V Topology Wheel Upright with Ø90.000 mm H7 Bearing Bore, Radial Caliper Lugs & Inspection Jig
    const uprightGroup = new THREE.Group();
    const hubRingGeo = trackGeo(createHollowCylinderGeometry(0.46, 0.27, 0.34, 28, 'z', 0.015));
    const hubRing = new THREE.Mesh(hubRingGeo, placeholderMat);
    hubRing.position.set(0, cy, -0.34);
    uprightGroup.add(hubRing);

    // UNVERIFIED: Hub wheel bearing race ID & axial width (0.27/0.18 x 0.36) visually proportioned inside Ø90.000 mm H7 bore;
    // needs OEM/motorsport double-row angular-contact wheel bearing datasheet (e.g., SKF/Timken ID, OD Ø90 mm, width).
    const bearingRaceGeo = trackGeo(createHollowCylinderGeometry(0.27, 0.18, 0.36, 24, 'z'));
    const brgRace = new THREE.Mesh(bearingRaceGeo, placeholderMat);
    brgRace.position.set(0, cy, -0.34);
    setDetailKind(brgRace, 'chrome_shaft');
    uprightGroup.add(brgRace);

    // Upper/lower ball joint spine & radial caliper mounting arms (180 mm centers)
    const spineGeo = trackGeo(new THREE.BoxGeometry(0.32, 1.95, 0.24));
    const spine = new THREE.Mesh(spineGeo, placeholderMat);
    spine.position.set(-0.08, cy, -0.38);
    uprightGroup.add(spine);

    const radialArmGeo = trackGeo(new THREE.BoxGeometry(0.75, 0.16, 0.18));
    [-0.45, 0.45].forEach((ryOff) => {
      const arm = new THREE.Mesh(radialArmGeo, placeholderMat);
      arm.position.set(0.42, cy + ryOff * 1.15 + 0.14, -0.32);
      arm.rotation.z = ryOff > 0 ? 0.52 : -0.05;
      uprightGroup.add(arm);

      const lugBolt = new THREE.Mesh(boltGeo, placeholderMat);
      lugBolt.rotation.z = -Math.PI / 2;
      lugBolt.position.set(0.86, cy + ryOff * 1.25 + 0.16, -0.22);
      setDetailKind(lugBolt, 'black_oxide');
      uprightGroup.add(lugBolt);
    });

    tagPart(uprightGroup, 'internal', 'DMLS Ti-6Al-4V Upright (Ø90.000 mm H7 Bore & Radial Lugs)', 'AF-DMLS-UPR-07', 22, new THREE.Vector3(-1.1, 0, -1.35));
    parts.push(uprightGroup);
    selectableMeshes.push(hubRing);
    hubRing.userData = uprightGroup.userData;
    root.add(uprightGroup);

    const baseGroup = new THREE.Group();
    const baseGeo = trackGeo(new THREE.BoxGeometry(2.2, 0.14, 1.8));
    const baseMesh = new THREE.Mesh(baseGeo, placeholderMat);
    baseMesh.position.set(0, 0.07, -0.2);
    baseGroup.add(baseMesh);

    const jigPostGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.12, Math.max(0.2, cy - 1.04), 16));
    const jigPost = new THREE.Mesh(jigPostGeo, placeholderMat);
    jigPost.position.set(-0.08, 0.14 + (cy - 1.04) * 0.5, -0.38);
    baseGroup.add(jigPost);

    tagPart(baseGroup, 'internal', 'Corner Hub Inspection Jig & Ball-Joint Post', 'AF-JIG-01', 4, new THREE.Vector3(0, -0.5, 0));
    parts.push(baseGroup);
    selectableMeshes.push(baseMesh);
    baseMesh.userData = baseGroup.userData;
    root.add(baseGroup);
  } else if (assemblyId === 'custom_build') {
    const cfg = customDesign ?? DEFAULT_CUSTOM_DESIGN;
    const MM = 1 / 500;
    const wb = cfg.wheelbaseMm * MM;
    const halfWb = wb / 2;
    const frontAxleX = -halfWb;
    const rearAxleX = halfWb;
    const halfTrack = (cfg.trackWidthMm * MM) / 2;
    const rotorR = (cfg.brakeRotorDiaMm * MM) / 2;
    const wheelR = Math.max(rotorR * 1.48, 0.66);
    const hubY = wheelR;
    const crankY = Math.max(0.48, cfg.crankHeightMm * MM);
    const railH = Math.max(0.08, cfg.railGaugeMm * 0.028);

    const tagCustomMat = (obj: THREE.Object3D, matId: MaterialId) => {
      obj.userData.customMaterialId = matId;
      obj.traverse((c) => {
        if (!c.userData.detailMatKind) {
          c.userData.customMaterialId = matId;
        }
      });
    };

    const tireMat = new THREE.MeshPhysicalMaterial({ color: 0x16191f, roughness: 0.88, metalness: 0.03, clippingPlanes });
    createdMaterials.push(tireMat);

    // 1. Chassis Structure
    const chassisGroup = new THREE.Group();
    const frameSpanLen = wb + 1.45;
    if (cfg.chassisStyle === 'carbon_monocoque') {
      const tubGeo = trackGeo(new THREE.BoxGeometry(wb * 0.72, 0.68, halfTrack * 1.15));
      const tubMesh = new THREE.Mesh(tubGeo, placeholderMat);
      tubMesh.position.set(0.05, 0.52, 0);
      chassisGroup.add(tubMesh);

      const frontBulkGeo = trackGeo(new THREE.BoxGeometry(0.95, 0.42, halfTrack * 0.92));
      const frontBulk = new THREE.Mesh(frontBulkGeo, placeholderMat);
      frontBulk.position.set(frontAxleX + 0.12, 0.44, 0);
      chassisGroup.add(frontBulk);
    } else if (cfg.chassisStyle === 'ev_skateboard') {
      const trayGeo = trackGeo(new THREE.BoxGeometry(wb * 0.84, 0.24, halfTrack * 1.38));
      const trayMesh = new THREE.Mesh(trayGeo, placeholderMat);
      trayMesh.position.set(0, 0.3, 0);
      chassisGroup.add(trayMesh);
    }

    const railGeo = trackGeo(new THREE.BoxGeometry(frameSpanLen, railH * 1.5, railH * 1.25));
    [-halfTrack * 0.56, halfTrack * 0.56].forEach((rz) => {
      const rail = new THREE.Mesh(railGeo, placeholderMat);
      rail.position.set(0.05, 0.42, rz);
      chassisGroup.add(rail);
    });

    const crossGeo = trackGeo(new THREE.BoxGeometry(0.14, railH * 1.4, halfTrack * 1.16));
    [-halfWb - 0.35, frontAxleX, 0, rearAxleX, halfWb + 0.42].forEach((cx) => {
      const cross = new THREE.Mesh(crossGeo, placeholderMat);
      cross.position.set(cx, 0.42, 0);
      chassisGroup.add(cross);
    });

    if (cfg.chassisStyle === 'tubular_spaceframe') {
      const hoopGeo = trackGeo(new THREE.TorusGeometry(halfTrack * 0.55, 0.042, 8, 20, Math.PI));
      const hoop = new THREE.Mesh(hoopGeo, placeholderMat);
      hoop.position.set(0.25, 0.48, 0);
      hoop.rotation.y = Math.PI / 2;
      chassisGroup.add(hoop);
    }

    tagPart(chassisGroup, 'airframe', `Custom ${cfg.chassisStyle.replace(/_/g, ' ').toUpperCase()} Chassis`, 'AF-CHS-01', 30, new THREE.Vector3(0, -0.55, 0));
    tagCustomMat(chassisGroup, cfg.chassisMaterial);
    parts.push(chassisGroup);
    if (chassisGroup.children[0]) {
      const cMesh = chassisGroup.children[0] as THREE.Mesh;
      selectableMeshes.push(cMesh);
      cMesh.userData = chassisGroup.userData;
    }
    root.add(chassisGroup);

    // 2. Powertrain Core + Valve Covers + Hot-Rod Blower / Magnetic Harmonic Balancer / Radiator Dress
    const setbackU = cfg.engineSetbackMm * MM;
    const boreScale = cfg.boreMm / 101.6;
    const strokeScale = cfg.strokeMm / 88.39;
    const engineLenU = cfg.powertrainType === 'inline6_dohc' ? 760 * MM : cfg.powertrainType === 'axial_flux_ev' ? 420 * MM : 540 * MM;
    const engineCenterX = frontAxleX + setbackU + engineLenU * 0.5;
    const bellhousingDatumX = frontAxleX + setbackU + engineLenU;
    const hotRodHeadVariant = sbcBlockConfig?.headVariant ?? 'cammed_ohv';
    const hotRodInduction = sbcBlockConfig?.inductionStyle ?? 'blower_671';
    const isHotRodV8 = cfg.powertrainType === 'v8_ohv';

    const blockGroup = new THREE.Group();
    blockGroup.position.set(engineCenterX, crankY, 0);

    if (cfg.powertrainType === 'axial_flux_ev') {
      const evGeo = trackGeo(new THREE.CylinderGeometry(0.36 * boreScale, 0.36 * boreScale, engineLenU, 28));
      evGeo.rotateZ(Math.PI / 2);
      const evMesh = new THREE.Mesh(evGeo, placeholderMat);
      blockGroup.add(evMesh);
    } else {
      const blockW = cfg.powertrainType === 'flat6_boxer' ? 0.88 : 0.56 * boreScale;
      const blockH = cfg.powertrainType === 'flat6_boxer' ? 0.34 : 0.48 * strokeScale;
      const blockGeo = trackGeo(new THREE.BoxGeometry(engineLenU, blockH, blockW));
      const blockMesh = new THREE.Mesh(blockGeo, placeholderMat);
      blockMesh.position.set(0, 0.12, 0);
      if (isHotRodV8) setEngineFinish(blockMesh, 'chevy_orange');
      blockGroup.add(blockMesh);

      if (isHotRodV8) {
        // Chevy-orange front timing cover + baffled billet oil pan
        const hrCoverGeo = trackGeo(new THREE.BoxGeometry(0.08, blockH * 0.85, blockW * 0.82));
        const hrCover = new THREE.Mesh(hrCoverGeo, placeholderMat);
        hrCover.position.set(-engineLenU * 0.53, 0.08, 0);
        setEngineFinish(hrCover, 'chevy_orange');
        blockGroup.add(hrCover);

        // Front Magnetic Harmonic Balancer + Copper Stator Coils + 60-2 Wheel + Alternator + Aluminum Radiator (Reference 02 & 05)
        const hrBalX = -engineLenU * 0.66;
        const hrStatorGeo = trackGeo(createHollowCylinderGeometry(0.145, 0.095, 0.04, 24, 'x'));
        const hrStator = new THREE.Mesh(hrStatorGeo, placeholderMat);
        hrStator.position.set(hrBalX + 0.025, -0.02, 0);
        setEngineFinish(hrStator, 'copper_coil');
        blockGroup.add(hrStator);

        const hrBalGeo = trackGeo(createHollowCylinderGeometry(0.205, 0.155, 0.072, 28, 'x', 0.004));
        const hrBal = new THREE.Mesh(hrBalGeo, placeholderMat);
        hrBal.position.set(hrBalX, -0.02, 0);
        setEngineFinish(hrBal, 'polished_billet');
        blockGroup.add(hrBal);

        const hrTrigGeo = trackGeo(createTriggerWheel60Minus2Geometry(0.215, 0.12, 0.012));
        const hrTrig = new THREE.Mesh(hrTrigGeo, placeholderMat);
        hrTrig.position.set(hrBalX - 0.048, -0.02, 0);
        setDetailKind(hrTrig, 'black_oxide');
        blockGroup.add(hrTrig);

        const hrPulleyGeo = trackGeo(new THREE.CylinderGeometry(0.115, 0.115, 0.045, 22));
        hrPulleyGeo.rotateZ(Math.PI / 2);
        const hrPulley = new THREE.Mesh(hrPulleyGeo, placeholderMat);
        hrPulley.position.set(hrBalX - 0.082, -0.02, 0);
        setEngineFinish(hrPulley, 'polished_billet');
        blockGroup.add(hrPulley);

        // Ribbed billet alternator on front-left of hot-rod V8
        const hrAltGeo = trackGeo(new THREE.CylinderGeometry(0.095, 0.095, 0.16, 18));
        hrAltGeo.rotateZ(Math.PI / 2);
        const hrAlt = new THREE.Mesh(hrAltGeo, placeholderMat);
        hrAlt.position.set(hrBalX + 0.03, 0.24, -0.34);
        setEngineFinish(hrAlt, 'polished_billet');
        blockGroup.add(hrAlt);

        const hrAltPulleyGeo = trackGeo(new THREE.CylinderGeometry(0.052, 0.052, 0.035, 16));
        hrAltPulleyGeo.rotateZ(Math.PI / 2);
        const hrAltPulley = new THREE.Mesh(hrAltPulleyGeo, placeholderMat);
        hrAltPulley.position.set(hrBalX - 0.082, 0.24, -0.34);
        setEngineFinish(hrAltPulley, 'polished_billet');
        blockGroup.add(hrAltPulley);

        // Crossflow Aluminum Radiator ahead of front axle
        const radX = Math.min(-engineLenU * 1.05, frontAxleX - engineCenterX + 0.12);
        const radCoreGeo = trackGeo(new THREE.BoxGeometry(0.09, 0.62, 0.96));
        const radCore = new THREE.Mesh(radCoreGeo, placeholderMat);
        radCore.position.set(radX, 0.12, 0);
        setEngineFinish(radCore, 'radiator_core');
        blockGroup.add(radCore);

        const radTankGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.66, 0.08));
        [-0.51, 0.51].forEach((tz) => {
          const tank = new THREE.Mesh(radTankGeo, placeholderMat);
          tank.position.set(radX, 0.12, tz);
          setEngineFinish(tank, 'polished_billet');
          blockGroup.add(tank);
        });

        const radCapGeo = trackGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 14));
        const radCap = new THREE.Mesh(radCapGeo, placeholderMat);
        radCap.position.set(radX, 0.46, 0.48);
        setDetailKind(radCap, 'anodized_red');
        blockGroup.add(radCap);
      }

      const panGeo = trackGeo(new THREE.BoxGeometry(engineLenU * 0.9, 0.2, blockW * 0.8));
      const panMesh = new THREE.Mesh(panGeo, placeholderMat);
      panMesh.position.set(0, -0.18, 0);
      if (isHotRodV8) setEngineFinish(panMesh, 'polished_billet');
      blockGroup.add(panMesh);
    }

    tagPart(blockGroup, 'propulsion', `Powertrain Core (${cfg.powertrainType.replace(/_/g, ' ').toUpperCase()})`, 'AF-ENG-01', 22, new THREE.Vector3(0, 0.65, 0));
    tagCustomMat(blockGroup, cfg.engineBlockMaterial);
    parts.push(blockGroup);
    if (blockGroup.children[0]) {
      const bMesh = blockGroup.children[0] as THREE.Mesh;
      selectableMeshes.push(bMesh);
      bMesh.userData = blockGroup.userData;
    }
    root.add(blockGroup);

    const headGroup = new THREE.Group();
    headGroup.position.set(engineCenterX, crankY, 0);
    if (cfg.powertrainType === 'axial_flux_ev') {
      const invGeo = trackGeo(new THREE.BoxGeometry(engineLenU * 0.85, 0.22, 0.56));
      const invMesh = new THREE.Mesh(invGeo, placeholderMat);
      invMesh.position.set(0, 0.44, 0);
      headGroup.add(invMesh);
    } else if (cfg.powertrainType === 'inline6_dohc') {
      const i6HeadGeo = trackGeo(new THREE.BoxGeometry(engineLenU * 0.98, 0.26, 0.42 * boreScale));
      const i6Head = new THREE.Mesh(i6HeadGeo, placeholderMat);
      i6Head.position.set(0, 0.46 * strokeScale, 0);
      headGroup.add(i6Head);
    } else {
      const halfAngleRad = THREE.MathUtils.degToRad((cfg.bankAngleDeg || 90) / 2);
      const bankHGeo = trackGeo(new THREE.BoxGeometry(engineLenU * 0.95, 0.24, 0.34 * boreScale));
      const cStackGeo = trackGeo(createHollowCylinderGeometry(0.038, 0.028, 0.12, 12, 'y'));
      const hrSolGeo = trackGeo(new THREE.CylinderGeometry(0.028, 0.032, 0.14, 12));
      const hrEfiGeo = trackGeo(new THREE.BoxGeometry(engineLenU * 0.86, 0.034, 0.038));

      [-1, 1].forEach((side) => {
        const bHead = new THREE.Mesh(bankHGeo, placeholderMat);
        bHead.position.set(0, (cfg.powertrainType === 'flat6_boxer' ? 0.14 : 0.42) * strokeScale, side * (cfg.powertrainType === 'flat6_boxer' ? 0.46 : 0.26));
        bHead.rotation.x = side * (cfg.powertrainType === 'flat6_boxer' ? Math.PI * 0.46 : halfAngleRad);
        if (isHotRodV8) setEngineFinish(bHead, 'polished_billet');
        headGroup.add(bHead);

        if (isHotRodV8 && hotRodHeadVariant === 'camless_billet') {
          const efiRail = new THREE.Mesh(hrEfiGeo, placeholderMat);
          efiRail.position.set(0, 0.56 * strokeScale, side * 0.18);
          setEngineFinish(efiRail, 'anodized_black');
          headGroup.add(efiRail);

          for (let k = 0; k < 4; k++) {
            const sx = -engineLenU * 0.34 + (k / 3) * (engineLenU * 0.68);
            [-0.06, 0.06].forEach((szOff) => {
              const sol = new THREE.Mesh(hrSolGeo, placeholderMat);
              sol.position.set(sx, 0.58 * strokeScale, side * (0.28 + szOff));
              sol.rotation.x = side * halfAngleRad;
              setEngineFinish(sol, 'polished_billet');
              headGroup.add(sol);
            });
          }
        } else if (isHotRodV8 && hotRodInduction === 'blower_671') {
          const vcGeo = trackGeo(new THREE.BoxGeometry(engineLenU * 0.9, 0.12, 0.26 * boreScale));
          const vc = new THREE.Mesh(vcGeo, placeholderMat);
          vc.position.set(0, 0.54 * strokeScale, side * 0.36);
          vc.rotation.x = side * halfAngleRad;
          setEngineFinish(vc, 'polished_billet');
          headGroup.add(vc);
        } else {
          for (let k = 0; k < 4; k++) {
            const st = new THREE.Mesh(cStackGeo, placeholderMat);
            st.position.set(-engineLenU * 0.32 + (k / 3) * (engineLenU * 0.64), 0.58 * strokeScale, side * 0.11);
            setDetailKind(st, 'chrome_shaft');
            headGroup.add(st);
          }
        }
      });

      if (isHotRodV8 && hotRodInduction === 'blower_671') {
        // Polished finned 6-71 blower + one-piece manifold + dual-bore scoop + snout pulley on hot-rod V8
        const hrManGeo = trackGeo(new THREE.BoxGeometry(engineLenU * 0.88, 0.12, 0.38));
        const hrMan = new THREE.Mesh(hrManGeo, placeholderMat);
        hrMan.position.set(0, 0.54 * strokeScale, 0);
        setEngineFinish(hrMan, 'polished_billet');
        headGroup.add(hrMan);

        const hrBlowerGeo = trackGeo(new THREE.BoxGeometry(engineLenU * 0.72, 0.22, 0.34));
        const hrBlower = new THREE.Mesh(hrBlowerGeo, placeholderMat);
        hrBlower.position.set(0, 0.7 * strokeScale, 0);
        setEngineFinish(hrBlower, 'polished_billet');
        headGroup.add(hrBlower);

        const hrSnoutGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.08, engineLenU * 0.44, 16));
        hrSnoutGeo.rotateZ(Math.PI / 2);
        const hrSnout = new THREE.Mesh(hrSnoutGeo, placeholderMat);
        hrSnout.position.set(-engineLenU * 0.52, 0.7 * strokeScale, 0);
        setEngineFinish(hrSnout, 'polished_billet');
        headGroup.add(hrSnout);

        const hrBPulleyGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.055, 22));
        hrBPulleyGeo.rotateZ(Math.PI / 2);
        const hrBPulley = new THREE.Mesh(hrBPulleyGeo, placeholderMat);
        hrBPulley.position.set(-engineLenU * 0.74, 0.7 * strokeScale, 0);
        setEngineFinish(hrBPulley, 'polished_billet');
        headGroup.add(hrBPulley);

        const hrScoopGeo = trackGeo(new THREE.BoxGeometry(0.36, 0.15, 0.28));
        const hrScoop = new THREE.Mesh(hrScoopGeo, placeholderMat);
        hrScoop.position.set(-0.04, 0.89 * strokeScale, 0);
        setEngineFinish(hrScoop, 'polished_billet');
        headGroup.add(hrScoop);
      }
    }
    tagPart(headGroup, 'wings', 'Cylinder Heads, Induction Blower & Valvetrain', 'AF-HEAD-02', 10, new THREE.Vector3(0, 1.35, 0));
    tagCustomMat(headGroup, cfg.cylinderHeadMaterial);
    parts.push(headGroup);
    root.add(headGroup);

    const exhGroup = new THREE.Group();
    [-1, 1].forEach((side) => {
      if (isHotRodV8) {
        for (let p = 0; p < 4; p++) {
          const px = engineCenterX - engineLenU * 0.34 + (p / 3) * (engineLenU * 0.68);
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(px, crankY + 0.32, side * 0.38),
            new THREE.Vector3(px + 0.12, crankY + 0.14, side * 0.56),
            new THREE.Vector3(engineCenterX + engineLenU * 0.42, 0.36, side * 0.48),
            new THREE.Vector3(bellhousingDatumX + 0.55, 0.28, side * 0.36),
          ]);
          const exhGeo = trackGeo(new THREE.TubeGeometry(curve, 18, 0.028, 8, false));
          const exhMesh = new THREE.Mesh(exhGeo, placeholderMat);
          exhGroup.add(exhMesh);
        }
        const tailCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(bellhousingDatumX + 0.55, 0.28, side * 0.36),
          new THREE.Vector3(rearAxleX + 0.55, 0.28, side * 0.38),
        ]);
        const tailExhGeo = trackGeo(new THREE.TubeGeometry(tailCurve, 12, 0.052, 10, false));
        exhGroup.add(new THREE.Mesh(tailExhGeo, placeholderMat));
      } else {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(engineCenterX - engineLenU * 0.3, crankY + 0.25, side * 0.36),
          new THREE.Vector3(engineCenterX + engineLenU * 0.2, crankY + 0.05, side * 0.48),
          new THREE.Vector3(bellhousingDatumX + 0.55, 0.28, side * 0.34),
          new THREE.Vector3(rearAxleX + 0.55, 0.28, side * 0.38),
        ]);
        const exhGeo = trackGeo(new THREE.TubeGeometry(curve, 24, 0.045, 8, false));
        const exhMesh = new THREE.Mesh(exhGeo, placeholderMat);
        exhGroup.add(exhMesh);
      }
    });
    tagPart(exhGroup, 'propulsion', '4-into-1 Swept Tubular Exhaust Headers & Collector', 'AF-EXH-03', 8, new THREE.Vector3(0, -0.25, 0.8));
    tagCustomMat(exhGroup, cfg.exhaustMaterial);
    parts.push(exhGroup);
    root.add(exhGroup);

    // 3. Transmission + Bellhousing Bolt Flange + Driveshaft U-Joint Yoke + Differential
    const transOffsetU = cfg.bellhousingOffsetMm * MM;
    const transLenU = cfg.gearboxLengthMm * MM;
    const transStartX = bellhousingDatumX + transOffsetU;
    const transGroup = new THREE.Group();
    transGroup.position.set(transStartX, crankY, 0);

    const bellGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.34, transLenU * 0.32, 24));
    bellGeo.rotateZ(-Math.PI / 2);
    const bellMesh = new THREE.Mesh(bellGeo, placeholderMat);
    bellMesh.position.set(transLenU * 0.16, 0, 0);
    transGroup.add(bellMesh);

    const caseGeo = trackGeo(new THREE.BoxGeometry(transLenU * 0.48, 0.38, 0.34));
    const caseMesh = new THREE.Mesh(caseGeo, placeholderMat);
    caseMesh.position.set(transLenU * 0.56, -0.02, 0);
    transGroup.add(caseMesh);

    const tailGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.2, transLenU * 0.28, 20));
    tailGeo.rotateZ(-Math.PI / 2);
    const tailMesh = new THREE.Mesh(tailGeo, placeholderMat);
    tailMesh.position.set(transLenU * 0.92, 0, 0);
    transGroup.add(tailMesh);

    const transTailX = transStartX + transLenU;
    const diffLen = Math.max(0.2, rearAxleX - transTailX);
    const dsGeo = trackGeo(new THREE.CylinderGeometry(0.065, 0.065, diffLen, 16));
    dsGeo.rotateZ(Math.PI / 2);
    const dsMesh = new THREE.Mesh(dsGeo, placeholderMat);
    dsMesh.position.set(transLenU + diffLen * 0.5, 0, 0);
    transGroup.add(dsMesh);

    const ujointGeo = trackGeo(new THREE.CylinderGeometry(0.095, 0.095, 0.08, 12));
    ujointGeo.rotateZ(Math.PI / 2);
    [transLenU + 0.04, rearAxleX - transStartX - 0.18].forEach((ux) => {
      const uj = new THREE.Mesh(ujointGeo, placeholderMat);
      uj.position.set(ux, 0, 0);
      setDetailKind(uj, 'black_oxide');
      transGroup.add(uj);
    });

    const diffGeo = trackGeo(new THREE.SphereGeometry(0.25, 18, 14));
    const diffMesh = new THREE.Mesh(diffGeo, placeholderMat);
    diffMesh.position.set(rearAxleX - transStartX, 0, 0);
    transGroup.add(diffMesh);

    tagPart(transGroup, 'internal', `Gearbox (${cfg.transmissionType.replace(/_/g, ' ').toUpperCase()}) & Driveshaft`, 'AF-TRN-04', 16, new THREE.Vector3(0.85, 0.2, 0));
    tagCustomMat(transGroup, cfg.transmissionMaterial);
    parts.push(transGroup);
    selectableMeshes.push(caseMesh);
    caseMesh.userData = transGroup.userData;
    root.add(transGroup);

    // 4. 4× Wheel Corners: Hollow Barrel + 5 Split-Spokes + Centerlock Nut + Drilled Rotor + Caliper + Heim-Joint Wishbones
    const corners: Array<{ x: number; z: number; label: string; isFront: boolean }> = [
      { x: frontAxleX, z: halfTrack, label: 'Front Right', isFront: true },
      { x: frontAxleX, z: -halfTrack, label: 'Front Left', isFront: true },
      { x: rearAxleX, z: halfTrack, label: 'Rear Right', isFront: false },
      { x: rearAxleX, z: -halfTrack, label: 'Rear Left', isFront: false },
    ];

    const cRimBarrelGeo = trackGeo(createHollowCylinderGeometry(wheelR * 0.64, wheelR * 0.58, 0.3, 28, 'z', 0.008));
    const cCenterNutGeo = trackGeo(createHexFlangeBoltGeometry(0.075, 0.06));
    cCenterNutGeo.rotateX(Math.PI / 2);
    const cSpokeGeo = trackGeo(new THREE.BoxGeometry(wheelR * 0.54, 0.045, 0.04));
    const heimGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.055, 10));

    corners.forEach((c, idx) => {
      const side = Math.sign(c.z);

      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(c.x, hubY, c.z);
      const tireMesh = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(wheelR * 0.78, wheelR * 0.24, 14, 32)), tireMat);
      tireMesh.userData.keepMaterial = true;
      wheelGroup.add(tireMesh);

      const barrel = new THREE.Mesh(cRimBarrelGeo, placeholderMat);
      wheelGroup.add(barrel);

      for (let s = 0; s < 10; s++) {
        const ang = (s / 10) * Math.PI * 2 + (s % 2 === 0 ? -0.09 : 0.09);
        const sp = new THREE.Mesh(cSpokeGeo, placeholderMat);
        sp.position.set(Math.cos(ang) * wheelR * 0.31, Math.sin(ang) * wheelR * 0.31, side * 0.11);
        sp.rotation.z = ang;
        wheelGroup.add(sp);
      }

      const cNut = new THREE.Mesh(cCenterNutGeo, placeholderMat);
      cNut.position.set(0, 0, side * 0.15);
      if (side < 0) cNut.rotation.y = Math.PI;
      setDetailKind(cNut, 'anodized_red');
      wheelGroup.add(cNut);

      tagPart(wheelGroup, 'internal', `${c.label} Forged Wheel & Tire`, `AF-WHL-${idx + 1}`, 4, new THREE.Vector3(0, 0, side * 1.1));
      tagCustomMat(wheelGroup, 'magnesium_az91d');
      animatedSpinners.push(wheelGroup);
      wheelGroup.userData.spinAxis = 'z';
      parts.push(wheelGroup);
      root.add(wheelGroup);

      const rotorGroup = new THREE.Group();
      rotorGroup.position.set(c.x, hubY, c.z - side * 0.07);
      const rGeo = trackGeo(createHollowCylinderGeometry(rotorR, rotorR * 0.48, 0.065, 28, 'z', 0.004));
      const rMesh = new THREE.Mesh(rGeo, placeholderMat);
      rotorGroup.add(rMesh);
      tagPart(rotorGroup, 'airframe', `${c.label} ${cfg.brakeRotorDiaMm}mm Ventilated Rotor`, `AF-BRK-${idx + 1}`, 3, new THREE.Vector3(0, 0, side * 0.7));
      tagCustomMat(rotorGroup, cfg.rotorMaterial);
      parts.push(rotorGroup);
      root.add(rotorGroup);

      const calGroup = new THREE.Group();
      calGroup.position.set(c.x - rotorR * 0.68, hubY + rotorR * 0.36, c.z - side * 0.07);
      const calGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.28 + cfg.caliperPistons * 0.015, 0.14));
      const calMesh = new THREE.Mesh(calGeo, placeholderMat);
      calGroup.add(calMesh);
      tagPart(calGroup, 'wings', `${c.label} ${cfg.caliperPistons}-Piston Caliper`, `AF-CAL-${idx + 1}`, 2, new THREE.Vector3(-0.3, 0.25, side * 0.85));
      tagCustomMat(calGroup, cfg.caliperMaterial);
      parts.push(calGroup);
      root.add(calGroup);

      const suspGroup = new THREE.Group();
      const uprightGeo = trackGeo(createHollowCylinderGeometry(0.16, 0.08, 0.14, 16, 'z'));
      const uprightMesh = new THREE.Mesh(uprightGeo, placeholderMat);
      uprightMesh.position.set(c.x, hubY, c.z - side * 0.24);
      suspGroup.add(uprightMesh);

      const armSpan = Math.max(0.25, halfTrack - halfTrack * 0.56 - 0.22);
      const armGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.032, armSpan, 10));
      armGeo.rotateX(Math.PI / 2);
      [hubY + 0.12, hubY - 0.14].forEach((ay) => {
        const arm = new THREE.Mesh(armGeo, placeholderMat);
        arm.position.set(c.x, ay, side * (halfTrack * 0.56 + armSpan * 0.5));
        suspGroup.add(arm);

        const heimOut = new THREE.Mesh(heimGeo, placeholderMat);
        heimOut.position.set(c.x, ay, side * (halfTrack * 0.56 + armSpan));
        setDetailKind(heimOut, 'bronze_bearing');
        suspGroup.add(heimOut);
      });
      if (cfg.suspensionType === 'pushrod_inboard') {
        const rodGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.025, armSpan * 1.15, 8));
        rodGeo.rotateX(Math.PI / 2);
        const rod = new THREE.Mesh(rodGeo, placeholderMat);
        rod.position.set(c.x, hubY + 0.24, side * (halfTrack * 0.56 + armSpan * 0.45));
        rod.rotation.x = side * -0.35;
        suspGroup.add(rod);
      }

      tagPart(suspGroup, 'internal', `${c.label} Upright & ${cfg.suspensionType.replace(/_/g, ' ')}`, `AF-SUSP-${idx + 1}`, 4, new THREE.Vector3(0, 0, side * 0.55));
      tagCustomMat(suspGroup, cfg.uprightMaterial);
      parts.push(suspGroup);
      root.add(suspGroup);
    });

    // 5. Rear Aerodynamics Package at Datum D (Cambered Airfoil)
    if (cfg.aeroPackage !== 'none') {
      const aeroGroup = new THREE.Group();
      const wingSpanU = cfg.wingSpanMm * MM;
      const wingAngleRad = THREE.MathUtils.degToRad(cfg.wingAngleDeg);
      const wingX = rearAxleX + 0.68;

      if (cfg.aeroPackage === 'ducktail_lip') {
        const lipGeo = trackGeo(createCamberedAirfoilGeometry(0.32, 0.16, 0.08, wingSpanU * 0.85));
        const lip = new THREE.Mesh(lipGeo, placeholderMat);
        lip.position.set(wingX - 0.1, 1.05, 0);
        lip.rotation.z = -wingAngleRad * 0.7;
        aeroGroup.add(lip);
      } else {
        const foilGeo = trackGeo(createCamberedAirfoilGeometry(0.5, 0.12, -0.06, wingSpanU));
        const foil = new THREE.Mesh(foilGeo, placeholderMat);
        foil.position.set(wingX, 1.96, 0);
        foil.rotation.z = -wingAngleRad;
        aeroGroup.add(foil);

        const endGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.38, 0.04));
        [-wingSpanU / 2, wingSpanU / 2].forEach((ez) => {
          const ep = new THREE.Mesh(endGeo, placeholderMat);
          ep.position.set(wingX + 0.05, 1.96, ez);
          aeroGroup.add(ep);
        });

        const pylonGeo = trackGeo(new THREE.BoxGeometry(0.18, 1.52, 0.06));
        [-0.44, 0.44].forEach((pz) => {
          const py = new THREE.Mesh(pylonGeo, placeholderMat);
          py.position.set(wingX - 0.12, 1.2, pz);
          py.rotation.z = -0.14;
          aeroGroup.add(py);
        });

        if (cfg.aeroPackage === 'venturi_diffuser') {
          const diffUnderGeo = trackGeo(new THREE.BoxGeometry(0.95, 0.08, halfTrack * 1.25));
          const diffUnder = new THREE.Mesh(diffUnderGeo, placeholderMat);
          diffUnder.position.set(rearAxleX + 0.35, 0.24, 0);
          diffUnder.rotation.z = 0.18;
          aeroGroup.add(diffUnder);
        }
      }

      tagPart(aeroGroup, 'wings', `Rear Aero Package (${cfg.aeroPackage.replace(/_/g, ' ').toUpperCase()})`, 'AF-AERO-05', 10, new THREE.Vector3(0.7, 1.2, 0));
      tagCustomMat(aeroGroup, cfg.aeroMaterial);
      parts.push(aeroGroup);
      if (aeroGroup.children[0]) {
        const aMesh = aeroGroup.children[0] as THREE.Mesh;
        selectableMeshes.push(aMesh);
        aMesh.userData = aeroGroup.userData;
      }
      root.add(aeroGroup);
    }

    if (cfg.showDatums) {
      const tolLimitMap: Record<CustomDesignConfig['toleranceClass'], number> = {
        iso_2768_mk: 0.18,
        iso_2768_fh: 0.12,
        asme_y14_5_precision: 0.08,
        agma_q12_motorsport: 0.05,
      };
      const bellAligned = Math.abs(cfg.bellhousingOffsetMm) <= tolLimitMap[cfg.toleranceClass];

      const okMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
      const errMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
      const cyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
      createdMaterials.push(okMat, errMat, cyanMat);

      const addDatumRing = (pos: [number, number, number], rotY: number, radius: number, mat: THREE.Material) => {
        const ringGeo = trackGeo(new THREE.RingGeometry(radius * 0.78, radius, 28));
        const ring = new THREE.Mesh(ringGeo, mat);
        ring.position.set(...pos);
        ring.rotation.y = rotY;
        ring.userData.keepMaterial = true;
        ring.userData.isExhaustPlume = true;
        root.add(ring);
      };

      addDatumRing([engineCenterX, crankY - 0.1, 0.45], 0, 0.14, cyanMat);
      addDatumRing([engineCenterX, crankY - 0.1, -0.45], 0, 0.14, cyanMat);
      addDatumRing([bellhousingDatumX + transOffsetU, crankY, 0], Math.PI / 2, 0.42, bellAligned ? okMat : errMat);
      if (!bellAligned) {
        addDatumRing([bellhousingDatumX, crankY, 0], Math.PI / 2, 0.46, cyanMat);
      }
      corners.forEach((c) => {
        addDatumRing([c.x, hubY, c.z], 0, 0.22, okMat);
      });
      if (cfg.aeroPackage !== 'none') {
        addDatumRing([rearAxleX + 0.56, 1.96, 0.44], Math.PI / 2, 0.14, cyanMat);
        addDatumRing([rearAxleX + 0.56, 1.96, -0.44], Math.PI / 2, 0.14, cyanMat);
      }
    }
  } else {
    // =========================================================================
    // Active Carbon-PEEK Dual-Element Cambered DRS Wing & Extruded Subframe
    // =========================================================================
    const cy = 2.05;
    const span = (params.wingspanM / 1.92) * 3.8;
    const drsRad = THREE.MathUtils.degToRad(params.sweepDeg);
    const lenScale = params.fuselageLengthM / 1.35;
    const anBoltGeo = trackGeo(createHexFlangeBoltGeometry(0.025, 0.036));

    // 1. Extruded Aluminum/PEEK Rear Crash Subframe + CNC Node Gussets & Diagonal Braces
    const frameLeft = trackGeo(new THREE.BoxGeometry(2.6 * lenScale, 0.24, 0.22));
    [-1.15, 1.15].forEach((zOff, idx) => {
      const rail = new THREE.Mesh(frameLeft, placeholderMat);
      rail.position.set(0, 0.65, zOff);
      registerMesh(rail, 'airframe', `Extruded Rear Subframe Longitudinal Rail ${idx + 1}`, `CH-SUB-7075-${idx + 1}`, 18, new THREE.Vector3(0, -0.75, zOff * 0.4));
      root.add(rail);
    });

    const crossGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.22, 2.5));
    [-1.1 * lenScale, 1.1 * lenScale].forEach((xOff, idx) => {
      const cross = new THREE.Mesh(crossGeo, placeholderMat);
      cross.position.set(xOff, 0.65, 0);
      registerMesh(cross, 'airframe', `CNC Billet Crossmember ${idx + 1}`, 'CH-CRS-01', 8, new THREE.Vector3(xOff * 0.6, -0.75, 0));
      root.add(cross);
    });

    // 2. Main Cambered NACA Airfoil Plane
    const mainWingGeo = trackGeo(createCamberedAirfoilGeometry(1.02, 0.13, -0.06, span * 2));
    const mainWing = new THREE.Mesh(mainWingGeo, placeholderMat);
    mainWing.position.set(0.15, cy, 0);
    mainWing.rotation.z = -0.09;
    registerMesh(mainWing, 'wings', 'Carbon-PEEK Cambered Main Downforce Airfoil', 'AERO-DRS-PEEK-92', 26, new THREE.Vector3(0, 1.15, 0));
    root.add(mainWing);

    // 3. Actuated Upper DRS Flap (cambered slot profile)
    const flapGeo = trackGeo(createCamberedAirfoilGeometry(0.46, 0.12, -0.05, span * 1.96));
    const flapMesh = new THREE.Mesh(flapGeo, placeholderMat);
    flapMesh.position.set(0.84, cy + 0.34, 0);
    flapMesh.rotation.z = -drsRad;
    registerMesh(flapMesh, 'wings', 'Hydraulic Active DRS Upper Flap', 'AERO-DRS-FLAP', 12, new THREE.Vector3(0.75, 1.75, 0));
    root.add(flapMesh);

    // 4. Twin CNC Swan-Neck Titanium Pylons + Top-Mount AN-6 Shear Clevises + Hydraulic DRS Actuator + Bolted Vortex Endplates
    const pylonGeo = trackGeo(new THREE.BoxGeometry(0.36, 1.48, 0.085));
    const clevisGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.09, 0.14));
    const endplateGeo = trackGeo(new THREE.BoxGeometry(1.55, 0.92, 0.055));
    const actuatorCylGeo = trackGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.38, 12));
    const actuatorRodGeo = trackGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 10));

    [-1, 1].forEach((side) => {
      const pylonGroup = new THREE.Group();
      const pylon = new THREE.Mesh(pylonGeo, placeholderMat);
      pylon.position.set(-0.15, cy - 0.62, side * 0.92);
      pylon.rotation.z = -0.18;
      pylonGroup.add(pylon);

      const clevis = new THREE.Mesh(clevisGeo, placeholderMat);
      clevis.position.set(0.02, cy + 0.11, side * 0.92);
      pylonGroup.add(clevis);

      const boltF = new THREE.Mesh(anBoltGeo, placeholderMat);
      boltF.position.set(-0.12, cy + 0.16, side * 0.92);
      setDetailKind(boltF, 'black_oxide');
      pylonGroup.add(boltF);

      const boltR = new THREE.Mesh(anBoltGeo, placeholderMat);
      boltR.position.set(0.14, cy + 0.16, side * 0.92);
      setDetailKind(boltR, 'black_oxide');
      pylonGroup.add(boltR);

      // Hydraulic DRS actuator pod
      const actBody = new THREE.Mesh(actuatorCylGeo, placeholderMat);
      actBody.position.set(0.45, cy + 0.24, side * 0.92);
      actBody.rotation.z = Math.PI / 2 - 0.22;
      setDetailKind(actBody, 'anodized_blue');
      pylonGroup.add(actBody);

      const actRod = new THREE.Mesh(actuatorRodGeo, placeholderMat);
      actRod.position.set(0.68, cy + 0.29, side * 0.92);
      actRod.rotation.z = Math.PI / 2 - 0.22;
      setDetailKind(actRod, 'chrome_shaft');
      pylonGroup.add(actRod);

      tagPart(pylonGroup, 'propulsion', side === 1 ? 'Starboard Swan-Neck Pylon & DRS Actuator' : 'Port Swan-Neck Pylon & DRS Actuator', 'AERO-PYLON-TI', 8, new THREE.Vector3(-0.35, 0.35, side * 0.65));
      parts.push(pylonGroup);
      selectableMeshes.push(pylon);
      pylon.userData = pylonGroup.userData;
      root.add(pylonGroup);

      const endplate = new THREE.Mesh(endplateGeo, placeholderMat);
      endplate.position.set(0.38, cy + 0.14, side * span);
      registerMesh(endplate, 'internal', side === 1 ? 'Right Vortex Strake Endplate' : 'Left Vortex Strake Endplate', 'AERO-END-01', 6, new THREE.Vector3(0.2, 0.65, side * 1.85));
      root.add(endplate);
    });
  }

  // Material application & disposal system
  let activeSubsystemMaterials: Record<SubsystemKey, THREE.Material> | null = null;
  const customMatCache = new Map<MaterialId, THREE.Material>();
  const detailMatCache = new Map<DetailMaterialKind, THREE.Material>();
  const engineFinishCache = new Map<EngineFinishKind, THREE.Material>();
  let wireframeMat: THREE.MeshBasicMaterial | null = null;
  let xrayMat: THREE.MeshPhysicalMaterial | null = null;
  let glassMat: THREE.MeshPhysicalMaterial | null = null;

  exhaustPlumes.forEach((m) => {
    m.userData.keepMaterial = true;
    m.userData.isExhaustPlume = true;
  });
  navStrobes.forEach((m) => {
    m.userData.keepMaterial = true;
    m.userData.isExhaustPlume = true;
  });

  const getOrCreateCustomMat = (matId: MaterialId): THREE.Material => {
    let m = customMatCache.get(matId);
    if (!m) {
      m = createMaterialFromSpec(matId, maxAnisotropy, isSoftwareGl);
      m.clippingPlanes = clippingPlanes;
      m.clipShadows = true;
      m.side = THREE.DoubleSide;
      customMatCache.set(matId, m);
    }
    return m;
  };

  const getOrCreateDetailMat = (kind: DetailMaterialKind): THREE.Material => {
    let m = detailMatCache.get(kind);
    if (!m) {
      m = createDetailMaterial(kind, clippingPlanes);
      detailMatCache.set(kind, m);
    }
    return m;
  };

  const getOrCreateEngineFinishMat = (kind: EngineFinishKind): THREE.Material => {
    let m = engineFinishCache.get(kind);
    if (!m) {
      m = createEngineFinishMaterial(kind, maxAnisotropy, clippingPlanes);
      engineFinishCache.set(kind, m);
    }
    return m;
  };

  const applyMeshOverlay = (
    mesh: THREE.Mesh,
    sub: SubsystemKey,
    isGlass: boolean,
    overlayMode: RenderOverlayMode,
    thermalMat: THREE.Material
  ) => {
    if (mesh.userData.keepMaterial) return;
    const curMat = mesh.material as THREE.Material;
    if (
      curMat !== placeholderMat &&
      curMat !== wireframeMat &&
      curMat !== xrayMat &&
      curMat !== glassMat &&
      curMat !== thermalMat &&
      !Object.values(activeSubsystemMaterials || {}).includes(curMat) &&
      !Array.from(customMatCache.values()).includes(curMat) &&
      !Array.from(detailMatCache.values()).includes(curMat) &&
      !Array.from(engineFinishCache.values()).includes(curMat) &&
      createdMaterials.includes(curMat)
    ) {
      curMat.clippingPlanes = clippingPlanes;
      return;
    }

    if (overlayMode === 'wireframe') {
      mesh.material = wireframeMat!;
    } else if (overlayMode === 'thermal') {
      mesh.material = thermalMat;
    } else if (overlayMode === 'xray') {
      mesh.material = sub === 'internal' ? activeSubsystemMaterials![sub] : xrayMat!;
    } else if (isGlass) {
      mesh.material = glassMat!;
    } else if (mesh.userData.detailMatKind) {
      mesh.material = getOrCreateDetailMat(mesh.userData.detailMatKind as DetailMaterialKind);
    } else if (mesh.userData.engineFinishKind) {
      mesh.material = getOrCreateEngineFinishMat(mesh.userData.engineFinishKind as EngineFinishKind);
    } else if (mesh.userData.customMaterialId) {
      mesh.material = getOrCreateCustomMat(mesh.userData.customMaterialId as MaterialId);
    } else {
      mesh.material = activeSubsystemMaterials![sub];
    }
  };

  const applyMaterials = (
    subMaterials: SubsystemMaterials,
    overlayMode: RenderOverlayMode,
    thermalMat: THREE.Material
  ) => {
    if (activeSubsystemMaterials) {
      Object.values(activeSubsystemMaterials).forEach((m) => m.dispose());
    }

    activeSubsystemMaterials = {
      airframe: createMaterialFromSpec(subMaterials.airframe, maxAnisotropy, isSoftwareGl),
      wings: createMaterialFromSpec(subMaterials.wings, maxAnisotropy, isSoftwareGl),
      propulsion: createMaterialFromSpec(subMaterials.propulsion, maxAnisotropy, isSoftwareGl),
      internal: createMaterialFromSpec(subMaterials.internal, maxAnisotropy, isSoftwareGl),
    };

    Object.values(activeSubsystemMaterials).forEach((m) => {
      m.clippingPlanes = clippingPlanes;
      m.clipShadows = true;
      m.side = THREE.DoubleSide;
    });

    if (!glassMat) {
      glassMat = createMaterialFromSpec('sapphire_glass', maxAnisotropy, isSoftwareGl);
      glassMat.clippingPlanes = clippingPlanes;
      createdMaterials.push(glassMat);
    }

    if (!wireframeMat) {
      wireframeMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.78,
        clippingPlanes,
      });
      createdMaterials.push(wireframeMat);
    }

    if (!xrayMat) {
      xrayMat = new THREE.MeshPhysicalMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.18,
        roughness: 0.3,
        metalness: 0.1,
        depthWrite: false,
        clippingPlanes,
      });
      createdMaterials.push(xrayMat);
    }

    thermalMat.clippingPlanes = clippingPlanes;

    parts.forEach((obj) => {
      const sub = (obj.userData.subsystem as SubsystemKey) || 'airframe';
      const isGlass = Boolean(obj.userData.isGlass);
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh || (child as THREE.InstancedMesh).isInstancedMesh) {
          applyMeshOverlay(child as THREE.Mesh, sub, isGlass, overlayMode, thermalMat);
        }
      });
    });

    kinematicRootObjects.forEach((obj) => {
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh || (child as THREE.InstancedMesh).isInstancedMesh) {
          applyMeshOverlay(child as THREE.Mesh, 'internal', false, overlayMode, thermalMat);
        }
      });
    });
  };

  const updateExploded = (factor: number) => {
    parts.forEach((p) => {
      const base = p.userData.basePos as THREE.Vector3 | undefined;
      const vec = p.userData.explodeVec as THREE.Vector3 | undefined;
      if (base && vec) {
        p.position.copy(base).addScaledVector(vec, factor * 2.2);
      }
    });
    updateEngineKinematics?.(lastCrankAngleDeg);
  };

  applyMaterials(materials, 'pbr', placeholderMat);

  return {
    root,
    parts,
    animatedSpinners,
    exhaustPlumes,
    navStrobes,
    selectableMeshes,
    applyMaterials,
    updateExploded,
    updateEngineKinematics,
    updateThrottle,
    dispose: () => {
      createdGeometries.forEach((g) => g.dispose());
      createdMaterials.forEach((m) => m.dispose());
      customMatCache.forEach((m) => m.dispose());
      detailMatCache.forEach((m) => m.dispose());
      engineFinishCache.forEach((m) => m.dispose());
      if (activeSubsystemMaterials) {
        Object.values(activeSubsystemMaterials).forEach((m) => m.dispose());
      }
    },
  };
}
