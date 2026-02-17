"use client";

import { CardData } from "@/app/lib/db";
import Swal from "sweetalert2";

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
}

export default function LayoutCard({
  data,
  settings,
  onUpdate,
  onDelete,
}: LayoutCardProps) {
  // Embed URL logic
  // Safe embed with query
  const mapUrl = `https://www.google.com/maps?q=${data.coords}&z=16&output=embed`;

  return (
    <div className="print-page bg-white relative group-card group p-8">
      <button
        onClick={() => {
          Swal.fire({
            title: "Hapus layout ini?",
            text: "Data yang dihapus tidak dapat dikembalikan!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Ya, Hapus!",
            cancelButtonText: "Batal",
          }).then((result) => {
            if (result.isConfirmed) {
              onDelete(data.id);
              Swal.fire("Terhapus!", "Layout berhasil dihapus.", "success");
            }
          });
        }}
        className="no-print absolute -right-4 top-0 rounded-md px-2 py-1 bg-white border-solid border-2 border-neutral-200 shadow-sm transition transform hover:scale-110 z-10"
        title="Hapus"
      >
        <i className="fa-solid fa-trash text-red-500"></i>
      </button>

      <div className="flex justify-between items-start mb-8">
        <img
          src="/assets/logo.png"
          className="w-40 h-24 object-cover rounded"
          alt="Logo"
        />
        <div className="text-right font-black uppercase text-xl leading-none">
          <span className="text-[#F36F21]">KLIK, BAYAR</span>
          <br />
          <span className="text-[#002D3E]">TAYANG</span>
        </div>
      </div>

      <div className="flex gap-6 mb-8 h-[440px]">
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
          <div className="text-[10px] space-y-1 opacity-90 leading-relaxed">
            <p className="font-black text-xs italic mb-1">{settings.addr1}</p>
            <p>{settings.addr2}</p>
            <p>
              Telp/WA: <span>{settings.telp}</span>
            </p>
            <p>
              Email: <span>{settings.email}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
