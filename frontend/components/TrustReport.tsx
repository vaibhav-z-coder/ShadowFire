'use client';

import React from 'react';
import { TrustReportData } from '@/lib/api';
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, ArrowLeft, Share2, Copy } from 'lucide-react';

interface TrustReportProps {
  report: TrustReportData;
  onReset: () => void;
}

export const TrustReport: React.FC<TrustReportProps> = ({ report, onReset }) => {
  const isHigh = report.risk_level === 'high';
  const isMedium = report.risk_level === 'medium';
  const isSafe = report.risk_level === 'safe' || report.risk_level === 'low';

  const badgeColor = isHigh
    ? 'bg-red-500/15 text-red-400 border-red-500/30'
    : isMedium
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

  const riskLabel = isHigh ? 'HIGH RISK' : isMedium ? 'SUSPICIOUS / MEDIUM RISK' : 'SAFE / LOW RISK';

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
      {/* Top Controls */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Check Another Content
        </button>
        <span className="text-xs text-slate-500 font-mono">ID: {report.report_id}</span>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 bg-slate-800/80 border border-slate-700/50">
          {isHigh ? (
            <ShieldAlert className="w-6 h-6 text-red-400 animate-pulse" />
          ) : isMedium ? (
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          ) : (
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          )}
        </div>
        <h2 className="text-xl font-bold tracking-wider text-slate-100 uppercase">Trust Report</h2>
        <p className="text-xs text-slate-400 mt-1">Grounded forensic verification & safety analysis</p>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {/* Risk Level */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Risk Level</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
            {riskLabel}
          </span>
          <span className="text-[11px] text-slate-500 mt-1">Score: {report.risk_score}/100</span>
        </div>

        {/* Confidence */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Confidence</span>
          <span className="text-lg font-bold text-slate-100">
            {Math.round(report.confidence * 100)}%
          </span>
          <span className="text-[11px] text-slate-500 mt-1">Evidence density</span>
        </div>

        {/* Category */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5">Category</span>
          <span className="text-sm font-semibold text-slate-200 capitalize">
            {report.category.replace(/_/g, ' ')}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 capitalize">{report.input_type} Analysis</span>
        </div>
      </div>

      {/* Detected Signals */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 mb-5">
        <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2">
          Detected Signals
        </h3>
        {report.signals && report.signals.length > 0 ? (
          <ul className="space-y-2">
            {report.signals.map((sig, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-200">
                <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                <span>{sig.replace(/^✓\s*/, '')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No malicious signals detected.
          </p>
        )}
      </div>

      {/* Why This is Risky (Gemini Explanation) */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 mb-5">
        <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">
          Why this is risky
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          {report.explanation}
        </p>
      </div>

      {/* Recommendation */}
      <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-bold tracking-wider text-blue-400 uppercase mb-2">
          Recommendation
        </h3>
        <p className="text-sm text-slate-200 font-medium leading-relaxed">
          {report.recommendation}
        </p>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          onClick={onReset}
          className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
        >
          Check Another Content
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(report.summary || report.explanation);
            alert('Summary copied to clipboard!');
          }}
          className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" /> Copy Summary
        </button>
      </div>
    </div>
  );
};
