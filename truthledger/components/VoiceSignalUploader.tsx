'use client';

import { useRef } from 'react';

interface Props {
  uploading: boolean;
  onUpload: (file: File) => void;
}

export default function VoiceSignalUploader({ uploading, onUpload }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="mb-6 p-6 bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl text-center">
      <p className="text-zinc-400 mb-4">Upload an audio clip from an earnings call or interview.</p>
      <p className="text-xs text-zinc-600 mb-4">Not lie detection. Behavioral risk indicators only.</p>
      <input ref={ref} type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
      <button
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 disabled:opacity-50"
      >
        {uploading ? 'Analyzing...' : 'Upload Audio Clip'}
      </button>
    </div>
  );
}
