"use client";

import { useEffect, useRef, useState } from "react";

export default function LiveInterventionMonitor({ status, chatHistory, audioUrl }: { status: string, chatHistory: {status: string, message: string, timestamp: Date}[], audioUrl: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [actionsExpanded, setActionsExpanded] = useState(false);

  useEffect(() => {
    if (status === 'ALERT_OWNER') {
      setActionsExpanded(true); // Auto-expand during an emergency
    }
  }, [status]);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.warn("Autoplay prevented:", e));
    }
  }, [audioUrl]);

  return (
    <div className="bg-white p-6 rounded-2xl border-none shadow-md overflow-hidden relative group font-sans">
      {/* Background glow for playing state or alert */}
      {isPlaying && (
        <div className="absolute inset-0 bg-[#2F5D9F]/5 blur-3xl animate-pulse pointer-events-none" />
      )}
      {status === 'ALERT_OWNER' && (
        <div className="absolute inset-0 bg-[#FF9800]/10 blur-3xl animate-pulse pointer-events-none" />
      )}

      {/* Main Status */}
      <div className={`p-4 rounded-xl border mb-6 flex items-center justify-center font-bold tracking-widest text-lg shadow-sm flex-col gap-1
        ${status === 'INACTIVE' ? 'bg-[#4CAF50]/10 border-[#4CAF50]/30 text-[#4CAF50]' 
        : status === 'ALERT_OWNER' ? 'bg-[#FF9800]/10 border-[#FF9800] text-[#FF9800] animate-pulse ring-4 ring-[#FF9800]/30'
        : 'bg-[#2F5D9F]/10 border-[#2F5D9F]/30 text-[#2F5D9F]'}`}>
        <span>STATUS: {status.replace('_', ' ')}</span>
        {status === 'ALERT_OWNER' && <span className="text-xs text-[#FF9800] uppercase tracking-normal mt-1 font-extrabold">⚠️ Dispatching push notification to owner's phone...</span>}
      </div>

      {/* Chatbot Activity Feed */}
      <h3 className="font-extrabold text-[#2F5D9F] text-sm uppercase mb-2">Live Activity Log</h3>
      <div className="bg-[#EAF4FF]/50 overflow-y-auto max-h-64 p-4 rounded-lg mb-6 border border-[#2F5D9F]/10 flex flex-col gap-3">
        {chatHistory.length === 0 ? (
          <div className="text-black/50 italic text-sm text-center py-4 font-semibold">Analyzing stream... waiting for events.</div>
        ) : (
          chatHistory.map((chat, i) => (
            <div key={i} className={`p-3 rounded-xl border max-w-[95%] shadow-sm ${chat.status === 'ALERT_OWNER' ? 'bg-[#FF9800]/10 border-[#FF9800]/30 self-end ml-auto' : 'bg-white border-[#2F5D9F]/20'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-black ${chat.status === 'ALERT_OWNER' ? 'text-[#FF9800]' : 'text-[#2F5D9F]'}`}>
                  {chat.status === 'ALERT_OWNER' ? '🚨 URGENT NOTIFICATION' : '🤖 AI ETHOLOGIST'}
                </span>
                <span className="text-[10px] text-black/40 font-bold">{chat.timestamp.toLocaleTimeString()}</span>
              </div>
              <p className="text-sm text-black/80 leading-relaxed font-sans font-medium">{chat.message}</p>
            </div>
          ))
        )}
      </div>

      {/* Audio Element & Visualizer */}
      <h3 className="font-extrabold text-[#2F5D9F] text-sm uppercase mb-3">Lyria Soundscape Player</h3>
      {audioUrl ? (
        <div className="flex flex-col gap-4">
          {audioUrl.includes('youtube.com') ? (
            <iframe 
              width="100%" 
              height="120" 
              src="https://www.youtube.com/embed/UGsji3SHKis?autoplay=1&start=4" 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              className="rounded-lg shadow-sm"
              onLoad={() => setIsPlaying(true)}
            />
          ) : (
            <audio 
              ref={audioRef} 
              controls 
              autoPlay 
              src={audioUrl}
              className="w-full opacity-80" 
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
          )}
          {isPlaying && (
            <div className="flex justify-center items-end gap-1 h-12 w-full mt-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-2 bg-[#2F5D9F] rounded-t-sm"
                  style={{
                    height: `${Math.max(10, Math.random() * 100)}%`,
                    animation: `waveform ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-black/50 text-sm italic py-4 mb-4 font-semibold">Waiting for trigger...</div>
      )}

      {/* Remote Interventions (Collapsible, Auto-expands on Alert) */}
      <div className="mt-6 pt-4 border-t border-[#2F5D9F]/20">
        <button 
          onClick={() => setActionsExpanded(!actionsExpanded)}
          className="flex items-center justify-between w-full font-extrabold text-sm uppercase mb-3 text-[#2F5D9F] hover:text-[#2F5D9F]/80 transition-colors">
          <span className="flex items-center gap-2">
            {status === 'ALERT_OWNER' && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9800] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF9800]"></span>
              </span>
            )}
            <span className={status === 'ALERT_OWNER' ? "text-[#FF9800]" : ""}>Remote Interventions</span>
          </span>
          <span className="text-xs border border-[#2F5D9F]/30 bg-white shadow-sm rounded px-2 py-0.5">
            {actionsExpanded ? "▲ Hide" : "▼ Show"}
          </span>
        </button>
        
        {actionsExpanded && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <button 
              onClick={(e) => {
                const btn = e.currentTarget;
                const originalText = btn.innerHTML;
                btn.innerHTML = "✅ Treat Dispensed!";
                btn.className = "p-3 rounded-lg font-bold shadow-md transition-all border bg-[#4CAF50]/20 text-[#4CAF50] border-[#4CAF50]";
                setTimeout(() => {
                  btn.innerHTML = originalText;
                  btn.className = "p-3 rounded-lg font-bold shadow-sm transition-all border bg-[#EAF4FF] hover:bg-[#2F5D9F]/10 text-[#2F5D9F] border-[#2F5D9F]/30";
                }, 2000);
              }}
              className="p-3 rounded-lg font-bold shadow-sm transition-all border bg-[#EAF4FF] hover:bg-[#2F5D9F]/10 text-[#2F5D9F] border-[#2F5D9F]/30 cursor-pointer">
              Dispense Treat 🦴
            </button>
            
            <button 
              onClick={(e) => {
                const btn = e.currentTarget;
                const isLive = btn.innerHTML.includes("Live");
                if (isLive) {
                  btn.innerHTML = "Open Intercom 🎙️";
                  btn.className = "p-3 rounded-lg font-bold shadow-sm transition-all border bg-[#EAF4FF] hover:bg-[#2F5D9F]/10 text-[#2F5D9F] border-[#2F5D9F]/30";
                } else {
                  btn.innerHTML = "🔴 Mic Live ...";
                  btn.className = "p-3 rounded-lg font-bold shadow-md transition-all border bg-[#FF9800]/20 text-[#FF9800] border-[#FF9800] animate-pulse";
                }
              }}
              className="p-3 rounded-lg font-bold shadow-sm transition-all border bg-[#EAF4FF] hover:bg-[#2F5D9F]/10 text-[#2F5D9F] border-[#2F5D9F]/30 cursor-pointer">
              Open Intercom 🎙️
            </button>
          </div>
        )}
      </div>

      {/* CSS overrides for simple animations */}
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes waveform {
          from { height: 10%; }
          to { height: 100%; }
        }
      `}} />
    </div>
  );
}
