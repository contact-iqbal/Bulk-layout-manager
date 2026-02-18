"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import TabSystem from "@/components/TabSystem";
import LayoutGenerator from "@/components/LayoutGenerator";
import WelcomeModal from "@/components/WelcomeModal";
import DownloadProgress from "@/components/DownloadProgress";
import BottomNavbar from "@/components/BottomNavbar";
import Cookies from "js-cookie";

export default function Home() {
  // Tab State
  const [tabs, setTabs] = useState<
    { id: string; title: string; content: React.ReactNode; canClose: boolean; initialData?: any }[]
  >([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [tabSettings, setTabSettings] = useState<
    Record<string, { paperSize: "a4" | "f4" }>
  >({});
  const [unsavedTabs, setUnsavedTabs] = useState<Set<string>>(new Set());
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [tabPageStatus, setTabPageStatus] = useState<
    Record<string, { current: number; total: number }>
  >({});
  const [tabZoom, setTabZoom] = useState<Record<string, number>>({});

  useEffect(() => {
    const handleZoomUpdate = (e: CustomEvent) => {
      const { tabId, zoom } = e.detail;
      handleZoomChange(tabId, zoom);
    };

    window.addEventListener("zoom-update", handleZoomUpdate as EventListener);
    return () => {
      window.removeEventListener("zoom-update", handleZoomUpdate as EventListener);
    };
  }, []);

  const handleZoomChange = (tabId: string, zoom: number) => {
    setTabZoom((prev) => ({
      ...prev,
      [tabId]: zoom,
    }));
  };

  const handlePageStatusChange = (tabId: string, current: number, total: number) => {
    setTabPageStatus((prev) => ({
      ...prev,
      [tabId]: { current, total },
    }));
  };

  const handleSettingsChange = (tabId: string, settings: any) => {
    setTabSettings((prev) => ({
      ...prev,
      [tabId]: { paperSize: settings.paperSize },
    }));
  };

  const handleHistoryChange = (tabId: string, hasHistory: boolean) => {
    setUnsavedTabs((prev) => {
      const next = new Set(prev);
      if (hasHistory) {
        next.add(tabId);
      } else {
        next.delete(tabId);
      }
      return next;
    });
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
          content: null, // Will be rendered dynamically
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
        content: null,
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

  const handleNewTab = (type: string, title: string, initialData?: any) => {
    const newId = `tab-${Date.now()}`;
    const newTab = {
      id: newId,
      title: title,
      content: null,
      canClose: true,
      initialData: initialData,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  // Render content dynamically based on state
  const renderedTabs = tabs.map(t => ({
    ...t,
    content: (
      <LayoutGenerator
        tabId={t.id}
        tabTitle={t.title}
        onSettingsChange={(s) => handleSettingsChange(t.id, s)}
        onHistoryChange={(h) => handleHistoryChange(t.id, h)}
        onPageStatusChange={(c, total) => handlePageStatusChange(t.id, c, total)}
        zoom={tabZoom[t.id] || 100}
        initialData={t.initialData}
      />
    )
  }));

  const handleTabClose = async (id: string) => {
    if (unsavedTabs.has(id)) {
      const Swal = (await import("sweetalert2")).default;
      const result = await Swal.fire({
        title: "Tutup tab?",
        text: "Tab ini memiliki riwayat aksi yang akan hilang jika ditutup.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#f97316",
        cancelButtonColor: "#9ca3af",
        confirmButtonText: "Ya, Tutup",
        cancelButtonText: "Batal",
      });

      if (!result.isConfirmed) return;
    }

    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);

    // Cleanup unsaved state
    setUnsavedTabs((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

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
        onHistoryChange={(h) => handleHistoryChange(id, h)}
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
      <DownloadProgress />
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onNewProject={() => {
          handleNewTab("layout", "Layout Generator");
          setShowWelcomeModal(false);
        }}
      />
      <Navbar
        onUpload={(files) => {
          // Dispatch custom event to target the active LayoutGenerator tab
          if (activeTabId) {
            window.dispatchEvent(
              new CustomEvent("upload-files", {
                detail: { files, tabId: activeTabId },
              })
            );
          } else {
             // Fallback if no tab is active (should not happen usually)
             alert("Silakan buka tab terlebih dahulu.");
          }
        }}
        onNewTab={handleNewTab}
        activeTabTitle={tabs.find((t) => t.id === activeTabId)?.title}
        activePaperSize={tabSettings[activeTabId]?.paperSize || "a4"}
        activeTabId={activeTabId}
      />
      <TabSystem
        tabs={renderedTabs}
        activeTabId={activeTabId}
        onTabClick={setActiveTabId}
        onTabClose={handleTabClose}
        onTabRename={handleTabRename}
      />
      <BottomNavbar 
        currentPage={tabPageStatus[activeTabId]?.current || 0}
        totalPages={tabPageStatus[activeTabId]?.total || 0}
        zoom={tabZoom[activeTabId] || 100}
        onZoomChange={(zoom) => handleZoomChange(activeTabId, zoom)}
      />
    </div>
  );
}
