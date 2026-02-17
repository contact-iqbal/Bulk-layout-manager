"use client";

import { useRef, useState, useEffect } from "react";

interface NavbarProps {
  onUpload: (files: FileList) => void;
  onNewTab?: (type: string, title: string) => void;
  activeTabTitle?: string;
  activePaperSize?: "a4" | "f4";
}

export default function Navbar({ 
  onUpload, 
  onNewTab, 
  activeTabTitle = "Desain Tanpa Judul", 
  activePaperSize = "a4" 
}: NavbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const paperDimensions = activePaperSize === "a4" ? "210 x 297 mm" : "215 x 330 mm";

  const handlePrint = () => {
    setIsExporting(true);
    window.dispatchEvent(new CustomEvent("print-action"));
    // Since we don't know when export finishes here easily,
    // reset after a delay or just leave it clickable.
    // Ideally we'd use a shared state or store.
    setTimeout(() => setIsExporting(false), 2000);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
    setActiveMenu(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      e.target.value = ""; // Reset
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleMenu = (e: React.MouseEvent, menu: string) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const menuItems = [
    {
      label: "Edit",
      items: [
        {
          label: "Undo",
          shortcut: "Ctrl+Z",
          action: () => window.dispatchEvent(new CustomEvent("undo-action")),
        },
        {
          label: "Redo",
          shortcut: "Ctrl+Y",
          action: () => window.dispatchEvent(new CustomEvent("redo-action")),
        },
      ],
    },
    {
      label: "View",
      items: [
        {
          label: "New Tab",
          shortcut: "Ctrl+Alt+T",
          action: () => onNewTab?.("layout", "Layout Generator"),
        },
      ],
    },
  ];

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Alt+T for New Tab
      if (e.ctrlKey && e.altKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        onNewTab?.("layout", "Layout Generator");
      }
      // Ctrl+O for Open File
      if (e.ctrlKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        handleFileClick();
      }
      // Ctrl+Z for Undo
      if (e.ctrlKey && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("undo-action"));
      }
      // Ctrl+Y (or Ctrl+Shift+Z) for Redo
      if (
        (e.ctrlKey && (e.key === "y" || e.key === "Y")) ||
        (e.ctrlKey && e.shiftKey && (e.key === "z" || e.key === "Z"))
      ) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("redo-action"));
      }
      // Ctrl+P for Print
      if (e.ctrlKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewTab]);

  return (
    <div className="no-print w-full bg-white border-b border-gray-200 text-xs select-none flex items-center px-2 z-50">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept="image/*"
      />

      <div className="mr-4 flex items-center">
        <img
          src="/assets/logo.png"
          alt="Icon"
          className="w-4 h-4 object-contain opacity-80"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      </div>

      <div className="flex">
        {menuItems.map((menu) => (
          <div key={menu.label} className="relative">
            <button
              className={`px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors ${
                activeMenu === menu.label ? "bg-gray-100" : ""
              }`}
              onClick={(e) => toggleMenu(e, menu.label)}
            >
              {menu.label}
            </button>

            {/* Dropdown Menu */}
            {activeMenu === menu.label && menu.items && (
              <div
                className="absolute top-full left-0 bg-white border border-gray-200 shadow-lg rounded-md py-1 min-w-[200px] z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {menu.items.map((item, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left px-4 py-1.5 hover:bg-blue-500 hover:text-white flex justify-between items-center group"
                    onClick={() => {
                      item.action?.();
                      setActiveMenu(null);
                    }}
                  >
                    <span className="opacity-90">{item.label}</span>
                    {item.shortcut && (
                      <span className="ml-4 opacity-50 text-[10px] group-hover:text-white group-hover:opacity-80">
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="ml-auto flex items-center pr-2 relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveMenu(activeMenu === "share" ? null : "share");
          }}
          className={`px-4 py-1.5 font-bold tracking-wider transition cursor-pointer flex items-center gap-2 text-xs ${
            activeMenu === "share"
              ? "bg-gray-100 text-gray-800"
              : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
          }`}
        >
          <span>Bagikan</span>
          <i className="fa-solid fa-chevron-down text-[10px] ml-1 opacity-70"></i>
        </button>

        {activeMenu === "share" && (
          <div
            className="absolute right-2 top-full mt-2 bg-white border border-gray-200 shadow-xl rounded-xl w-72 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center p-2">
                   <img src="/assets/logo.png" className="w-full h-full object-contain opacity-80" alt="Preview" />
                </div>
                <div>
                   <h3 className="font-semibold text-gray-800 text-sm truncate max-w-[180px]" title={activeTabTitle}>{activeTabTitle}</h3>
                   <p className="text-[10px] text-gray-500 uppercase">{activePaperSize} • {paperDimensions}</p>
                </div>
              </div>
              <button 
                className="w-full bg-blue-600 cursor-pointer hover:bg-blue-700 text-white py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                onClick={() => {
                  // Default action - usually opens download settings in Canva
                  // For now, let's just trigger PDF download
                  handlePrint();
                  setActiveMenu(null);
                }}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm">Unduh</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2">
              <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Opsi Unduhan
              </div>
              
              <button
                className="w-full text-left px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors group"
                onClick={() => {
                  handlePrint();
                  setActiveMenu(null);
                }}
                disabled={isExporting}
              >
                <div className="w-8 h-8 bg-red-50 text-red-500 rounded-md flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <i className="fa-regular fa-file-pdf"></i>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-700 text-sm">Cetak PDF</div>
                  <div className="text-[10px] text-gray-500">Terbaik untuk dokumen & print</div>
                </div>
                {isExporting && <i className="fa-solid fa-spinner fa-spin text-gray-400"></i>}
              </button>
            </div>
          
          </div>
        )}
      </div>
    </div>
  );
}
