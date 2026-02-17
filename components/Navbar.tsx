"use client";

import { useRef, useState, useEffect } from "react";

interface NavbarProps {
  onUpload: (files: FileList) => void;
  onNewTab?: (type: string, title: string) => void;
}

export default function Navbar({ onUpload, onNewTab }: NavbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

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
                {menu.items.map((item, idx) =>
                  item.separator ? (
                    <div
                      key={idx}
                      className="border-b border-gray-200 my-1"
                    ></div>
                  ) : (
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
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
