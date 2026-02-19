"use client";

import { useState } from "react";

interface UploadPanelProps {
  onUpload: (files: FileList) => void;
  onPrint?: () => void;
  isExporting?: boolean;
  cardCount: number;
  history: {
    past: { action: string }[];
    future: { action: string }[];
    onUndo: () => void;
    onRedo: () => void;
  };
  onLogoUpload?: (file: File | string) => void;
}

import LogoCropperModal from "./LogoCropperModal";

export default function UploadPanel({
  onUpload,
  onPrint,
  isExporting,
  cardCount,
  history,
  onLogoUpload,
}: UploadPanelProps) {
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [pendingLogo, setPendingLogo] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = e.target.files;
      
      // Check if the first file is a JSON backup file
      if (files.length === 1 && files[0].type === "application/json") {
         const file = files[0];
         try {
           const text = await file.text();
           const json = JSON.parse(text);
           if (json.cards || json.history) {
              // Dispatch event to parent to handle import
              const event = new CustomEvent("import-backup", { detail: json });
              window.dispatchEvent(event);
           }
         } catch (error) {
            console.error("Import error:", error);
         }
      } else {
        // Normal image upload
        onUpload(files);
      }
      e.target.value = ""; // Reset
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onLogoUpload) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPendingLogo(ev.target?.result as string);
          setIsCropperOpen(true);
        };
        reader.readAsDataURL(file);
      }
      e.target.value = ""; // Reset
    }
  };

  const handleLogoSave = (croppedLogo: string) => {
    if (onLogoUpload) {
      onLogoUpload(croppedLogo);
    }
    setIsCropperOpen(false);
    setPendingLogo(null);
  };

  const [showAllHistory, setShowAllHistory] = useState(false);
  const maxHistoryItems = 20;

  // Reverse the history to show newest first
  const reversedHistory = [...history.past].reverse();
  const displayHistory = showAllHistory ? reversedHistory : reversedHistory.slice(0, maxHistoryItems);
  const hasMoreHistory = reversedHistory.length > maxHistoryItems;

  return (
    <div className="space-y-6">
      <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">
        Bulk Layout Manager
      </h3>
      <div className="relative group border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-orange-500 transition cursor-pointer">
        <input
          type="file"
          multiple
          accept="image/*, application/json"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <p className="text-[11px] font-bold text-gray-400 uppercase">
          Drop Images
        </p>
      </div>
      
      {onLogoUpload && (
        <div className="relative group border border-dashed border-gray-200 rounded-lg p-3 text-center hover:border-blue-500 transition cursor-pointer bg-gray-50">
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div className="flex items-center justify-center gap-2">
             <i className="fa-regular fa-image text-gray-400 group-hover:text-blue-500"></i>
             <p className="text-[10px] font-bold text-gray-400 uppercase group-hover:text-blue-500">
               Ganti Logo (1070 x 780 px)
             </p>
          </div>
        </div>
      )}

      {onPrint && (
        <button
          onClick={onPrint}
          disabled={isExporting}
          className={`w-full font-black py-4 rounded-md transition uppercase tracking-widest text-xs ${
            isExporting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600 text-white"
          }`}
        >
          {isExporting ? "Memproses PDF..." : "Cetak"}
        </button>
      )}

      <div className="mt-6 w-full border-t border-gray-100 pt-4 px-2">
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
          {/* Header Panel - Opsional jika ingin ada judul di dalam panel */}
          <div className="px-4 py-3 border-b border-gray-100 bg-[hsl(0,0%,99%)] flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Action History
            </h3>
            <i className="fas fa-history text-gray-500"></i>
          </div>

          <div className="p-3 space-y-1 max-h-[250px] overflow-y-auto thin-scrollbar">
            {displayHistory.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <svg
                  className="w-8 h-8 text-gray-200 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">
                  No recent activity
                </p>
              </div>
            )}

            {displayHistory.map((action, i) => (
                <div
                  key={i}
                  className={`
            group flex items-center gap-3 p-2.5 rounded-md text-[11px] transition-all duration-200
            ${
              i === 0
                ? "bg-white border border-neutral-300"
                : "border border-transparent hover:bg-gray-50 text-gray-500"
            }
          `}
                >
                  {/* Action Text */}
                  <div className="flex-1 truncate">
                    <span
                      className={`font-semibold tracking-tight ${i === 0 ? "text-gray-900" : "text-gray-600"}`}
                    >
                      {action.action}
                    </span>
                  </div>
                </div>
              ))}
              
              {hasMoreHistory && !showAllHistory && (
                <button 
                  onClick={() => setShowAllHistory(true)}
                  className="w-full text-center text-[10px] text-blue-500 hover:text-blue-700 py-2 font-medium"
                >
                  Lihat lebih...
                </button>
              )}

              {showAllHistory && (
                 <button 
                 onClick={() => setShowAllHistory(false)}
                 className="w-full text-center text-[10px] text-gray-400 hover:text-gray-600 py-2 font-medium"
               >
                 Sembunyikan
               </button>
              )}
          </div>
        </div>
      </div>
      
      {isCropperOpen && (
        <LogoCropperModal
          isOpen={isCropperOpen}
          onClose={() => {
            setIsCropperOpen(false);
            setPendingLogo(null);
          }}
          imageSrc={pendingLogo}
          onSave={handleLogoSave}
        />
      )}
    </div>
  );
}
