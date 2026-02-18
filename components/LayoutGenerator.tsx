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
}

export default function LayoutGenerator({
  tabId,
  tabTitle = "Layout",
  onSettingsChange,
  onHistoryChange,
}: LayoutGeneratorProps) {
  const [activeLeftPanel, setActiveLeftPanel] = useState<
    "upload" | "settings" | null
  >("upload");
  const [isMapsOpen, setIsMapsOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<Settings>({
    addr1: "Gedung Graha Pena Suite 1503",
    addr2: "Jl. Ahmad Yani 88 - Surabaya",
    telp: "0811-301-8005",
    email: "marketing@iklann.id",
    paperSize: "a4",
  });

  // Notify parent when settings change
  useEffect(() => {
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

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

  // --- Handlers ---

  // PDF Export Handler
  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    setIsExporting(true);

    const element = contentRef.current.querySelector(
      "#cards-container",
    ) as HTMLElement;
    const cloned = element.cloneNode(true)
    if (!element) {
      setIsExporting(false);
      return;
    }

    const opt = {
      margin: [0, 0, 0, 0] as [number, number, number, number],
      // filename: `${tabTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`,
      filename: `generated_${new Date(Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.pdf`,
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
    setSettings(savedSettings);
    setHasLoaded(false);

    const fetchData = async () => {
      try {
        const loadedCards = await getAllCards(tabId);
        const savedHistory = await getHistoryFromDB(tabId);
        if (savedHistory) {
          reset(savedHistory.past, loadedCards, savedHistory.future);
        } else {
          reset([], loadedCards, []);
        }
        setHasLoaded(true);
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };
    fetchData();
  }, [tabId, reset]);

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
    onHistoryChange?.(historyData.past.length > 0);
  }, [historyData.past, historyData.future, tabId, hasLoaded, onHistoryChange]);

  // 4. Global Events (Undo, Redo, Print)
  useEffect(() => {
    const handleUndo = () => {
      const el = document.getElementById(`layout-generator-${tabId}`);
      if (el && el.offsetParent !== null) undo();
    };
    const handleRedo = () => {
      const el = document.getElementById(`layout-generator-${tabId}`);
      if (el && el.offsetParent !== null) redo();
    };
    const handlePrint = () => {
      const el = document.getElementById(`layout-generator-${tabId}`);
      if (el && el.offsetParent !== null) handleDownloadPDF();
    };

    window.addEventListener("undo-action", handleUndo);
    window.addEventListener("redo-action", handleRedo);
    window.addEventListener("print-action", handlePrint);

    return () => {
      window.removeEventListener("undo-action", handleUndo);
      window.removeEventListener("redo-action", handleRedo);
      window.removeEventListener("print-action", handlePrint);
    };
  }, [undo, redo, tabId, handleDownloadPDF]);

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
        className="flex-1 overflow-y-auto px-20 py-10 flex flex-col items-center bg-gray-100 h-full"
      >
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
            className="grid gap-8 w-fit"
          >
            {cards.map((card, index) => (
              <LayoutCard
                key={card.id}
                data={card}
                settings={settings}
                onUpdate={updateCard}
                onDelete={deleteCard}
                onCopy={copyCard}
                onMoveDown={moveDownCard}
                isLast={index === cards.length - 1}
                paperSize={settings.paperSize}
              />
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
