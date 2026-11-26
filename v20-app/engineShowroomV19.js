// engineShowroomV19.js — Area 9: Quantum Aerospace Design Studio 3D Powertrain Showroom
import * as THREE from "three";

const IN3_TO_CM3 = 16.387064;
const IN_TO_MM = 25.4;
const LB_TO_KG = 0.45359237;

// Pre-library SBC 350 + TH350 seed using ONLY facts verified in the prompt so far.
// Any physical dimension not yet supplied by the pasted powertrain library stays null / NEEDING RAY'S MEASUREMENT.
export const PRE_LIBRARY_SEED = Object.freeze({
  engines: [
    {
      id: "sbc_350_baseline",
      brand: "Chevrolet",
      name: "SBC 350 Baseline (349.85 CID · Carb 385 HP / 414 TQ)",
      displacementCid: 349.85,
      horsepowerCarb: 385,
      torqueCarbFtLb: 414,
      horsepowerMpfiProvisional: 408,
      torqueMpfiProvisionalFtLb: 431,
      cylinders: 8,
      configuration: "V8",
      bankAngleDeg: 90,
      boreIn: null,             // Awaiting powertrain library / Ray's measurement
      strokeIn: null,           // Awaiting powertrain library / Ray's measurement
      boreSpacingIn: 4.400,
      headLengthIn: 19.685,     // 500 mm = 19.685 in
      deckHeightIn: null,       // Awaiting powertrain library / Ray's measurement
      rodLengthIn: null,        // Awaiting powertrain library / Ray's measurement
      firingOrder: [1, 8, 4, 3, 6, 5, 7, 2],
      valvetrain: "OHV (17-bolt SBC pattern)",
      bellhousingPattern: "GM SBC Standard",
      compatibleTransmissions: [
        { transmissionId: "gm_th350", fitment: "direct", verified: true, notes: "Ray's confirmed direct bolt-up" }
      ],
      sources: {
        displacementCid: "QADS SBC 350 Baseline",
        boreSpacingIn: "GM SBC Gen-I Baseline (4.400 in)",
        headLengthIn: "QADS Baseline (500 mm = 19.685 in)",
        horsepowerCarb: "QADS Baseline (385 HP / 414 TQ)",
        horsepowerMpfiProvisional: "PROVISIONAL — UNVERIFIED (408 HP / 431 TQ)"
      }
    }
  ],
  transmissions: [
    {
      id: "gm_th350",
      brand: "GM / Chevrolet",
      name: "TH350 (Turbo-Hydramatic 350 — Confirmed Direct Bolt-Up)",
      type: "3-Speed Automatic",
      bellhousingPattern: "GM SBC Standard",
      caseLengthIn: null,       // Awaiting powertrain library / Ray's measurement
      bellhousingDepthIn: null,
      tailshaftLengthIn: null,
      weightLb: null,
      source: "Ray's Confirmed Direct Bolt-Up (Dims awaiting powertrain library)"
    }
  ]
});

export class EngineShowroomV19 {
  constructor(scene, containerEl, options = {}) {
    this.scene = scene;
    this.container = containerEl;
    this.getUnitSystem = options.getUnitSystem || (() => "imperial");
    this.onGeometryBuilt = options.onGeometryBuilt || (() => {});

    this.engines = [];
    this.transmissions = [];
    this.showCutaway = true;

    this.showroomGroup = new THREE.Group();
    this.showroomGroup.name = "Area9_PowertrainShowroom";
    this.showroomGroup.userData.isShowroomModel = true;
    this.scene.add(this.showroomGroup);

    this.loadPowertrainLibrary(PRE_LIBRARY_SEED, { isPreLibrarySeed: true });
  }

  setVisible(visible) {
    this.showroomGroup.visible = Boolean(visible);
  }

