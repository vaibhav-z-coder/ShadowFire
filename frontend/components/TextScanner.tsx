'use client';

import React, { useState } from 'react';
import { Send, FileText, Sparkles } from 'lucide-react';

interface TextScannerProps {
  onScan: (text: string) => void;
  loading: boolean;
}

const SAMPLE_TEXT = "Congratulations! You have been selected for a work-from-home job. Pay ₹2,999 registration fee immediately to confirm your job.";

export const TextScanner: React.FC<TextScannerProps> = ({ onScan, loading }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    onScan(text);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Paste suspicious message, job offer, or email
          </label>
          <button
            type="button"
            onClick={() => setText(SAMPLE_TEXT)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3 h-3" /> Try Sample Scam
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="e.g. You have been selected for a part-time job. Pay ₹1,500 registration deposit..."
          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={!text.trim() || loading}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        {loading ? 'Analyzing Content...' : 'Analyze Text'}
      </button>
    </form>
  );
};
