"use client";

import { useState, useEffect, useRef } from "react";
import { CardData, getAllCards, getHistoryFromDB, clearAllData } from "@/app/lib/db";
import Swal from "sweetalert2";
import Captcha from "captcha-image";
import Draggable from "react-draggable";

interface StorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: CardData[];
  onExportJSON: () => void;
}

export default function StorageModal({ isOpen, onClose, cards, onExportJSON }: StorageModalProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [storageInfo, setStorageInfo] = useState<{
    usage: number;
    quota: number;
    percentage: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [backupSize, setBackupSize] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const nodeRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Simulate loading delay to prevent lag during panel opening animation
      const timer = setTimeout(() => {
        setIsInitializing(false);
        checkStorage();
        calculateBackupSize();
      }, 300);
      return () => clearTimeout(timer);
    } else {
        setTimeout(() => setIsVisible(false), 300);
        setIsInitializing(true);
    }
  }, [isOpen]);

  const handleImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        try {
          const text = await file.text();
          const json = JSON.parse(text);
          if (json.cards || json.history) {
             // Dispatch event to parent to handle import
             const event = new CustomEvent("import-backup", { detail: json });
             window.dispatchEvent(event);
             
             Swal.fire({
                title: "Berhasil!",
                text: "Backup berhasil diimpor ke tab baru.",
                icon: "success",
                confirmButtonColor: "#f97316",
             });
             onClose();
          } else {
             Swal.fire({
                title: "Gagal!",
                text: "Format file backup tidak valid.",
                icon: "error",
                confirmButtonColor: "#dc2626",
             });
          }
        } catch (error) {
           console.error("Import error:", error);
           Swal.fire({
              title: "Error!",
              text: "Gagal membaca file backup.",
              icon: "error",
              confirmButtonColor: "#dc2626",
           });
        }
      }
    };
    input.click();
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const calculateBackupSize = async () => {
    try {
      const dbCards = await getAllCards();
      const dbHistory = await getHistoryFromDB();
      
      const exportData = {
        version: "1.0",
        tabTitle: "Layout", // Placeholder, actual title is in LayoutGenerator but this is just for size calc
        settings: {}, // Placeholder
        cards: dbCards,
        history: dbHistory,
        timestamp: Date.now()
      };
      
      const jsonString = JSON.stringify(exportData);
      const blob = new Blob([jsonString], { type: "application/json" });
      setBackupSize(formatBytes(blob.size));
    } catch (error) {
      console.error("Error calculating backup size:", error);
      setBackupSize(null);
    }
  };

  const handleClearData = async () => {
    // First warning
    const result = await Swal.fire({
      title: 'Hapus Semua Data?',
      text: "Seluruh data (kartu, riwayat, pengaturan) akan dihapus secara permanen dari browser ini! Tindakan ini tidak dapat dibatalkan.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626', // red-600
      cancelButtonColor: '#6b7280', // gray-500
      confirmButtonText: 'Lanjutkan',
      cancelButtonText: 'Batal',
      focusCancel: true
    });

    if (result.isConfirmed) {
      // Generate Captcha
      const captcha = new Captcha(
        "30px Arial",
        "center",
        "middle",
        200,
        60,
        "#f3f4f6", // gray-100
        "#111827", // gray-900
        5 // length
      ).createImage();

      // Extract code from data-key attribute
      const match = captcha.match(/data-key="([^"]+)"/);
      const secretCode = match ? match[1] : "";
      
      // Fix <image> tag to <img> for better compatibility
      const captchaHtml = captcha.replace("<image ", '<img style="display:block; margin:0 auto; border-radius:8px; border:1px solid #d1d5db;" ');

      // Show Captcha Modal
      const captchaResult = await Swal.fire({
        title: 'Verifikasi Keamanan',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <p style="font-size: 0.875rem; color: #4b5563;">Masukkan kode berikut untuk konfirmasi:</p>
            ${captchaHtml}
          </div>
        `,
        input: 'text',
        inputAttributes: {
          autocapitalize: 'off',
          autocorrect: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Hapus Permanen',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#dc2626',
        preConfirm: (inputValue) => {
          if (inputValue !== secretCode) {
            Swal.showValidationMessage('Kode salah! Silakan coba lagi.');
            return false;
          }
          return true;
        }
      });

      if (captchaResult.isConfirmed) {
        try {
          await clearAllData();
          await Swal.fire({
            title: 'Terhapus!',
            text: 'Seluruh data berhasil dihapus. Halaman akan dimuat ulang.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
          window.location.reload();
        } catch (error) {
          console.error("Error clearing data:", error);
          Swal.fire(
            'Gagal!',
            'Terjadi kesalahan saat menghapus data.',
            'error'
          );
        }
      }
    }
  };

  const checkStorage = async () => {
    setIsLoading(true);
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          setStorageInfo({
            usage: estimate.usage,
            quota: estimate.quota,
            percentage: (estimate.usage / estimate.quota) * 100,
          });
        }
      }
    } catch (error) {
      console.error("Error checking storage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitializing && isOpen) {
      checkStorage();
      calculateBackupSize();
    }
  }, [cards, isInitializing, isOpen]); // Re-check when cards change or init done

  if (!isVisible && !isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
    >
      <Draggable nodeRef={nodeRef} handle=".drag-handle">
        <div
          ref={nodeRef}
          className={`relative w-[800px] bg-white shadow-2xl flex flex-col overflow-hidden transform transition-all duration-300 pointer-events-auto ${
            isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
          }`}
        >
          {/* Drag Handle */}
          <div className="absolute top-0 left-0 right-0 h-6 z-50 cursor-move drag-handle flex justify-center items-center group">
            <div className="w-16 h-1 rounded-full bg-gray-200 group-hover:bg-gray-300 transition-colors"></div>
          </div>

          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 mt-2">
            <div>
                <h3 className="font-bold text-gray-800 text-xl">
                    Manajemen Data
                </h3>
                <p className="text-gray-400 text-xs mt-1">Kelola penyimpanan lokal dan backup data aplikasi</p>
            </div>
            <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
          </div>

          <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
            {isInitializing ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-3xl text-orange-500 mb-4"></i>
                    <span className="text-sm font-medium">Memuat Data...</span>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-10 h-full">
                    {/* Left Column: Storage Info */}
                    <div className="flex flex-col">
                        <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Penyimpanan Browser</h4>
                        
                        <div className="bg-gray-50 border border-gray-200 p-6 flex-1 flex flex-col justify-center">
                             {isLoading ? (
                                <div className="text-sm text-gray-500 animate-pulse text-center">
                                    Memeriksa penyimpanan...
                                </div>
                            ) : storageInfo ? (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="text-4xl font-light text-gray-800 mb-2">
                                            {storageInfo.percentage.toFixed(1)}%
                                        </div>
                                        <div className="text-xs text-gray-400 uppercase tracking-wide">Terpakai</div>
                                    </div>

                                    <div>
                                        <div className="w-full bg-gray-200 h-1 overflow-hidden mb-2">
                                            <div
                                            className="bg-orange-500 h-1 transition-all duration-500"
                                            style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>{formatBytes(storageInfo.usage)}</span>
                                            <span>{formatBytes(storageInfo.quota)}</span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-gray-500 leading-relaxed text-center px-4">
                                        Data tersimpan di cache browser. Membersihkan cache akan menghapus data ini.
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-red-500 text-center">
                                    Info tidak tersedia.
                                </div>
                            )}

                            <div className="mt-auto pt-6 text-center">
                                <button
                                    onClick={() => {
                                        checkStorage();
                                        calculateBackupSize();
                                    }}
                                    className="text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
                                >
                                    Refresh Status
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="flex flex-col">
                        <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Tindakan</h4>
                        
                        <div className="space-y-3">
                            <button
                                onClick={onExportJSON}
                                className="w-full text-left p-4 border border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all group"
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-gray-800 group-hover:text-orange-700">Backup Data</span>
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 group-hover:bg-white group-hover:text-orange-600">JSON</span>
                                </div>
                                <p className="text-xs text-gray-500 group-hover:text-orange-600/80">
                                    Download file backup {backupSize && `(~${backupSize})`}
                                </p>
                            </button>

                            <button
                                onClick={handleImportClick}
                                className="w-full text-left p-4 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all group"
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-gray-800">Restore Data</span>
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5">JSON</span>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Import dari file backup sebelumnya
                                </p>
                            </button>

                            <div className="pt-4 mt-2 border-t border-gray-100">
                                <button
                                    onClick={handleClearData}
                                    className="w-full text-left px-4 py-3 border border-transparent hover:bg-red-50 text-red-600 transition-colors flex justify-between items-center group"
                                >
                                    <span className="text-sm font-medium">Reset Semua Data</span>
                                    <i className="fa-solid fa-triangle-exclamation text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>
      </Draggable>
    </div>
  );
}
