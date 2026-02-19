"use client";

import Image from "next/image";

type LeftPanelMode = "upload" | "settings" | null;
type RightPanelMode = "objects" | "maps";

interface SidebarProps {
  activeLeftPanel: LeftPanelMode;
  setActiveLeftPanel: (mode: LeftPanelMode) => void;
  rightPanels: RightPanelMode[];
  toggleRightPanel: (mode: RightPanelMode) => void;
  onPrint: () => void;
  isExporting?: boolean;
  children?: React.ReactNode;
}

export function MiniSidebar({
  activeLeftPanel,
  setActiveLeftPanel,
  rightPanels,
  toggleRightPanel,
  onPrint,
  isExporting,
}: SidebarProps) {
  return (
    <div className="no-print w-16 bg-white border-r border-gray-200 flex flex-col items-center py-6 z-60 shrink-0">
      <div className="mb-8 font-black text-orange-500 text-xl italic tracking-tighter cursor-default">
        ik
      </div>

      <button
        id="btn-upload"
        onClick={() =>
          setActiveLeftPanel(activeLeftPanel === "upload" ? null : "upload")
        }
        className={`p-3 mb-4 rounded-xl transition ${activeLeftPanel === "upload" ? "text-orange-600 bg-orange-50" : "text-gray-400 hover:text-orange-600"}`}
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
        id="btn-objects"
        onClick={() => toggleRightPanel("objects")}
        className={`p-3 mb-4 rounded-xl transition ${rightPanels.includes("objects") ? "text-orange-600 bg-orange-50" : "text-gray-400 hover:text-orange-600"}`}
        title="Objects"
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
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          ></path>
        </svg>
      </button>

      <button
        id="btn-settings"
        onClick={() =>
          setActiveLeftPanel(activeLeftPanel === "settings" ? null : "settings")
        }
        className={`p-3 mb-4 rounded-xl transition ${activeLeftPanel === "settings" ? "text-orange-600 bg-orange-50" : "text-gray-400 hover:text-orange-600"}`}
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

      <button
        id="btn-maps"
        onClick={() => toggleRightPanel("maps")}
        className={`p-3 mb-4 rounded-xl transition ${rightPanels.includes("maps") ? "text-orange-600 bg-orange-50" : "text-gray-400 hover:text-orange-600"}`}
        title="Maps"
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
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          ></path>
        </svg>
      </button>

      <div className="flex-1"></div>
    </div>
  );
}

export function MainSidebar({
  activePanel,
  children,
}: {
  activePanel: LeftPanelMode;
  children: React.ReactNode;
}) {
  // If no panel is active, we might hide the sidebar? Or just show the active one.
  // The PHP version creates a persistent sidebar area.

  return (
    <div className="no-print w-[300px] bg-white border-r border-gray-200 p-6 z-50 shrink-0 h-full overflow-y-auto">
      {children}
    </div>
  );
}