  loadPowertrainLibrary(libraryData, meta = {}) {
    this.isPreLibrarySeed = Boolean(meta.isPreLibrarySeed);
    this.engines = Array.isArray(libraryData?.engines) ? libraryData.engines : [];
    this.transmissions = Array.isArray(libraryData?.transmissions) ? libraryData.transmissions : [];
    this.renderUi();
    this.selectDefaultEngineAndTransmission();
  }

  auditEngine(eng) {
    const missing = [];
    const warnings = [];
    const cfg = String(eng.configuration || "").toUpperCase();
    const isRotary = cfg.includes("ROTARY") || cfg.includes("WANKEL");

    if (isRotary) {
      missing.push("Rotary rotor/housing geometry unsupported for piston bore builder");
      return { tier: "BLOCKED", canBuildCore: false, canBuildFull: false, missing, warnings, calcCid: null };
    }

    if (!Number.isFinite(eng.boreIn) || eng.boreIn <= 0) missing.push("boreIn");
    if (!Number.isFinite(eng.strokeIn) || eng.strokeIn <= 0) missing.push("strokeIn");
    if (!Number.isFinite(eng.cylinders) || eng.cylinders <= 0) missing.push("cylinders");
    if (!eng.configuration) missing.push("configuration");

    const hasCore = missing.length === 0;
    let calcCid = null;
    if (hasCore) {
      calcCid = eng.cylinders * (Math.PI / 4) * (eng.boreIn ** 2) * eng.strokeIn;
      if (Number.isFinite(eng.displacementCid) && eng.displacementCid > 0) {
        const pctErr = Math.abs(calcCid - eng.displacementCid) / eng.displacementCid;
        if (pctErr > 0.02) {
          warnings.push(
            `DISPLACEMENT MISMATCH: Calculated ${calcCid.toFixed(2)} CID vs Listed ${eng.displacementCid} CID (${(pctErr * 100).toFixed(2)}% > 2% — verify bore/stroke)`
          );
        }
      }
    }

    if (!Number.isFinite(eng.boreSpacingIn) || eng.boreSpacingIn <= 0) missing.push("boreSpacingIn");
    if (!Number.isFinite(eng.deckHeightIn) || eng.deckHeightIn <= 0) missing.push("deckHeightIn");
    if (!Number.isFinite(eng.rodLengthIn) || eng.rodLengthIn <= 0) missing.push("rodLengthIn");
    if ((cfg.startsWith("V") || cfg.startsWith("H") || cfg.startsWith("F")) && !Number.isFinite(eng.bankAngleDeg)) {
      missing.push("bankAngleDeg");
    }
    if (!eng.bellhousingPattern) missing.push("bellhousingPattern");
    if (!Array.isArray(eng.firingOrder) || eng.firingOrder.length !== eng.cylinders) {
      missing.push("firingOrder");
    }

    const canBuildFull = hasCore && missing.length === 0 && warnings.length === 0;
    const tier = !hasCore ? "BLOCKED" : (canBuildFull ? "FULL_PARAMETRIC" : "PARTIAL_AMBER_ENVELOPE");
    return { tier, canBuildCore: hasCore, canBuildFull, missing, warnings, calcCid };
  }

  auditLibrarySummary() {
    const counts = { total: this.engines.length, full: 0, partial: 0, blocked: 0 };
    const report = this.engines.map((e) => {
      const a = this.auditEngine(e);
      if (a.tier === "FULL_PARAMETRIC") counts.full++;
      else if (a.tier === "PARTIAL_AMBER_ENVELOPE") counts.partial++;
      else counts.blocked++;
      return { id: e.id, brand: e.brand, name: e.name, ...a };
    });
    return { counts, report };
  }

