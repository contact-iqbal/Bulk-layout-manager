"use client";

import { useState, ReactNode } from "react";

interface Tab {
  id: string;
  title: string;
  content: ReactNode;
  canClose: boolean;
}

interface TabSystemProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabRename?: (id: string, newTitle: string) => void;
}

export default function TabSystem({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onTabRename,
}: TabSystemProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleDoubleClick = (id: string, currentTitle: string) => {
    setEditingTabId(id);
    setEditTitle(currentTitle);
  };

  const handleRenameSubmit = () => {
    if (editingTabId && onTabRename) {
      onTabRename(editingTabId, editTitle);
    }
    setEditingTabId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setEditingTabId(null);
    }
  };
  return (
    <div className="flex flex-col h-full w-full bg-gray-100 overflow-hidden">
      {/* Tab Bar */}
      <div className="flex bg-[#f3f3f3] border-b border-gray-300 select-none overflow-x-auto no-scrollbar h-[35px] items-end px-2 gap-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`
              group relative flex items-center px-3 py-1.5 min-w-[120px] max-w-[200px] 
              text-xs border-r border-gray-200 cursor-pointer
              ${
                activeTabId === tab.id
                  ? "bg-white text-gray-800 border-t-2 border-t-orange-500 font-medium"
                  : "bg-[#ececec] text-gray-600 hover:bg-[#e6e6e6]"
              }
            `}
            onClick={() => onTabClick(tab.id)}
            onDoubleClick={() => handleDoubleClick(tab.id, tab.title)}
          >
            {editingTabId === tab.id ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1 mr-2 px-1 py-0.5 text-xs border border-blue-400 outline-none rounded"
                onClick={(e) => e.stopPropagation()} // Prevent triggering tab switch execution again
              />
            ) : (
              <span className="truncate flex-1 mr-2">{tab.title}</span>
            )}
            {tab.canClose && (
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded text-gray-500 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                <span className="sr-only">Close</span>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 relative bg-white overflow-hidden">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`w-full h-full absolute inset-0 ${
              activeTabId === tab.id
                ? "z-10 opacity-100"
                : "z-0 opacity-0 pointer-events-none no-print"
            }`}
            style={{ display: activeTabId === tab.id ? "block" : "none" }}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
