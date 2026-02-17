"use client";

interface Settings {
  addr1: string;
  addr2: string;
  telp: string;
  email: string;
  paperSize?: "a4" | "f4";
}

interface SettingsPanelProps {
  settings: Settings;
  setSettings: (key: keyof Settings, value: string) => void;
}

export default function SettingsPanel({
  settings,
  setSettings,
}: SettingsPanelProps) {
  return (
    <div className="space-y-5">
      <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">
        Settings
      </h3>
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase">
            Nama Gedung
          </label>
          <input
            type="text"
            value={settings.addr1}
            onChange={(e) => setSettings("addr1", e.target.value)}
            className="w-full border-b py-2 text-sm focus:border-orange-500 outline-none transition"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase">
            Alamat
          </label>
          <input
            type="text"
            value={settings.addr2}
            onChange={(e) => setSettings("addr2", e.target.value)}
            className="w-full border-b py-2 text-sm focus:border-orange-500 outline-none transition"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase">
            Telepon / WA
          </label>
          <input
            type="text"
            value={settings.telp}
            onChange={(e) => setSettings("telp", e.target.value)}
            className="w-full border-b py-2 text-sm focus:border-orange-500 outline-none transition"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase">
            Email
          </label>
          <input
            type="text"
            value={settings.email}
            onChange={(e) => setSettings("email", e.target.value)}
            className="w-full border-b py-2 text-sm focus:border-orange-500 outline-none transition"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase">
            Ukuran Kertas
          </label>
          <select
            value={settings.paperSize || "a4"}
            onChange={(e) => setSettings("paperSize" as any, e.target.value)}
            className="w-full border-b py-2 text-sm focus:border-orange-500 outline-none transition bg-transparent"
          >
            <option value="a4">A4 (210 x 297mm)</option>
            <option value="f4">F4 / Folio (215 x 330mm)</option>
          </select>
        </div>
      </div>
      <p className="text-[10px] text-orange-500 italic font-medium">
        *Perubahan otomatis tersimpan ke semua halaman.
      </p>
    </div>
  );
}
