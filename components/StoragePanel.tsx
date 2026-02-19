
import { useState, useEffect } from "react";
import { CardData, getAllCards, getHistoryFromDB, clearAllData } from "@/app/lib/db";
import Swal from "sweetalert2";
import Captcha from "captcha-image";

interface StoragePanelProps {
  cards: CardData[];
  onExportJSON: () => void;
}

export default function StoragePanel({ cards, onExportJSON }: StoragePanelProps) {
  const [storageInfo, setStorageInfo] = useState<{
    usage: number;
    quota: number;
    percentage: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [backupSize, setBackupSize] = useState<string | null>(null);

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
    checkStorage();
    calculateBackupSize();
  }, [cards]); // Re-check when cards change

  return (
    <div className="p-4">
      <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest mb-4">
        Manajemen Data
      </h3>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">
          Penyimpanan Browser
        </h3>

        {isLoading ? (
          <div className="text-sm text-gray-500 animate-pulse">
            Memeriksa penyimpanan...
          </div>
        ) : storageInfo ? (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Terpakai: {formatBytes(storageInfo.usage)}</span>
                <span>Total: {formatBytes(storageInfo.quota)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                ></div>
              </div>
              <div className="text-right text-xs text-gray-500 mt-1">
                {storageInfo.percentage.toFixed(2)}% digunakan
              </div>
            </div>

            <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100">
              <p>
                <strong>Info:</strong> Data disimpan secara lokal di browser
                Anda. Jika Anda menghapus cache browser, data mungkin akan
                hilang.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-red-500">
            Tidak dapat memeriksa informasi penyimpanan.
          </div>
        )}

        <button
          onClick={() => {
            checkStorage();
            calculateBackupSize();
          }}
          className="mt-3 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh Data
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">
          Ekspor Data
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Unduh seluruh data layout (kartu, pengaturan, history) dalam format
          JSON untuk cadangan atau dipindahkan ke browser lain.
        </p>

        <button
          onClick={onExportJSON}
          className="w-full cursor-pointer bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download Backup {backupSize && `(${backupSize})`}
        </button>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg shadow p-4 mt-6">
        <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          Zona Bahaya
        </h3>
        <p className="text-xs text-red-500 mb-4">
          Tindakan ini akan menghapus seluruh data kartu, riwayat, dan
          pengaturan dari browser ini. Data yang dihapus tidak dapat
          dikembalikan.
        </p>

        <button
          onClick={handleClearData}
          className="w-full cursor-pointer bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Hapus Semua Data
        </button>
      </div>
    </div>
  );
}
