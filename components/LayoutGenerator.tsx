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
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
    
    window.dispatchEvent(new CustomEvent("export-start", { 
      detail: { fileName: `${tabTitle.replace(/[^a-z0-9\s-_]/gi, "").trim() || "Layout"}.pdf` } 
    }));

    try {
        const element = contentRef.current.querySelector("#cards-container") || contentRef.current.querySelector("#export-root");
        
        if (!element) throw new Error("Container element not found");

        // Clone for manipulation
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

        // Prepare clone for rendering
        cloned.style.position = "absolute";
        cloned.style.left = "-9999px";
        cloned.style.top = "0";
        // Reset zoom/transform on the container
        cloned.style.transform = "none";
        cloned.style.width = "auto";
        cloned.style.height = "auto";
        cloned.style.overflow = "visible";
        
        document.body.appendChild(cloned);

        // Transform inputs and textareas to text elements for better rendering
        const inputs = cloned.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            const el = input as HTMLInputElement | HTMLTextAreaElement;
            const style = window.getComputedStyle(el);
            
            const replacement = document.createElement('div');
            replacement.textContent = el.value;
            
            // Copy relevant styles
            replacement.style.fontFamily = style.fontFamily;
            replacement.style.fontSize = style.fontSize;
            replacement.style.fontWeight = style.fontWeight;
            replacement.style.color = style.color;
            replacement.style.textAlign = style.textAlign;
            replacement.style.lineHeight = style.lineHeight;
            replacement.style.textTransform = style.textTransform;
            replacement.style.letterSpacing = style.letterSpacing;
            replacement.style.whiteSpace = 'pre-wrap'; // Preserve line breaks for textareas
            replacement.style.wordBreak = 'break-word';
            replacement.style.display = 'inline-block';
            replacement.style.width = style.width; // Maintain width if set
            
            // Remove border/background to look like clean text
            replacement.style.border = 'none';
            replacement.style.background = 'transparent';
            replacement.style.padding = style.padding;
            replacement.style.margin = style.margin;

            if (el.tagName.toLowerCase() === 'textarea') {
                replacement.style.display = 'block'; // Textareas usually block or inline-block behaving like block
                replacement.style.height = 'auto'; // Let it grow
                replacement.style.minHeight = style.height;
            }

            el.parentNode?.replaceChild(replacement, el);
        });

        // Convert Google Maps iframes to static images
        // Since html2canvas cannot capture cross-origin iframes, we replace them with static map images
        // We use Yandex Static Maps as a free fallback that doesn't require an API key for basic usage
        const mapIframes = cloned.querySelectorAll('iframe');
        const mapLoadPromises: Promise<void>[] = [];

        mapIframes.forEach(iframe => {
            const src = iframe.src;
            // Extract coordinates from Google Maps Embed URL
            // Format: https://www.google.com/maps?q=-6.9165,107.5913&...
            const match = src.match(/q=([-\d\.,]+)/);
            
            if (match && match[1]) {
                const coords = match[1].split(',');
                if (coords.length === 2) {
                    const lat = coords[0].trim();
                    const lon = coords[1].trim();

                    const img = document.createElement('img');
                    img.crossOrigin = "anonymous"; // Important for html2canvas
                    
                    // Using Yandex Static Maps API (free, reliable, no key for basic use)
                    // Note: Yandex uses lon,lat order. Google uses lat,lon.
                    // l=map: Vector map layer (colorful, like Google Maps default)
                    // lang=en_US: Ensure labels are in Latin/English, not Russian
                    // pt parameter adds a marker
                    img.src = `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&z=16&l=map&lang=en_US&size=600,450&pt=${lon},${lat},pm2rdm`;
                    
                    // Copy styles to match iframe
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    img.style.border = '0';
                    img.style.position = 'absolute';
                    img.style.inset = '0';
                    
                    const parent = iframe.parentNode;
                    if (parent) {
                            const loadPromise = new Promise<void>((resolve) => {
                                img.onload = () => resolve();
                                img.onerror = () => {
                                    // Fallback if image fails (e.g. rate limit or network)
                                    console.warn("Failed to load static map image");
                                    // Create a placeholder
                                    const placeholder = document.createElement('div');
                                    placeholder.style.width = '100%';
                                    placeholder.style.height = '100%';
                                    placeholder.style.display = 'flex';
                                    placeholder.style.alignItems = 'center';
                                    placeholder.style.justifyContent = 'center';
                                    placeholder.style.backgroundColor = '#f0f0f0';
                                    placeholder.style.color = '#666';
                                    placeholder.style.fontSize = '12px';
                                    // Use lat/lon from closure
                                    placeholder.innerHTML = `<div style="text-align:center">Map Preview<br/>${lat}, ${lon}</div>`;
                                    
                                    if (img.parentNode) {
                                        img.parentNode.replaceChild(placeholder, img);
                                    }
                                    resolve();
                                };
                            });
                        mapLoadPromises.push(loadPromise);
                        
                        parent.replaceChild(img, iframe);
                    }
                }
            }
        });

        // Wait for all map images to load (with timeout)
        if (mapLoadPromises.length > 0) {
            await Promise.race([
                Promise.all(mapLoadPromises),
                new Promise(resolve => setTimeout(resolve, 5000)) // 5s timeout
            ]);
        }

        // Fix for "unsupported color function oklch/oklab" error in html2canvas
        // Tailwind CSS v4 uses oklch by default, which html2canvas doesn't support yet.
        // We traverse the cloned DOM and convert any oklch/oklab colors to RGB using a canvas context.
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            if (ctx) {
                // Helper to convert color string to hex/rgba using canvas
                const convertColor = (colorStr: string): string | null => {
                    try {
                        ctx.clearRect(0, 0, 1, 1);
                        // Default to black if invalid, so we check if it changes
                        ctx.fillStyle = '#000000'; 
                        ctx.fillRect(0, 0, 1, 1);
                        
                        ctx.fillStyle = colorStr;
                        // If browser doesn't understand colorStr, fillStyle won't change (usually)
                        // But let's just draw
                        ctx.clearRect(0, 0, 1, 1);
                        ctx.fillRect(0, 0, 1, 1);
                        
                        const data = ctx.getImageData(0, 0, 1, 1).data;
                        return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
                    } catch (e) {
                        return null;
                    }
                };

                const elements = [cloned, ...Array.from(cloned.querySelectorAll('*'))] as HTMLElement[];
                
                // Properties that might contain colors
                // We check computed styles
                const colorProps = [
                    'color', 
                    'backgroundColor', 
                    'borderColor', 
                    'borderTopColor', 
                    'borderRightColor', 
                    'borderBottomColor', 
                    'borderLeftColor',
                    'outlineColor',
                    'textDecorationColor',
                    'fill',
                    'stroke'
                ];

                // Complex properties that might contain colors mixed with other things
                const complexProps = ['boxShadow', 'textShadow', 'backgroundImage'];

                elements.forEach(el => {
                    const style = window.getComputedStyle(el);
                    
                    // Handle simple color properties
                    colorProps.forEach(prop => {
                        const val = style.getPropertyValue(prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`));
                        if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('lab(') || val.includes('lch('))) {
                             const converted = convertColor(val);
                             if (converted) {
                                 (el.style as any)[prop] = converted;
                             }
                        }
                    });

                    // Handle complex properties (shadows, gradients)
                    // We use regex to find oklch(...) or okllab(...) patterns
                    complexProps.forEach(prop => {
                        const val = style.getPropertyValue(prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`));
                         if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('lab(') || val.includes('lch('))) {
                             // Replace all occurrences
                             const newVal = val.replace(/(oklch|oklab|lab|lch)\([^)]+\)/g, (match) => {
                                 const converted = convertColor(match);
                                 return converted || match;
                             });
                             if (newVal !== val) {
                                 (el.style as any)[prop] = newVal;
                             }
                         }
                    });
                });
            }
        } catch (e) {
            console.warn("Color conversion failed", e);
        }

        // Get wrappers from the CLONED container
        const wrappers = cloned.querySelectorAll(".layout-card-wrapper");
        
        if (wrappers.length === 0) {
            document.body.removeChild(cloned);
            setIsExporting(false);
            window.dispatchEvent(new CustomEvent("export-end"));
            return;
        }

        // Initialize PDF
        const isF4 = settings.paperSize === "f4";
        // F4: 215 x 330 mm (Landscape) -> 330 x 215
        // A4: 210 x 297 mm (Landscape) -> 297 x 210
        const format = isF4 ? [330, 215] : "a4";
        
        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: format,
            compress: true
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Process each card
        for (let i = 0; i < wrappers.length; i++) {
            const wrapper = wrappers[i] as HTMLElement;
            
            // Set fixed dimensions for capture to match paper aspect ratio/size
            const wMM = isF4 ? 330 : 297;
            const hMM = isF4 ? 215 : 210;
            
            // 1mm = 3.7795px
            // Use 2x scale for better quality
            const pixelWidth = Math.ceil(wMM * 3.7795);
            const pixelHeight = Math.ceil(hMM * 3.7795);
            
            wrapper.style.width = `${pixelWidth}px`;
            wrapper.style.height = `${pixelHeight}px`;
            wrapper.style.margin = "0";
            wrapper.style.padding = "0";
            wrapper.style.boxSizing = "border-box";
            wrapper.style.backgroundColor = "white";
            
            // Ensure internal card fills
            const card = wrapper.querySelector(".layout-card") as HTMLElement;
            if (card) {
                card.style.width = "100%";
                card.style.height = "100%";
                card.style.transform = "none";
                card.style.boxShadow = "none";
                card.style.border = "none";
            }
            
             const cardRoot = wrapper.firstElementChild as HTMLElement;
             if (cardRoot) {
                 cardRoot.style.width = "100%";
                 cardRoot.style.height = "100%";
                 cardRoot.style.boxShadow = "none"; 
                 cardRoot.style.border = "none"; 
             }

            // Force 16:9 aspect ratio and correct cropping (cover) for uploaded images
            // html2canvas often fails with object-fit: cover on img tags, so we use background-image
            const uploadImg = wrapper.querySelector('img[alt="Upload"]') as HTMLImageElement;
            if (uploadImg && uploadImg.parentElement) {
                const imgContainer = uploadImg.parentElement;
                const containerWidth = imgContainer.offsetWidth;
                
                if (containerWidth > 0) {
                    // Force container height to be 16:9
                    const targetHeight = containerWidth * 9 / 16;
                    imgContainer.style.height = `${targetHeight}px`;
                    
                    // Create a div to replace the image
                    const bgDiv = document.createElement('div');
                    bgDiv.style.width = '100%';
                    bgDiv.style.height = '100%';
                    bgDiv.style.backgroundImage = `url("${uploadImg.src}")`;
                    bgDiv.style.backgroundSize = 'cover';
                    bgDiv.style.backgroundPosition = 'center';
                    bgDiv.style.backgroundRepeat = 'no-repeat';
                    
                    // Copy critical styles from the original image
                    // We need to ensure borders and rounded corners are preserved
                    const imgStyle = window.getComputedStyle(uploadImg);
                    bgDiv.style.borderRadius = imgStyle.borderRadius;
                    bgDiv.style.border = imgStyle.border;
                    bgDiv.style.boxShadow = imgStyle.boxShadow;
                    
                    // Replace img with div
                    uploadImg.parentNode?.replaceChild(bgDiv, uploadImg);
                }
            }

            // Render
            const canvas = await html2canvas(wrapper, {
                scale: 2, 
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
                width: pixelWidth,
                height: pixelHeight,
                windowWidth: pixelWidth,
                windowHeight: pixelHeight
            } as any);

            const imgData = canvas.toDataURL("image/jpeg", 0.95);
            
            if (i > 0) pdf.addPage();
            
            pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
        }

        pdf.save(`${tabTitle.replace(/[^a-z0-9\s-_]/gi, "").trim() || "Layout"}.pdf`);
        document.body.removeChild(cloned);

    } catch (error) {
        console.error("PDF Export failed:", error);
        alert("Gagal mengekspor PDF.");
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
        className="flex-1 overflow-y-auto flex flex-col items-center bg-gray-100 h-full relative"
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
            id="export-root"
            style={{
              width: "1123px",
              margin: "0 auto"
            }}
          >
            <div
              id="cards-container"
              className="grid gap-8 mx-auto origin-top transition-transform duration-200"
              style={{ transform: `scale(${zoom / 100})` , width: '279mm'}}
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
