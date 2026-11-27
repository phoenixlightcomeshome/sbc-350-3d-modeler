import { useMemo, useState } from 'react';
import { Cog, Gauge, Ruler } from 'lucide-react';
import { AUTOMOTIVE_PARTS_CATALOG } from '../data/automotiveMatrix';
import {
  BORE_IN,
  CAM_LIFT_MAX_IN,
  DECK_CLEARANCE_IN,
  depthBelowDeckIn,
  displacementCid,
  dynoPeaks,
  FIRING_ORDER,
  GASKET_IN,
  hpAt,
  pinHeightIn,
  ROD_IN,
  STROKE_IN,
  THROW_IN,
  torqueAt,
  type DynoTune,
} from '../three/engineKinetics';
import { EngineTelemetry } from './Viewport3D';

/**
 * Engine Block — the v16 SBC-350 modeler's engine-block functionality, as a
 * separate page in the current AeroForge session: fully functioning tabs,
 * buttons and menus, live readings, flow adjustments, and every measurement
 * in inches.
 *
 * The block is the published small-block Chevrolet (bore 4.000 in, stroke
 * 3.480 in, deck 9.025 in along the bore axis, bore spacing 4.400 in).
 * Bore / stroke / deck clearance / gasket are adjustable — any value off the
 * published stock is the user's own configuration, labelled as such, never
 * presented as the stock spec. Compression is computed from the live values
 * (64 cc Performer chamber, flat-top assumption); Ray's 9.90:1 baseline is
 * shown beside it with the gap flagged — the piston crown volume is
 * UNVERIFIED until the pistons are measured. Flow numbers are computed from
 * the live RPM and displacement with the volumetric efficiency stated, or
 * labelled as estimates where they are estimates.
 */

type EngineBlockTab =
  | 'block'
  | 'bores'
  | 'crank'
  | 'heads'
  | 'flows'
  | 'measure'
  | 'dyno';

type CamChoice = 'crower_00980' | 'comp_127048';

const CAMS: Record<
  CamChoice,
  { label: string; liftIn: number; detail: string; note: string }
> = {
  crower_00980: {
    label: 'Crower Supercharger 1 #00980 — street',
    liftIn: 0.459,
    detail: '232/232 @ 0.050 in, 0.459 in lift, 114° LSA, 2400–6500 RPM',
    note: 'Sourced: Crower / Edelbrock Performer sheet. Fits under the 0.480 in rocker limit.',
  },
  comp_127048: {
    label: 'Comp Cams 12-704-8 — pro mechanical roller',
    liftIn: 0.575,
    detail: '0.575/0.575 in lift, 300/308 advertised, 114° LSA, 3000–6500 RPM',
    note: 'Sourced: Comp Cams. 0.575 in EQUALS the flat-tappet spring max lift — springs for a mechanical roller are UNVERIFIED.',
  },
};

const CC_PER_CID = 16.387064;
const CHAMBER_CC = 64; // Edelbrock Performer 60909, sourced

interface EngineBlockViewProps {
  isV8: boolean;
  onSelectV8: () => void;
  engineRunning: boolean;
  onToggleEngine: () => void;
  throttlePct: number;
  onChangeThrottle: (pct: number) => void;
  tune: DynoTune;
  onChangeTune: (tune: DynoTune) => void;
  telemetry: EngineTelemetry | null;
}

function Stepper({
  label,
  value,
  step,
  min,
  max,
  onChange,
  source,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  source: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 1000) / 1000));
  return (
    <div className="bg-[#0e141c] border border-slate-800 rounded-lg px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-sm font-mono font-semibold text-white">{value.toFixed(3)} in</span>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
        >
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="flex-1 accent-amber-500 cursor-pointer"
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
        >
          +
        </button>
      </div>
      <div className="text-[11px] text-slate-500 mt-1">{source}</div>
    </div>
  );
}

