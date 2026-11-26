/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { AEROSPACE_MATRIX_CATALOG, AerospaceMaterialRow } from '../../data/aerospaceMatrix';
import { ConfidenceBadge, FieldLabel, FlaggedText, LegendRow, SourceLine } from './aerospaceFormat';

const MATERIALS = AEROSPACE_MATRIX_CATALOG.materials;

const FAMILIES = [
  { id: 'all', label: 'All families', matches: () => true },
  { id: 'titanium', label: 'Titanium', matches: (id: string) => id.startsWith('ti_') },
  { id: 'nickel', label: 'Nickel superalloy', matches: (id: string) => id.startsWith('inconel_') },
  { id: 'aluminium', label: 'Aluminium', matches: (id: string) => id.startsWith('al_') },
  { id: 'composite', label: 'Composite (CFRP)', matches: (id: string) => id.startsWith('cfrp_') },
  { id: 'magnesium', label: 'Magnesium', matches: (id: string) => id.startsWith('mg_') }
] as const;

type FamilyId = (typeof FAMILIES)[number]['id'];

const FIRST_MPA = /(\d[\d,]*(?:\.\d+)?)\s*MPa/;
const FIRST_DENSITY = /(\d+(?:\.\d+)?)\s*g\/cm/;

function firstNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

interface DerivedStrength {
  utsMPa: number | null;
  yieldMPa: number | null;
  densityGcm3: number | null;
  /** UTS ÷ density, in kN·m/kg (numerically identical to MPa·cm³/g). */
  specificStrength: number | null;
  specificYield: number | null;
}

/**
 * Specific strength is derived only from the figures already quoted in the
 * catalog row: the first MPa figure in `uts` / `yieldStrength` and the first
 * g/cm³ figure in `density`. No external values are introduced.
 */
function deriveStrength(row: AerospaceMaterialRow): DerivedStrength {
  const utsMPa = firstNumber(row.uts, FIRST_MPA);
  const yieldMPa = firstNumber(row.yieldStrength, FIRST_MPA);
  const densityGcm3 = firstNumber(row.density, FIRST_DENSITY);
  return {
    utsMPa,
    yieldMPa,
    densityGcm3,
    specificStrength: utsMPa !== null && densityGcm3 ? utsMPa / densityGcm3 : null,
    specificYield: yieldMPa !== null && densityGcm3 ? yieldMPa / densityGcm3 : null
  };
}

const specificStrengthById = new Map(
  MATERIALS.map((row) => [row.id, deriveStrength(row)] as const)
);

function formatSpecific(value: number | null): string {
  return value === null ? 'N/A' : `${value.toFixed(1)} kN·m/kg`;
}

const MaterialCard: React.FC<{ row: AerospaceMaterialRow }> = ({ row }) => {
  const derived = specificStrengthById.get(row.id);
  return (
    <article className="rounded-xl border border-slate-800 bg-[#12161c] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold leading-snug text-white">{row.material}</h3>
        <ConfidenceBadge flag={row.confidence} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="rounded-lg border border-slate-800/80 bg-[#0d1014] px-2.5 py-2">
          <FieldLabel>UTS</FieldLabel>
          <FlaggedText text={row.uts} className="text-[11px] text-slate-200" />
        </div>
        <div className="rounded-lg border border-slate-800/80 bg-[#0d1014] px-2.5 py-2">
          <FieldLabel>Yield (0.2%)</FieldLabel>
          <FlaggedText text={row.yieldStrength} className="text-[11px] text-slate-200" />
        </div>
        <div className="rounded-lg border border-slate-800/80 bg-[#0d1014] px-2.5 py-2">
          <FieldLabel>Density</FieldLabel>
          <FlaggedText text={row.density} className="text-[11px] text-slate-200" />
        </div>
        <div className="rounded-lg border border-slate-800/80 bg-[#0d1014] px-2.5 py-2">
          <FieldLabel>Max service temperature</FieldLabel>
          <FlaggedText text={row.maxServiceTemp} className="text-[11px] text-slate-200" />
        </div>
      </div>

      <div>
        <FieldLabel>Main aerospace uses</FieldLabel>
        <FlaggedText text={row.mainAerospaceUses} className="text-[11px] text-slate-300" />
      </div>

      <div>
        <FieldLabel>Notes</FieldLabel>
        <FlaggedText text={row.additionalNotes} className="text-[11px] text-slate-400" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2">
        <span className="font-mono text-[10px] text-cyan-300">
          Specific strength (derived): {formatSpecific(derived?.specificStrength ?? null)}
        </span>
        <span className="font-mono text-[10px] text-slate-500">
          {derived?.specificStrength !== null && derived?.specificStrength !== undefined
            ? `${derived.utsMPa} MPa ÷ ${derived.densityGcm3} g/cm³`
            : 'density/UTS not parseable'}
        </span>
      </div>

      <SourceLine sourceRef={row.sourceRef} />
    </article>
  );
};

