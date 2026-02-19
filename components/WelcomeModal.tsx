"use client";

import { useState, useEffect, useRef } from "react";
import { getReleaseNotes, ReleaseNote } from "@/app/actions";
import Draggable from "react-draggable";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewProject: () => void;
}

export default function WelcomeModal({
  isOpen,
  onClose,
  onNewProject,
}: WelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const nodeRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      getReleaseNotes().then(setReleaseNotes);
    } else {
      setTimeout(() => setIsVisible(false), 300); // Animation delay
    }
  }, [isOpen]);

  const handleStart = () => {
    if (dontShowAgain) {
      localStorage.setItem("dlayout_welcome_seen_v1.0", "true");
    }
    onClose();
  };

  const handleNewProjectAction = () => {
    if (dontShowAgain) {
      localStorage.setItem("dlayout_welcome_seen_v1.0", "true");
    }
    onNewProject();
  };

  const handleTour = () => {
    onClose();
    
    // Slight delay to allow modal to close completely
    setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        animate: true,
        doneBtnText: 'Selesai',
        nextBtnText: 'Lanjut',
        prevBtnText: 'Kembali',
        steps: [
          { 
            element: '#btn-upload', 
            popover: { 
              title: 'Upload Gambar', 
              description: 'Mulai dengan mengupload gambar desain Anda di sini. Anda bisa upload banyak gambar sekaligus.',
              side: "right", 
              align: 'start' 
            } 
          },
          { 
            element: '#btn-objects', 
            popover: { 
              title: 'Objek', 
              description: 'Manage object yang ada di area kerja kamu, dengan lebih teratur',
              side: "right", 
              align: 'start' 
            } 
          },
          { 
            element: '#btn-settings', 
            popover: { 
              title: 'Pengaturan', 
              description: 'Di pengaturan anda bisa mengatur teks default seperti pada section Kontak Kami.',
              side: "right", 
              align: 'start' 
            } 
          },
          { 
            element: '#btn-maps', 
            popover: { 
              title: 'Peta Lokasi', 
              description: 'Cari dan tambahkan peta lokasi untuk setiap kartu desain Anda.',
              side: "right", 
              align: 'start' 
            } 
          },
          { 
            element: '#nav-menu-view', 
            popover: { 
              title: 'Menu Tampilan & Storage', 
              description: 'Akses fitur Storage (Manajemen Data), Grid, dan Rulers melalui menu dropdown ini.',
              side: "bottom", 
              align: 'center' 
            } 
          },
          { 
            element: '#main-content', 
            popover: { 
              title: 'Area Kerja', 
              description: 'Di sini kartu-kartu Anda akan muncul. Anda bisa mengedit teks, memindahkan posisi, atau menghapus kartu.',
              side: "top", 
              align: 'center' 
            } 
          }
        ]
      });
  
      driverObj.drive();
    }, 300);
  };

  if (!isVisible && !isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Modal Content */}
      <Draggable nodeRef={nodeRef} handle=".drag-handle">
        <div
          ref={nodeRef}
          className={`relative w-[800px] h-[500px] bg-white shadow-2xl flex overflow-hidden transform transition-all duration-300 pointer-events-auto ${
            isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
          }`}
        >
          {/* Drag Handle */}
          <div className="absolute top-0 left-0 right-0 h-6 z-50 cursor-move drag-handle flex justify-center items-center group">
            <div className="w-16 h-1 rounded-full bg-gray-200 group-hover:bg-gray-300 transition-colors"></div>
          </div>

          {/* Left Side - Image & Actions */}
          <div className="w-1/3 bg-gray-50 p-6 flex flex-col justify-between border-r border-gray-200">
            <div>
              <div className="mb-8 mt-2">
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                  DLayout
                </h1>
                <p className="text-gray-500 text-sm">Version 1.0.0</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleNewProjectAction}
                  className="w-full text-left group"
                >
                  <div className="flex items-center gap-3 p-3 bg-orange-500 hover:bg-orange-600 transition-colors">
                    <div className="w-8 h-8 bg-white/20 flex items-center justify-center">
                      <i className="fa-solid fa-plus text-white text-sm"></i>
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">
                        Proyek Baru
                      </div>
                      <div className="text-orange-100 text-xs">
                        Mulai desain kosong
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleStart}
                  className="w-full text-left group"
                >
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-200 transition-colors">
                    <div className="w-8 h-8 bg-gray-200 flex items-center justify-center text-gray-500 group-hover:text-gray-700 transition-colors">
                      <i className="fa-regular fa-folder-open text-sm"></i>
                    </div>
                    <div>
                      <div className="text-gray-600 group-hover:text-gray-900 font-medium text-sm transition-colors">
                        Lanjutkan
                      </div>
                      <div className="text-gray-400 text-xs">
                        Buka sesi terakhir
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleTour}
                  className="w-full text-left group"
                >
                  <div className="flex items-center gap-3 p-3 hover:bg-gray-200 transition-colors">
                    <div className="w-8 h-8 bg-blue-100 flex items-center justify-center text-blue-500 group-hover:text-blue-700 transition-colors">
                      <i className="fa-solid fa-location-arrow text-sm"></i>
                    </div>
                    <div>
                      <div className="text-gray-600 group-hover:text-gray-900 font-medium text-sm transition-colors">
                        Take a Tour
                      </div>
                      <div className="text-gray-400 text-xs">
                        Pelajari fitur aplikasi
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-auto">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="dontShow"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label
                  htmlFor="dontShow"
                  className="text-xs text-gray-500 cursor-pointer select-none"
                >
                  Jangan tampilkan lagi saat memulai
                </label>
              </div>

              <div className="pt-4 border-t border-gray-200">
                 <a 
                   href="/documentation/index.html" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-[10px] text-gray-400 hover:text-orange-500 transition-colors flex items-center gap-1.5"
                 >
                   <i className="fa-regular fa-circle-question"></i>
                   Butuh bantuan? Baca dokumentasi
                 </a>
              </div>
            </div>
          </div>

          {/* Right Side - Release Notes */}
          <div className="flex-1 bg-white flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-gray-800 font-semibold">Apa yang baru?</h2>
              <button
                onClick={handleStart}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              <div className="space-y-6">
                {releaseNotes.map((note, index) => {
                  let colorClass = "border-gray-200";
                  let badgeClass = "bg-gray-100 text-gray-600";

                  if (note.type.toLowerCase().includes("fitur")) {
                    colorClass = "border-orange-500";
                    badgeClass = "bg-orange-100 text-orange-600";
                  } else if (note.type.toLowerCase().includes("peningkatan")) {
                    colorClass = "border-green-500"; // Changed to green border for variety if needed, but keeping gray as default
                    // Let's stick to the request style or make it dynamic
                    // Actually the original code had gray border for others but specific badge colors
                    // Let's map colors based on type
                  }

                  // Dynamic styling helper
                  const getColors = (type: string) => {
                    const t = type.toLowerCase();
                    if (t.includes("fitur"))
                      return {
                        border: "border-orange-500",
                        badge: "bg-orange-100 text-orange-600",
                      };
                    if (t.includes("peningkatan"))
                      return {
                        border: "border-green-200",
                        badge: "bg-green-100 text-green-600",
                      }; // Using green-200 border for subtle look
                    if (t.includes("sistem"))
                      return {
                        border: "border-blue-200",
                        badge: "bg-blue-100 text-blue-600",
                      };
                    return {
                      border: "border-gray-200",
                      badge: "bg-gray-100 text-gray-600",
                    };
                  };

                  const colors = getColors(note.type);

                  return (
                    <div
                      key={index}
                      className={`relative pl-6 border-l-2 ${colors.border}`}
                    >
                      <div
                        className={`absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 ${colors.border.replace("border-", "border-")}`}
                      ></div>
                      <div className="mb-1">
                        <span
                          className={`${colors.badge} text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide`}
                        >
                          {note.type}
                        </span>
                        {note.date && (
                          <span className="text-gray-400 text-xs ml-2">
                            {note.date}
                          </span>
                        )}
                      </div>
                      <h3 className="text-gray-800 font-medium mb-2">
                        {note.title}
                      </h3>
                      <p className="text-gray-500 text-sm leading-relaxed">
                        {note.content}
                      </p>
                      {note.extra && (
                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <i className={`${note.extra.icon}`}></i>
                            <span>{note.extra.text}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {releaseNotes.length === 0 && (
                  <div className="text-center text-gray-400 py-10">
                    <i className="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
                    <p>Memuat catatan rilis...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
              <p className="text-xs text-gray-400">
                DLayout Next &copy; 2026. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </Draggable>
    </div>
  );
}
