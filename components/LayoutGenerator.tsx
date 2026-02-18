"use client";

import { useState, useEffect, useRef } from "react";
import { MiniSidebar, MainSidebar } from "@/components/Sidebar";
import UploadPanel from "@/components/UploadPanel";
import SettingsPanel from "@/components/SettingsPanel";
import MapsPanel from "@/components/MapsPanel";
import LayoutCard from "@/components/LayoutCard";
import {
  saveCardToDB,
  getAllCards,
  deleteCardFromDB,
  saveHistoryToDB,
  getHistoryFromDB,
  CardData,
} from "@/app/lib/db";

import useHistory from "@/hooks/useHistory";
import html2PDF from "jspdf-html2canvas-pro";

interface Settings {
  addr1: string;
  addr2: string;
  telp: string;
  email: string;
  paperSize: "a4" | "f4";
}

interface LayoutGeneratorProps {
  tabId: string;
  tabTitle?: string;
  onSettingsChange?: (settings: Settings) => void;
  onHistoryChange?: (hasHistory: boolean) => void;
  onPageStatusChange?: (current: number, total: number) => void;
  zoom?: number;
  initialData?: any;
}

export default function LayoutGenerator({
  tabId,
  tabTitle = "Layout",
  onSettingsChange,
  onHistoryChange,
  onPageStatusChange,
  zoom = 100,
  initialData,
}: LayoutGeneratorProps) {
  const [activeLeftPanel, setActiveLeftPanel] = useState<
    "upload" | "settings" | null
  >("upload");
  const [isMapsOpen, setIsMapsOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<Settings>({
    addr1: "Gedung Graha Pena Suite 1503",
    addr2: "Jl. Ahmad Yani 88 - Surabaya",
    telp: "0811-301-8005",
    email: "marketing@iklann.id",
    paperSize: "a4",
  });

  // Refs for callbacks to avoid dependency cycles
  const onSettingsChangeRef = useRef(onSettingsChange);
  const onHistoryChangeRef = useRef(onHistoryChange);
  const onPageStatusChangeRef = useRef(onPageStatusChange);

  useEffect(() => {
    onSettingsChangeRef.current = onSettingsChange;
  }, [onSettingsChange]);

  useEffect(() => {
    onHistoryChangeRef.current = onHistoryChange;
  }, [onHistoryChange]);

  useEffect(() => {
    onPageStatusChangeRef.current = onPageStatusChange;
  }, [onPageStatusChange]);

  // Notify parent when settings change
  useEffect(() => {
    onSettingsChangeRef.current?.(settings);
  }, [settings]);

  // History State
  const {
    state: cards,
    set: setCards,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    history: historyData,
  } = useHistory<CardData[]>([]);

  // Page Tracking
  useEffect(() => {
    // Notify parent about total pages
    onPageStatusChangeRef.current?.(1, cards.length); // Default to page 1

    const container = document.getElementById("cards-container");
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the card that is most visible
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const index = parseInt(entry.target.getAttribute("data-index") || "0");
            onPageStatusChangeRef.current?.(index + 1, cards.length);
          }
        });
      },
      {
        root: null, // viewport
        threshold: 0.5, // 50% visibility
      }
    );

    const cardElements = container.querySelectorAll(".layout-card-wrapper");
    cardElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [cards.length]);

  // --- Handlers ---

  // PDF Export Handler
  const handleDownloadPDF = async (pageRange?: string) => {
    if (!contentRef.current) return;
    setIsExporting(true);
    
    // Dispatch custom event for loading indicator
    window.dispatchEvent(new CustomEvent("export-start", { 
      detail: { fileName: `${tabTitle.replace(/[^a-z0-9\s-_]/gi, "").trim() || "Layout"}.pdf` } 
    }));

    const element = contentRef.current.querySelector(
      "#cards-container",
    ) as HTMLElement;
    
    if (!element) {
      setIsExporting(false);
      return;
    }

    const cloned = element.cloneNode(true) as HTMLElement;
    
    // Filter pages based on pageRange if provided
    if (pageRange) {
      const cardWrappers = cloned.querySelectorAll(".layout-card-wrapper");
      const pagesToKeep = new Set<number>();
      
      // Parse page range "1,3,5-7"
      const parts = pageRange.split(",");
      parts.forEach(part => {
        const range = part.trim().split("-");
        if (range.length === 1) {
          const page = parseInt(range[0]);
          if (!isNaN(page)) pagesToKeep.add(page);
        } else if (range.length === 2) {
          const start = parseInt(range[0]);
          const end = parseInt(range[1]);
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) pagesToKeep.add(i);
          }
        }
      });

      // Remove cards not in range (using 1-based indexing)
      cardWrappers.forEach((wrapper, index) => {
        if (!pagesToKeep.has(index + 1)) {
          wrapper.remove();
        }
      });

      // If no cards left, alert and stop
      if (cloned.querySelectorAll(".layout-card-wrapper").length === 0) {
        alert("Tidak ada halaman yang cocok dengan rentang yang dipilih.");
        setIsExporting(false);
        window.dispatchEvent(new CustomEvent("export-end"));
        return;
      }
    }

    const opt = {
      margin: [0, 0, 0, 0] as [number, number, number, number],
      filename: `${tabTitle.replace(/[^a-z0-9\s-_]/gi, "").trim() || "Layout"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: true,
        ignoreElements: (el: Element) => el.tagName === "IFRAME",
        foreignObjectRendering: true,
      },
      jsPDF: {
        unit: "mm",
        format: settings.paperSize === "f4" ? [330, 215] : "a4",
        orientation: "landscape",
        compress: true,
      },
      pagebreak: { mode: ["css", "legacy"] },
    };

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await (html2pdf() as any).from(cloned).set(opt).save();
    } catch (error) {
      console.error("PDF Export failed:", error);
    } finally {
      setIsExporting(false);
      window.dispatchEvent(new CustomEvent("export-end"));
    }
  };


  // Upload Handler
  const handleUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    const cardPromises = fileArray.map((file) => {
      return new Promise<CardData>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (!ev.target?.result) {
            reject(new Error("Failed to read file"));
            return;
          }
          const newCard: CardData = {
            id:
              "card_" +
              Date.now() +
              "_" +
              Math.random().toString(36).substr(2, 9),
            imgSrc: ev.target.result as string,
            coords: "-6.9165,107.5913",
            jenis: "Billboard",
            ukuran: "4x6m",
            lokasi: "Jl. Contoh Lokasi",
            keterangan: "-",
            timestamp: Date.now(),
            tabId: tabId,
          };
          resolve(newCard);
        };
        reader.onerror = () => reject(new Error("File reading error"));
        reader.readAsDataURL(file);
      });
    });

    try {
      const newCards = await Promise.all(cardPromises);
      setCards([...cards, ...newCards], `Upload ${newCards.length} Images`);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  // Card Operations
  const updateCard = async (id: string, key: keyof CardData, value: string) => {
    const updatedCards = cards.map((card) => {
      if (card.id === id) {
        return { ...card, [key]: value };
      }
      return card;
    });
    setCards(updatedCards, `Update ${key}`);
  };

  const deleteCard = async (id: string) => {
    setCards(
      cards.filter((c) => c.id !== id),
      "Delete Card",
    );
  };

  const copyCard = (id: string) => {
    const cardIndex = cards.findIndex((c) => c.id === id);
    if (cardIndex === -1) return;
    const cardToCopy = cards[cardIndex];
    const newCard: CardData = {
      ...cardToCopy,
      id: "card_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    const newCards = [...cards];
    newCards.splice(cardIndex + 1, 0, newCard);
    setCards(newCards, "Duplicate Card");
  };

  const moveDownCard = (id: string) => {
    const cardIndex = cards.findIndex((c) => c.id === id);
    if (cardIndex === -1 || cardIndex === cards.length - 1) return;
    const newCards = [...cards];
    const [movedCard] = newCards.splice(cardIndex, 1);
    newCards.splice(cardIndex + 1, 0, movedCard);
    setCards(newCards, "Move Card Down");
  };

  // Update Settings Wrapper
  const updateSetting = (key: keyof typeof settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    localStorage.setItem("settings_" + key, value);
  };

  // --- Effects ---

  // 1. Load Settings and Data on Mount
  useEffect(() => {
    const savedSettings = {
      addr1: localStorage.getItem("settings_addr1") || settings.addr1,
      addr2: localStorage.getItem("settings_addr2") || settings.addr2,
      telp: localStorage.getItem("settings_telp") || settings.telp,
      email: localStorage.getItem("settings_email") || settings.email,
      paperSize:
        (localStorage.getItem("settings_paperSize") as any) ||
        settings.paperSize,
    };
    
    // If initialData is provided, use it to override settings
    if (initialData && initialData.settings) {
       Object.assign(savedSettings, initialData.settings);
    }

    setSettings(savedSettings);
    setHasLoaded(false);

    const fetchData = async () => {
      try {
        if (initialData && initialData.cards) {
          // Initialize from initialData (Imported JSON)
          const newCards = initialData.cards.map((c: CardData) => ({
             ...c,
             tabId: tabId // Remap to current tabId
          }));

          // Save to DB immediately to persist this new tab's data
          // Clear any existing data for this tabId just in case (though likely empty)
          const existing = await getAllCards(tabId);
          for (const c of existing) await deleteCardFromDB(c.id);
          
          for (const c of newCards) {
             await saveCardToDB(c);
          }

          // Handle History
          if (initialData.history) {
             reset(initialData.history.past, newCards, initialData.history.future);
             await saveHistoryToDB(tabId, initialData.history.past, initialData.history.future);
          } else {
             reset([], newCards, []);
          }

          setHasLoaded(true);
        } else {
          // Normal load from DB
          const loadedCards = await getAllCards(tabId);
          const savedHistory = await getHistoryFromDB(tabId);
          if (savedHistory) {
            reset(savedHistory.past, loadedCards, savedHistory.future);
          } else {
            reset([], loadedCards, []);
          }
          setHasLoaded(true);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };
    fetchData();
  }, [tabId, reset, initialData]);

  // 2. Sync with DB
  useEffect(() => {
    const syncCards = async () => {
      if (!hasLoaded) return;
      const dbCards = await getAllCards(tabId);
      const currentIds = new Set(cards.map((c) => c.id));
      for (const c of dbCards) {
        if (!currentIds.has(c.id)) await deleteCardFromDB(c.id);
      }
      for (const c of cards) await saveCardToDB(c);
    };
    syncCards();
  }, [cards, tabId, hasLoaded]);

  // 3. Sync History to DB
  useEffect(() => {
    if (!hasLoaded) return;
    saveHistoryToDB(tabId, historyData.past, historyData.future);
    onHistoryChangeRef.current?.(historyData.past.length > 0);
  }, [historyData.past, historyData.future, tabId, hasLoaded]);

  // 4. Global Events (Undo, Redo, Print, Zoom)
  useEffect(() => {
    const handleUndo = () => {
      const el = document.getElementById(`layout-generator-${tabId}`);
      if (el && el.offsetParent !== null) undo();
    };
    const handleRedo = () => {
      const el = document.getElementById(`layout-generator-${tabId}`);
      if (el && el.offsetParent !== null) redo();
    };
    const handlePrint = (e: Event) => {
      const customEvent = e as CustomEvent;
      const pageRange = customEvent.detail?.pageRange;
      const el = document.getElementById(`layout-generator-${tabId}`);
      if (el && el.offsetParent !== null) handleDownloadPDF(pageRange);
    };

    // Zoom shortcuts - handled by event listener above, but need actual implementation here or parent.
    // Since props are read-only, we emit event.
    // The implementation inside useEffect is correct for dispatching.
    
    // We need to listen to the custom event in the parent (page.tsx) or here if we had local state.
    // Since zoom is controlled by parent, we just dispatch the request.
    
    // However, to make it work seamlessly, we need to add the listener for the custom event we just dispatched?
    // No, the parent should listen to it.
    
    const handleWheel = (e: WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            // Calculate new zoom based on direction
            const delta = e.deltaY > 0 ? -5 : 5;
            // We need to use the current zoom prop
            const currentZoom = zoom;
            const newZoom = Math.max(25, Math.min(200, currentZoom + delta));
            
            // Dispatch event for parent to update state
            window.dispatchEvent(new CustomEvent("zoom-update", { 
                detail: { tabId, zoom: newZoom } 
            }));
        }
    };

    const handleUploadEvent = (e: CustomEvent) => {
      // Check if the event is for this tab
      if (e.detail && e.detail.tabId === tabId && e.detail.files) {
        handleUpload(e.detail.files);
      }
    };

    const handleExportJSON = async (e: CustomEvent) => {
      // Only process if tabId matches
      if (e.detail && e.detail.tabId !== tabId) return;

      const dbCards = await getAllCards(tabId);
      const dbHistory = await getHistoryFromDB(tabId);
      
      const exportData = {
        version: "1.0",
        tabTitle,
        settings,
        cards: dbCards,
        history: dbHistory,
        timestamp: Date.now()
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${tabTitle.replace(/[^a-z0-9\s-_]/gi, "").trim() || "layout"}.json`);
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    };

    const handleToggleGrid = (e: Event) => {
        const customEvent = e as CustomEvent;
        setShowGrid(customEvent.detail?.show);
    };

    window.addEventListener("undo-action", handleUndo);
    window.addEventListener("redo-action", handleRedo);
    window.addEventListener("print-action", handlePrint);
    window.addEventListener("upload-files", handleUploadEvent as EventListener);
    window.addEventListener("export-json-action", handleExportJSON as unknown as EventListener);
    window.addEventListener("toggle-grid", handleToggleGrid as EventListener);
    
    // Use a more specific target if possible, or window with filter
    const container = document.getElementById(`layout-generator-${tabId}`);
    if (container) {
        container.addEventListener("wheel", handleWheel as EventListener, { passive: false });
    }

    return () => {
      window.removeEventListener("undo-action", handleUndo);
      window.removeEventListener("redo-action", handleRedo);
      window.removeEventListener("print-action", handlePrint);
      window.removeEventListener("upload-files", handleUploadEvent as EventListener);
      window.removeEventListener("export-json-action", handleExportJSON as unknown as EventListener);
      window.removeEventListener("toggle-grid", handleToggleGrid as EventListener);
      if (container) {
          container.removeEventListener("wheel", handleWheel as EventListener);
      }
    };
  }, [undo, redo, tabId, handleDownloadPDF, zoom]);

  return (
    <div
      id={`layout-generator-${tabId}`}
      className="flex h-full w-full bg-white relative"
      style={
        {
          "--print-width": settings.paperSize === "f4" ? "330mm" : "297mm",
          "--print-height": settings.paperSize === "f4" ? "215mm" : "210mm",
        } as React.CSSProperties
      }
    >
      <MiniSidebar
        activeLeftPanel={activeLeftPanel}
        setActiveLeftPanel={setActiveLeftPanel}
        isMapsOpen={isMapsOpen}
        toggleMaps={() => setIsMapsOpen(!isMapsOpen)}
        onPrint={handleDownloadPDF}
        isExporting={isExporting}
      />

      {activeLeftPanel && (
        <MainSidebar activePanel={activeLeftPanel as any}>
          {activeLeftPanel === "upload" && (
            <UploadPanel
              onUpload={handleUpload}
              cardCount={cards.length}
              history={{
                past: historyData.past.map((h) => h.action),
                future: historyData.future.map((h) => h.action),
                onUndo: undo,
                onRedo: redo,
              }}
            />
          )}
          {activeLeftPanel === "settings" && (
            <SettingsPanel settings={settings} setSettings={updateSetting} />
          )}
        </MainSidebar>
      )}

      <div
        id="main-content"
        ref={contentRef}
        className="flex-1 overflow-y-auto px-20 py-10 flex flex-col items-center bg-gray-100 h-full relative"
      >
        {showGrid && (
          <div 
            className="absolute inset-0 pointer-events-none z-0" 
            style={{
              backgroundImage: `linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)`,
              backgroundSize: `${40 * (zoom / 100)}px ${40 * (zoom / 100)}px`,
              backgroundPosition: "center top",
            }}
          />
        )}
        
        {cards.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            <p>Belum ada gambar yang diupload.</p>
          </div>
        ) : (
          <div
            id="cards-container"
            className="grid gap-8 w-fit origin-top transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            {cards.map((card, index) => (
              <div 
                key={card.id} 
                className="layout-card-wrapper" 
                data-index={index}
              >
                <LayoutCard
                  data={card}
                settings={settings}
                onUpdate={updateCard}
                onDelete={deleteCard}
                onCopy={copyCard}
                onMoveDown={moveDownCard}
                isLast={index === cards.length - 1}
                paperSize={settings.paperSize}
              />
              </div>
            ))}
          </div>
        )}
      </div>

      {isMapsOpen && (
        <div className="no-print w-[350px] bg-white border-l border-gray-200 p-6 z-50 shrink-0 h-full overflow-y-auto">
          <MapsPanel tabId={tabId} />
        </div>
      )}
    </div>
  );
}
