'use client';

import React, { useState } from 'react';
import { Globe, Sparkles, Shield } from 'lucide-react';

interface UrlScannerProps {
  onScan: (url: string) => void;
  loading: boolean;
}

const SAMPLE_URL = "http://google-security-verify-account.xyz/login";

export const UrlScanner: React.FC<UrlScannerProps> = ({ onScan, loading }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    onScan(url);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Enter link, website, or domain to verify
          </label>
          <button
            type="button"
            onClick={() => setUrl(SAMPLE_URL)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3 h-3" /> Try Phishing Sample
          </button>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Globe className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example-security-portal.xyz/login"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!url.trim() || loading}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Shield className="w-4 h-4" />
        {loading ? 'Analyzing URL...' : 'Analyze URL'}
      </button>
    </form>
  );
};
