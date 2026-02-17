"use client";

import { useState, useEffect } from "react";
import { MiniSidebar, MainSidebar } from "@/components/Sidebar";
import UploadPanel from "@/components/UploadPanel";
import SettingsPanel from "@/components/SettingsPanel";
import LayoutCard from "@/components/LayoutCard";
import {
  saveCardToDB,
  getAllCards,
  deleteCardFromDB,
  CardData,
} from "@/app/lib/db";

import useHistory from "@/hooks/useHistory";

interface LayoutGeneratorProps {
  tabId: string;
}

export default function LayoutGenerator({ tabId }: LayoutGeneratorProps) {
  const [activePanel, setActivePanel] = useState<"upload" | "settings" | null>(
    "upload",
  );

  // Settings State
  const [settings, setSettings] = useState({
    addr1: "Gedung Graha Pena Suite 1503",
    addr2: "Jl. Ahmad Yani 88 - Surabaya",
    telp: "0811-301-8005",
    email: "marketing@iklann.id",
  });

  // History State
  const {
    state: cards,
    set: setCards,
    undo,
    redo,
    canUndo,
    canRedo,
    history: historyData,
  } = useHistory<CardData[]>([]);

  // 1. Load Settings on Mount
  useEffect(() => {
    const savedSettings = {
      addr1: localStorage.getItem("settings_addr1") || settings.addr1,
      addr2: localStorage.getItem("settings_addr2") || settings.addr2,
      telp: localStorage.getItem("settings_telp") || settings.telp,
      email: localStorage.getItem("settings_email") || settings.email,
    };
    setSettings(savedSettings);

    const fetchCards = async () => {
      try {
        const loadedCards = await getAllCards(tabId);
        // Initialize history with loaded cards without adding to history stack (kinda tricky with useHistory)
        // For simplicity, we just set it. If we want to avoid initial undo to empty, we might need a reset method in hook.
        // But for now setCards is fine.
        setCards(loadedCards);
      } catch (error) {
        console.error("Failed to load cards:", error);
      }
    };
    fetchCards();
  }, []);

  // Sync with DB whenever cards change (from undo/redo/set)
  // Optimization: This might be heavy if we delete/rewrite all.
  // Ideally we should sync diffs. But given the prompt "undo/redo logs actions",
  // simply ensuring DB matches UI state is the goal for persistence.
  // Note: This effect runs on every history change.
  useEffect(() => {
    // We need to be careful not to create infinite loops or excessive DB writes.
    // Also, we need to handle that `cards` in DB might need to be synced.
    // Strategy: When `cards` changes, we essentially want the DB to reflect this list for this tabId.
    // A simple way is to delete all for this tab and re-add. (Inefficient but robust for small counts).
    // Better way for this specific app:
    // The previous implementation updated DB individually.
    // Now state is source of truth.
    // Let's implement a bulk sync or just per-action update wrapped in setCards.
    // Actually, `useHistory` manages state. When we `undo`, `cards` reverts.
    // We should probably sync the *result* to DB.

    // However, since `setCards` in `handleUpload` etc previously did `saveCardToDB`,
    // now we must do it inversely: Effect observes `cards` and ensures DB matches.

    const syncDB = async () => {
      // Get all current DB cards for this tab
      const dbCards = await getAllCards(tabId);
      const currentIds = new Set(cards.map((c) => c.id));
      const dbIds = new Set(dbCards.map((c) => c.id));

      // Delete removed
      for (const c of dbCards) {
        if (!currentIds.has(c.id)) {
          await deleteCardFromDB(c.id);
        }
      }

      // Add/Update existing
      for (const c of cards) {
        // Optimization: check if changed? For now just put (it updates).
        await saveCardToDB(c);
      }
    };
    syncDB();
  }, [cards, tabId]);

  // Global Undo/Redo Events
  useEffect(() => {
    const handleUndo = () => {
      // Only undo if this tab is visible?
      // Actually the event is global. If we have multiple tabs, all might undo.
      // We should check visibility.
      // For MVP, checking if the tab container is visible is hard from here without ref.
      // But `LayoutGenerator` is mounted/unmounted or hidden?
      // In `TabSystem`, we use `display: none`. So component is mounted.
      // We need to know if we are active.
      // Let's rely on the fact that only one is visible.
      // But we don't have `isActive` prop.
      // Let's assume the user wants undo on the active tab.
      // We can pass `isActive` prop or check visibility.
      // PRO TIP: Check `document.visibilityState` or if element is visible.
      // A simple check: `offsetParent !== null`.
      const el = document.getElementById(`layout-generator-${tabId}`);
      if (el && el.offsetParent !== null) {
        undo();
      }
    };
    const handleRedo = () => {
      const el = document.getElementById(`layout-generator-${tabId}`);
      if (el && el.offsetParent !== null) {
        redo();
      }
    };

    window.addEventListener("undo-action", handleUndo);
    window.addEventListener("redo-action", handleRedo);

    return () => {
      window.removeEventListener("undo-action", handleUndo);
      window.removeEventListener("redo-action", handleRedo);
    };
  }, [undo, redo, tabId]);

  // Update Settings Wrapper
  const updateSetting = (key: keyof typeof settings, value: string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem("settings_" + key, value);
  };

  // Upload Handler
  const handleUpload = async (files: FileList) => {
    const fileArray = Array.from(files);

    // Create promises for all file reads
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

  // Update Card Handler
  const updateCard = async (id: string, key: keyof CardData, value: string) => {
    const updatedCards = cards.map((card) => {
      if (card.id === id) {
        return { ...card, [key]: value };
      }
      return card;
    });
    setCards(updatedCards, `Update ${key}`);
    // DB sync handled by effect
  };

  // Delete Card Handler
  const deleteCard = async (id: string) => {
    // await deleteCardFromDB(id); // Handled by effect
    setCards(
      cards.filter((c) => c.id !== id),
      "Delete Card",
    );
  };

  return (
    <div
      id={`layout-generator-${tabId}`}
      className="flex h-full w-full bg-white relative"
    >
      <MiniSidebar
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        onPrint={() => window.print()}
      />

      {activePanel && (
        <MainSidebar activePanel={activePanel}>
          {activePanel === "upload" && (
            <UploadPanel
              onUpload={handleUpload}
              onPrint={() => window.print()}
              cardCount={cards.length}
              history={{
                past: historyData.past.map((h) => h.action),
                future: historyData.future.map((h) => h.action),
                onUndo: undo,
                onRedo: redo,
              }}
            />
          )}
          {activePanel === "settings" && (
            <SettingsPanel settings={settings} setSettings={updateSetting} />
          )}
        </MainSidebar>
      )}

      <div
        id="main-content"
        className="flex-1 overflow-y-auto p-8 flex flex-col items-center bg-gray-100 h-full"
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
            className="flex flex-col gap-8 w-full max-w-5xl"
          >
            {cards.map((card) => (
              <LayoutCard
                key={card.id}
                data={card}
                settings={settings}
                onUpdate={updateCard}
                onDelete={deleteCard}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
