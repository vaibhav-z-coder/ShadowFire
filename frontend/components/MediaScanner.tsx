'use client';

import React, { useState } from 'react';
import { Upload, Image as ImageIcon, Video, Mic, FileCheck } from 'lucide-react';

interface MediaScannerProps {
  onScan: (file: File, type: 'image' | 'video' | 'audio') => void;
  loading: boolean;
}

export const MediaScanner: React.FC<MediaScannerProps> = ({ onScan, loading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio'>('image');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Auto-detect media type
      if (file.type.startsWith('video/')) {
        setMediaType('video');
      } else if (file.type.startsWith('audio/')) {
        setMediaType('audio');
      } else {
        setMediaType('image');
      }
    }
  };

  const handleScan = () => {
    if (!selectedFile || loading) return;
    onScan(selectedFile, mediaType);
  };

  return (
    <div className="space-y-5">
      {/* Media Type Switcher */}
      <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => setMediaType('image')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            mediaType === 'image'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" /> Image
        </button>
        <button
          type="button"
          onClick={() => setMediaType('video')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            mediaType === 'video'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Video className="w-3.5 h-3.5" /> Video
        </button>
        <button
          type="button"
          onClick={() => setMediaType('audio')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            mediaType === 'audio'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mic className="w-3.5 h-3.5" /> Audio
        </button>
      </div>

      {/* Upload Dropzone */}
      <label className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-950/80 transition-all rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer block">
        <input
          type="file"
          accept={mediaType === 'image' ? 'image/*' : mediaType === 'video' ? 'video/*' : 'audio/*'}
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 mb-3">
          <Upload className="w-5 h-5" />
        </div>
        {selectedFile ? (
          <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span className="truncate max-w-xs">{selectedFile.name}</span>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-200 mb-1">
              Click to upload {mediaType} file
            </p>
            <p className="text-xs text-slate-500">
              {mediaType === 'image' && 'PNG, JPG, WEBP up to 10MB (AI & manipulation detection)'}
              {mediaType === 'video' && 'MP4, MOV up to 50MB (Deepfake & face consistency)'}
              {mediaType === 'audio' && 'WAV, MP3, M4A up to 25MB (Voice cloning detection)'}
            </p>
          </>
        )}
      </label>

      {/* Action Button */}
      <button
        type="button"
        onClick={handleScan}
        disabled={!selectedFile || loading}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Upload className="w-4 h-4" />
        {loading ? `Analyzing ${mediaType}...` : `Analyze ${mediaType.toUpperCase()}`}
      </button>
    </div>
  );
};