  _disposeShowroomMeshes() {
    while (this.showroomGroup.children.length) {
      const ch = this.showroomGroup.children.pop();
      ch.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
  }

  _clearEl(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  _fmtDim(inVal) {
    if (!Number.isFinite(inVal)) return "NEEDING RAY'S MEASUREMENT";
    return this.getUnitSystem() === "metric"
      ? `${(inVal * IN_TO_MM).toFixed(2)} mm`
      : `${inVal.toFixed(3)} in`;
  }

  _fmtVol(cidVal) {
    if (!Number.isFinite(cidVal)) return "NEEDING RAY'S MEASUREMENT";
    return this.getUnitSystem() === "metric"
      ? `${(cidVal * IN3_TO_CM3).toFixed(1)} cc`
      : `${cidVal.toFixed(2)} CID`;
  }

  _fmtWeight(lbVal) {
    if (!Number.isFinite(lbVal)) return "NEEDING RAY'S MEASUREMENT";
    return this.getUnitSystem() === "metric"
      ? `${(lbVal * LB_TO_KG).toFixed(1)} kg`
      : `${lbVal.toFixed(1)} lb`;
  }

  _parseBankTopology(eng) {
    const cfg = String(eng.configuration || "").toUpperCase();
    const n = Number(eng.cylinders) || 0;
    if (cfg.startsWith("I") || cfg.startsWith("S") || cfg.startsWith("L")) {
      return { banks: 1, cylsPerBank: n, halfAngleRad: 0, isVeeOrFlat: false };
    }
    if (cfg.startsWith("H") || cfg.includes("FLAT") || cfg.includes("BOXER")) {
      return { banks: 2, cylsPerBank: Math.ceil(n / 2), halfAngleRad: Math.PI / 2, isVeeOrFlat: true };
    }
    if (cfg.startsWith("V") || cfg.startsWith("W")) {
      const deg = Number.isFinite(eng.bankAngleDeg) ? eng.bankAngleDeg : 90;
      return { banks: 2, cylsPerBank: Math.ceil(n / 2), halfAngleRad: THREE.MathUtils.degToRad(deg / 2), isVeeOrFlat: true };
    }
    return { banks: 1, cylsPerBank: n, halfAngleRad: 0, isVeeOrFlat: false };
  }

  rebuildShowroomModel(eng, transLink = null, transObj = null) {
    this._disposeShowroomMeshes();
    if (!eng) return;

    const audit = this.auditEngine(eng);
    this._renderPropertiesPanel(eng, audit, transLink, transObj);

    // If core cylinder/bore/stroke properties are missing, refuse to invent a fake shape.
    if (!audit.canBuildCore) {
      const datumAxes = new THREE.AxesHelper(4.0);
      this.showroomGroup.add(datumAxes);
      return;
    }

    const bore = eng.boreIn;
    const stroke = eng.strokeIn;
    const crankThrow = stroke * 0.5;
    const topo = this._parseBankTopology(eng);

    const boreSpacingMeasured = Number.isFinite(eng.boreSpacingIn) && eng.boreSpacingIn > 0;
    const boreSpacing = boreSpacingMeasured ? eng.boreSpacingIn : bore + 0.42;

    const rodMeasured = Number.isFinite(eng.rodLengthIn) && eng.rodLengthIn > 0;
    const rodLength = rodMeasured ? eng.rodLengthIn : stroke * 1.65;

    const deckMeasured = Number.isFinite(eng.deckHeightIn) && eng.deckHeightIn > 0;
    const deckHeight = deckMeasured ? eng.deckHeightIn : crankThrow + rodLength + bore * 0.38;

    const bankAngleMeasured = !topo.isVeeOrFlat || Number.isFinite(eng.bankAngleDeg);

    // Materials: Solid machined for measured specs; dashed/translucent amber for derived/missing envelopes
    const boreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, metalness: 0.45, roughness: 0.35, transparent: this.showCutaway, opacity: this.showCutaway ? 0.58 : 0.95
    });
    const pistonMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.65, roughness: 0.25 });
    const crankMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
    const rodMat = new THREE.MeshStandardMaterial({
      color: rodMeasured ? 0x64748b : 0xf59e0b,
      metalness: 0.5,
      roughness: 0.4,
      wireframe: !rodMeasured
    });
    const blockMat = new THREE.MeshStandardMaterial({
      color: deckMeasured && boreSpacingMeasured ? 0x334155 : 0xf59e0b,
      transparent: true,
      opacity: this.showCutaway ? 0.28 : (deckMeasured && boreSpacingMeasured ? 0.85 : 0.32),
      wireframe: !(deckMeasured && boreSpacingMeasured)
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: Number.isFinite(eng.headLengthIn) && bankAngleMeasured ? 0x475569 : 0xf59e0b,
      transparent: true,
      opacity: Number.isFinite(eng.headLengthIn) && bankAngleMeasured ? 0.82 : 0.35,
      wireframe: !(Number.isFinite(eng.headLengthIn) && bankAngleMeasured)
    });

    const crankCenterY = Math.max(4.0, crankThrow + bore * 0.9 + 1.5);
    const totalStationSpan = Math.max(bore, (topo.cylsPerBank - 1) * boreSpacing + bore * 1.45);
    const blockLengthZ = Number.isFinite(eng.headLengthIn) ? Math.max(totalStationSpan, eng.headLengthIn) : totalStationSpan;

    // Crankshaft centerline along Z
    const crankShaftMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(bore * 0.22, bore * 0.22, blockLengthZ + 1.2, 20),
      crankMat
    );
    crankShaftMesh.rotation.x = Math.PI / 2;
    crankShaftMesh.position.set(0, crankCenterY, 0);
    this.showroomGroup.add(crankShaftMesh);

    // Lower crankcase pan envelope (amber wireframe if pan dims unmeasured)
    const panMesh = new THREE.Mesh(
      new THREE.BoxGeometry(bore * 2.1, crankThrow + 1.2, blockLengthZ * 0.95),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, wireframe: true, transparent: true, opacity: 0.4 })
    );
    panMesh.position.set(0, crankCenterY - (crankThrow + 1.2) * 0.5 - 0.25, 0);
    this.showroomGroup.add(panMesh);

    // Build cylinders, pistons, rods, and cylinder heads per bank
    const bankCount = topo.banks;
    const bankAngles = bankCount === 2 ? [-topo.halfAngleRad, topo.halfAngleRad] : [0];
    const cylHeight = Math.max(stroke + bore * 0.55, deckHeight - crankThrow - bore * 0.2);

    bankAngles.forEach((angleRad, bIdx) => {
      const bankGroup = new THREE.Group();
      bankGroup.position.set(0, crankCenterY, 0);
      bankGroup.rotation.z = -angleRad;

      const zOffset = bankCount === 2 && bIdx === 1 ? boreSpacing * 0.22 : 0; // bank stagger approximation
      const startZ = -((topo.cylsPerBank - 1) * boreSpacing) / 2 + zOffset;

      for (let i = 0; i < topo.cylsPerBank; i++) {
        const cz = startZ + i * boreSpacing;
        const phase = ((i * 2 + bIdx) / Math.max(1, eng.cylinders)) * Math.PI * 2;
        const pistonPinY = crankThrow * Math.cos(phase) + rodLength * 0.88;

        // Cylinder Bore Sleeve (true boreIn diameter!)
        const cylGeo = new THREE.CylinderGeometry(bore / 2, bore / 2, cylHeight, 24, 1, true);
        const cylMesh = new THREE.Mesh(cylGeo, boreMat);
        cylMesh.position.set(0, deckHeight - cylHeight / 2, cz);
        bankGroup.add(cylMesh);

        // Piston crown (true boreIn * 0.97 diameter!)
        const pistonMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(bore * 0.485, bore * 0.485, bore * 0.42, 20),
          pistonMat
        );
        pistonMesh.position.set(0, Math.min(deckHeight - bore * 0.22, pistonPinY), cz);
        bankGroup.add(pistonMesh);

        // Connecting Rod
        const rodMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(bore * 0.08, bore * 0.1, rodLength, 10),
          rodMat
        );
        rodMesh.position.set(0, pistonPinY - rodLength / 2, cz);
        bankGroup.add(rodMesh);
      }

      // Bank Block Envelope
      const blockW = bore * 1.45;
      const blockMesh = new THREE.Mesh(
        new THREE.BoxGeometry(blockW, Math.max(1.0, deckHeight - crankThrow * 0.4), blockLengthZ),
        blockMat
      );
      blockMesh.position.set(0, (deckHeight + crankThrow * 0.4) / 2, 0);
      bankGroup.add(blockMesh);

      // Cylinder Head Envelope + Valvetrain Style
      const headH = Number.isFinite(eng.headHeightIn) ? eng.headHeightIn : bore * 0.95;
      const headW = Number.isFinite(eng.headWidthIn) ? eng.headWidthIn : bore * 1.55;
      const headMesh = new THREE.Mesh(new THREE.BoxGeometry(headW, headH, blockLengthZ), headMat);
      headMesh.position.set(0, deckHeight + headH / 2, 0);
      bankGroup.add(headMesh);

      const vt = String(eng.valvetrain || "").toUpperCase();
      const vcMat = new THREE.MeshStandardMaterial({
        color: vt.includes("CAMLESS") ? 0x22d3ee : 0x94a3b8,
        transparent: true,
        opacity: 0.75
      });
      if (vt.includes("DOHC")) {
        [-headW * 0.25, headW * 0.25].forEach((ox) => {
          const camCover = new THREE.Mesh(new THREE.BoxGeometry(headW * 0.36, bore * 0.34, blockLengthZ * 0.96), vcMat);
          camCover.position.set(ox, deckHeight + headH + bore * 0.17, 0);
          bankGroup.add(camCover);
        });
      } else {
        const valveCover = new THREE.Mesh(new THREE.BoxGeometry(headW * 0.72, bore * 0.36, blockLengthZ * 0.96), vcMat);
        valveCover.position.set(0, deckHeight + headH + bore * 0.18, 0);
        bankGroup.add(valveCover);
      }

      this.showroomGroup.add(bankGroup);
    });

    // Rear Flywheel & Bellhousing Flange (at rear Z = +blockLengthZ/2)
    const rearZ = blockLengthZ / 2 + 0.35;
    const fwDia = Number.isFinite(eng.flywheelDiaIn) ? eng.flywheelDiaIn : bore * 3.1;
    const fwMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(fwDia / 2, fwDia / 2, 0.55, 28),
      new THREE.MeshStandardMaterial({ color: eng.bellhousingPattern ? 0x64748b : 0xf59e0b, wireframe: !eng.bellhousingPattern })
    );
    fwMesh.rotation.x = Math.PI / 2;
    fwMesh.position.set(0, crankCenterY, rearZ);
    this.showroomGroup.add(fwMesh);

    // Mated Transmission & Optional Adapter Plate
    if (transObj) {
      let curZ = rearZ + 0.3;
      const needsAdapter = transLink?.fitment === "adapter";
      if (needsAdapter) {
        const adThickness = Number.isFinite(transLink.adapterThicknessIn) ? transLink.adapterThicknessIn : 0.75;
        const adMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(fwDia * 0.54, fwDia * 0.54, adThickness, 24),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.75 })
        );
        adMesh.rotation.x = Math.PI / 2;
        adMesh.position.set(0, crankCenterY, curZ + adThickness / 2);
        this.showroomGroup.add(adMesh);
        curZ += adThickness;
      }

      const transDimsKnown = Number.isFinite(transObj.caseLengthIn) && transObj.caseLengthIn > 0;
      const bellDepth = Number.isFinite(transObj.bellhousingDepthIn) ? transObj.bellhousingDepthIn : 6.0;
      const caseLen = transDimsKnown ? transObj.caseLengthIn : 13.0;
      const tailLen = Number.isFinite(transObj.tailshaftLengthIn) ? transObj.tailshaftLengthIn : 7.5;

      const transMat = new THREE.MeshStandardMaterial({
        color: transDimsKnown ? 0x475569 : 0xf59e0b,
        transparent: true,
        opacity: transDimsKnown ? 0.85 : 0.35,
        wireframe: !transDimsKnown
      });

      const bellMesh = new THREE.Mesh(new THREE.CylinderGeometry(fwDia * 0.35, fwDia * 0.56, bellDepth, 20), transMat);
      bellMesh.rotation.x = Math.PI / 2;
      bellMesh.position.set(0, crankCenterY, curZ + bellDepth / 2);
      this.showroomGroup.add(bellMesh);
      curZ += bellDepth;

      const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(fwDia * 0.62, fwDia * 0.68, caseLen), transMat);
      caseMesh.position.set(0, crankCenterY - 0.4, curZ + caseLen / 2);
      this.showroomGroup.add(caseMesh);
      curZ += caseLen;

      const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.5, tailLen, 16), transMat);
      tailMesh.rotation.x = Math.PI / 2;
      tailMesh.position.set(0, crankCenterY, curZ + tailLen / 2);
      this.showroomGroup.add(tailMesh);
    }

    this.onGeometryBuilt({ engine: eng, transmission: transObj, audit });
  }

  renderUi() {
    if (!this.container) return;
    this._clearEl(this.container);

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "12px";

    const summary = this.auditLibrarySummary();
    const banner = document.createElement("div");
    banner.className = this.isPreLibrarySeed || summary.counts.partial + summary.counts.blocked > 0 ? "amber-box" : "honest-note";
    banner.textContent = this.isPreLibrarySeed
      ? "Pre-Library Seed Active (SBC 350 + TH350 Direct Bolt-Up). Paste/Load the 96-engine / 34-transmission Powertrain Library to inspect all 17 brands in 3D."
      : `Powertrain Library Audit: ${summary.counts.total} Engines | ${summary.counts.full} Complete Parametric | ${summary.counts.partial} Partial (Amber Envelope — Missing Measurements) | ${summary.counts.blocked} Blocked (Needs Drawings).`;
    wrap.appendChild(banner);

    const filterRow = document.createElement("div");
    filterRow.className = "field-row";

    const brandSel = document.createElement("select");
    const engSel = document.createElement("select");
    const transSel = document.createElement("select");
    const cutawayChk = document.createElement("input");
    cutawayChk.type = "checkbox";
    cutawayChk.checked = this.showCutaway;

    const brands = ["All Brands", ...Array.from(new Set(this.engines.map((e) => e.brand || "Unknown"))).sort()];
    brands.forEach((b) => {
      const o = document.createElement("option");
      o.value = b;
      o.textContent = b;
      brandSel.appendChild(o);
    });

    const mkField = (title, control) => {
      const lbl = document.createElement("label");
      lbl.className = "field";
      const sp = document.createElement("span");
      sp.textContent = title;
      lbl.append(sp, control);
      return lbl;
    };

    filterRow.append(
      mkField("1. Brand Filter", brandSel),
      mkField("2. Engine Model (Rebuilds 3D)", engSel),
      mkField("3. Compatible Transmission", transSel)
    );
    wrap.appendChild(filterRow);

    const cutLbl = document.createElement("label");
    cutLbl.className = "inline-check";
    const cutTxt = document.createElement("span");
    cutTxt.textContent = "Show Block Cutaway (True Bore Cylinders, Pistons, Rods & Crank Throw)";
    cutLbl.append(cutawayChk, cutTxt);
    wrap.appendChild(cutLbl);

    const propsHost = document.createElement("div");
    propsHost.className = "telemetry-box";
    wrap.appendChild(propsHost);

    this.uiRefs = { brandSel, engSel, transSel, cutawayChk, propsHost };
    this.container.appendChild(wrap);

    const populateEngines = () => {
      this._clearEl(engSel);
      const b = brandSel.value;
      const list = b === "All Brands" ? this.engines : this.engines.filter((e) => (e.brand || "Unknown") === b);
      list.forEach((e) => {
        const o = document.createElement("option");
        o.value = e.id;
        o.textContent = `${e.brand ? `${e.brand} — ` : ""}${e.name}`;
        engSel.appendChild(o);
      });
      populateTransmissions();
    };

    const populateTransmissions = () => {
      this._clearEl(transSel);
      const eng = this.engines.find((e) => e.id === engSel.value);
      const compat = Array.isArray(eng?.compatibleTransmissions) ? eng.compatibleTransmissions : [];
      if (compat.length === 0) {
        const o = document.createElement("option");
        o.value = "";
        o.textContent = "No compatibleTransmissions listed (NEEDING VERIFICATION)";
        transSel.appendChild(o);
      } else {
        compat.forEach((c) => {
          const tObj = this.transmissions.find((t) => t.id === c.transmissionId);
          const tag = c.fitment === "direct" ? "DIRECT BOLT-UP" : "ADAPTER REQUIRED";
          const o = document.createElement("option");
          o.value = c.transmissionId;
          o.textContent = `${tObj?.name || c.transmissionId} [${tag}]`;
          transSel.appendChild(o);
        });
      }
      triggerRebuild();
    };

    const triggerRebuild = () => {
      const eng = this.engines.find((e) => e.id === engSel.value);
      const transLink = (eng?.compatibleTransmissions || []).find((c) => c.transmissionId === transSel.value) || null;
      const transObj = this.transmissions.find((t) => t.id === transSel.value) || null;
      this.rebuildShowroomModel(eng, transLink, transObj);
    };

    brandSel.onchange = populateEngines;
    engSel.onchange = populateTransmissions;
    transSel.onchange = triggerRebuild;
    cutawayChk.onchange = () => {
      this.showCutaway = cutawayChk.checked;
      triggerRebuild();
    };

    this._populateEnginesFn = populateEngines;
    this._populateTransmissionsFn = populateTransmissions;
  }

  selectDefaultEngineAndTransmission() {
    if (!this.uiRefs || this.engines.length === 0) return;
    this._populateEnginesFn();
    const sbc = this.engines.find((e) => /sbc.?350/i.test(e.id) || /sbc\s*350/i.test(e.name));
    if (sbc) {
      this.uiRefs.engSel.value = sbc.id;
      this._populateTransmissionsFn();
      const th350Opt = Array.from(this.uiRefs.transSel.options).find((o) => /th350/i.test(o.value) || /th350/i.test(o.textContent));
      if (th350Opt) {
        this.uiRefs.transSel.value = th350Opt.value;
        this.uiRefs.transSel.onchange();
      }
    }
  }

  _renderPropertiesPanel(eng, audit, transLink, transObj) {
    const host = this.uiRefs?.propsHost;
    if (!host) return;
    this._clearEl(host);

    const statusLine = document.createElement("div");
    statusLine.className = audit.tier === "FULL_PARAMETRIC" ? "ok-text" : "amber-text";
    statusLine.style.marginBottom = "8px";
    statusLine.textContent =
      audit.tier === "FULL_PARAMETRIC"
        ? "3D Geometry Status: FULL PARAMETRIC ENGINE BUILT FROM VERIFIED DIMENSIONS"
        : audit.tier === "PARTIAL_AMBER_ENVELOPE"
          ? `3D Geometry Status: PARTIAL CUTAWAY (Amber wireframe = missing/derived fields: ${audit.missing.join(", ")})`
          : `3D Geometry Status: REFUSED TO INVENT SHAPE (Missing core data: ${audit.missing.join(", ")})`;
    host.appendChild(statusLine);

    audit.warnings.forEach((w) => {
      const warnEl = document.createElement("div");
      warnEl.className = "amber-box";
      warnEl.style.marginBottom = "8px";
      warnEl.textContent = w;
      host.appendChild(warnEl);
    });

    const rows = [
      ["Brand / Engine", `${eng.brand || "Unknown"} · ${eng.name}`, eng.sources?.name || "Library Entry"],
      ["Configuration / Cylinders", `${eng.configuration || "NEEDING RAY'S MEASUREMENT"} (${eng.cylinders || "?"} cyl)`, eng.sources?.configuration || "Library Entry"],
      ["Bore", this._fmtDim(eng.boreIn), eng.sources?.boreIn || (Number.isFinite(eng.boreIn) ? "Library Entry" : "NEEDING RAY'S MEASUREMENT")],
      ["Stroke", this._fmtDim(eng.strokeIn), eng.sources?.strokeIn || (Number.isFinite(eng.strokeIn) ? "Library Entry" : "NEEDING RAY'S MEASUREMENT")],
      ["Listed / Calculated Displacement", `${this._fmtVol(eng.displacementCid)} (Calc: ${this._fmtVol(audit.calcCid)})`, eng.sources?.displacementCid || "Library Entry"],
      ["Bore Spacing", this._fmtDim(eng.boreSpacingIn), eng.sources?.boreSpacingIn || (Number.isFinite(eng.boreSpacingIn) ? "Library Entry" : "NEEDING RAY'S MEASUREMENT")],
      ["Deck Height", this._fmtDim(eng.deckHeightIn), eng.sources?.deckHeightIn || (Number.isFinite(eng.deckHeightIn) ? "Library Entry" : "NEEDING RAY'S MEASUREMENT")],
      ["Connecting Rod Length", this._fmtDim(eng.rodLengthIn), eng.sources?.rodLengthIn || (Number.isFinite(eng.rodLengthIn) ? "Library Entry" : "NEEDING RAY'S MEASUREMENT")],
      ["Bank Angle", Number.isFinite(eng.bankAngleDeg) ? `${eng.bankAngleDeg} deg` : "NEEDING RAY'S MEASUREMENT", eng.sources?.bankAngleDeg || "Library Entry"],
      ["Firing Order", Array.isArray(eng.firingOrder) ? eng.firingOrder.join("-") : "NEEDING RAY'S MEASUREMENT", eng.sources?.firingOrder || "Library Entry"],
      ["Bellhousing Pattern", eng.bellhousingPattern || "NEEDING RAY'S MEASUREMENT", eng.sources?.bellhousingPattern || "Library Entry"],
      ["Mated Transmission", transObj ? `${transObj.name} (${transLink?.fitment === "direct" ? "Direct Bolt-Up" : "Adapter Required"})` : "None Selected", transObj?.source || "Library Compatibility"],
      ["Transmission Case Length", this._fmtDim(transObj?.caseLengthIn), transObj?.source || "NEEDING RAY'S MEASUREMENT"],
      ["Transmission Weight", this._fmtWeight(transObj?.weightLb), transObj?.source || "NEEDING RAY'S MEASUREMENT"]
    ];

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.fontSize = "11px";

    rows.forEach(([k, v, src]) => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #1e293b";
      const td1 = document.createElement("td");
      td1.style.padding = "5px 6px";
      td1.style.color = "#94a3b8";
      td1.textContent = k;

      const td2 = document.createElement("td");
      td2.style.padding = "5px 6px";
      td2.style.color = String(v).includes("NEEDING RAY'S MEASUREMENT") ? "#fbbf24" : "#f8fafc";
      td2.style.fontWeight = "600";
      td2.textContent = v;

      const td3 = document.createElement("td");
      td3.style.padding = "5px 6px";
      td3.style.color = String(src).includes("NEEDING") || String(src).includes("PROVISIONAL") ? "#fbbf24" : "#94a3b8";
      td3.textContent = src;

      tr.append(td1, td2, td3);
      table.appendChild(tr);
    });
    host.appendChild(table);
  }
}