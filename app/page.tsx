"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import TabSystem from "@/components/TabSystem";
import LayoutGenerator from "@/components/LayoutGenerator";
import WelcomeModal from "@/components/WelcomeModal";
import Cookies from "js-cookie";

export default function Home() {
  // Tab State
  const [tabs, setTabs] = useState<
    { id: string; title: string; content: React.ReactNode; canClose: boolean }[]
  >([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [tabSettings, setTabSettings] = useState<Record<string, { paperSize: "a4" | "f4" }>>({});
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const handleSettingsChange = (tabId: string, settings: any) => {
    setTabSettings((prev) => ({
      ...prev,
      [tabId]: { paperSize: settings.paperSize },
    }));
  };

  // Load tabs from Cookies on mount
  useEffect(() => {
    // Check if welcome modal has been seen
    const hasSeenWelcome = localStorage.getItem("dlayout_welcome_seen_v1.0");
    if (!hasSeenWelcome) {
      setShowWelcomeModal(true);
    }

    const savedTabs = Cookies.get("dlayout_tabs");
    const savedActiveTab = Cookies.get("dlayout_active_tab");

    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs);
        // Reconstruct content component since it can't be JSON serialized
        const restoredTabs = parsedTabs.map((t: any) => ({
          ...t,
          content: (
            <LayoutGenerator
              tabId={t.id}
              tabTitle={t.title}
              onSettingsChange={(s) => handleSettingsChange(t.id, s)}
            />
          ),
        }));
        setTabs(restoredTabs);
        setActiveTabId(savedActiveTab || restoredTabs[0]?.id || "");
      } catch (e) {
        console.error("Failed to parse tabs cookie", e);
        initializeDefaultTab();
      }
    } else {
      initializeDefaultTab();
    }
    setIsLoaded(true);
  }, []);

  const initializeDefaultTab = () => {
    const defaultId = "tab-1";
    setTabs([
      {
        id: defaultId,
        title: "Layout Generator",
        content: (
          <LayoutGenerator
            tabId={defaultId}
            tabTitle="Layout Generator"
            onSettingsChange={(s) => handleSettingsChange(defaultId, s)}
          />
        ),
        canClose: false,
      },
    ]);
    setActiveTabId(defaultId);
  };

  // Save tabs to Cookies whenever they change
  useEffect(() => {
    if (!isLoaded) return;

    // Save only serializable data (exclude content)
    const tabsToSave = tabs.map(({ id, title, canClose }) => ({
      id,
      title,
      canClose,
    }));
    Cookies.set("dlayout_tabs", JSON.stringify(tabsToSave), { expires: 365 });
    Cookies.set("dlayout_active_tab", activeTabId, { expires: 365 });
  }, [tabs, activeTabId, isLoaded]);

  const handleNewTab = (type: string, title: string) => {
    const newId = `tab-${Date.now()}`;
    const newTitle = `${title} ${tabs.length + 1}`;
    const newTab = {
      id: newId,
      title: newTitle,
      content: (
        <LayoutGenerator
          tabId={newId}
          tabTitle={newTitle}
          onSettingsChange={(s) => handleSettingsChange(newId, s)}
        />
      ),
      canClose: true,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const handleTabClose = (id: string) => {
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const updateTabContent = (id: string, title: string) => {
    return (
      <LayoutGenerator
        tabId={id}
        tabTitle={title}
        onSettingsChange={(s) => handleSettingsChange(id, s)}
      />
    );
  };

  const handleTabRename = (id: string, newTitle: string) => {
    const titleToUse =
      newTitle.trim() === ""
        ? `Layout Generator (${id ? id.replace("tab-", "") : ""})`
        : newTitle;
    setTabs(
      tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              title: titleToUse,
              content: updateTabContent(id, titleToUse),
            }
          : t,
      ),
    );
  };

  if (!isLoaded) return null; // or a loading spinner

  return (
    <div className="flex flex-col h-screen w-full">
      <WelcomeModal 
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onNewProject={() => {
          initializeDefaultTab();
          setShowWelcomeModal(false);
        }}
      />
      <Navbar
        onUpload={(files) => {
          // If active tab is LayoutGenerator, we might want to pass upload to it?
          // Currently Navbar upload is global. We might need to context or ref to pass to active tab.
          // For now, let's just log or open a new tab if needed.
          // Ideally, the active LayoutGenerator should handle this.
          // Since we extracted logic, we need a way to communicate.
          // Implementation detail: For now, Navbar upload might need valid targets.
          alert(
            "Please use the Upload button inside the Layout Generator tab.",
          );
        }}
        onNewTab={handleNewTab}
        activeTabTitle={tabs.find((t) => t.id === activeTabId)?.title}
        activePaperSize={tabSettings[activeTabId]?.paperSize || "a4"}
      />
      <TabSystem
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={setActiveTabId}
        onTabClose={handleTabClose}
        onTabRename={handleTabRename}
      />
    </div>
  );
}
