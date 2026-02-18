"use client";

import { useState, useEffect, useRef } from "react";

interface DownloadItem {
  id: string;
  fileName: string;
  timestamp: number;
  status: "processing" | "completed" | "failed";
}

interface BottomNavbarProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export default function BottomNavbar({ currentPage, totalPages, zoom, onZoomChange }: BottomNavbarProps) {
  const [history, setHistory] = useState<DownloadItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onZoomChange(parseInt(e.target.value));
  };

  // Load history from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("dlayout_download_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse download history", e);
      }
    }

    // Listen for outside clicks to close popover
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save history to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem("dlayout_download_history", JSON.stringify(history));
  }, [history]);

  // Listen for download events
  useEffect(() => {
    const handleStart = (e: CustomEvent) => {
      const newItem: DownloadItem = {
        id: Date.now().toString(),
        fileName: e.detail?.fileName || "Unknown File",
        timestamp: Date.now(),
        status: "processing",
      };
      setHistory((prev) => [newItem, ...prev]);
      setHasUnread(true);
    };

    const handleEnd = () => {
      setHistory((prev) => {
        if (prev.length === 0) return prev;
        const newHistory = [...prev];
        // Assuming the most recent one is the one finishing
        if (newHistory[0].status === "processing") {
          newHistory[0] = { ...newHistory[0], status: "completed" };
        }
        return newHistory;
      });
    };

    window.addEventListener("export-start", handleStart as EventListener);
    window.addEventListener("export-end", handleEnd);

    return () => {
      window.removeEventListener("export-start", handleStart as EventListener);
      window.removeEventListener("export-end", handleEnd);
    };
  }, []);

  const toggleHistory = () => {
    setIsOpen(!isOpen);
    if (!isOpen) setHasUnread(false);
  };

  const clearHistory = () => {
    setHistory([]);
    setIsOpen(false);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-8 bg-white border-t border-gray-200 flex items-center justify-between px-4 select-none relative z-40 text-xs font-medium text-gray-600">
      
      {/* Left Side - Download History Button (Only visible if history exists) */}
      <div className="relative" ref={popoverRef}>
        {history.length > 0 && (
          <>
            <button
              onClick={toggleHistory}
              className={`flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors ${
                isOpen ? "bg-gray-100 text-gray-900" : ""
              }`}
              title="Riwayat Unduhan"
            >
              <div className="relative">
                <i className="fa-solid fa-clock-rotate-left text-sm"></i>
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </div>
            </button>

            {/* History Popover */}
            {isOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-2 duration-200 origin-bottom-left">
                <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-semibold text-gray-800">Riwayat Unduhan</h3>
                </div>
                
                <div className="max-h-60 overflow-y-auto">
                  <ul className="divide-y divide-gray-50">
                    {history.map((item) => (
                      <li key={item.id} className="p-3 hover:bg-gray-50 transition-colors flex items-start gap-3">
                        <div className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                          item.status === "completed" ? "bg-neutral-400 text-neutral-100" :
                          item.status === "processing" ? "bg-blue-100 text-blue-600" :
                          "bg-red-100 text-red-600"
                        }`}>
                          {item.status === "completed" ? <i className="fa-solid fa-check text-[10px]"></i> :
                           item.status === "processing" ? <i className="fa-solid fa-spinner fa-spin text-[10px]"></i> :
                           <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-gray-800 font-medium truncate pr-2 w-40" title={item.fileName}>
                              {item.fileName}
                            </p>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                              {formatTime(item.timestamp)}
                            </span>
                          </div>
                          <p className={`text-[10px] ${
                            item.status === "completed" ? "text-neutral-500" :
                            item.status === "processing" ? "text-neutral-500" :
                            "text-red-600"
                          }`}>
                            {item.status === "completed" ? "Berhasil diunduh" :
                             item.status === "processing" ? "Sedang memproses..." :
                             "Gagal"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right Side - Page Counter & Zoom */}
      <div className="flex items-center gap-6">
        {/* Page Counter */}
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded text-gray-600">
          <i className="fa-regular fa-file"></i>
          <span>
            Halaman {totalPages > 0 ? currentPage : 0} / {totalPages}
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onZoomChange(Math.max(25, zoom - 10))}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900"
            title="Zoom Out"
          >
            <i className="fa-solid fa-minus text-xs"></i>
          </button>
          
          <div className="flex items-center gap-2 w-32 group relative">
            <input
              type="range"
              min="25"
              max="200"
              step="5"
              value={zoom}
              onChange={(e) => onZoomChange(parseInt(e.target.value))}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-neutral-500"
            />
            <span className="w-10 text-right text-xs tabular-nums text-gray-600">{zoom}%</span>
          </div>

          <button 
            onClick={() => onZoomChange(Math.min(200, zoom + 10))}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900"
            title="Zoom In"
          >
            <i className="fa-solid fa-plus text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
