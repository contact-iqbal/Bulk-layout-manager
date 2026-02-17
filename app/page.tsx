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
} from "./lib/db";

export default function Home() {
  const [activePanel, setActivePanel] = useState<"upload" | "settings" | null>(
    "upload",
  ); // Default to upload panel visible

  // Settings State
  const [settings, setSettings] = useState({
    addr1: "Gedung Graha Pena Suite 1503",
    addr2: "Jl. Ahmad Yani 88 - Surabaya",
    telp: "0811-301-8005",
    email: "marketing@iklann.id",
  });

  // Cards State
  const [cards, setCards] = useState<CardData[]>([]);

  // 1. Load Settings on Mount
  useEffect(() => {
    const savedSettings = {
      addr1: localStorage.getItem("settings_addr1") || settings.addr1,
      addr2: localStorage.getItem("settings_addr2") || settings.addr2,
      telp: localStorage.getItem("settings_telp") || settings.telp,
      email: localStorage.getItem("settings_email") || settings.email,
    };
    setSettings(savedSettings);

    // 2. Load Cards on Mount
    const fetchCards = async () => {
      try {
        const loadedCards = await getAllCards();
        setCards(loadedCards);
      } catch (error) {
        console.error("Failed to load cards:", error);
      }
    };
    fetchCards();
  }, []);

  // Update Settings Wrapper
  const updateSetting = (key: keyof typeof settings, value: string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem("settings_" + key, value);
  };

  // Upload Handler
  const handleUpload = (files: FileList) => {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        if (!ev.target?.result) return;

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
        };

        await saveCardToDB(newCard);
        setCards((prev) => [...prev, newCard]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Update Card Handler
  const updateCard = async (id: string, key: keyof CardData, value: string) => {
    const updatedCards = cards.map((card) => {
      if (card.id === id) {
        return { ...card, [key]: value };
      }
      return card;
    });
    setCards(updatedCards);

    // Persist to DB
    const cardToUpdate = updatedCards.find((c) => c.id === id);
    if (cardToUpdate) {
      await saveCardToDB(cardToUpdate);
    }
  };

  // Delete Card Handler
  const deleteCard = async (id: string) => {
    await deleteCardFromDB(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="flex h-screen w-full">
      {/* Mini Sidebar */}
      <MiniSidebar
        activePanel={activePanel}
        setActivePanel={(mode) => {
          // Toggle logic: if clicking same mode, close it? Or keep open?
          // PHP logic: "If just toggle... toggle between Main and Mini"
          // NextJS logic: If mode is same as active, maybe close?
          // The prompt implies persistent sidebar. Let's just switch.
          if (activePanel === mode) {
            // optional: setActivePanel(null); // Close sidebar
          } else {
            setActivePanel(mode);
          }
        }}
        onPrint={() => window.print()}
      />

      {/* Main Sidebar - Only show if activePanel is not null */}
      {activePanel && (
        <MainSidebar activePanel={activePanel}>
          {activePanel === "upload" && (
            <UploadPanel
              onUpload={handleUpload}
              onPrint={() => window.print()}
            />
          )}
          {activePanel === "settings" && (
            <SettingsPanel settings={settings} setSettings={updateSetting} />
          )}
        </MainSidebar>
      )}

      {/* Main Content */}
      <div
        id="main-content"
        className="flex-1 overflow-y-auto p-8 flex flex-col items-center bg-gray-100"
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
          <div id="cards-container" className="flex flex-col gap-8">
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
