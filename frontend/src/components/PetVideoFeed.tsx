"use client";

import { useEffect, useRef, useState } from "react";

export default function PetVideoFeed({ 
  onStressUpdate, 
  onIntervention 
}: { 
  onStressUpdate: (level: number) => void, 
  onIntervention: (action: string, reasoning: string, audioUrl?: string) => void 
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const historyRef = useRef<any[]>([]);
  const calmTicksRef = useRef<number>(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;

      // Ask for Push Notification permission for owner alerts
      if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
      }

      // Initialize MediaRecorder for Audio
      const audioTrack = stream.getAudioTracks()[0];
      const audioStream = new MediaStream([audioTrack]);
      
      // Use webm audio format, which Gemini REST accepts natively
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
         mimeType = 'audio/mp4'; // Fallback for Safari
      }

      const mediaRecorder = new MediaRecorder(audioStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.start(100); // Add timeslices
      setIsMonitoring(true);
      
      // Start REST Pulse Engine (Every 3.5 seconds)
      intervalRef.current = setInterval(pulseAnalyze, 3500);

    } catch (err) {
      console.error("Webcam/Mic Error:", err);
    }
  };

  const stopStream = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsMonitoring(false);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });
  };

  const pulseAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // 1. Capture Video Frame
    const ctx = canvasRef.current.getContext('2d');
    let base64Jpeg = "";
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);
      base64Jpeg = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
    }

    // 2. Capture Audio Chunk
    let base64Audio = "";
    if (audioChunksRef.current.length > 0) {
      const blob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType });
      base64Audio = await blobToBase64(blob);
      audioChunksRef.current = []; // Empty the buffer for the next 3s slice
    }

    if (!base64Jpeg && !base64Audio) return;

    // 3. Dispatch REST Polling Request
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
      const res = await fetch(`${backendUrl}/api/analyze-pulse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Jpeg,
          audio: base64Audio,
          history: historyRef.current
        })
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        const { stress_level, behavior_detected, intervention_required, action, chatbot_message } = data.analysis;
        
        onStressUpdate(stress_level);
        
        // Enqueue to short-term history window (last 6 intervals ~ 21 seconds context)
        historyRef.current.push({ stress_level, behavior_detected });
        if (historyRef.current.length > 6) {
          historyRef.current.shift();
        }

        const now = Date.now();
        if (intervention_required) {
          calmTicksRef.current = 0; // Reset calm timer immediately if stress spikes

          if (action === "alert_owner") {
            // Dispatch Native Browser Push Notification
            if ("Notification" in window && Notification.permission === "granted") {
              const notification = new Notification("🚨 Guardian Pet AI Anxiety Alert", {
                body: chatbot_message || `Alert: High stress detected (${behavior_detected})`
              });
              // Auto-close notification after 10 seconds to avoid spam stack
              setTimeout(() => notification.close(), 10000);
            }
          }

          onIntervention(
            action === "play_lyria" ? "SOOTHING ACTIVE" : action.toUpperCase(),
            chatbot_message || `Behavior detected: ${behavior_detected}. Executing ${action}.`,
            data.audioUrl || ""
          );
        } else {
          // Pet is showing low stress (< 5).
          calmTicksRef.current += 1;
          
          // 4 ticks * 3.5s per tick = 14 seconds (approx 15 seconds)
          const REQUIRED_CALM_TICKS = 4;
          
          if (calmTicksRef.current >= REQUIRED_CALM_TICKS) {
             onIntervention(
               "INACTIVE",
               chatbot_message || `Behavior detected: ${behavior_detected}. Dog is officially calm. Intervention stopped.`,
               ""
             );
             calmTicksRef.current = 0; // reset for the next event
          } else {
             // Keep current UI/Music playing during the cooldown period
             onIntervention(
               "SOOTHING ACTIVE",
               chatbot_message || `Behavior detected: ${behavior_detected}. Dog seems calmer. Waiting for 15s of continuous calm before shutting off...`,
               undefined // undefined keeps the current audioUrl playing without wiping it
             );
          }
        }
      }
    } catch (e) {
      console.error("Pulse fetch error:", e);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopStream();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden border border-neutral-700 shadow-2xl aspect-video w-full flex items-center justify-center">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} width="320" height="240" className="hidden" />

      {/* Overlay Status */}
      <div className="absolute top-4 left-4 flex gap-2">
        {!isMonitoring && (
            <button 
              onClick={startStream} 
              className="px-5 py-2.5 bg-[#2F5D9F] hover:bg-[#2F5D9F]/90 text-white font-extrabold rounded-full shadow-lg border border-[#2F5D9F] transition-transform hover:scale-105 active:scale-95">
              Start Monitoring
            </button>
        )}
        {isMonitoring && (
          <div className="px-4 py-1.5 text-xs font-black rounded-full border shadow-sm backdrop-blur-md flex items-center gap-2 bg-white/90 text-[#4CAF50] border-[#4CAF50]/30 shadow-sm transition-transform">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4CAF50] animate-pulse shadow-[0_0_8px_rgba(76,175,80,0.8)]" />
            LIVE FEED ACTIVE
          </div>
        )}
      </div>
      <div className="absolute bottom-4 right-4 flex gap-2">
        <div className="px-3 py-1 text-[10px] font-bold rounded-full bg-white/80 border border-black/10 text-black/60 uppercase tracking-widest shadow-sm">
           GEMINI MULTIMODAL PULSE API
        </div>
      </div>
    </div>
  );
}
