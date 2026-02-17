"use client";

import { CardData } from "@/app/lib/db";
import Swal from "sweetalert2";
import { useState, useRef, useEffect } from "react";

interface Settings {
  addr1: string;
  addr2: string;
  telp: string;
  email: string;
}

interface LayoutCardProps {
  data: CardData;
  settings: Settings;
  onUpdate: (id: string, key: keyof CardData, value: string) => void;
  onDelete: (id: string) => void;
  onCopy: (id: string) => void;
  onMoveDown: (id: string) => void;
  isLast: boolean;
  paperSize?: "a4" | "f4";
}

export default function LayoutCard({
  data,
  settings,
  onUpdate,
  onDelete,
  onCopy,
  onMoveDown,
  isLast,
  paperSize,
}: LayoutCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  // Embed URL logic
  // Safe embed with query
  const mapUrl = `https://www.google.com/maps?q=${data.coords}&z=16&output=embed`;

  return (
    <div className="print-page bg-white relative group-card group px-12 py-10 flex flex-col">
      {/* Dropdown Menu */}
      <div
        ref={menuRef}
        className="no-print absolute -right-12 top-0 z-50 flex flex-col items-center"
      >
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="rounded-md w-8 h-8 flex items-center justify-center bg-white border-2 border-neutral-200 shadow-sm transition hover:bg-neutral-50 hover:scale-110"
          title="Menu"
        >
          <i className="fa-solid fa-ellipsis-vertical text-gray-500"></i>
        </button>

        {isMenuOpen && (
          <div className="absolute top-10 right-0 bg-white border border-neutral-200 rounded-lg py-2">
            <button
              onClick={() => {
                onCopy(data.id);
                setIsMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition font-medium"
            >
              <i className="fa-solid fa-copy w-4"></i>
            </button>
            <button
              onClick={() => {
                onMoveDown(data.id);
                setIsMenuOpen(false);
              }}
              disabled={isLast}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition font-medium ${
                isLast
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              <i className="fa-solid fa-arrow-down w-4"></i>
            </button>
            <div className="my-1 border-t border-neutral-100"></div>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                Swal.fire({
                  title: "Hapus layout ini?",
                  text: "Apakah anda yakin ingin menghapus layout ini?",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonColor: "#d33",
                  cancelButtonColor: "#3085d6",
                  confirmButtonText: "Ya, Hapus!",
                  cancelButtonText: "Batal",
                }).then((result) => {
                  if (result.isConfirmed) {
                    onDelete(data.id);
                    Swal.fire(
                      "Terhapus!",
                      "Layout berhasil dihapus.",
                      "success",
                    );
                  }
                });
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition font-bold"
            >
              <i className="fa-solid fa-trash w-4"></i>
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-start mb-8">
        <img
          src="/assets/logo.png"
          className="w-40 h-24 object-cover rounded"
          alt="Logo"
        />
        <div className="text-right font-black uppercase text-2xl leading-none">
          <span className="text-[#F36F21]">KLIK, BAYAR</span>
          <br />
          <span className="text-[#002D3E]">TAYANG</span>
        </div>
      </div>

      <div className="flex gap-8 mb-10 flex-1 min-h-0">
        <div className="w-2/3 h-full relative">
          {/* Using standard img tag for blob/dataUrl usually better for local previews than next/image if optimization not needed */}
          <img
            src={data.imgSrc}
            className="w-full h-full object-cover rounded border border-gray-100 shadow-sm"
            alt="Upload"
          />
        </div>
        <div className="w-1/3 flex flex-col">
          <div className="flex-grow border border-gray-100 rounded overflow-hidden relative">
            <iframe
              className="w-full h-full border-0 absolute inset-0"
              src={mapUrl}
              loading="lazy"
            ></iframe>
          </div>
          <input
            type="text"
            value={data.coords}
            onChange={(e) => onUpdate(data.id, "coords", e.target.value)}
            className="no-print text-[10px] w-full border p-1 mt-2 rounded font-mono text-gray-500 focus:text-gray-900 focus:border-orange-500 outline-none transition"
          />
        </div>
      </div>

      <div className="flex gap-4 border-t-8 border-[#F36F21] pt-6 items-stretch">
        <div className="flex-grow">
          <div className="print-exact bg-[#F36F21] text-white px-4 py-1 inline-block font-black uppercase text-xs mb-4">
            Informasi Media
          </div>
          <table className="w-full text-sm font-bold text-[#002D3E]">
            <tbody>
              <tr>
                <td className="w-24 text-gray-400 uppercase text-[10px]">
                  Jenis
                </td>
                <td>
                  :
                  <input
                    className="editable-input ml-1"
                    value={data.jenis}
                    onChange={(e) => onUpdate(data.id, "jenis", e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="text-gray-400 uppercase text-[10px]">Ukuran</td>
                <td>
                  :{" "}
                  <input
                    className="editable-input"
                    value={data.ukuran}
                    onChange={(e) =>
                      onUpdate(data.id, "ukuran", e.target.value)
                    }
                  />
                </td>
              </tr>
              <tr className="align-top">
                <td className="text-gray-400 uppercase text-[10px] pt-1">
                  Lokasi
                </td>
                <td>
                  :{" "}
                  <input
                    className="editable-input"
                    value={data.lokasi}
                    onChange={(e) =>
                      onUpdate(data.id, "lokasi", e.target.value)
                    }
                  />
                </td>
              </tr>
              <tr>
                <td className="text-gray-400 uppercase text-[10px]">
                  Keterangan -
                </td>
                <td>
                  <textarea
                    className="editable-input w-full"
                    value={data.keterangan}
                    onChange={(e) =>
                      onUpdate(data.id, "keterangan", e.target.value)
                    }
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="print-exact w-1/3 bg-[#002D3E] text-white p-6 relative flex flex-col justify-center">
          <div className="print-exact bg-[#F36F21] px-4 py-1 inline-block font-black uppercase text-xs absolute -top-4 left-6 shadow-md">
            Kontak Kami
          </div>
          <div className="text-[12px] space-y-1.5 opacity-90 leading-relaxed">
            <p className="font-black text-sm italic mb-1">{settings.addr1}</p>
            <p className="font-bold">{settings.addr2}</p>
            <p className="font-bold">
              Telp/WA: <span>{settings.telp}</span>
            </p>
            <p className="font-bold">
              Email: <span>{settings.email}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
