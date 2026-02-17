"use client";

import Image from "next/image";

type PanelMode = "upload" | "settings" | null;

interface SidebarProps {
  activePanel: PanelMode;
  setActivePanel: (mode: PanelMode) => void;
  onPrint: () => void;
  children?: React.ReactNode; // Pass panels as children
}

export function MiniSidebar({ activePanel, setActivePanel }: SidebarProps) {
  return (
    <div className="no-print w-16 bg-white border-r border-gray-200 flex flex-col items-center py-6 z-60 shrink-0">
      <div className="mb-8 font-black text-orange-500 text-xl italic tracking-tighter cursor-default">
        ik
      </div>

      <button
        onClick={() => setActivePanel("upload")}
        className={`p-3 mb-4 rounded-xl transition ${activePanel === "upload" ? "text-orange-600 bg-orange-50" : "text-gray-400 hover:text-orange-600"}`}
        title="Upload"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          ></path>
        </svg>
      </button>

      <button
        onClick={() => setActivePanel("settings")}
        className={`p-3 mb-4 rounded-xl transition ${activePanel === "settings" ? "text-orange-600 bg-orange-50" : "text-gray-400 hover:text-orange-600"}`}
        title="Settings"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          ></path>
        </svg>
      </button>
    </div>
  );
}

export function MainSidebar({
  activePanel,
  children,
}: {
  activePanel: PanelMode;
  children: React.ReactNode;
}) {
  // If no panel is active, we might hide the sidebar? Or just show the active one.
  // The PHP version creates a persistent sidebar area.

  return (
    <div className="no-print w-[300px] bg-white border-r border-gray-200 p-6 z-50 shrink-0">
      {children}
    </div>
  );
}
