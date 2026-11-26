/**
 * 2D Plan / Profile Summary & Thickness Indicator SVG Renderer (v19.0.0 — Quantum Aerospace Design Studio)
 * - Honest scope: renders an unscaled fit-to-view 2D plan polygon, hole/slot cutouts, conceptual
 *   datum markers (A|B|C), and an unscaled thickness indicator bar.
 * - NOT a scaled third-angle orthographic, isometric, or true cross-section drawing (interactive
 *   Plan / Section A-A / Detail CAD drafting with Draft <-> 3D transfer runs in Room 3: 2D Drafting).
 * - DOM security: builds all HTML & SVG nodes via createElement / createElementNS + textContent (zero innerHTML).
 * - Internal geometry units: strictly inches (metric values labeled as display-only conversions).
 */
export class DrawingSheetRendererV19 {
  constructor(containerEl) {
    this.container = containerEl;
    this.svgNs = "http://www.w3.org/2000/svg";
  }

  _clearContainer() {
    if (!this.container) return;
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }

  _svgEl(tag, attrs = {}, text = null) {
    const el = document.createElementNS(this.svgNs, tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    if (text !== null && text !== undefined) {
      el.textContent = String(text);
    }
    return el;
  }

  _renderMessage(msg, isError = false) {
    this._clearContainer();
    const div = document.createElement("div");
    div.style.fontSize = "12px";
    div.style.padding = "8px";
    div.style.color = isError ? "#fca5a5" : "#94a3b8";
    div.textContent = msg;
    this.container.appendChild(div);
  }

  renderSheet({
    title = null,
    standard = null,
    material = null,
    unitSystem = "imperial",
    outerLoop = [],
    features = [],
    metrics = null
  } = {}) {
    if (!this.container) return;

    if (!Array.isArray(outerLoop) || outerLoop.length === 0) {
      this._renderMessage(
        "Sketch, draft, or load a preset profile (at least 3 vertices) to preview the 2D plan summary."
      );
      return;
    }

    if (outerLoop.length < 3) {
      this._renderMessage(
        `Invalid outerLoop: expected at least 3 vertices, received ${outerLoop.length}.`,
        true
      );
      return;
    }

    // Strict input validation (Flag 6)
    for (let i = 0; i < outerLoop.length; i++) {
      const p = outerLoop[i];
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        const msg = `Invalid coordinate in outerLoop[${i}]: (${p?.x}, ${p?.y}). Expected finite numbers (in.).`;
        this._renderMessage(msg, true);
        throw new Error(msg);
      }
    }

    const validFeatures = [];
    const UNVERIFIED_FALLBACK_HOLE_DIA_IN = 0.3125; // Matches index.html & webgpuComputeEngineV19
    let hasUnverifiedFeatureDefault = false;

    for (let i = 0; i < (Array.isArray(features) ? features.length : 0); i++) {
      const f = features[i];
      if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y)) {
        const msg = `Invalid feature[${i}] center coordinates: (${f?.x}, ${f?.y}).`;
        this._renderMessage(msg, true);
        throw new Error(msg);
      }
      if (f.kind === "oblong_slot") {
        if (!Number.isFinite(f.lengthIn) || !Number.isFinite(f.widthIn) || f.widthIn <= 0 || f.lengthIn < f.widthIn) {
          const msg = `Invalid oblong_slot feature[${i}] (${f.id || "slot"}): lengthIn=${f.lengthIn}, widthIn=${f.widthIn}.`;
          this._renderMessage(msg, true);
          throw new Error(msg);
        }
        const ang = f.angleDeg === undefined ? 0 : f.angleDeg;
        if (!Number.isFinite(ang)) {
          const msg = `Invalid oblong_slot angleDeg=${f.angleDeg} on feature[${i}].`;
          this._renderMessage(msg, true);
          throw new Error(msg);
        }
        validFeatures.push({ ...f, angleDeg: ang, isUnverifiedDefault: false });
      } else {
        const hasDia = Number.isFinite(f.diameterIn) && f.diameterIn > 0;
        if (!hasDia) hasUnverifiedFeatureDefault = true;
        validFeatures.push({
          ...f,
          diameterIn: hasDia ? f.diameterIn : UNVERIFIED_FALLBACK_HOLE_DIA_IN,
          isUnverifiedDefault: !hasDia || (Array.isArray(f.defaultsUsed) && f.defaultsUsed.length > 0)
        });
      }
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of outerLoop) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    const rawSpanX = maxX - minX;
    const rawSpanY = maxY - minY;
    if (rawSpanX <= 1e-6 || rawSpanY <= 1e-6) {
      this._renderMessage("Degenerate profile: contour spans zero width or height.", true);
      return;
    }

    const isMetricDisplay = unitSystem === "metric";
    const scaleFactor = isMetricDisplay ? 25.4 : 1;
    const displayUnitShort = isMetricDisplay ? "mm" : "in.";
    const unitsHonestLabel = isMetricDisplay ? "in. internal, displayed in mm" : "in. (Imperial internal)";

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const viewBoxW = 260;
    const viewBoxH = 122;
    const planCenterX = 72;
    const planCenterY = 58;
    const pxScale = Math.min(106 / rawSpanX, 66 / rawSpanY);

    const hasThickness = Number.isFinite(metrics?.thicknessIn) && metrics.thicknessIn > 0;
    const widthDisplay = (rawSpanX * scaleFactor).toFixed(2);
    const heightDisplay = (rawSpanY * scaleFactor).toFixed(2);
    const thickDisplay = hasThickness
      ? `${(metrics.thicknessIn * scaleFactor).toFixed(2)} ${displayUnitShort}`
      : "NOT SUPPLIED";

    const resolvedTitle = title && String(title).trim()
      ? String(title).trim()
      : "UNSPECIFIED PART (Default Preview)";
    const resolvedMaterial = material && String(material).trim()
      ? String(material).trim()
      : "UNSPECIFIED MATERIAL (Needs Selection)";
    const resolvedStandard = standard && String(standard).trim()
      ? String(standard).trim()
      : "NO STANDARD SELECTED (Ref Only)";

    this._clearContainer();

    // Header row (DOM API only — zero innerHTML)
    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.justifyContent = "space-between";
    headerRow.style.alignItems = "center";
    headerRow.style.flexWrap = "wrap";
    headerRow.style.gap = "6px";
    headerRow.style.fontSize = "11px";
    headerRow.style.color = "#93c5fd";
    headerRow.style.marginBottom = "6px";

    const leftHdr = document.createElement("span");
    const leftBold = document.createElement("strong");
    leftBold.textContent = "2D Plan / Profile Summary (Fit-to-View): ";
    leftHdr.appendChild(leftBold);
    leftHdr.appendChild(document.createTextNode(resolvedTitle));

    const rightHdr = document.createElement("span");
    rightHdr.style.color = hasThickness ? "#cbd5e1" : "#fbbf24";
    rightHdr.textContent =
      `Envelope: ${widthDisplay} x ${heightDisplay} ${displayUnitShort} | Thick: ${thickDisplay} | ${unitsHonestLabel}`;

    headerRow.append(leftHdr, rightHdr);
    this.container.appendChild(headerRow);

    // SVG Sheet (strictly createElementNS)
    const svg = this._svgEl("svg", {
      viewBox: `0 0 ${viewBoxW} ${viewBoxH}`,
      width: 560,
      style: "width:100%;max-width:100%;height:auto;background:#090d16;border:1px solid #1e293b;border-radius:6px;display:block;"
    });

    // Sheet Border
    svg.appendChild(this._svgEl("rect", {
      x: 3, y: 3, width: viewBoxW - 6, height: viewBoxH - 6,
      fill: "none", stroke: "#334155", "stroke-width": 0.6
    }));

    // Plan View Header
    svg.appendChild(this._svgEl("text", {
      x: planCenterX, y: 14, fill: "#94a3b8", "font-size": 5.2, "text-anchor": "middle"
    }, `PLAN / PROFILE (Fit-to-View · ${unitsHonestLabel})`));

    // Conceptual Datum Axes B (Bottom Baseline) & C (Left Baseline) drawn explicitly in SVG
    const leftEdgeX = planCenterX + (minX - cx) * pxScale;
    const bottomEdgeY = planCenterY - (minY - cy) * pxScale;

    svg.appendChild(this._svgEl("line", {
      x1: leftEdgeX - 8, y1: bottomEdgeY, x2: leftEdgeX + rawSpanX * pxScale + 6, y2: bottomEdgeY,
      stroke: "#475569", "stroke-width": 0.5, "stroke-dasharray": "2,1.5"
    }));
    svg.appendChild(this._svgEl("rect", {
      x: leftEdgeX - 11, y: bottomEdgeY - 3.5, width: 7, height: 7,
      fill: "#0f172a", stroke: "#f59e0b", "stroke-width": 0.5
    }));
    svg.appendChild(this._svgEl("text", {
      x: leftEdgeX - 7.5, y: bottomEdgeY + 1.8, fill: "#fcd34d", "font-size": 4.4, "text-anchor": "middle"
    }, "B"));

    svg.appendChild(this._svgEl("line", {
      x1: leftEdgeX, y1: bottomEdgeY + 8, x2: leftEdgeX, y2: bottomEdgeY - rawSpanY * pxScale - 6,
      stroke: "#475569", "stroke-width": 0.5, "stroke-dasharray": "2,1.5"
    }));
    svg.appendChild(this._svgEl("rect", {
      x: leftEdgeX - 3.5, y: bottomEdgeY + 9, width: 7, height: 7,
      fill: "#0f172a", stroke: "#f59e0b", "stroke-width": 0.5
    }));
    svg.appendChild(this._svgEl("text", {
      x: leftEdgeX, y: bottomEdgeY + 14.3, fill: "#fcd34d", "font-size": 4.4, "text-anchor": "middle"
    }, "C"));

    // Outer Polygon
    const polyPoints = outerLoop
      .map((p) => {
        const vx = planCenterX + (p.x - cx) * pxScale;
        const vy = planCenterY - (p.y - cy) * pxScale;
        return `${vx.toFixed(2)},${vy.toFixed(2)}`;
      })
      .join(" ");

    svg.appendChild(this._svgEl("polygon", {
      points: polyPoints,
      fill: "rgba(56,189,248,0.12)",
      stroke: "#e2e8f0",
      "stroke-width": 1.1
    }));

    // Hole & Slot Cutout Features
    validFeatures.forEach((f) => {
      const fx = planCenterX + (f.x - cx) * pxScale;
      const fy = planCenterY - (f.y - cy) * pxScale;
      const strokeCol = f.isUnverifiedDefault ? "#f59e0b" : "#38bdf8";

      if (f.kind === "oblong_slot") {
        const rw = Math.max(2, f.lengthIn * pxScale);
        const rh = Math.max(2, f.widthIn * pxScale);
        const attrs = {
          x: (fx - rw / 2).toFixed(2),
          y: (fy - rh / 2).toFixed(2),
          width: rw.toFixed(2),
          height: rh.toFixed(2),
          rx: (rh / 2).toFixed(2),
          fill: "none",
          stroke: strokeCol,
          "stroke-width": 0.9,
          transform: `rotate(${-f.angleDeg} ${fx.toFixed(2)} ${fy.toFixed(2)})`
        };
        if (f.isUnverifiedDefault) attrs["stroke-dasharray"] = "1.5,1";
        svg.appendChild(this._svgEl("rect", attrs));
      } else {
        const hr = Math.max(1.2, (f.diameterIn / 2) * pxScale);
        const attrs = {
          cx: fx.toFixed(2),
          cy: fy.toFixed(2),
          r: hr.toFixed(2),
          fill: "none",
          stroke: strokeCol,
          "stroke-width": 0.9
        };
        if (f.isUnverifiedDefault) attrs["stroke-dasharray"] = "1.5,1";
        svg.appendChild(this._svgEl("circle", attrs));
      }
    });

    // Unscaled Thickness Indicator (NOT a section view; no invented 0.5 / 12.70 default)
    svg.appendChild(this._svgEl("text", {
      x: 192, y: 14, fill: "#94a3b8", "font-size": 4.9, "text-anchor": "middle"
    }, "THICKNESS INDICATOR (Unscaled)"));

    if (hasThickness) {
      const barH = Math.max(4, Math.min(44, metrics.thicknessIn * pxScale));
      const barY = 44 - barH / 2;
      svg.appendChild(this._svgEl("rect", {
        x: 170, y: barY.toFixed(2), width: 44, height: barH.toFixed(2),
        fill: "rgba(74,222,128,0.14)", stroke: "#4ade80", "stroke-width": 0.9
      }));
      // Conceptual Datum A on bottom face
      svg.appendChild(this._svgEl("rect", {
        x: 158, y: (barY + barH - 3.5).toFixed(2), width: 7, height: 7,
        fill: "#0f172a", stroke: "#f59e0b", "stroke-width": 0.5
      }));
      svg.appendChild(this._svgEl("text", {
        x: 161.5, y: (barY + barH + 1.8).toFixed(2), fill: "#fcd34d", "font-size": 4.4, "text-anchor": "middle"
      }, "A"));
      svg.appendChild(this._svgEl("text", {
        x: 192, y: (barY + barH + 8).toFixed(2), fill: "#cbd5e1", "font-size": 4.5, "text-anchor": "middle"
      }, `t = ${thickDisplay}`));
    } else {
      svg.appendChild(this._svgEl("rect", {
        x: 162, y: 31, width: 60, height: 22,
        fill: "rgba(245,158,11,0.08)", stroke: "#f59e0b", "stroke-width": 0.7, "stroke-dasharray": "2,1.5"
      }));
      svg.appendChild(this._svgEl("text", {
        x: 192, y: 43.5, fill: "#fcd34d", "font-size": 4.4, "text-anchor": "middle"
      }, "THICKNESS NOT SUPPLIED"));
    }

    // Honest Title Block
    svg.appendChild(this._svgEl("rect", {
      x: 138, y: 69, width: 117, height: 48,
      fill: "#0f172a", stroke: "#475569", "stroke-width": 0.6
    }));

    const matIsDefault = !material || !String(material).trim();
    svg.appendChild(this._svgEl("text", {
      x: 142, y: 76.5, fill: matIsDefault ? "#fcd34d" : "#f8fafc", "font-size": 4.6, "font-weight": "bold"
    }, resolvedMaterial.slice(0, 34)));

    svg.appendChild(this._svgEl("text", {
      x: 142, y: 83.5, fill: "#93c5fd", "font-size": 4.0
    }, resolvedStandard.slice(0, 38)));

    svg.appendChild(this._svgEl("text", {
      x: 142, y: 90.5, fill: "#fbbf24", "font-size": 3.8
    }, "NOT CERTIFIED FRAMEWORK REFS · JSON PACKET (NOT STEP)"));

    svg.appendChild(this._svgEl("text", {
      x: 142, y: 97.5, fill: "#cbd5e1", "font-size": 4.0
    }, `Scale: Unscaled Fit-to-View | Conceptual Datums A|B|C`));

    svg.appendChild(this._svgEl("text", {
      x: 142, y: 104.5, fill: hasUnverifiedFeatureDefault ? "#fbbf24" : "#cbd5e1", "font-size": 4.0
    }, `Features: ${validFeatures.length}${hasUnverifiedFeatureDefault ? " (Amber = Unverified Default)" : ""}`));

    svg.appendChild(this._svgEl("text", {
      x: 142, y: 111.5, fill: "#94a3b8", "font-size": 3.9
    }, `Units: ${unitsHonestLabel}`));

    this.container.appendChild(svg);
  }
}