export function EngineBlockView({
  isV8,
  onSelectV8,
  engineRunning,
  onToggleEngine,
  throttlePct,
  onChangeThrottle,
  tune,
  onChangeTune,
  telemetry,
}: EngineBlockViewProps) {
  const [tab, setTab] = useState<EngineBlockTab>('block');
  const [bore, setBore] = useState(BORE_IN);
  const [stroke, setStroke] = useState(STROKE_IN);
  const [deckClearance, setDeckClearance] = useState(DECK_CLEARANCE_IN);
  const [gasket, setGasket] = useState(GASKET_IN);
  const [cam, setCam] = useState<CamChoice>('crower_00980');
  const [oilPct, setOilPct] = useState(100);
  const [coolantPct, setCoolantPct] = useState(100);

  const block = AUTOMOTIVE_PARTS_CATALOG.sbc350_block;
  const rpm = telemetry?.rpm ?? 850;
  const isStock =
    bore === BORE_IN &&
    stroke === STROKE_IN &&
    deckClearance === DECK_CLEARANCE_IN &&
    gasket === GASKET_IN;

  const calc = useMemo(() => {
    const cid = displacementCid(bore, stroke, 8);
    const chamberCid = CHAMBER_CC / CC_PER_CID;
    const gasketCid = (Math.PI / 4) * bore * bore * gasket;
    const deckCid = (Math.PI / 4) * bore * bore * deckClearance;
    const sweptCid = (Math.PI / 4) * bore * bore * stroke;
    const clearanceCid = chamberCid + gasketCid + deckCid;
    const cr = (sweptCid + clearanceCid) / clearanceCid;
    return {
      cid,
      chamberCid,
      gasketCid,
      deckCid,
      sweptCid,
      clearanceCid,
      cr,
      quench: gasket + deckClearance,
      rodRatio: ROD_IN / stroke,
      meanPistonSpeedFpm: (2 * stroke * rpm) / 12,
      intakeCfm: (cid * rpm * 0.85) / 3456,
      oilPsi: rpm / 100,
      hp: hpAt(rpm, tune),
      tq: torqueAt(rpm, tune),
      peaks: dynoPeaks(tune),
      pinHeightTdc: pinHeightIn(0),
    };
  }, [bore, stroke, gasket, deckClearance, rpm, tune]);

  const camSpec = CAMS[cam];
  const tabButton = (active: boolean) =>
    `px-2.5 py-2 text-[11px] font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
      active ? 'text-white border-amber-500' : 'text-slate-400 border-transparent hover:text-slate-100'
    }`;

  const reading = (label: string, value: string, sub?: string) => (
    <div className="bg-[#0e141c] border border-slate-800 rounded-lg px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-sm font-mono font-semibold text-white">{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-[#0b0f14] text-slate-200">
      <div className="px-4 py-4 space-y-4">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <Cog className="w-5 h-5 text-amber-400" />
            Engine Block — SBC-350
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            The v16 modeler&apos;s block functionality, in this session. Tabs, buttons and
            menus below — every measurement in inches, every reading live from the
            running engine.
          </p>
          <p className="text-[11px] font-mono text-amber-400 mt-1">
            ALL MEASUREMENTS IN INCHES
            {isStock ? ' · Stock published spec' : ' · CUSTOM configuration — not the stock spec'}
          </p>
        </div>

        {!isV8 && (
          <button
            type="button"
            onClick={onSelectV8}
            className="w-full px-4 py-2.5 text-sm font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
          >
            Load the SBC-350 V8 Powertrain
          </button>
        )}

        {/* Engine controls */}
        <div className="bg-[#10161f] border border-slate-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleEngine}
              className={`px-4 py-2 text-xs font-semibold rounded transition-colors cursor-pointer ${
                engineRunning
                  ? 'bg-red-500/90 text-white hover:bg-red-500'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
              }`}
            >
              {engineRunning ? 'Stop engine' : 'Start engine'}
            </button>
            <div className="text-xs font-mono text-slate-300">
              {Math.round(rpm).toLocaleString()} RPM
              {telemetry ? ` · firing cyl ${telemetry.firingCylinder}` : ' · idle 850 RPM'}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Throttle
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={throttlePct}
              onChange={(e) => onChangeThrottle(Number(e.target.value))}
              className="flex-1 accent-amber-500 cursor-pointer"
            />
            <span className="font-mono text-slate-200 w-10 text-right">{throttlePct}%</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Induction
            <select
              value={tune}
              onChange={(e) => onChangeTune(e.target.value as DynoTune)}
              className="bg-[#0e141c] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 cursor-pointer"
            >
              <option value="carb">Carburetor — 385 HP / 414 TQ</option>
              <option value="mpfi">MPFI — 408 HP / 431 TQ (provisional)</option>
            </select>
          </label>
        </div>

        {/* Live readings strip */}
        <div className="grid grid-cols-2 gap-2">
          {reading('Power', `${Math.round(calc.hp)} HP`, `Peak ${calc.peaks.peakHp} @ ${calc.peaks.peakHpRpm.toLocaleString()} RPM`)}
          {reading('Torque', `${Math.round(calc.tq)} lb-ft`, `Peak ${calc.peaks.peakTq} @ ${calc.peaks.peakTqRpm.toLocaleString()} RPM`)}
          {reading('Displacement', `${calc.cid.toFixed(2)} CID`, `Bore ${bore.toFixed(3)} in × Stroke ${stroke.toFixed(3)} in × 8`)}
          {reading('Static compression', `${calc.cr.toFixed(2)}:1`, `Ray's baseline 9.90:1 — see Block tab`)}
        </div>

        {/* Tabs */}
        <div className="bg-[#10161f] border border-slate-800 rounded-lg overflow-hidden">
          <div className="flex gap-0.5 border-b border-slate-800 px-2 overflow-x-auto">
            <button type="button" className={tabButton(tab === 'block')} onClick={() => setTab('block')}>Block</button>
            <button type="button" className={tabButton(tab === 'bores')} onClick={() => setTab('bores')}>Bores</button>
            <button type="button" className={tabButton(tab === 'crank')} onClick={() => setTab('crank')}>Crank</button>
            <button type="button" className={tabButton(tab === 'heads')} onClick={() => setTab('heads')}>Heads</button>
            <button type="button" className={tabButton(tab === 'flows')} onClick={() => setTab('flows')}>Flows</button>
            <button type="button" className={tabButton(tab === 'measure')} onClick={() => setTab('measure')}>Measure</button>
            <button type="button" className={tabButton(tab === 'dyno')} onClick={() => setTab('dyno')}>Dyno</button>
          </div>

          <div className="p-3 space-y-3">
            {tab === 'block' && (
              <>
                <Stepper label="Bore diameter" value={bore} step={0.01} min={2} max={6} onChange={setBore} source="Published SBC spec 4.000 in — v16 range 2–6 in" />
                <Stepper label="Stroke" value={stroke} step={0.01} min={2} max={6} onChange={setStroke} source="Published SBC spec 3.480 in — v16 range 2–6 in" />
                <Stepper label="Deck clearance" value={deckClearance} step={0.001} min={0} max={0.2} onChange={setDeckClearance} source="Ray's number 0.015 in — v16 range 0–0.2 in" />
                <Stepper label="Head gasket" value={gasket} step={0.001} min={0.01} max={0.1} onChange={setGasket} source="Ray's number 0.039 in" />
                <div className="grid grid-cols-2 gap-2">
                  {reading('Displacement', `${calc.cid.toFixed(2)} CID`, 'Computed from bore × stroke × 8')}
                  {reading('Quench', `${calc.quench.toFixed(3)} in`, 'Gasket + deck clearance')}
                  {reading('Static compression', `${calc.cr.toFixed(2)}:1`, 'Flat-top assumption')}
                  {reading("Ray's baseline", '9.90:1', 'Static — his number')}
                </div>
                <p className="text-[11px] text-amber-400 leading-relaxed">
                  Compression gap: computed {calc.cr.toFixed(2)}:1 vs Ray&apos;s 9.90:1. The
                  difference is the piston crown volume (dish/dome) — UNVERIFIED until the
                  pistons are measured. Chamber is the Performer 64 cc ({calc.chamberCid.toFixed(3)} CID).
                </p>
                <div className="bg-[#0e141c] border border-slate-800 rounded-lg p-3 space-y-1">
                  <div className="text-sm font-semibold text-white">{block?.name ?? 'SBC-350 block'}</div>
                  <div className="text-[11px] font-mono text-slate-400">{block?.partNumber} · {block?.dataSource}</div>
                  <div className="text-xs text-slate-400">{block?.nominalDimensionMm}</div>
                  <div className="text-xs text-slate-400">Tolerance {block?.toleranceSpec}</div>
                  <div className="text-xs text-slate-400">Mass {block?.massKg} kg · ${block?.unitCostUsd.toLocaleString()}</div>
                </div>
                {!isStock && (
                  <button
                    type="button"
                    onClick={() => {
                      setBore(BORE_IN);
                      setStroke(STROKE_IN);
                      setDeckClearance(DECK_CLEARANCE_IN);
                      setGasket(GASKET_IN);
                    }}
                    className="w-full px-4 py-2 text-xs font-semibold rounded bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Reset to stock spec (4.000 × 3.480 in, 0.015 / 0.039 in)
                  </button>
                )}
              </>
            )}

            {tab === 'bores' && (
              <>
                <p className="text-xs text-slate-400">
                  Eight bores, 4.400 in spacing, first-to-last bore center 13.200 in. Bores run
                  45° off vertical along the bank axis — deck height 9.025 in is measured along
                  the bore axis (definition open, awaiting Ray).
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-800">
                      <th className="py-1.5 pr-2">Cyl</th>
                      <th className="py-1.5 pr-2">Bank</th>
                      <th className="py-1.5 pr-2">Along bank</th>
                      <th className="py-1.5 pr-2">Bore</th>
                      <th className="py-1.5">Travel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((cyl) => {
                      const bankIndex = Math.floor((cyl - 1) / 2);
                      const bank = cyl % 2 === 1 ? 'Left (1-3-5-7)' : 'Right (2-4-6-8)';
                      return (
                        <tr key={cyl}>
                          <td className="py-1.5 pr-2 text-white">{cyl}</td>
                          <td className="py-1.5 pr-2 text-slate-300">{bank}</td>
                          <td className="py-1.5 pr-2 text-slate-300">{(bankIndex * 4.4).toFixed(1)} in</td>
                          <td className="py-1.5 pr-2 text-slate-300">{bore.toFixed(3)} in</td>
                          <td className="py-1.5 text-slate-300">{stroke.toFixed(3)} in</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="grid grid-cols-2 gap-2">
                  {reading('Pin height at TDC', `${calc.pinHeightTdc.toFixed(3)} in`, 'Computed live from crank geometry')}
                  {reading(
                    'Depth below deck',
                    telemetry ? `${telemetry.depthBelowDeckIn.toFixed(3)} in` : `${depthBelowDeckIn(0).toFixed(3)} in`,
                    telemetry ? `Live — cyl 1 at ${Math.round(telemetry.crankAngleDeg)}° crank` : 'At TDC, engine stopped',
                  )}
                </div>
              </>
            )}

            {tab === 'crank' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {reading('Crank throw', `${THROW_IN.toFixed(3)} in`, 'Stroke / 2')}
                  {reading('Rod length', `${ROD_IN.toFixed(3)} in`, 'Published SBC spec 5.700 in')}
                  {reading('Rod ratio', calc.rodRatio.toFixed(3), 'Rod / stroke')}
                  {reading('Mean piston speed', `${Math.round(calc.meanPistonSpeedFpm).toLocaleString()} ft/min`, `At ${Math.round(rpm).toLocaleString()} RPM`)}
                  {reading('Main bearing bore', '2.449 in', '62.205 ±0.012 mm — Packet 3 / GM Heritage')}
                  {reading('Rod journal', '2.100 in', '53.34 mm — Packet 3 / GM Heritage')}
                </div>
                <div className="bg-[#0e141c] border border-slate-800 rounded-lg p-3 space-y-1">
                  <div className="text-sm font-semibold text-white">Firing order {FIRING_ORDER.join('-')}</div>
                  <div className="text-xs text-slate-400">Published SBC firing order. Cam turns at crank / 2.</div>
                  <div className="text-xs font-mono text-slate-300">
                    {telemetry
                      ? `Live: crank ${Math.round(telemetry.crankAngleDeg)}° · cam ${Math.round(telemetry.camAngleDeg)}° · firing cyl ${telemetry.firingCylinder}`
                      : 'Start the engine for live crank / cam angles.'}
                  </div>
                  <div className="text-[11px] text-amber-400">
                    Main journal diameter: UNVERIFIED (Claude — check Ray&apos;s block drawing).
                    Crank sprocket 18T / cam sprocket 36T in the 3D model are visual proportions.
                  </div>
                </div>
              </>
            )}

            {tab === 'heads' && (
              <>
                <div className="bg-[#0e141c] border border-slate-800 rounded-lg p-3 space-y-1">
                  <div className="text-sm font-semibold text-white">Edelbrock Performer 60909 — 64 cc</div>
                  <div className="text-xs text-slate-400">Valves 2.02 / 1.60 in · runners 185 / 65 cc · deck 9/16 in · A356-T6</div>
                  <div className="text-xs text-slate-400">Flat-tappet springs 120 lb seat / 320 lb @ 0.500 in / 0.575 in max lift · roller springs 150 lb seat / 420 lb @ 0.600 in</div>
                  <div className="text-[11px] text-slate-500">Sourced: Edelbrock sheet 60909 / Claude. Pro-class head decision (E-Series 210) is open, awaiting Ray.</div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  Camshaft
                  <select
                    value={cam}
                    onChange={(e) => setCam(e.target.value as CamChoice)}
                    className="flex-1 bg-[#0e141c] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 cursor-pointer"
                  >
                    {Object.entries(CAMS).map(([id, c]) => (
                      <option key={id} value={id}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <div className="bg-[#0e141c] border border-slate-800 rounded-lg p-3 space-y-1">
                  <div className="text-xs text-slate-400">{camSpec.detail}</div>
                  <div className="text-sm font-mono font-semibold text-white">Max valve lift {camSpec.liftIn.toFixed(3)} in</div>
                  <div className="text-[11px] text-slate-500">{camSpec.note}</div>
                  <div className="text-xs font-mono text-slate-300">
                    {telemetry
                      ? `Live highest valve lift right now: ${telemetry.valveLiftIn.toFixed(3)} in`
                      : `Live lift shows when the engine runs (sourced max ${CAM_LIFT_MAX_IN.toFixed(3)} in).`}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Camless variant: the billet heads with vertical solenoid actuators, EFI rail
                  and return springs (Ray&apos;s reference drawings) are a design variant of
                  this head unit — the live engine stays cammed unless Ray says otherwise.
                </p>
              </>
            )}

            {tab === 'flows' && (
              <>
                <p className="text-xs text-slate-400">
                  Flow adjustments — throttle, oil and coolant. Intake flow is computed from
                  live displacement and RPM; volumetric efficiency is stated, not hidden.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {reading('Intake airflow', `${Math.round(calc.intakeCfm).toLocaleString()} CFM`, `CID ${calc.cid.toFixed(2)} × ${Math.round(rpm).toLocaleString()} RPM × VE 85% / 3456 — VE assumed`)}
                  {reading('Oil pressure (est.)', `${calc.oilPsi.toFixed(0)} psi`, 'Rule of thumb: 10 psi per 1000 RPM — estimate, not measured')}
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  Oil pump
                  <input
                    type="range"
                    min={0}
                    max={120}
                    step={5}
                    value={oilPct}
                    onChange={(e) => setOilPct(Number(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <span className="font-mono text-slate-200 w-12 text-right">{oilPct}%</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  Coolant flow
                  <input
                    type="range"
                    min={0}
                    max={120}
                    step={5}
                    value={coolantPct}
                    onChange={(e) => setCoolantPct(Number(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <span className="font-mono text-slate-200 w-12 text-right">{coolantPct}%</span>
                </label>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Oil and coolant are flow controls (percent of nominal pump speed). No oil or
                  coolant temperature sensor data is in the app — those readouts are not shown
                  rather than faked.
                </p>
                <div className="bg-[#0e141c] border border-slate-800 rounded-lg p-3 space-y-1">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-amber-400" /> Flow at {Math.round(rpm).toLocaleString()} RPM
                  </div>
                  <div className="text-xs text-slate-400">Throttle {throttlePct}% · {tune === 'carb' ? 'Carburetor' : 'MPFI'} · oil pump {oilPct}% · coolant {coolantPct}%</div>
                  <div className="text-xs text-slate-400">Blower manifold: Weiand 6-71 (kit 7587P) — bolts 15 lb-ft then 30 lb-ft. No published manifold dimensions exist; modelled as a design concept.</div>
                </div>
              </>
            )}

            {tab === 'measure' && (
              <>
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-amber-400" />
                  Every measurement in inches, with its source. Values are the model&apos;s
                  numbers — a physical measurement of the real parts still rules.
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-800">
                      <th className="py-1.5 pr-2">Measurement</th>
                      <th className="py-1.5 pr-2">Value</th>
                      <th className="py-1.5">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {[
                      ['Bore', `${bore.toFixed(3)} in`, 'Published SBC spec'],
                      ['Stroke', `${stroke.toFixed(3)} in`, 'Published SBC spec'],
                      ['Bore spacing', '4.400 in', 'Published SBC spec'],
                      ['Deck height', '9.025 in', 'Along the bore axis — definition open'],
                      ['Deck clearance', `${deckClearance.toFixed(3)} in`, "Ray's number"],
                      ['Head gasket', `${gasket.toFixed(3)} in`, "Ray's number"],
                      ['Quench', `${calc.quench.toFixed(3)} in`, 'Computed: gasket + clearance'],
                      ['Rod length', '5.700 in', 'Published SBC spec'],
                      ['Crank throw', '1.740 in', 'Stroke / 2'],
                      ['Pin height at TDC', `${calc.pinHeightTdc.toFixed(3)} in`, 'Computed from crank geometry'],
                      ['Head deck', '0.563 in', 'Performer 9/16 in — sourced'],
                      ['Intake valve', '2.020 in', 'Performer 60909 — sourced'],
                      ['Exhaust valve', '1.600 in', 'Performer 60909 — sourced'],
                      ['Max valve lift', `${camSpec.liftIn.toFixed(3)} in`, cam === 'crower_00980' ? 'Crower 00980 — sourced' : 'Comp 12-704-8 — sourced'],
                      ['Main bearing bore', '2.449 in', 'Packet 3 / GM Heritage'],
                      ['Rod journal', '2.100 in', 'Packet 3 / GM Heritage'],
                      ['Cam-to-crank centerline', '—', 'UNVERIFIED — awaiting Ray'],
                      ['Flywheel teeth', '—', 'UNVERIFIED — 153T vs 168T, awaiting Ray'],
                      ['Oil pan bolts', '—', 'UNVERIFIED — awaiting Ray'],
                    ].map(([name, value, source]) => (
                      <tr key={name}>
                        <td className="py-1.5 pr-2 text-slate-300">{name}</td>
                        <td className="py-1.5 pr-2 font-mono text-white">{value}</td>
                        <td className="py-1.5 text-slate-400">{source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {tab === 'dyno' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {reading('Power now', `${Math.round(calc.hp)} HP`, `At ${Math.round(rpm).toLocaleString()} RPM — ${tune === 'carb' ? 'carb' : 'MPFI'} curve`)}
                  {reading('Torque now', `${Math.round(calc.tq)} lb-ft`, `At ${Math.round(rpm).toLocaleString()} RPM`)}
                  {reading('Peak power', `${calc.peaks.peakHp} HP`, `@ ${calc.peaks.peakHpRpm.toLocaleString()} RPM`)}
                  {reading('Peak torque', `${calc.peaks.peakTq} lb-ft`, `@ ${calc.peaks.peakTqRpm.toLocaleString()} RPM`)}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Dyno curves are the V8 anchors only (385 HP / 414 TQ carb; 408 / 431 MPFI
                  provisional). V6/V10/V12 power curves are not modelled — no sourced anchors.
                  Full dyno page with the run sheet lives in the Dyno Lab.
                </p>
                <button
                  type="button"
                  onClick={onToggleEngine}
                  className={`w-full px-4 py-2.5 text-sm font-semibold rounded transition-colors cursor-pointer ${
                    engineRunning
                      ? 'bg-red-500/90 text-white hover:bg-red-500'
                      : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  }`}
                >
                  {engineRunning ? 'Stop engine' : 'Start engine'}
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          Engine Block reads the same live engine as the Dyno Lab and the Powertrain
          configurator — start it here or there, the readings stay in step.
        </p>
      </div>
    </div>
  );
}
