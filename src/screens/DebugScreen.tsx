import React, { useState, useRef } from 'react';
import { X, Play, Pause } from 'lucide-react';

export function DebugScreen() {
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(e => console.error("Play failed", e?.message || "Unknown error"));
      } else {
        videoRef.current.pause();
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 gap-6 pt-20 pb-32">
      <h1 className="text-xl font-bold text-slate-100 uppercase tracking-widest border-b border-fuchsia-500 pb-2">Video Debug</h1>
      
      <div className="bg-[var(--bg-panel)] p-4 border border-[var(--border-subtle)] w-full">
        <p className="text-xs text-slate-400 font-mono mb-4">
          Test the level up video rendering. Added controls to verify loading state.
        </p>
        <button 
          onClick={() => setShowVideo(true)}
          className="w-full py-3 bg-fuchsia-600 text-white font-bold text-[11px] uppercase tracking-widest"
        >
          Open Video Overlay
        </button>
      </div>

      <div className="bg-[var(--bg-panel)] p-4 border border-[var(--border-subtle)] w-full flex flex-col gap-4">
         <p className="text-xs text-slate-400 font-mono">Inline Video Test</p>
         <div className="relative w-full aspect-video bg-black border border-slate-700">
           <video 
             ref={videoRef}
             src="/ffmpegLevlUp.mp4" 
             playsInline
             controls
             muted
             className="w-full h-full object-contain"
             onError={(e) => { const err = e.currentTarget.error; console.error("Video error code:", err?.code, "message:", err?.message); }}
           />
         </div>
         <button 
          onClick={handleTogglePlay}
          className="w-full py-2 bg-[var(--border-subtle)] text-white font-bold text-[10px] uppercase tracking-widest flex justify-center items-center gap-2"
         >
           <Play size={14} /> Toggle Play
         </button>
      </div>

      {showVideo && (
        <div className="fixed inset-0 z-[100] bg-black">
          <video 
             src="/ffmpegLevlUp.mp4" 
             autoPlay 
             playsInline
             loop
             muted
             controls
             className="w-full h-full object-contain"
          />
          <button
            onClick={() => setShowVideo(false)}
            className="absolute top-6 right-6 z-[110] w-12 h-12 bg-black/50 text-white rounded-full flex items-center justify-center border border-white/20 hover:bg-black/70 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
