/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AerospaceConfidenceFlag } from '../../data/aerospaceMatrix';

/**
 * The research catalog carries inline "[cite: 20]" markers from its source
 * report. They are citation bookkeeping, not values, so they are dropped from
 * the rendered text only — the catalog strings themselves stay untouched.
 */
const CITE_PATTERN = /\s*\[cite:\s*\d+\]/g;

const BRACKET_SPLIT = /(\[[^\]]*\])/g;
const FLAG_KEYWORDS = ['VENDOR_CLAIM', 'ESTIMATE', 'NEEDS_MEASUREMENT', "NEEDS RAY'S MEASUREMENT", 'CONFLICT'];

export function stripCitations(text: string): string {
  return text.replace(CITE_PATTERN, '');
}

function flagTone(token: string): string {
  if (token.includes('VENDOR_CLAIM')) return 'text-rose-300';
  if (token.includes('CONFLICT')) return 'text-rose-300';
  if (token.includes('ESTIMATE')) return 'text-amber-300';
  return 'text-orange-300';
}

/** Renders catalog prose with every inline [VENDOR_CLAIM] / [ESTIMATE] / [NEEDS RAY'S MEASUREMENT] / [CONFLICT] token kept visible and highlighted. */
export const FlaggedText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const parts = stripCitations(text).split(BRACKET_SPLIT);
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('[') && FLAG_KEYWORDS.some((keyword) => part.includes(keyword))) {
          return (
            <span key={index} className={`font-semibold ${flagTone(part)}`}>
              {part}
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};

const CONFIDENCE_META: Record<
  AerospaceConfidenceFlag,
  { label: string; className: string; description: string }
> = {
  VERIFIED_REF: {
    label: 'VERIFIED REF',
    className: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
    description: 'Traced to a named published reference in the research report.'
  },
  ESTIMATE: {
    label: '[ESTIMATE]',
    className: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
    description: 'Estimated or range value — not a verified single figure.'
  },
  VENDOR_CLAIM: {
    label: '[VENDOR_CLAIM]',
    className: 'border-rose-500/50 bg-rose-500/10 text-rose-300',
    description: 'Vendor-claimed capability — not independently verified.'
  },
  NEEDS_MEASUREMENT: {
    label: "NEEDS RAY'S MEASUREMENT",
    className: 'border-orange-500/50 bg-orange-500/10 text-orange-300',
    description: 'No published single value — must be measured or ruled on by Ray.'
  }
};

export const ConfidenceBadge: React.FC<{ flag: AerospaceConfidenceFlag; className?: string }> = ({
  flag,
  className = ''
}) => {
  const meta = CONFIDENCE_META[flag];
  return (
    <span
      title={meta.description}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide whitespace-nowrap ${meta.className} ${className}`}
    >
      {meta.label}
    </span>
  );
};

export const SourceLine: React.FC<{ sourceRef: string }> = ({ sourceRef }) => (
  <p className="font-mono text-[10px] leading-relaxed text-slate-500 break-words">
    Source: {stripCitations(sourceRef)}
  </p>
);

export const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">{children}</span>
);

export const LegendRow: React.FC = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-800 bg-[#12161c] px-3 py-2">
    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Flag legend</span>
    {(Object.keys(CONFIDENCE_META) as AerospaceConfidenceFlag[]).map((flag) => (
      <span key={flag} className="flex items-center gap-1.5">
        <ConfidenceBadge flag={flag} />
        <span className="text-[10px] text-slate-500">{CONFIDENCE_META[flag].description}</span>
      </span>
    ))}
  </div>
);