const CompareColumn: React.FC<{
  slot: 'A' | 'B';
  row: AerospaceMaterialRow;
  selectedId: string;
  onChange: (id: string) => void;
  barPercent: number;
}> = ({ slot, row, selectedId, onChange, barPercent }) => {
  const derived = specificStrengthById.get(row.id);
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0d1014] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-orange-600 font-mono text-[10px] font-bold text-white">
          {slot}
        </span>
        <select
          value={selectedId}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Compare material ${slot}`}
          className="min-w-0 flex-1 rounded border border-slate-700 bg-[#12161c] px-2 py-1 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none"
        >
          {MATERIALS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.material}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-lg font-bold text-cyan-300">
          {formatSpecific(derived?.specificStrength ?? null)}
        </span>
        <span className="font-mono text-[10px] text-slate-500">
          specific yield {formatSpecific(derived?.specificYield ?? null)}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${slot === 'A' ? 'bg-orange-500' : 'bg-cyan-400'}`}
          style={{ width: `${Math.max(0, Math.min(100, barPercent))}%` }}
        />
      </div>

      <p className="font-mono text-[10px] text-slate-500">
        {derived?.utsMPa !== null && derived?.densityGcm3
          ? `${derived.utsMPa} MPa ÷ ${derived.densityGcm3} g/cm³`
          : 'no single UTS/density figure to divide'}
      </p>
      <ConfidenceBadge flag={row.confidence} />
    </div>
  );
};

export const MaterialsTab: React.FC = () => {
  const [family, setFamily] = useState<FamilyId>('all');
  const [compareA, setCompareA] = useState<string>(MATERIALS[0]?.id ?? '');
  const [compareB, setCompareB] = useState<string>(MATERIALS[1]?.id ?? MATERIALS[0]?.id ?? '');

  const activeFamily = FAMILIES.find((entry) => entry.id === family) ?? FAMILIES[0];
  const visibleRows = useMemo(
    () => MATERIALS.filter((row) => activeFamily.matches(row.id)),
    [activeFamily]
  );

  const rowA = MATERIALS.find((row) => row.id === compareA) ?? MATERIALS[0];
  const rowB = MATERIALS.find((row) => row.id === compareB) ?? MATERIALS[1] ?? MATERIALS[0];
  const derivedA = rowA ? specificStrengthById.get(rowA.id) : undefined;
  const derivedB = rowB ? specificStrengthById.get(rowB.id) : undefined;

  const maxSpecific = Math.max(derivedA?.specificStrength ?? 0, derivedB?.specificStrength ?? 0, 1);
  const percentOfMax = (value: number | null | undefined) =>
    value === null || value === undefined ? 0 : (value / maxSpecific) * 100;

  const deltaPercent =
    derivedA?.specificStrength !== null &&
    derivedA?.specificStrength !== undefined &&
    derivedB?.specificStrength !== null &&
    derivedB?.specificStrength !== undefined &&
    derivedB.specificStrength > 0
      ? ((derivedA.specificStrength - derivedB.specificStrength) / derivedB.specificStrength) * 100
      : null;

  return (
    <div className="space-y-4">
      <LegendRow />

      <section className="rounded-xl border border-slate-800 bg-[#12161c] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white">Two-material compare</h2>
            <p className="text-[11px] text-slate-400">
              Specific strength = UTS ÷ density, computed from the first MPa and g/cm³ figures quoted in the
              catalog row. Indicative ratio only — not a design allowable.
            </p>
          </div>
          <span className="rounded border border-slate-700 bg-[#0d1014] px-2 py-0.5 font-mono text-[10px] text-slate-400">
            DERIVED — NOT A DESIGN VALUE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rowA && (
            <CompareColumn
              slot="A"
              row={rowA}
              selectedId={compareA}
              onChange={setCompareA}
              barPercent={percentOfMax(derivedA?.specificStrength)}
            />
          )}
          {rowB && (
            <CompareColumn
              slot="B"
              row={rowB}
              selectedId={compareB}
              onChange={setCompareB}
              barPercent={percentOfMax(derivedB?.specificStrength)}
            />
          )}
        </div>

        <p className="rounded-lg border border-slate-800 bg-[#0d1014] px-3 py-2 text-[11px] text-slate-300">
          {deltaPercent === null ? (
            'Specific strength is not comparable for this pair — one row has no single UTS or density figure.'
          ) : (
            <>
              <span className="font-semibold text-white">A vs B:</span>{' '}
              {deltaPercent >= 0 ? '+' : '−'}
              {Math.abs(deltaPercent).toFixed(1)}% specific strength for A relative to B. Both figures inherit the
              row flags shown above (min/typ. or range start — check the row text).
            </>
          )}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-1 text-[11px] font-semibold text-slate-400">Family filter:</span>
          {FAMILIES.map((entry) => {
            const count = MATERIALS.filter((row) => entry.matches(row.id)).length;
            const active = entry.id === family;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setFamily(entry.id)}
                aria-pressed={active}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${
                  active
                    ? 'border-orange-500 bg-orange-600 text-white'
                    : 'border-slate-800 bg-[#0d1014] text-slate-300 hover:border-slate-600'
                }`}
              >
                {entry.label}
                <span className={`ml-1.5 font-mono text-[10px] ${active ? 'text-orange-100' : 'text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {visibleRows.map((row) => (
            <MaterialCard key={row.id} row={row} />
          ))}
        </div>
      </section>
    </div>
  );
};
