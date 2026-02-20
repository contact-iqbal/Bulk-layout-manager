"use client";

import { useState, useEffect, useRef } from "react";
import { MiniSidebar, MainSidebar } from "@/components/Sidebar";
import UploadPanel from "@/components/UploadPanel";
import SettingsPanel from "@/components/SettingsPanel";
import MapsPanel from "@/components/MapsPanel";
import ObjectsPanel from "@/components/ObjectsPanel";
import StorageModal from "@/components/StorageModal";
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
import Ruler from "@/components/Ruler";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import JSZip from "jszip";
import Swal from "sweetalert2";

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
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [rightPanels, setRightPanels] = useState<("objects" | "maps")[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(false);
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });
  const [originOffset, setOriginOffset] = useState({ x: 0, y: 0 });

  // Settings State
  const [settings, setSettings] = useState<Settings>({
    addr1: "Gedung Graha Pena Suite 1503",
    addr2: "Jl. Ahmad Yani 88 - Surabaya",
    telp: "0811-301-8005",
    email: "marketing@iklann.id",
    paperSize: "a4",
  });
  
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  // Load logo from localStorage
  useEffect(() => {
    const savedLogo = localStorage.getItem(`custom_logo_${tabId}`);
    if (savedLogo) {
      setCustomLogo(savedLogo);
    } else {
      // If no custom logo for this tab, use null (will fallback to default in LayoutCard)
      setCustomLogo(null);
    }
  }, [tabId]);

  const handleLogoUpload = (fileOrString: File | string) => {
    const processLogo = (logoString: string) => {
      // Check if any card has specific logo
      const hasSpecificLogo = cards.some(c => c.customLogo);

      if (hasSpecificLogo) {
        Swal.fire({
          title: 'Konfirmasi Penggantian Logo',
          text: 'Beberapa kartu telah memiliki logo spesifik yang berbeda. Bagaimana Anda ingin menerapkan logo baru ini?',
          icon: 'question',
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonText: 'Ganti Semua (Timpa Spesifik)',
          denyButtonText: 'Hanya Default (Pertahankan Spesifik)',
          cancelButtonText: 'Batal',
          confirmButtonColor: '#f97316', // Orange-500
          denyButtonColor: '#3b82f6', // Blue-500
        }).then((result) => {
          if (result.isConfirmed) {
            // Replace ALL: Update global + Clear specific
            setCustomLogo(logoString);
            try {
              localStorage.setItem(`custom_logo_${tabId}`, logoString);
            } catch (e) { console.error(e); }

            // Clear specific logos on all cards
            const updatedCards = cards.map(c => {
              if (c.customLogo) {
                // Create a new object to avoid mutation
                const newCard = { ...c };
                delete newCard.customLogo;
                return newCard;
              }
              return c;
            });
            setCards(updatedCards);
            
            Swal.fire('Berhasil', 'Logo telah diterapkan ke seluruh kartu.', 'success');
          } else if (result.isDenied) {
            // Replace Default Only: Update global only
            setCustomLogo(logoString);
            try {
              localStorage.setItem(`custom_logo_${tabId}`, logoString);
            } catch (e) { console.error(e); }
            
            Swal.fire('Berhasil', 'Logo default diperbarui. Kartu dengan logo spesifik tidak berubah.', 'success');
          }
        });
      } else {
        // No specific logos, straightforward update
        setCustomLogo(logoString);
        try {
          localStorage.setItem(`custom_logo_${tabId}`, logoString);
        } catch (err) {
          console.error("Failed to save logo to localStorage (likely too big)", err);
          Swal.fire({
            icon: "warning",
            title: "Peringatan Penyimpanan",
            text: "Logo berhasil diubah, namun ukurannya terlalu besar untuk disimpan permanen. Logo akan hilang jika halaman direfresh.",
          });
        }
      }
    };

    if (typeof fileOrString === 'string') {
      processLogo(fileOrString);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        processLogo(result);
      };
      reader.readAsDataURL(fileOrString);
    }
  };

  // Refs for callbacks to avoid dependency cycles
  const onSettingsChangeRef = useRef(onSettingsChange);
  const onHistoryChangeRef = useRef(onHistoryChange);
  const onPageStatusChangeRef = useRef(onPageStatusChange);

  const toggleRightPanel = (panel: "objects" | "maps") => {
    setRightPanels((prev) => {
      if (prev.includes(panel)) {
        return prev.filter((p) => p !== panel);
      }
      if (prev.length >= 2) {
        // Remove the first one (FIFO) to keep max 2
        return [...prev.slice(1), panel];
      }
      return [...prev, panel];
    });
  };

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
            Swal.fire({
              icon: "warning",
              title: "Perhatian",
              text: "Tidak ada halaman yang cocok dengan rentang yang dipilih.",
              confirmButtonColor: "#3b82f6",
            });
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
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal mengekspor PDF.",
          confirmButtonColor: "#dc2626",
        });
    } finally {
        setIsExporting(false);
        window.dispatchEvent(new CustomEvent("export-end"));
    }
  };

  // Image Export Handler
  const handleExportImage = async (format: "png" | "jpg", pageRange?: string) => {
    if (!contentRef.current) return;
    setIsExporting(true);
    
    window.dispatchEvent(new CustomEvent("export-start", { 
      detail: { fileName: `${tabTitle.replace(/[^a-z0-9\s-_]/gi, "").trim() || "Layout"}.${format}` } 
    }));

    try {
        const element = contentRef.current.querySelector("#cards-container") || contentRef.current.querySelector("#export-root");
        if (!element) throw new Error("Container element not found");

        // Clone for manipulation
        const cloned = element.cloneNode(true) as HTMLElement;
        
        // Setup hidden container
        cloned.style.position = 'fixed';
        cloned.style.top = '0';
        cloned.style.left = '0';
        cloned.style.width = '100%'; 
        cloned.style.height = 'auto';
        cloned.style.zIndex = '-9999';
        cloned.style.pointerEvents = 'none'; // prevent interaction
        cloned.id = "export-cloned-root";
        
        // Remove scale/transform on cloned container if any
        cloned.style.transform = 'none';
        
        document.body.appendChild(cloned);

        // 1. Transform inputs and textareas
        const inputs = cloned.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            const el = input as HTMLInputElement | HTMLTextAreaElement;
            const style = window.getComputedStyle(el);
            const replacement = document.createElement('div');
            replacement.textContent = el.value;
            
            replacement.style.fontFamily = style.fontFamily;
            replacement.style.fontSize = style.fontSize;
            replacement.style.fontWeight = style.fontWeight;
            replacement.style.color = style.color;
            replacement.style.textAlign = style.textAlign;
            replacement.style.lineHeight = style.lineHeight;
            replacement.style.textTransform = style.textTransform;
            replacement.style.letterSpacing = style.letterSpacing;
            replacement.style.whiteSpace = 'pre-wrap';
            replacement.style.wordBreak = 'break-word';
            replacement.style.display = 'inline-block';
            replacement.style.width = style.width;
            replacement.style.border = 'none';
            replacement.style.background = 'transparent';
            replacement.style.padding = style.padding;
            replacement.style.margin = style.margin;

             if (el.tagName.toLowerCase() === 'textarea') {
                replacement.style.display = 'block';
                replacement.style.height = 'auto';
                replacement.style.minHeight = style.height;
            }
            el.parentNode?.replaceChild(replacement, el);
        });

        // 2. Fix object-fit: cover for images (html2canvas issue)
        const images = cloned.querySelectorAll('img');
        images.forEach(img => {
            const style = window.getComputedStyle(img);
            if (style.objectFit === 'cover') {
                const div = document.createElement('div');
                div.style.width = style.width || '100%';
                div.style.height = style.height || '100%';
                div.style.backgroundImage = `url("${img.src}")`;
                div.style.backgroundSize = 'cover';
                div.style.backgroundPosition = 'center';
                div.style.borderRadius = style.borderRadius;
                div.style.border = style.border;
                div.style.boxShadow = style.boxShadow;
                div.style.position = style.position;
                div.style.top = style.top;
                div.style.left = style.left;
                div.style.right = style.right;
                div.style.bottom = style.bottom;
                div.style.zIndex = style.zIndex;
                
                img.parentNode?.replaceChild(div, img);
            }
        });

        // 3. Handle Map Iframes
        const mapIframes = cloned.querySelectorAll('iframe');
        const mapLoadPromises: Promise<void>[] = [];
        mapIframes.forEach(iframe => {
            const src = iframe.src;
            const match = src.match(/q=([-\d\.,]+)/);
            if (match && match[1]) {
                const coords = match[1].split(',');
                if (coords.length === 2) {
                    const lat = coords[0].trim();
                    const lon = coords[1].trim();
                    const img = document.createElement('img');
                    img.crossOrigin = "anonymous";
                    img.src = `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&z=16&l=map&lang=en_US&size=600,450&pt=${lon},${lat},pm2rdm`;
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
                                const placeholder = document.createElement('div');
                                Object.assign(placeholder.style, { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', color: '#666', fontSize: '12px' });
                                placeholder.innerHTML = `<div style="text-align:center">Map Preview<br/>${lat}, ${lon}</div>`;
                                if (img.parentNode) img.parentNode.replaceChild(placeholder, img);
                                resolve();
                            };
                        });
                        mapLoadPromises.push(loadPromise);
                        parent.replaceChild(img, iframe);
                    }
                }
            }
        });

        if (mapLoadPromises.length > 0) {
            await Promise.race([
                Promise.all(mapLoadPromises),
                new Promise(resolve => setTimeout(resolve, 5000))
            ]);
        }

        // 4. Color Fix (oklch/oklab)
         try {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            if (ctx) {
                const convertColor = (colorStr: string): string | null => {
                    try {
                        ctx.clearRect(0, 0, 1, 1);
                        ctx.fillStyle = '#000000'; 
                        ctx.fillRect(0, 0, 1, 1);
                        ctx.fillStyle = colorStr;
                        ctx.clearRect(0, 0, 1, 1);
                        ctx.fillRect(0, 0, 1, 1);
                        const data = ctx.getImageData(0, 0, 1, 1).data;
                        return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
                    } catch (e) {
                        return null;
                    }
                };

                const elements = [cloned, ...Array.from(cloned.querySelectorAll('*'))] as HTMLElement[];
                const colorProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'textDecorationColor', 'fill', 'stroke'];
                const complexProps = ['boxShadow', 'textShadow', 'backgroundImage'];

                elements.forEach(el => {
                    const style = window.getComputedStyle(el);
                    colorProps.forEach(prop => {
                        const val = style.getPropertyValue(prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`));
                        if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('lab(') || val.includes('lch('))) {
                             const converted = convertColor(val);
                             if (converted) (el.style as any)[prop] = converted;
                        }
                    });
                    complexProps.forEach(prop => {
                        const val = style.getPropertyValue(prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`));
                         if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('lab(') || val.includes('lch('))) {
                             const newVal = val.replace(/(oklch|oklab|lab|lch)\([^)]+\)/g, (match) => {
                                 const converted = convertColor(match);
                                 return converted || match;
                             });
                             if (newVal !== val) (el.style as any)[prop] = newVal;
                         }
                    });
                });
            }
        } catch (e) {
            console.warn("Color conversion failed", e);
        }

        // Get wrappers
        const wrappers = cloned.querySelectorAll(".layout-card-wrapper");
        
        // Filter based on pageRange
        let targetWrappers: HTMLElement[] = [];
        if (pageRange && pageRange.trim() !== "") {
            const ranges = pageRange.split(',').map(r => r.trim());
            const indices = new Set<number>();
            
            ranges.forEach(range => {
                if (range.includes('-')) {
                    const [start, end] = range.split('-').map(Number);
                    if (!isNaN(start) && !isNaN(end)) {
                        for (let i = start; i <= end; i++) indices.add(i - 1);
                    }
                } else {
                    const page = Number(range);
                    if (!isNaN(page)) indices.add(page - 1);
                }
            });
            
            wrappers.forEach((w, i) => {
                if (indices.has(i)) targetWrappers.push(w as HTMLElement);
            });
        } else {
            targetWrappers = Array.from(wrappers) as HTMLElement[];
        }

        if (targetWrappers.length === 0) {
             // Fallback to all if range is invalid or empty
             targetWrappers = Array.from(wrappers) as HTMLElement[];
        }

        const blobs: { blob: Blob, name: string }[] = [];

        for (let i = 0; i < targetWrappers.length; i++) {
            const wrapper = targetWrappers[i];
            
            // Dimensions
             const isF4 = settings.paperSize === "f4";
             const wMM = isF4 ? 330 : 297;
             const hMM = isF4 ? 215 : 210;
             const pixelWidth = Math.ceil(wMM * 3.7795);
             const pixelHeight = Math.ceil(hMM * 3.7795);
            
             wrapper.style.width = `${pixelWidth}px`;
             wrapper.style.height = `${pixelHeight}px`;
             wrapper.style.margin = "0";
             wrapper.style.padding = "0";
             wrapper.style.boxSizing = "border-box";
             wrapper.style.backgroundColor = "white"; 
             
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

            const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, 0.95));
            
            if (blob) {
                blobs.push({
                    blob,
                    name: `Page_${i + 1}.${format}`
                });
            }
        }
        
        document.body.removeChild(cloned);

        if (blobs.length === 1) {
            const url = URL.createObjectURL(blobs[0].blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tabTitle.replace(/[^a-z0-9\s-_]/gi, "").trim() || "Layout"}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else if (blobs.length > 1) {
            const zip = new JSZip();
            blobs.forEach((item) => {
                zip.file(item.name, item.blob);
            });
            
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tabTitle.replace(/[^a-z0-9\s-_]/gi, "").trim() || "Layout"}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

    } catch (error) {
        console.error("Image Export failed:", error);
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: `Gagal mengekspor ${format.toUpperCase()}.`,
          confirmButtonColor: "#dc2626",
        });
    } finally {
        setIsExporting(false);
        window.dispatchEvent(new CustomEvent("export-end"));
    }
  };


  // Upload Handler
  const handleUpload = async (files: FileList) => {
    setIsUploading(true);
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
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDropChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = e.target.files;
      
      // Check for JSON backup
      if (files.length === 1 && files[0].type === "application/json") {
         const file = files[0];
         try {
           const text = await file.text();
           const json = JSON.parse(text);
           if (json.cards || json.history) {
              window.dispatchEvent(new CustomEvent("import-backup", { detail: json }));
           }
         } catch (error) {
            console.error("Import error:", error);
         }
      } else {
        // Normal image upload
        handleUpload(files);
      }
      e.target.value = ""; // Reset
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

  const updateCardField = (id: string, key: keyof CardData, value: string) => {
    const updatedCards = cards.map((c) => {
      if (c.id === id) {
        return { ...c, [key]: value };
      }
      return c;
    });
    setCards(updatedCards, `Update ${key}`);
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
            reset(
              initialData.history.past || [],
              newCards,
              initialData.history.future || []
            );
            await saveHistoryToDB(
              tabId,
              initialData.history.past || [],
              initialData.history.future || []
            );
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

    const handleExportImageEvent = (e: CustomEvent) => {
      // Only process if tabId matches
      if (e.detail && e.detail.tabId !== tabId) return;
      
      if (e.detail && e.detail.format) {
        handleExportImage(e.detail.format, e.detail.pageRange);
      }
    };

    const handleExportJSON = async (e: CustomEvent) => {
      // Only process if tabId matches
      if (e.detail && e.detail.tabId !== tabId) return;

      // Fetch ALL cards and ALL history from DB
      const dbCards = await getAllCards(); // No tabId passed = get all
      const dbHistory = await getHistoryFromDB(); // No tabId passed = get all

      const exportData = {
        version: "1.0",
        tabTitle,
        settings,
        cards: dbCards,
        history: dbHistory,
        timestamp: Date.now()
      };

      // Format date for filename: dlayout_backup_(YYYY-MM-DD)
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const filename = `dlayout_backup_(${dateStr}).json`;

      // Dispatch start event
      window.dispatchEvent(new CustomEvent("export-start", {
        detail: { fileName: filename }
      }));
      setIsExporting(true);

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", filename);
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();

      // Dispatch end event
      setIsExporting(false);
      window.dispatchEvent(new CustomEvent("export-end"));
    };

    const handleToggleGrid = (e: Event) => {
      const customEvent = e as CustomEvent;
      setShowGrid(customEvent.detail?.show);
    };

    window.addEventListener("undo-action", handleUndo);
    window.addEventListener("redo-action", handleRedo);
    window.addEventListener("print-action", handlePrint);
    window.addEventListener("export-image-action", handleExportImageEvent as EventListener);
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
      window.removeEventListener("export-image-action", handleExportImageEvent as EventListener);
      window.removeEventListener("upload-files", handleUploadEvent as EventListener);
      window.removeEventListener("export-json-action", handleExportJSON as unknown as EventListener);
      window.removeEventListener("toggle-grid", handleToggleGrid as EventListener);
      if (container) {
        container.removeEventListener("wheel", handleWheel as EventListener);
      }
    };
  }, [undo, redo, tabId, handleDownloadPDF, zoom]);

  useEffect(() => {
    const handleOpenStorageModal = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.tabId === tabId) {
        setIsStorageModalOpen(true);
      }
    };
    window.addEventListener("open-storage-modal", handleOpenStorageModal);
    return () => window.removeEventListener("open-storage-modal", handleOpenStorageModal);
  }, [tabId]);

  useEffect(() => {
    const handleToggleRulers = (e: Event) => {
      const customEvent = e as CustomEvent;
      setShowRulers(customEvent.detail?.show);
    };
    window.addEventListener("toggle-rulers", handleToggleRulers as EventListener);
    return () => window.removeEventListener("toggle-rulers", handleToggleRulers as EventListener);
  }, []);

  useEffect(() => {
    if (!showRulers) return;
    
    const updateOrigin = () => {
      const mainContent = contentRef.current;
      const cardsContainer = document.getElementById("cards-container");
      
      if (mainContent && cardsContainer) {
        const mainRect = mainContent.getBoundingClientRect();
        const cardsRect = cardsContainer.getBoundingClientRect();
        
        const x = (cardsRect.left - mainRect.left) + mainContent.scrollLeft;
        const y = (cardsRect.top - mainRect.top) + mainContent.scrollTop;
        
        setOriginOffset({ x, y });
      }
    };

    updateOrigin();
    window.addEventListener("resize", updateOrigin);
    return () => window.removeEventListener("resize", updateOrigin);
  }, [showRulers, zoom, activeLeftPanel, cards.length]);

  useEffect(() => {
    const handleUpdateCardImage = (e: CustomEvent) => {
      if (e.detail && e.detail.tabId === tabId) {
        updateCard(e.detail.cardId, "imgSrc", e.detail.newImageSrc);
      }
    };
    window.addEventListener("update-card-image", handleUpdateCardImage as EventListener);
    return () => window.removeEventListener("update-card-image", handleUpdateCardImage as EventListener);
  }, [tabId, updateCard]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPos({
      x: e.currentTarget.scrollLeft,
      y: e.currentTarget.scrollTop,
    });
  };

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
        rightPanels={rightPanels}
        toggleRightPanel={toggleRightPanel}
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
                past: historyData.past.map((h) => ({ action: h.action })),
                future: historyData.future.map((h) => ({ action: h.action })),
                onUndo: undo,
                onRedo: redo,
              }}
              onLogoUpload={handleLogoUpload}
            />
          )}
          {activeLeftPanel === "settings" && (
            <SettingsPanel settings={settings} setSettings={updateSetting} />
          )}
        </MainSidebar>
      )}

      <div className="flex-1 flex flex-col relative overflow-hidden h-full">
        {showRulers && (
          <div className="flex flex-row h-[20px] shrink-0 z-20 bg-gray-100 border-b border-gray-300">
            <div className="w-[20px] shrink-0 bg-gray-200 border-r border-gray-300" />
            <div className="flex-1 relative overflow-hidden">
              <Ruler
                orientation="horizontal"
                scale={zoom / 100}
                scrollPos={scrollPos.x}
                originOffset={originOffset.x}
              />
            </div>
          </div>
        )}

        <div id="workspace-container" className="flex-1 flex flex-row overflow-hidden relative h-full">
          {showRulers && (
            <div className="w-[20px] shrink-0 h-full z-20 bg-gray-100 border-r border-gray-300 relative overflow-hidden">
              <Ruler
                orientation="vertical"
                scale={zoom / 100}
                scrollPos={scrollPos.y}
                originOffset={originOffset.y}
              />
            </div>
          )}
          <div
            id="main-content"
            ref={contentRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto flex flex-col items-center bg-gray-100 h-full relative"
            style={
              showGrid
                ? {
                    backgroundImage: `linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)`,
                    backgroundSize: `${40 * (zoom / 100)}px ${40 * (zoom / 100)}px`,
                    backgroundPosition: "center top",
                    backgroundAttachment: "fixed",
                  }
                : undefined
            }
          >
            {(!hasLoaded || isUploading) && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-500 mb-4"></div>
            <p className="text-gray-600 font-medium">
              {isUploading ? "Memproses gambar..." : "Memuat layout..."}
            </p>
          </div>
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
                    customLogo={customLogo}
                  />
                </div>
              ))}

              {/* Add New Card Dropzone */}
              <div 
                className="w-full mt-4 mb-20 flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-orange-50 hover:border-orange-500 transition-colors cursor-pointer group relative no-print"
                data-html2canvas-ignore="true"
              >
                <input
                  type="file"
                  multiple
                  accept="image/*, application/json"
                  onChange={handleFileDropChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="flex flex-col items-center space-y-3 pointer-events-none">
                   <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 group-hover:border-orange-200 group-hover:shadow-md transition-all">
                      <i className="fa-solid fa-cloud-arrow-up text-2xl text-gray-400 group-hover:text-orange-500 transition-colors"></i>
                   </div>
                   <div className="text-center">
                     <p className="text-sm font-semibold text-gray-600 group-hover:text-orange-600 transition-colors">
                       Klik atau Drag & Drop file di sini
                     </p>
                     <p className="text-xs text-gray-400 mt-1">
                       Upload gambar baru
                     </p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
        </div>
      </div>

      {rightPanels.length > 0 && (
        <div className="no-print w-[350px] bg-white border-l border-gray-200 z-50 shrink-0 h-full flex flex-col">
          {rightPanels.map((panel, index) => (
            <div
              key={panel}
              className={`flex-1 overflow-y-auto ${
                index < rightPanels.length - 1 ? "border-b border-gray-200" : ""
              }`}
            >
              {panel === "maps" && (
                <div className="p-6 h-full">
                  <MapsPanel tabId={tabId} />
                </div>
              )}
              {panel === "objects" && (
                <div className="p-4 h-full">
                  <ObjectsPanel 
                    cards={cards} 
                    onUpdateCard={updateCardField}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <StorageModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        cards={cards}
        onExportJSON={() =>
          window.dispatchEvent(
            new CustomEvent("export-json-action", { detail: { tabId } })
          )
        }
      />
    </div>
  );
}
