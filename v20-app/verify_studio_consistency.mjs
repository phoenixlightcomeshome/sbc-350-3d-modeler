// verify_studio_consistency.mjs — Zero-Dependency QADS Dataset & Safety Validator
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];

for (const fileName of fs.readdirSync(root)) {
  if (!/\.(html|js|mjs|json|ts)$/i.test(fileName)) continue;
  const text = fs.readFileSync(path.join(root, fileName), "utf8");

  if (/lines\.join\("\r?\n/.test(text)) {
    errors.push(`${fileName}: raw line break inside lines.join(" literal.`);
  }
  if (/3\s+equal\s+steps/i.test(text)) {
    errors.push(`${fileName}: invalid "3 equal steps" wording on progressive torque passes (25->45->65 or 25->45->70).`);
  }
  if (/Lead Systems Engineer \(v\d+/i.test(text)) {
    errors.push(`${fileName}: contains invented auto-stamped engineer signoff actor.`);
  }
  if (/\.innerHTML\s*=/.test(text)) {
    warnings.push(`${fileName}: uses innerHTML assignment; verify no unescaped dynamic strings.`);
  }
}

const standardsPath = path.join(root, "v19_standards.json");
if (fs.existsSync(standardsPath)) {
  try {
    const std = JSON.parse(fs.readFileSync(standardsPath, "utf8"));
    const engines = std.engines ? Object.values(std.engines) : [];
    const seenIds = new Set();
    for (const eng of engines) {
      if (!eng.id) {
        errors.push("Engine entry missing id.");
        continue;
      }
      if (seenIds.has(eng.id)) errors.push(`Duplicate engine id: ${eng.id}`);
      seenIds.add(eng.id);

      if (eng.boreIn && eng.strokeIn && eng.cylinders && eng.displacementCid) {
        const calcCid = eng.cylinders * (Math.PI / 4) * (eng.boreIn ** 2) * eng.strokeIn;
        const relErr = Math.abs(calcCid - eng.displacementCid) / eng.displacementCid;
        if (relErr > 0.02) {
          errors.push(`${eng.id}: displacement mismatch (${calcCid.toFixed(2)} calc vs ${eng.displacementCid} listed; ${(relErr * 100).toFixed(2)}% > 2%).`);
        }
      }
      if (typeof eng.ve === "number" && eng.ve > 1.1 && !eng.veSource) {
        warnings.push(`${eng.id}: VE=${eng.ve} > 1.10 without explicit veSource/reference basis.`);
      }
      if (eng.yearStart && eng.yearEnd && eng.yearStart > eng.yearEnd) {
        errors.push(`${eng.id}: invalid year range ${eng.yearStart}-${eng.yearEnd}.`);
      }
      if (Array.isArray(eng.firingOrder) && eng.cylinders && eng.firingOrder.length !== eng.cylinders) {
        errors.push(`${eng.id}: firingOrder length ${eng.firingOrder.length} != ${eng.cylinders} cylinders.`);
      }
    }
  } catch (err) {
    errors.push(`v19_standards.json parse failure: ${err.message}`);
  }
}

console.log(`=== QADS Consistency Check ===`);
console.log(`Errors: ${errors.length} | Warnings: ${warnings.length}`);
errors.forEach((e) => console.error(`[ERROR] ${e}`));
warnings.forEach((w) => console.warn(`[WARN]  ${w}`));
if (errors.length > 0) process.exit(1);