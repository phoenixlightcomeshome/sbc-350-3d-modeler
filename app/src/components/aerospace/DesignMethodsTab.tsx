/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AEROSPACE_MATRIX_CATALOG,
  AerospaceCaseStudyItem
} from '../../data/aerospaceMatrix';
import { ConfidenceBadge, FieldLabel, FlaggedText, LegendRow, SourceLine } from './aerospaceFormat';

const METHODS = AEROSPACE_MATRIX_CATALOG.designMethods;
const CASE_STUDIES = AEROSPACE_MATRIX_CATALOG.caseStudies;

const CASE_STATUS: Record<
  AerospaceCaseStudyItem['statusFlag'],
  { label: string; className: string; note: string }
> = {
  OEM_CLAIM: {
    label: '[OEM CLAIM]',
    className: 'border-rose-500/60 bg-rose-500/10 text-rose-300',
    note: 'Published by the manufacturer — not independent test data.'
  },
  SECONDARY_COMPILATION: {
    label: '[SECONDARY COMPILATION]',
    className: 'border-slate-500/60 bg-slate-500/10 text-slate-300',
    note: 'Figures re-compiled from secondary sources.'
  },
  DESIGN_EXPLORATION_NOT_PRODUCTION: {
    label: 'DESIGN EXPLORATION — NOT PRODUCTION',
    className: 'border-amber-500/70 bg-amber-500/10 text-amber-300',
    note: 'A concept study only; never an in-service production part.'
  }
};

export const DesignMethodsTab: React.FC = () => (
  <div className="space-y-4">
    <LegendRow />

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {METHODS.map((entry) => (
        <article key={entry.id} className="rounded-xl border border-slate-800 bg-[#12161c] p-4 space-y-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-white">{entry.topic}</h3>
            <ConfidenceBadge flag={entry.confidence} />
          </div>

          <FlaggedText text={entry.summary} className="block text-[11px] leading-relaxed text-slate-300" />

          <div>
            <FieldLabel>Key rules &amp; details</FieldLabel>
            <ul className="mt-1 space-y-1.5">
              {entry.keyRulesOrDetails.map((rule, index) => (
                <li key={index} className="flex gap-2 text-[11px] leading-relaxed text-slate-300">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-orange-500" aria-hidden="true" />
                  <FlaggedText text={rule} />
                </li>
              ))}
            </ul>
          </div>

          <SourceLine sourceRef={entry.sourceRef} />
        </article>
      ))}
    </div>

    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-white">Reported examples</h2>
        <span className="rounded border border-slate-700 bg-[#0d1014] px-2 py-0.5 font-mono text-[10px] text-slate-400">
          CLAIM STATUS SHOWN ON EVERY CASE
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {CASE_STUDIES.map((item) => {
          const status = CASE_STATUS[item.statusFlag];
          return (
            <article
              key={item.id}
              className={`rounded-xl border bg-[#12161c] p-4 space-y-2.5 ${
                item.statusFlag === 'DESIGN_EXPLORATION_NOT_PRODUCTION'
                  ? 'border-amber-500/60'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-bold leading-snug text-white">{item.name}</h3>
                <span
                  className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide ${status.className}`}
                >
                  {status.label}
                </span>
              </div>

              <div>
                <FieldLabel>Process / basis</FieldLabel>
                <FlaggedText text={item.processOrBasis} className="text-[11px] text-slate-300" />
              </div>

              <div>
                <FieldLabel>Reported metrics</FieldLabel>
                <FlaggedText text={item.reportedMetrics} className="text-[11px] text-slate-200" />
              </div>

              <div>
                <FieldLabel>Notes</FieldLabel>
                <FlaggedText text={item.notes} className="text-[11px] text-slate-400" />
              </div>

              <p className="text-[10px] font-semibold text-slate-400">{status.note}</p>

              <SourceLine sourceRef={item.sourceRef} />
            </article>
          );
        })}
      </div>
    </section>
  </div>
);
