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

interface BufferedInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  value: string;
  onCommit: (value: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const BufferedInput = ({
  value,
  onCommit,
  onChange,
  onBlur,
  ...props
}: BufferedInputProps) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (localValue !== value) {
      onCommit(localValue);
    }
    if (onBlur) onBlur(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    if (onChange) onChange(e);
  };

  return (
    <input
      {...props}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

interface BufferedTextAreaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange"
> {
  value: string;
  onCommit: (value: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const BufferedTextArea = ({
  value,
  onCommit,
  onChange,
  onBlur,
  ...props
}: BufferedTextAreaProps) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (localValue !== value) {
      onCommit(localValue);
    }
    if (onBlur) onBlur(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    if (onChange) onChange(e);
  };

  return (
    <textarea
      {...props}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

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
        className="no-print absolute right-4 top-4 z-50 flex flex-col items-end"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          className="rounded-full w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white border border-gray-200 shadow-sm backdrop-blur-sm transition-all hover:shadow-md"
          title="Opsi Kartu"
        >
          <i className="fa-solid fa-ellipsis-vertical text-gray-600"></i>
        </button>

        {isMenuOpen && (
          <div className="no-print absolute top-10 right-0 bg-white border border-gray-200 shadow-xl rounded-lg py-1.5 w-48 animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown(data.id);
                setIsMenuOpen(false);
              }}
              disabled={isLast}
              className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-3 transition font-medium ${
                isLast
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <i className="fa-solid fa-arrow-down w-3.5 text-center"></i>
              <span>Pindah ke Bawah</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(data.id);
                setIsMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 transition font-medium"
            >
              <i className="fa-solid fa-copy w-3.5 text-center"></i>
              <span>Duplikat Kartu</span>
            </button>

            <div className="my-1 border-t border-gray-100"></div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(false);
                Swal.fire({
                  title: "Hapus layout ini?",
                  text: "Tindakan ini tidak dapat dibatalkan!",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonColor: "#d33",
                  cancelButtonColor: "#3085d6",
                  confirmButtonText: "Ya, Hapus!",
                  cancelButtonText: "Batal",
                  reverseButtons: true,
                }).then((result) => {
                  if (result.isConfirmed) {
                    onDelete(data.id);
                  }
                });
              }}
              className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-3 transition font-bold"
            >
              <i className="fa-solid fa-trash w-3.5 text-center"></i>
              <span>Hapus Kartu</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-start mb-8">
        <img
          src="https://files.catbox.moe/dienws.png"
          className="w-40 h-24 object-cover rounded"
          alt="Logo"
        />
        <div className="text-right genos uppercase text-3xl leading-none">
          <span className="text-[#F36F21] genos">
            Klik, Bayar, <span className="text-[#002D3E] genos">Tayang</span>
          </span>
        </div>
      </div>

      <div className="flex gap-8 mb-10 flex-1 min-h-0">
        <div className="w-2/3 aspect-video relative">
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
          <BufferedInput
            type="text"
            value={data.coords}
            onCommit={(val) => onUpdate(data.id, "coords", val)}
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
              <tr className="align-top">
                <td className="w-24 text-gray-400 uppercase text-[10px]">
                  Jenis
                </td>
                <td>
                  <span className="align-top">:</span>{" "}
                  <BufferedInput
                    className="editable-input ml-1"
                    value={data.jenis}
                    onCommit={(val) => onUpdate(data.id, "jenis", val)}
                  />
                </td>
              </tr>
              <tr className="align-top">
                <td className="text-gray-400 uppercase text-[10px] pt-1">
                  Ukuran
                </td>
                <td>
                  <span className="align-top">:</span>{" "}
                  <BufferedInput
                    className="editable-input"
                    value={data.ukuran}
                    onCommit={(val) => onUpdate(data.id, "ukuran", val)}
                  />
                </td>
              </tr>
              <tr className="align-top">
                <td className="text-gray-400 uppercase text-[10px] pt-1">
                  Lokasi
                </td>
                <td>
                  <span className="align-top">:</span>{" "}
                  <BufferedTextArea
                    className="editable-input w-2/3"
                    value={data.lokasi}
                    onCommit={(val) => onUpdate(data.id, "lokasi", val)}
                  />
                </td>
              </tr>
              <tr className="align-top">
                <td className="text-gray-400 uppercase text-[10px] pt-1">
                  Keterangan
                </td>
                <td>
                  <span className="align-top">:</span>{" "}
                  <BufferedTextArea
                    className="editable-input w-2/3"
                    value={data.keterangan}
                    onCommit={(val) => onUpdate(data.id, "keterangan", val)}
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
