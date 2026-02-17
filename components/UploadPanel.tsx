"use client";

interface UploadPanelProps {
  onUpload: (files: FileList) => void;
  onPrint: () => void;
}

export default function UploadPanel({ onUpload, onPrint }: UploadPanelProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      e.target.value = ""; // Reset
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">
        Bulk Layout Manager
      </h3>
      <div className="relative group border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-orange-500 transition cursor-pointer">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <p className="text-[11px] font-bold text-gray-400 uppercase">
          Drop Images Here
        </p>
      </div>
      <button
        onClick={onPrint}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-md transition uppercase tracking-widest text-xs"
      >
        Cetak
      </button>
    </div>
  );
}
