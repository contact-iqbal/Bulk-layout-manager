"use client";

import { useRef, useState, useEffect } from "react";
import Swal from "sweetalert2";

interface NavbarProps {
  onUpload: (files: FileList) => void;
  onNewTab?: (type: string, title: string, initialData?: any) => void;
  activeTabTitle?: string;

  activeTabId?: string;
  isImageViewer?: boolean;
}

export default function Navbar({
  onUpload,
  onNewTab,
  activeTabTitle = "Desain Tanpa Judul",
  activeTabId,
  isImageViewer,
}: NavbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pageRange, setPageRange] = useState("");
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(false);

  useEffect(() => {
    const handleExportEnd = () => setIsExporting(false);
    window.dispatchEvent(
      new CustomEvent("toggle-grid", { detail: { show: showGrid } }),
    );
    window.dispatchEvent(
      new CustomEvent("toggle-rulers", { detail: { show: showRulers } }),
    );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        setShowRulers((prev) => !prev);
      }
    };

    window.addEventListener("export-end", handleExportEnd);

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("export-end", handleExportEnd);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showGrid, showRulers]);

  const toggleGrid = () => {
    setShowGrid((prev) => !prev);
  };

  const toggleRulers = () => {
    setShowRulers((prev) => !prev);
  };

  const handlePrint = () => {
    setIsExporting(true);
    window.dispatchEvent(
      new CustomEvent("print-action", {
        detail: { pageRange: pageRange.trim(), tabId: activeTabId },
      }),
    );
  };

  const handleExportImage = (format: "png" | "jpg") => {
    setIsExporting(true);
    window.dispatchEvent(
      new CustomEvent("export-image-action", {
        detail: { format, pageRange: pageRange.trim(), tabId: activeTabId },
      }),
    );
  };

  const handleExportJSON = () => {
    if (activeTabId) {
      window.dispatchEvent(
        new CustomEvent("export-json-action", {
          detail: { tabId: activeTabId },
        }),
      );
    } else {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Tidak ada tab yang aktif.",
        confirmButtonColor: "#3b82f6",
      });
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
    setActiveMenu(null);
  };

  const handleJSONClick = () => {
    jsonInputRef.current?.click();
    setActiveMenu(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      e.target.value = ""; // Reset
    }
  };

  const handleJSONChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      label: "File",
      items: [
        {
          label: "Upload",
          shortcut: "Ctrl+O",
          action: () => handleFileClick(),
        },
        {
          label: "Open File",
          shortcut: "Ctrl+Shift+O",
          action: () => handleJSONClick(),
        },
        {
          label: "Save As",
          shortcut: "Ctrl+Shift+S",
          action: () => handleExportJSON(),
        },
        {
          label: "Export",
          children: [
            {
              label: "PDF",
              action: () => handlePrint(),
            },
            {
              label: "PNG",
              action: () => handleExportImage("png"),
            },
            {
              label: "JPG",
              action: () => handleExportImage("jpg"),
            },
            {
              label: "JSON",
              action: () => handleExportJSON(),
            },
          ],
        },
      ],
    },
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
          shortcut: "Shift+N",
          action: () => onNewTab?.("layout", "Layout Generator"),
        },
        {
          label: "Storage",
          action: () => {
            window.dispatchEvent(
              new CustomEvent("open-storage-modal", {
                detail: { tabId: activeTabId },
              }),
            );
          },
        },
        {
          label: showGrid ? "Disable Grid" : "Enable Grid",
          shortcut: "Ctrl+'",
          action: () => toggleGrid(),
        },
        {
          label: showRulers ? "Disable Rulers" : "Enable Rulers",
          shortcut: "Ctrl+R",
          action: () => toggleRulers(),
        },
      ],
    },
  ];

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift+N for New Tab
      if (
        e.shiftKey &&
        (e.key === "n" || e.key === "N") &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        onNewTab?.("layout", "Layout Generator");
      }
      // Ctrl+O for Upload (Image)
      if (e.ctrlKey && !e.shiftKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        handleFileClick();
      }
      // Ctrl+Shift+O for Open File (JSON)
      if (e.ctrlKey && e.shiftKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        handleJSONClick();
      }
      // Ctrl+Shift+S for Save As (JSON)
      if (e.ctrlKey && e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleExportJSON();
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
      // Ctrl+' for Toggle Grid
      if (e.ctrlKey && e.key === "'") {
        e.preventDefault();
        toggleGrid();
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
      <input
        type="file"
        ref={jsonInputRef}
        onChange={handleJSONChange}
        className="hidden"
        accept=".json"
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
              id={`nav-menu-${menu.label.toLowerCase()}`}
              className={`px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors ${
                activeMenu === menu.label ? "bg-gray-100" : ""
              }`}
              onClick={(e) => toggleMenu(e, menu.label)}
            >
              {menu.label}
            </button>
            {activeMenu === menu.label && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-100">
                {menu.items.map((item, idx) => (
                  <div key={idx}>
                    {"children" in item && item.children ? (
                      <div className="relative group/submenu">
                        <button className="w-full text-left px-4 py-2 hover:bg-gray-50 flex justify-between items-center group/item">
                          <span>{item.label}</span>
                          <i className="fa-solid fa-chevron-right text-[10px] text-gray-400"></i>
                        </button>
                        <div className="absolute left-full top-0 ml-1 w-48 bg-white border border-gray-200 shadow-lg rounded-lg py-1 hidden group-hover/submenu:block">
                          {item.children.map((child, cIdx) => (
                            <button
                              key={cIdx}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                              onClick={() => {
                                child.action();
                                setActiveMenu(null);
                              }}
                            >
                              {child.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex justify-between items-center group/item"
                        onClick={() => {
                          item.action();
                          setActiveMenu(null);
                        }}
                      >
                        <span>{item.label}</span>
                        {item.shortcut && (
                          <span className="text-gray-400 text-[10px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 group-hover/item:border-gray-300 transition-colors">
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {isImageViewer && (
        <div className="ml-auto flex items-center gap-2 border-l border-gray-200 pl-4">
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("save-image-edit", {
                  detail: { tabId: activeTabId },
                }),
              )
            }
            className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 transition-all border border-transparent"
            title="Simpan Perubahan (Ctrl+S)"
          >
            <i className="fa-solid fa-check"></i>
          </button>
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("close-image-tab", {
                  detail: { tabId: activeTabId },
                }),
              )
            }
            className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 transition-all border border-transparent"
            title="Tutup Tanpa Menyimpan (Esc)"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      <div
        className={`ml-auto flex items-center gap-4 ${isImageViewer ? "hidden" : ""}`}
      >
        <span className="text-gray-400 italic truncate max-w-[200px]">
          {activeTabTitle}
        </span>
        <div className="h-4 w-[1px] bg-gray-200"></div>
        <div className="flex items-center gap-1 bg-gray-100 p-1">
          <button
            className={`w-7 h-7 flex items-center justify-center rounded hover:bg-white hover:shadow-sm transition-all ${
              !showGrid ? "text-gray-400" : "text-blue-600 bg-white shadow-sm"
            }`}
            onClick={toggleGrid}
            title="Toggle Grid (Ctrl+')"
          >
            <i className="fa-solid fa-border-all"></i>
          </button>
          <button
            className={`w-7 h-7 flex items-center justify-center rounded hover:bg-white hover:shadow-sm transition-all ${
              !showRulers ? "text-gray-400" : "text-blue-600 bg-white shadow-sm"
            }`}
            onClick={toggleRulers}
            title="Toggle Rulers (Ctrl+R)"
          >
            <i className="fa-solid fa-ruler-combined"></i>
          </button>
        </div>

        <div className="h-4 w-[1px] bg-gray-200"></div>

        <div className="flex items-center gap-2 relative">
          <a
            href="/documentation/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="mr-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors flex items-center gap-2"
            title="Buka Dokumentasi"
          >
            <i className="fa-regular fa-circle-question"></i>
            <span>Help</span>
          </a>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu(activeMenu === "share" ? null : "share");
            }}
            className={`px-4 py-1.5 font-bold tracking-wider transition cursor-pointer flex items-center gap-2 text-xs rounded-md ${
              activeMenu === "share"
                ? "bg-gray-100 text-gray-800"
                : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
            }`}
          >
            <span>
              <i className="fa-solid fa-share"></i> Bagikan
            </span>
            <i className="fa-solid fa-chevron-down text-[10px] ml-1 opacity-70"></i>
          </button>

          {activeMenu === "share" && (
            <div
              className="absolute right-0 top-full mt-2 bg-white border border-gray-200 shadow-xl rounded-xl w-72 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center p-2">
                    <img
                      src="/assets/logo.png"
                      className="w-full h-full object-contain opacity-80"
                      alt="Preview"
                    />
                  </div>
                  <div>
                    <h3
                      className="font-semibold text-gray-800 text-sm truncate max-w-[180px]"
                      title={activeTabTitle}
                    >
                      {activeTabTitle}
                    </h3>
                  </div>
                </div>

                {/* Page Range Input */}
                <div className="mb-3">
                  <label className="text-[10px] text-gray-500 font-semibold uppercase mb-1 block">
                    Halaman (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 1, 3, 5-8"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <p className="text-[9px] text-gray-400 mt-1">
                    Kosongkan untuk mengunduh semua halaman
                  </p>
                </div>

                <button
                  className="w-full bg-blue-600 cursor-pointer hover:bg-blue-700 text-white py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                  onClick={() => {
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
                    <div className="font-medium text-gray-700 text-sm">
                      Cetak PDF
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Terbaik untuk dokumen & print
                    </div>
                  </div>
                  {isExporting && (
                    <i className="fa-solid fa-spinner fa-spin text-gray-400"></i>
                  )}
                </button>

                <button
                  className="w-full text-left px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors group"
                  onClick={() => {
                    handleExportImage("png");
                    setActiveMenu(null);
                  }}
                  disabled={isExporting}
                >
                  <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-md flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <i className="fa-regular fa-image"></i>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-700 text-sm">
                      Gambar PNG
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Kualitas tinggi (Lossless)
                    </div>
                  </div>
                  {isExporting && (
                    <i className="fa-solid fa-spinner fa-spin text-gray-400"></i>
                  )}
                </button>

                <button
                  className="w-full text-left px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors group"
                  onClick={() => {
                    handleExportImage("jpg");
                    setActiveMenu(null);
                  }}
                  disabled={isExporting}
                >
                  <div className="w-8 h-8 bg-green-50 text-green-500 rounded-md flex items-center justify-center group-hover:bg-green-100 transition-colors">
                    <i className="fa-regular fa-image"></i>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-700 text-sm">
                      Gambar JPG
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Ukuran file kecil
                    </div>
                  </div>
                  {isExporting && (
                    <i className="fa-solid fa-spinner fa-spin text-gray-400"></i>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
