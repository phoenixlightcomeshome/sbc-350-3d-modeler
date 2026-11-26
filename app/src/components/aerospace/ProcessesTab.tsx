/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AEROSPACE_MATRIX_CATALOG } from '../../data/aerospaceMatrix';
import { ConfidenceBadge, FieldLabel, FlaggedText, LegendRow, SourceLine } from './aerospaceFormat';

const PROCESSES = AEROSPACE_MATRIX_CATALOG.processes;

export const ProcessesTab: React.FC = () => (
  <div className="space-y-4">
    <LegendRow />

    <p className="rounded-lg border border-slate-800 bg-[#12161c] px-3 py-2 text-[11px] text-slate-400">
      Seven processes. Tolerance and surface-finish figures are shop or vendor claims wherever the row carries a
      flag — a process with no single published number says so instead of quoting one.
    </p>

    <div className="space-y-3">
      {PROCESSES.map((row) => (
        <article key={row.id} className="rounded-xl border border-slate-800 bg-[#12161c] p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-white">{row.process}</h3>
            <ConfidenceBadge flag={row.confidence} />
          </div>

          <div>
            <FieldLabel>What it does &amp; where it is used</FieldLabel>
            <FlaggedText text={row.whatItDoesAndUse} className="text-[11px] text-slate-300" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-slate-800/80 bg-[#0d1014] px-2.5 py-2">
              <FieldLabel>Tolerance</FieldLabel>
              <FlaggedText text={row.tolerance} className="text-[11px] text-slate-200" />
            </div>
            <div className="rounded-lg border border-slate-800/80 bg-[#0d1014] px-2.5 py-2">
              <FieldLabel>Surface finish (Ra)</FieldLabel>
              <FlaggedText text={row.surfaceFinishRa} className="text-[11px] text-slate-200" />
            </div>
          </div>

          <div>
            <FieldLabel>Post-processing &amp; qualification</FieldLabel>
            <FlaggedText text={row.postProcessingAndQualification} className="text-[11px] text-slate-300" />
          </div>

          <SourceLine sourceRef={row.sourceRef} />
        </article>
      ))}
    </div>
  </div>
);
