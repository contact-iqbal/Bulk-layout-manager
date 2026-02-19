"use client";

import { useEffect, useState } from "react";

export default function DownloadProgress() {
  const [status, setStatus] = useState<"idle" | "preparing" | "downloading" | "done">("idle");
  const [fileName, setFileName] = useState("");

  const getFileDescription = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith('.pdf')) return 'file PDF';
    if (lowerName.endsWith('.png')) return 'file PNG';
    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'file JPG';
    if (lowerName.endsWith('.zip')) return 'file ZIP';
    if (lowerName.endsWith('.json')) return 'Backup Data';
    return 'file';
  };

  useEffect(() => {
    const handleStart = (e: CustomEvent) => {
      setStatus("preparing");
      setFileName(e.detail?.fileName || "desain.pdf");
      
      // Simulate progress stages for better UX
      setTimeout(() => setStatus("downloading"), 1500);
    };

    const handleEnd = () => {
      setStatus("done");
      setTimeout(() => setStatus("idle"), 4000);
    };

    window.addEventListener("export-start", handleStart as EventListener);
    window.addEventListener("export-end", handleEnd);

    return () => {
      window.removeEventListener("export-start", handleStart as EventListener);
      window.removeEventListener("export-end", handleEnd);
    };
  }, []);

  if (status === "idle") return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-neutral-100 text-black rounded-lg shadow-2xl p-4 min-w-[320px] max-w-[400px] flex items-center gap-4 border border-gray-700/50 backdrop-blur-sm">
        
        {/* Icon/Spinner */}
        <div className="flex-shrink-0">
          {status === "done" ? (
             <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
               <i className="fa-solid fa-check text-white text-lg"></i>
             </div>
          ) : (
             <div className="relative w-10 h-10">
               {/* Outer Ring */}
               <svg className="animate-spin w-full h-full text-blue-500" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               {/* Inner Icon */}
               <div className="absolute inset-0 flex items-center justify-center">
                 <i className={`fa-solid ${status === 'preparing' ? 'fa-wand-magic-sparkles' : 'fa-file-arrow-down'} text-[12px] text-gray-300`}></i>
               </div>
             </div>
          )}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm  truncate">
            {status === "done" ? "Unduhan Selesai!" : `Menyiapkan ${getFileDescription(fileName)}...`}
          </h4>
          <p className="text-xs text-gray-400 truncate mt-1">
            {status === "done" 
              ? `${fileName} berhasil disimpan` 
              : status === "preparing" 
                ? "Merender halaman..." 
                : `Mengunduh ${getFileDescription(fileName)}...`}
          </p>
          
          {/* Progress Bar (Fake) */}
          {status !== "done" && (
            <div className="mt-2 w-full bg-gray-700 h-1 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-blue-500 rounded-full transition-all duration-[2000ms] ease-out ${status === 'preparing' ? 'w-[40%]' : 'w-[90%]'}`}
              ></div>
            </div>
          )}
        </div>

        {/* Close Button (only when done) */}
        {status === "done" && (
          <button 
            onClick={() => setStatus("idle")}
            className="text-gray-500 hover text-black transition-colors p-1.5 hover:bg-gray-800 rounded-full"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>
    </div>
  );
}
