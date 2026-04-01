"use client";

import { useState } from "react";
import PetVideoFeed from "@/components/PetVideoFeed";
import LiveInterventionMonitor from "@/components/LiveInterventionMonitor";

export default function Dashboard() {
  const [stressLevel, setStressLevel] = useState(1);
  const [lyriaStatus, setLyriaStatus] = useState("INACTIVE");
  const [chatHistory, setChatHistory] = useState<{status: string, message: string, timestamp: Date}[]>([]);
  const [audioUrl, setAudioUrl] = useState("");
  const [anxietyReport, setAnxietyReport] = useState("");

  const handleGenerateReport = async () => {
    try {
      setAnxietyReport("Generating report...");
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
      const res = await fetch(`${backendUrl}/generate-report`, { method: "POST" });
      const data = await res.json();
      setAnxietyReport(data.report || "No patterns detected locally.");
    } catch (err) {
      setAnxietyReport("Error generating report: " + String(err));
    }
  };

  // Mock demo functionality removed to allow live testing with real Audio/Video
  return (
    <div className="min-h-screen bg-[#EAF4FF] text-black p-8 space-y-8 max-w-5xl mx-auto font-sans">
      <header className="flex items-center justify-between border-b border-[#2F5D9F]/20 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-[#2F5D9F] tracking-tight">PawSense</h1>
          <p className="text-black/60 mt-1 font-medium">Reactive separation anxiety companion</p>
        </div>
        <div className="flex gap-4">

          <button 
            onClick={handleGenerateReport}
            className="px-5 py-2.5 bg-[#2F5D9F] hover:bg-[#2F5D9F]/90 text-white rounded-lg transition-transform hover:scale-105 active:scale-95 shadow-md font-bold tracking-wide">
            Generate Daily Status Report
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-4">
          <div className="bg-[#FFF9C4] p-6 rounded-xl border-none flex flex-col sm:flex-row gap-6 items-center sm:items-start shadow-md relative overflow-hidden mb-6">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/40 rounded-full blur-3xl pointer-events-none" />
            
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-neutral-200 flex-shrink-0">
               {/* Make sure to save the image you attached into the /public folder as bruce.png! */}
               <img src="/bruce.png" alt="Bruce" className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-1 w-full relative z-10">
               <div className="flex justify-between items-start mb-2">
                 <div>
                   <h2 className="text-4xl font-extrabold text-[#2F5D9F] tracking-tight drop-shadow-sm">Bruce</h2>
                   <p className="text-black/70 text-sm font-bold tracking-wide mt-1">Nova Scotia Duck Tolling Retriever</p>
                 </div>
                 <span className="text-xs bg-white text-[#2F5D9F] px-4 py-2 rounded-full uppercase tracking-widest font-extrabold shadow-sm">Owner:<br/>Nora</span>
               </div>
               
               <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-black/80 mt-4 border-t border-black/10 pt-4 font-medium">
                 <div className="flex items-center gap-3 border-b border-black/5 pb-1 whitespace-nowrap">
                    <span className="text-black/60 font-bold w-14">Gender</span>
                    <span>Male</span>
                 </div>
                 <div className="flex items-center gap-3 border-b border-black/5 pb-1 whitespace-nowrap">
                    <span className="text-black/60 font-bold w-10">Age</span>
                    <span>5 Years</span>
                 </div>
                 <div className="flex items-center gap-3 border-b border-black/5 pb-1 whitespace-nowrap">
                    <span className="text-black/60 font-bold w-14">Weight</span>
                    <span>40 Pounds</span>
                 </div>
                 <div className="flex items-center gap-3 border-b border-black/5 pb-1 whitespace-nowrap">
                    <span className="text-black/60 font-bold w-10">Color</span>
                    <span>Red & White</span>
                 </div>
                 <div className="flex items-center gap-3 col-span-2 pt-1 whitespace-nowrap">
                    <span className="text-black/60 font-bold w-14">Size</span>
                    <span>20 Inches Tall</span>
                 </div>
               </div>
            </div>
          </div>

          <h2 className="text-xl font-bold border-l-4 border-[#2F5D9F] pl-3 text-black">Live Pet Feed</h2>
          <PetVideoFeed 
            onStressUpdate={(level) => setStressLevel(level)} 
            onIntervention={(action, chatbotMessage, url) => {
              setLyriaStatus(action);
              if (url !== undefined) setAudioUrl(url); // Don't wipe URL if simply appending messages
              
              if (chatbotMessage) {
                // Ensure we don't spam the exact same message back-to-back within the same state
                setChatHistory(prev => {
                  if (prev.length > 0 && prev[prev.length - 1].message === chatbotMessage) return prev;
                  return [...prev, { status: action, message: chatbotMessage, timestamp: new Date() }];
                });
              }
            }} 
          />
          <div className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-[#2F5D9F]/10">
             <span className="text-black font-extrabold">Stress Meter:</span>
             <div className="w-1/2 h-5 bg-black/5 rounded-full overflow-hidden shadow-inner border border-black/5">
                <div 
                  className={`h-full ${stressLevel > 5 ? 'bg-[#FF9800]' : 'bg-[#4ade80]'} transition-all duration-500 shadow-md`} 
                  style={{ width: `${stressLevel * 10}%` }}
                />
             </div>
             <span className="font-black text-[#2F5D9F]">{stressLevel}/10</span>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold border-l-4 border-[#2F5D9F] pl-3 text-black">Intervention Monitor</h2>
          <LiveInterventionMonitor 
            status={lyriaStatus} 
            chatHistory={chatHistory} 
            audioUrl={audioUrl} 
          />
          
          {anxietyReport && (
            <div className="mt-12 bg-white px-8 pb-8 pt-14 rounded-xl border-4 border-black border-dashed shadow-2xl relative mt-16">
              {/* Dog Bone Header Graphic */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#93C5FD] text-black px-8 py-2.5 rounded-full border-4 border-black font-black text-2xl tracking-widest uppercase transform -rotate-2 whitespace-nowrap z-10 shadow-md">
                DOG REPORT CARD
              </div>
              <div className="flex justify-between font-bold text-black border-b-4 border-black pb-2 mb-6 text-xl">
                 <span className="uppercase">Name: Bruce</span>
                 <span className="uppercase">Date: 03/28/2026</span>
              </div>
              <p className="text-black font-semibold leading-relaxed whitespace-pre-wrap text-lg font-sans">
                {anxietyReport}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
