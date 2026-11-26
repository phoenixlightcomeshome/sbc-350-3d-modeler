/**
 * 2D Plan / Profile Summary & Thickness Indicator SVG Renderer (v20.0.0)
 *
 * Honesty & Scope Notice:
 * - Renders an unscaled fit-to-view 2D plan/profile contour, conceptual datum
 *   markers (A|B|C), and an unscaled-width thickness indicator box.
 * - Explicitly NOT a scaled third-angle orthographic projection, isometric view,
 *   or true cross-section engineering drawing.
 * - Uses DOM createElement / createElementNS + textContent exclusively (0 innerHTML).
 * - Internal geometry coordinates are strictly in inches; metric display mode
 *   converts dimension labels only ("in. internal, displayed in mm").
 * - Referenced standards are framework references only (NOT Certified), and
 *   MBD exports are JSON packets (NOT Native STEP).
 */
const SVG_NS = "http://www.w3.org/2000/svg";

export class DrawingSheetRendererV20 {
  constructor(containerEl) {
    this.container = containerEl;
  }

  _clearNode(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  _el(tag, text = "", styles = {}) {
    const el = document.createElement(tag);
    if (text !== undefined && text !== null && text !== "") {
      el.textContent = String(text);
    }
    Object.assign(el.style, styles);
    return el;
  }

  _svgEl(tag, attrs = {}, text = "") {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v !== undefined && v !== null) el.setAttribute(k, String(v));
    });
    if (text !== undefined && text !== null && text !== "") {
      el.textContent = String(text);
    }
    return el;
  }

  renderSheet({
    title = null,
    standard = null,
    material = null,
    materialSpec = null,
    processCode = null,
    unitSystem = "imperial",
    outerLoop = [],
    features = [],
    metrics = null
  } = {}) {
    if (!this.container) return;
    this._clearNode(this.container);

    const hasTitle = Boolean(title && String(title).trim());
    const hasMaterial = Boolean(material && String(material).trim());
    const hasStandard = Boolean(standard && String(standard).trim());
    const derivedProc = processCode && String(processCode).trim()
      ? String(processCode).trim()
      : (materialSpec?.recommended3dpProcess ? String(materialSpec.recommended3dpProcess).toUpperCase() : null);

    const displayTitle = hasTitle ? String(title).trim() : "UNSPECIFIED PART (Default Preview)";
    const displayMaterial = hasMaterial ? String(material).trim() : "UNSPECIFIED MATERIAL (Needs Selection)";
    const displayStandard = hasStandard ? String(standard).trim() : "NO STANDARD SELECTED (Ref Only)";
    const displayProcess = derivedProc || "NO 3DP PROCESS SELECTED";

    if (!Array.isArray(outerLoop) || outerLoop.length < 3) {
      this.container.appendChild(
        this._el(
          "div",
          "Sketch or load a closed profile (>= 3 vertices) to preview the 2D Plan/Profile Summary + Thickness Indicator.",
          { fontSize: "12px", color: "#94a3b8", padding: "8px" }
        )
      );
      return;
    }

    for (let i = 0; i < outerLoop.length; i++) {
      const p = outerLoop[i];
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        this.container.appendChild(
          this._el(
            "div",
            `Invalid or non-finite outerLoop vertex at index ${i} — refusing to render NaN SVG geometry.`,
            {
              fontSize: "12px",
              color: "#fbbf24",
              padding: "8px",
              border: "1px dashed #f59e0b",
              borderRadius: "5px"
            }
          )
        );
        return;
      }
    }

    const isMetric = unitSystem === "metric";
    const scaleFactor = isMetric ? 25.4 : 1;
    const unitShort = isMetric ? "mm" : "in.";
    const unitNotice = isMetric ? "in. internal, displayed in mm" : "in. (internal inches)";

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of outerLoop) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const realSpanX = Math.max(0, maxX - minX);
    const realSpanY = Math.max(0, maxY - minY);
    const renderSpanX = Math.max(realSpanX, 0.05);
    const renderSpanY = Math.max(realSpanY, 0.05);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const svgW = 560;
    const viewBoxW = 260;
    const viewBoxH = 128;
    const pxScale = Math.min(106 / renderSpanX, 66 / renderSpanY);

    const mapPt = (x, y) => {
      const vx = 74 + (x - cx) * pxScale;
      const vy = 58 - (y - cy) * pxScale;
      return `${vx.toFixed(2)},${vy.toFixed(2)}`;
    };

    const hasThickness = Number.isFinite(metrics?.thicknessIn) && metrics.thicknessIn > 0;
    const widthVal = (realSpanX * scaleFactor).toFixed(2);
    const heightVal = (realSpanY * scaleFactor).toFixed(2);
    const thickHeaderStr = hasThickness
      ? `${(metrics.thicknessIn * scaleFactor).toFixed(2)} ${unitShort}`
      : "THICKNESS NOT SUPPLIED";

    const headerRow = this._el("div", "", {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "6px",
      fontSize: "11px",
      color: "#cbd5e1",
      marginBottom: "6px"
    });
    const leftSpan = this._el("span");
    leftSpan.appendChild(this._el("strong", "2D Plan / Profile Summary + Thickness Indicator (Fit-to-View — Unscaled): "));
    leftSpan.appendChild(document.createTextNode(`${displayTitle} (${displayProcess})`));
    const rightSpan = this._el(
      "span",
      `Conceptual Datum [A|B|C] · ${widthVal} x ${heightVal} ${unitShort} · T: ${thickHeaderStr}`,
      { color: hasThickness ? "#cbd5e1" : "#fbbf24" }
    );
    headerRow.appendChild(leftSpan);
    headerRow.appendChild(rightSpan);
    this.container.appendChild(headerRow);

    const svg = this._svgEl("svg", {
      viewBox: `0 0 ${viewBoxW} ${viewBoxH}`,
      width: svgW
    });
    Object.assign(svg.style, {
      width: "100%",
      maxWidth: "100%",
      height: "auto",
      background: "#090d16",
      border: "1px solid #1e293b",
      borderRadius: "5px",
      display: "block"
    });

    svg.appendChild(this._svgEl("rect", {
      x: 3, y: 3, width: viewBoxW - 6, height: viewBoxH - 6,
      fill: "none", stroke: "#334155", "stroke-width": 0.6
    }));
    svg.appendChild(this._svgEl("text", {
      x: 74, y: 12, fill: "#94a3b8", "font-size": 4.8, "text-anchor": "middle"
    }, `PLAN / PROFILE (Fit-to-View — Unscaled · ${unitShort})`));
    svg.appendChild(this._svgEl("text", {
      x: 74, y: 18, fill: "#fbbf24", "font-size": 3.8, "text-anchor": "middle"
    }, "NOT a scaled 3rd-angle orthographic, isometric, or true section drawing"));
    svg.appendChild(this._svgEl("text", {
      x: 168, y: 12, fill: "#94a3b8", "font-size": 4.8, "text-anchor": "middle"
    }, "THICKNESS INDICATOR"));
    svg.appendChild(this._svgEl("text", {
      x: 168, y: 17.5, fill: "#94a3b8", "font-size": 3.8, "text-anchor": "middle"
    }, "(Unscaled Width)"));

    const polyPoints = outerLoop.map((p) => mapPt(p.x, p.y)).join(" ");
    svg.appendChild(this._svgEl("polygon", {
      points: polyPoints,
      fill: "rgba(148, 163, 184, 0.12)",
      stroke: "#e2e8f0",
      "stroke-width": 1.0
    }));

    const leftEdgeVx = 74 + (minX - cx) * pxScale;
    const rightEdgeVx = 74 + (maxX - cx) * pxScale;
    const topEdgeVy = 58 - (maxY - cy) * pxScale;
    const botEdgeVy = 58 - (minY - cy) * pxScale;

    svg.appendChild(this._svgEl("line", {
      x1: leftEdgeVx.toFixed(2), y1: (botEdgeVy + 3).toFixed(2),
      x2: rightEdgeVx.toFixed(2), y2: (botEdgeVy + 3).toFixed(2),
      stroke: "#f59e0b", "stroke-width": 0.6, "stroke-dasharray": "2,1.5"
    }));
    svg.appendChild(this._svgEl("rect", {
      x: (74 - 4).toFixed(2), y: (botEdgeVy + 4.5).toFixed(2),
      width: 8, height: 6.5, fill: "#0f172a", stroke: "#f59e0b", "stroke-width": 0.6
    }));
    svg.appendChild(this._svgEl("text", {
      x: 74, y: (botEdgeVy + 9.2).toFixed(2),
      fill: "#fbbf24", "font-size": 4.3, "text-anchor": "middle"
    }, "B"));

    svg.appendChild(this._svgEl("line", {
      x1: (leftEdgeVx - 3).toFixed(2), y1: topEdgeVy.toFixed(2),
      x2: (leftEdgeVx - 3).toFixed(2), y2: botEdgeVy.toFixed(2),
      stroke: "#f59e0b", "stroke-width": 0.6, "stroke-dasharray": "2,1.5"
    }));
    svg.appendChild(this._svgEl("rect", {
      x: (leftEdgeVx - 12).toFixed(2), y: (58 - 3.25).toFixed(2),
      width: 8, height: 6.5, fill: "#0f172a", stroke: "#f59e0b", "stroke-width": 0.6
    }));
    svg.appendChild(this._svgEl("text", {
      x: (leftEdgeVx - 8).toFixed(2), y: (58 + 1.5).toFixed(2),
      fill: "#fbbf24", "font-size": 4.3, "text-anchor": "middle"
    }, "C"));

    svg.appendChild(this._svgEl("text", {
      x: 74, y: (botEdgeVy + 16).toFixed(2),
      fill: "#fbbf24", "font-size": 3.8, "text-anchor": "middle"
    }, "Conceptual Datum A|B|C (Unmeasured)"));

    let unverifiedFeatureCount = 0;
    const safeFeatures = Array.isArray(features) ? features : [];
    safeFeatures.forEach((f) => {
      if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y)) return;
      const sx = 74 + (f.x - cx) * pxScale;
      const sy = 58 - (f.y - cy) * pxScale;

      if (f.kind === "oblong_slot") {
        if (!Number.isFinite(f.lengthIn) || !Number.isFinite(f.widthIn) || f.lengthIn <= 0 || f.widthIn <= 0) return;
        const angle = Number.isFinite(f.angleDeg) ? f.angleDeg : 0;
        const rw = Math.max(2, f.lengthIn * pxScale);
        const rh = Math.max(2, f.widthIn * pxScale);
        const isUnverified = Boolean(f.unverifiedDefaultUsed);
        if (isUnverified) unverifiedFeatureCount++;
        svg.appendChild(this._svgEl("rect", {
          x: (sx - rw / 2).toFixed(2),
          y: (sy - rh / 2).toFixed(2),
          width: rw.toFixed(2),
          height: rh.toFixed(2),
          rx: (rh / 2).toFixed(2),
          fill: "none",
          stroke: isUnverified ? "#fbbf24" : "#94a3b8",
          "stroke-width": 0.85,
          "stroke-dasharray": isUnverified ? "2.5,1.5" : null,
          transform: `rotate(${-angle} ${sx.toFixed(2)} ${sy.toFixed(2)})`
        }));
      } else {
        const hasExplicitDia = Number.isFinite(f.diameterIn) && f.diameterIn > 0;
        const dia = hasExplicitDia ? f.diameterIn : 0.3125;
        const isUnverified = !hasExplicitDia || Boolean(f.unverifiedDefaultUsed);
        if (isUnverified) unverifiedFeatureCount++;
        const hr = Math.max(1.2, (dia / 2) * pxScale);
        svg.appendChild(this._svgEl("circle", {
          cx: sx.toFixed(2),
          cy: sy.toFixed(2),
          r: hr.toFixed(2),
          fill: "none",
          stroke: isUnverified ? "#fbbf24" : "#94a3b8",
          "stroke-width": 0.85,
          "stroke-dasharray": isUnverified ? "2.5,1.5" : null
        }));
      }
    });

    if (hasThickness) {
      const boxH = Math.max(4, Math.min(54, metrics.thicknessIn * pxScale));
      svg.appendChild(this._svgEl("rect", {
        x: 151,
        y: (52 - boxH / 2).toFixed(2),
        width: 34,
        height: boxH.toFixed(2),
        fill: "rgba(74, 222, 128, 0.14)",
        stroke: "#4ade80",
        "stroke-width": 0.9
      }));
      svg.appendChild(this._svgEl("text", {
        x: 168, y: (52 + boxH / 2 + 6).toFixed(2),
        fill: "#4ade80", "font-size": 4.0, "text-anchor": "middle"
      }, `T = ${thickHeaderStr}`));
    } else {
      svg.appendChild(this._svgEl("rect", {
        x: 147,
        y: 38,
        width: 42,
        height: 24,
        fill: "rgba(245, 158, 11, 0.08)",
        stroke: "#f59e0b",
        "stroke-width": 0.85,
        "stroke-dasharray": "3,2"
      }));
      svg.appendChild(this._svgEl("text", {
        x: 168, y: 49,
        fill: "#fbbf24", "font-size": 3.8, "text-anchor": "middle"
      }, "THICKNESS"));
      svg.appendChild(this._svgEl("text", {
        x: 168, y: 55,
        fill: "#fbbf24", "font-size": 3.8, "text-anchor": "middle"
      }, "NOT SUPPLIED"));
    }

    svg.appendChild(this._svgEl("rect", {
      x: 140, y: 74, width: 115, height: 49,
      fill: "#0f172a", stroke: "#475569", "stroke-width": 0.65
    }));
    svg.appendChild(this._svgEl("text", {
      x: 144, y: 81.5, fill: hasTitle ? "#f8fafc" : "#fbbf24", "font-size": 4.4, "font-weight": "bold"
    }, displayTitle.slice(0, 31)));
    svg.appendChild(this._svgEl("text", {
      x: 144, y: 88, fill: hasMaterial ? "#e2e8f0" : "#fbbf24", "font-size": 4.1
    }, `Mat: ${displayMaterial.slice(0, 29)}`));
    svg.appendChild(this._svgEl("text", {
      x: 144, y: 94.5, fill: derivedProc ? "#cbd5e1" : "#fbbf24", "font-size": 4.0
    }, `3DP Est: ${displayProcess.slice(0, 26)} | Feat: ${safeFeatures.length}${unverifiedFeatureCount ? " (Amber=Unverified)" : ""}`));
    svg.appendChild(this._svgEl("text", {
      x: 144, y: 101, fill: "#94a3b8", "font-size": 3.8
    }, `Units: ${unitNotice}`));
    svg.appendChild(this._svgEl("text", {
      x: 144, y: 107.5, fill: "#fbbf24", "font-size": 3.7
    }, "Std: Framework Refs Only (NOT Certified)"));
    svg.appendChild(this._svgEl("text", {
      x: 144, y: 113.5, fill: "#94a3b8", "font-size": 3.5
    }, displayStandard.slice(0, 34)));
    svg.appendChild(this._svgEl("text", {
      x: 144, y: 119.5, fill: "#fbbf24", "font-size": 3.7
    }, "MBD Export: JSON Packet (NOT Native STEP)"));

    this.container.appendChild(svg);
  }
}