"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import TabSystem from "@/components/TabSystem";
import LayoutGenerator from "@/components/LayoutGenerator";
import ImageViewer from "@/components/ImageViewer";
import WelcomeModal from "@/components/WelcomeModal";
import DownloadProgress from "@/components/DownloadProgress";
import { CardData, saveTabsToDB, getTabsFromDB } from "@/app/lib/db";
import BottomNavbar from "@/components/BottomNavbar";
import Cookies from "js-cookie";
import Swal from "sweetalert2";

export default function Home() {
  // Tab State
  const [tabs, setTabs] = useState<
    { id: string; title: string; type?: string; content: React.ReactNode; canClose: boolean; initialData?: any }[]
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

    const handleImportBackup = (e: CustomEvent) => {
      const backupData = e.detail;
      handleAddTab(backupData);
    };

    const handleOpenImageTab = (e: CustomEvent) => {
      const { src, name, cardId, sourceTabId } = e.detail;
      handleNewTab("image", name, { src, name, cardId, sourceTabId });
    };

    window.addEventListener("zoom-update", handleZoomUpdate as EventListener);
    window.addEventListener("import-backup", handleImportBackup as EventListener);
    window.addEventListener("open-image-tab", handleOpenImageTab as EventListener);
    
    return () => {
      window.removeEventListener("zoom-update", handleZoomUpdate as EventListener);
      window.removeEventListener("import-backup", handleImportBackup as EventListener);
      window.removeEventListener("open-image-tab", handleOpenImageTab as EventListener);
    };
  }, [tabs]);

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

  // Load tabs from DB on mount
  useEffect(() => {
    // Check if welcome modal has been seen
    const hasSeenWelcome = localStorage.getItem("dlayout_welcome_seen_v1.0");
    if (!hasSeenWelcome) {
      setShowWelcomeModal(true);
    }

    const loadTabs = async () => {
      try {
        let restoredTabs = await getTabsFromDB();

        // Fallback: If DB empty, try localStorage (migration)
        if (!restoredTabs || restoredTabs.length === 0) {
          const localTabs = localStorage.getItem("dlayout_tabs");
          if (localTabs) {
            try {
              restoredTabs = JSON.parse(localTabs);
            } catch (e) {
              console.error("Failed to parse local tabs", e);
            }
          }
        }

        // Fallback: If still empty, try cookies (older migration)
        if (!restoredTabs || restoredTabs.length === 0) {
           const cookieTabs = Cookies.get("dlayout_tabs");
           if (cookieTabs) {
             try {
               restoredTabs = JSON.parse(cookieTabs);
             } catch (e) {
               console.error("Failed to parse cookie tabs", e);
             }
           }
        }

        if (restoredTabs && restoredTabs.length > 0) {
          setTabs(restoredTabs.map((t: any) => ({
            ...t,
            content: null // Content will be rendered by renderedTabs
          })));
          
          const active = localStorage.getItem("dlayout_active_tab") || Cookies.get("dlayout_active_tab");
          if (active) setActiveTabId(active);
          else setActiveTabId(restoredTabs[0].id);
        } else {
          // Initialize default if no tabs found
          const defaultId = `tab-${Date.now()}`;
          setTabs([
            {
              id: defaultId,
              title: "Layout Generator",
              content: null,
              canClose: false,
            },
          ]);
          setActiveTabId(defaultId);
        }
      } catch (error) {
        console.error("Failed to load tabs:", error);
        // Initialize default on error
        const defaultId = `tab-${Date.now()}`;
        setTabs([
          {
            id: defaultId,
            title: "Layout Generator",
            content: null,
            canClose: false,
          },
        ]);
        setActiveTabId(defaultId);
      } finally {
        setIsLoaded(true);
      }
    };

    loadTabs();
  }, []);

  const initializeDefaultTab = () => {
    const defaultId = `tab-${Date.now()}`;
    setTabs([
      {
        id: defaultId,
        title: "Layout Generator",
        content: null,
        canClose: false,
        initialData: undefined,
        type: undefined
      },
    ]);
    setActiveTabId(defaultId);
  };

  // Save tabs to DB whenever they change
  useEffect(() => {
    if (!isLoaded) return;

    // Save serializable data including type and initialData (for images)
    // Use IndexedDB (via saveTabsToDB) instead of localStorage to handle larger data
    const tabsToSave = tabs.map(({ id, title, canClose, type, initialData }) => ({
      id,
      title,
      canClose,
      type,
      initialData
    }));
    
    // Save to DB asynchronously
    saveTabsToDB(tabsToSave).catch(e => {
      console.error("Failed to save tabs to DB", e);
    });

    try {
      // Save active tab ID to localStorage (lightweight)
      localStorage.setItem("dlayout_active_tab", activeTabId);
      
      // Cleanup old storage to avoid confusion and free up space
      Cookies.remove("dlayout_tabs");
      Cookies.remove("dlayout_active_tab");
      
      // We can also remove the localStorage tabs entry if migration is confirmed,
      // but let's keep it for now or maybe clear it to solve the "QuotaExceeded" issue?
      // Since we are now using DB, we SHOULD clear the localStorage tabs to fix the user's issue.
      if (localStorage.getItem("dlayout_tabs")) {
        localStorage.removeItem("dlayout_tabs");
      }
    } catch (e) {
      console.error("Failed to save active tab or cleanup", e);
    }
  }, [tabs, activeTabId, isLoaded]);

  const handleAddTab = (initialData?: any) => {
    const newId = `tab-${Date.now()}`;
    const newTitle = initialData?.tabTitle || `Layout Generator (${tabs.length + 1})`;
    
    setTabs((prev) => [
      ...prev,
      {
        id: newId,
        title: newTitle,
        content: null,
        canClose: true,
        initialData: initialData,
      },
    ]);
    setActiveTabId(newId);
  };

  const handleNewTab = (type: string, title: string, initialData?: any) => {
    const newId = `tab-${Date.now()}`;
    const newTab = {
      id: newId,
      title: title,
      content: null,
      canClose: true,
      initialData: initialData,
      type: type, // Store type
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  // Render content dynamically based on state
  const renderedTabs = tabs.map(t => ({
    ...t,
    content: t.type === "image" ? (
      <ImageViewer 
        src={t.initialData?.src} 
        name={t.initialData?.name} 
        tabId={t.id}
        initialData={t.initialData}
        onClose={() => handleTabClose(t.id)}
      />
    ) : (
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
           // Check if first file is JSON (backup)
           if (files.length === 1 && files[0].type === "application/json") {
              const file = files[0];
              const reader = new FileReader();
              reader.onload = (e) => {
                 try {
                    const json = JSON.parse(e.target?.result as string);
                    if (json.cards || json.history) {
                       handleAddTab(json);
                       Swal.fire({
                          title: "Berhasil!",
                          text: "Backup berhasil diimpor ke tab baru.",
                          icon: "success",
                          confirmButtonColor: "#f97316",
                       });
                    }
                 } catch (err) {
                    console.error("Failed to parse backup", err);
                 }
              };
              reader.readAsText(file);
              return;
           }

          // Dispatch custom event to target the active LayoutGenerator tab
          if (activeTabId) {
            window.dispatchEvent(
              new CustomEvent("upload-files", {
                detail: { files, tabId: activeTabId },
              })
            );
          } else {
             // Fallback if no tab is active (should not happen usually)
             Swal.fire({
               icon: "warning",
               title: "Perhatian",
               text: "Silakan buka tab terlebih dahulu.",
               confirmButtonColor: "#3b82f6",
             });
          }
        }}
        onNewTab={handleNewTab}
        activeTabTitle={tabs.find((t) => t.id === activeTabId)?.title}
        activeTabId={activeTabId}
        isImageViewer={tabs.find(t => t.id === activeTabId)?.type === "image"}
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
