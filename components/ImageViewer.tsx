"use client";

import React, { useState, useEffect, useRef } from "react";
// import Image from "next/image"; // Disabled next/image to avoid constructor conflict

import Swal from "sweetalert2";

interface ImageViewerProps {
  src: string;
  name?: string;
  tabId?: string;
  initialData?: any;
  onClose?: () => void;
}

export default function ImageViewer({
  src,
  name = "Image",
  tabId,
  initialData,
  onClose,
}: ImageViewerProps) {
  // Viewport State
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingView, setIsDraggingView] = useState(false);
  const [dragViewStart, setDragViewStart] = useState({ x: 0, y: 0 });

  // Image/Canvas State
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Transform State
  const [isTransformMode, setIsTransformMode] = useState(false);
  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    scaleW: 1,
    scaleH: 1,
    rotate: 0,
  });

  // Tools State
  const [activeTool, setActiveTool] = useState<"move" | "rectangle" | "text">("move");
  const [rectangles, setRectangles] = useState<
    Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      text?: string;
      textColor?: string;
    }>
  >([]);
  const [texts, setTexts] = useState<
    Array<{
      id: string;
      x: number;
      y: number;
      content: string;
      fontSize: number;
      color: string;
    }>
  >([]);
  const [drawingRect, setDrawingRect] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [selectedRectId, setSelectedRectId] = useState<string | null>(null);
  const [isRectTransformMode, setIsRectTransformMode] = useState(false);
  const [rectColor, setRectColor] = useState("#ff0000"); // Background / Fill
  const [rectTextColor, setRectTextColor] = useState("#ffffff"); // Foreground / Text
  const [editingRectTextId, setEditingRectTextId] = useState<string | null>(
    null,
  );
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<
    Array<{
      rects: typeof rectangles;
      texts: typeof texts;
    }>
  >([{ rects: [], texts: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const addToHistory = (
    newRects: typeof rectangles,
    newTexts?: typeof texts,
  ) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      rects: newRects,
      texts: newTexts || texts,
    });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setRectangles(history[newIndex].rects);
      setTexts(history[newIndex].texts);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setRectangles(history[newIndex].rects);
      setTexts(history[newIndex].texts);
    }
  };

  // Dragging/Resizing State
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = useState({
    x: 0,
    y: 0,
    rotate: 0,
    scaleW: 1,
    scaleH: 1,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  // Coordinate Mapping Utilities
  const getLogicalCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = zoom / 100;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  };

  const getScreenCoords = (logicalX: number, logicalY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = zoom / 100;
    return {
      x: logicalX * scale + rect.left,
      y: logicalY * scale + rect.top,
    };
  };

  // Main Canvas Rendering Loop
  const renderMainCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !isLoaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = imageDimensions.width;
    const height = imageDimensions.height;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Background/Image
    const img = new Image();
    img.src = src;
    if (img.complete) {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.translate(Math.round(transform.x), Math.round(transform.y));
      ctx.scale(transform.scaleW, transform.scaleH);
      ctx.rotate((transform.rotate * Math.PI) / 180);
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
      ctx.restore();
    }

    // 2. Draw Rectangles
    rectangles.forEach((rect) => {
      const isSelected = selectedRectId === rect.id;
      ctx.fillStyle = rect.color;
      const rx = Math.round(rect.x);
      const ry = Math.round(rect.y);
      const rw = Math.round(rect.width);
      const rh = Math.round(rect.height);
      ctx.fillRect(rx, ry, rw, rh);

      if (isSelected && isRectTransformMode) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, ry, rw, rh);
      }

      if (rect.text) {
        ctx.fillStyle = rect.textColor || rectTextColor;
        const fontSize = Math.round(Math.min(rw, rh) * 0.2);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(rect.text, rx + rw / 2, ry + rh / 2);
      }
    });
  };

  useEffect(() => {
    const animate = () => {
      renderMainCanvas();
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [
    isLoaded,
    imageDimensions,
    transform,
    rectangles,
    selectedRectId,
    isRectTransformMode,
  ]);

  // Handle zoom with wheel
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -10 : 10;
        setZoom((prev) => Math.max(10, Math.min(500, prev + delta)));
      }
    };

    const container = document.getElementById(`image-viewer-canvas-${tabId}`);
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, [tabId, zoom, position]); // Added stable dependencies

  // Listener for rect tool color from Navbar
  useEffect(() => {
    const handleSetColors = (e: CustomEvent) => {
      if (e.detail?.bgColor) {
        setRectColor(e.detail.bgColor);
        if (selectedRectId) {
          setRectangles((prev) => {
            const next = prev.map((r) =>
              r.id === selectedRectId ? { ...r, color: e.detail.bgColor } : r,
            );
            addToHistory(next, texts);
            return next;
          });
        }
      }
      if (e.detail?.fgColor) {
        setRectTextColor(e.detail.fgColor);
        if (selectedRectId) {
          setRectangles((prev) => {
            const next = prev.map((r) =>
              r.id === selectedRectId
                ? { ...r, textColor: e.detail.fgColor }
                : r,
            );
            addToHistory(next, texts);
            return next;
          });
        } else if (selectedTextId) {
          setTexts((prev) => {
            const next = prev.map((t) =>
              t.id === selectedTextId ? { ...t, color: e.detail.fgColor } : t,
            );
            addToHistory(rectangles, next);
            return next;
          });
        }
      }
    };
    window.addEventListener(
      "set-rect-colors",
      handleSetColors as EventListener,
    );
    return () =>
      window.removeEventListener(
        "set-rect-colors",
        handleSetColors as EventListener,
      );
  }, [selectedRectId, selectedTextId, rectangles, texts]);

  // Notify Navbar of tool status
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("rect-tool-status", {
        detail: {
          active: activeTool === "rectangle" || !!selectedRectId || activeTool === "text" || !!selectedTextId,
          color: rectColor,
          textColor: rectTextColor,
        },
      }),
    );
  }, [activeTool, selectedRectId, selectedTextId, rectColor, rectTextColor]);

  // Helper to add a default rectangle (centered)
  const addDefaultRectangle = () => {
    const mediumSize =
      Math.min(imageDimensions.width, imageDimensions.height) * 0.2 || 100;
    const newRect = {
      id: `rect-${Date.now()}`,
      x: imageDimensions.width / 2 - mediumSize / 2,
      y: imageDimensions.height / 2 - mediumSize / 2,
      width: mediumSize,
      height: mediumSize,
      color: rectColor,
    };
    const newRectangles = [...rectangles, newRect];
    setRectangles(newRectangles);
    addToHistory(newRectangles);
    setSelectedRectId(newRect.id);
    setIsRectTransformMode(true);
    setActiveTool("move");
  };

  // Handle Save
  const handleSave = async () => {
    if (!initialData?.sourceTabId || !initialData?.cardId) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Tidak dapat menyimpan: Informasi kartu sumber hilang.",
      });
      return;
    }

    // Use stored dimensions for canvas to ensure WYSIWYG
    // Ensure we use integer dimensions for the canvas grid
    const width = Math.round(imageDimensions.width || 800);
    const height = Math.round(imageDimensions.height || 600);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    try {
      await new Promise((resolve, reject) => {
        if (img.complete) {
          resolve(true);
        } else {
          img.onload = () => resolve(true);
          img.onerror = () => reject(new Error("Failed to load image"));
        }
      });

      ctx.clearRect(0, 0, width, height);

      // Draw white background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      // Move origin to center of the logical frame
      ctx.translate(width / 2, height / 2);

      // Apply transformations exactly matching CSS "translate -> scale -> rotate"
      // Note: We round transform.x/y to match the browser's potential snapping
      ctx.translate(Math.round(transform.x), Math.round(transform.y));
      ctx.scale(transform.scaleW, transform.scaleH);
      ctx.rotate((transform.rotate * Math.PI) / 180);

      // Smooth rendering for transformed images
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw image centered at the current transformed origin
      ctx.drawImage(img, -width / 2, -height / 2, width, height);

      ctx.restore();

      // Draw Rectangles (Relative to the canvas frame)
      rectangles.forEach((rect) => {
        ctx.fillStyle = rect.color;
        // Rounding is critical here to match the DOM rendering snapping
        const rx = Math.round(rect.x);
        const ry = Math.round(rect.y);
        const rw = Math.round(rect.width);
        const rh = Math.round(rect.height);

        ctx.fillRect(rx, ry, rw, rh);

        // Draw text inside rectangle if it exists
        if (rect.text) {
          ctx.fillStyle = rect.textColor || "#ffffff";
          const fontSize = Math.round(Math.min(rw, rh) * 0.2);
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(rect.text, rx + rw / 2, ry + rh / 2);
        }
      });

      const newSrc = canvas.toDataURL("image/png");

      window.dispatchEvent(
        new CustomEvent("update-card-image", {
          detail: {
            tabId: initialData.sourceTabId,
            cardId: initialData.cardId,
            newImageSrc: newSrc,
          },
        }),
      );

      Swal.fire({
        icon: "success",
        title: "Tersimpan!",
        text: "Gambar berhasil diperbarui di layout.",
        timer: 1500,
        showConfirmButton: false,
      }).then(() => {
        onClose?.();
      });
    } catch (error) {
      console.error("Save error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Gagal menyimpan gambar.",
      });
    }
  };

  // Listen to Navbar events
  useEffect(() => {
    const handleSaveEvent = (e: CustomEvent) => {
      if (e.detail?.tabId === tabId) {
        handleSave();
      }
    };

    const handleCloseEvent = (e: CustomEvent) => {
      if (e.detail?.tabId === tabId) {
        onClose?.();
      }
    };

    window.addEventListener(
      "save-image-edit",
      handleSaveEvent as EventListener,
    );
    window.addEventListener(
      "close-image-tab",
      handleCloseEvent as EventListener,
    );

    return () => {
      window.removeEventListener(
        "save-image-edit",
        handleSaveEvent as EventListener,
      );
      window.removeEventListener(
        "close-image-tab",
        handleCloseEvent as EventListener,
      );
    };
  }, [tabId, handleSave, onClose]);

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S to Save
      if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSave();
      }

      // Esc to Close
      if (e.key === "Escape" && !isTransformMode) {
        e.preventDefault();
        onClose?.();
      }

      // Undo/Redo
      if (e.ctrlKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
      }

      // Tool switching
      if (!isTransformMode && !activeHandle) {
        if (e.key.toLowerCase() === "r") {
          setActiveTool("rectangle");
        }
        if (e.key.toLowerCase() === "v") {
          setActiveTool("move");
        }
      }

      if (e.ctrlKey && e.altKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        e.stopPropagation();
        setIsTransformMode((prev) => !prev);
      }

      if (isTransformMode && e.key === "Enter") {
        setIsTransformMode(false);
      }

      if (isTransformMode && e.key === "Escape") {
        setIsTransformMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isTransformMode,
    activeHandle,
    historyIndex,
    history,
    handleSave,
    onClose,
    undo,
    redo,
  ]); // Added history dependencies

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImageDimensions({ width: naturalWidth, height: naturalHeight });
    setIsLoaded(true);
  };

  // Mouse Handlers for Viewport Panning & Drawing
  const handleViewMouseDown = (e: React.MouseEvent) => {
    // If clicking a handle, ignore
    if (activeHandle) return;

    // Get logical coordinates
    const logical = getLogicalCoords(e.clientX, e.clientY);

    // If currently editing text, clicking outside should just finish editing (let blur handle it)
    if (editingRectTextId) {
      return;
    }

    // 1. Check for hits on existing shapes (Hit-Testing) - prioritize top-most
    if (activeTool === "move") {
      // Check Rectangles
      for (let i = rectangles.length - 1; i >= 0; i--) {
        const rect = rectangles[i];
        if (
          logical.x >= rect.x &&
          logical.x <= rect.x + rect.width &&
          logical.y >= rect.y &&
          logical.y <= rect.y + rect.height
        ) {
          e.stopPropagation();
          setSelectedRectId(rect.id);
          setIsRectTransformMode(true);
          handleTransformMouseDown(e, "move");
          return;
        }
      }

      // If clicked nothing, deselect
      setSelectedRectId(null);
      setIsRectTransformMode(false);
    }

    // Handle Rectangle Drawing
    if (activeTool === "rectangle" && !isTransformMode) {
      setDrawingRect({
        startX: logical.x,
        startY: logical.y,
        currentX: logical.x,
        currentY: logical.y,
      });
      return;
    }

    // Handle Text Creation
    if (activeTool === "text" && !isTransformMode) {
      const newTextId = `text-${Date.now()}`;
      const newText = {
        id: newTextId,
        x: logical.x,
        y: logical.y,
        content: "Double click to edit",
        fontSize: 24, // Default font size
        color: rectTextColor || "#000000",
      };
      const newTexts = [...texts, newText];
      setTexts(newTexts);
      addToHistory(rectangles, newTexts);

      // Auto-select
      setSelectedTextId(newTextId);
      setIsRectTransformMode(true);
      setActiveTool("move");
      return;
    }

    // Default: Pan View
    setIsDraggingView(true);
    setDragViewStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleViewMouseMove = (e: React.MouseEvent) => {
    const logical = getLogicalCoords(e.clientX, e.clientY);

    if (drawingRect) {
      setDrawingRect((prev) =>
        prev ? { ...prev, currentX: logical.x, currentY: logical.y } : null,
      );
      return;
    }

    if (isDraggingView) {
      setPosition({
        x: e.clientX - dragViewStart.x,
        y: e.clientY - dragViewStart.y,
      });
    }
  };

  const handleViewMouseUp = (e: React.MouseEvent) => {
    if (drawingRect) {
      // Finalize rectangle
      const width = Math.abs(drawingRect.currentX - drawingRect.startX);
      const height = Math.abs(drawingRect.currentY - drawingRect.startY);

      let finalRect;

      if (width < 5 && height < 5) {
        // Just a click -> Create medium rectangle centered at click
        const mediumSize =
          Math.min(imageDimensions.width, imageDimensions.height) * 0.2 || 100;
        finalRect = {
          id: `rect-${Date.now()}`,
          x: drawingRect.startX - mediumSize / 2,
          y: drawingRect.startY - mediumSize / 2,
          width: mediumSize,
          height: mediumSize,
          color: rectColor,
        };
      } else {
        // Dragged rectangle
        finalRect = {
          id: `rect-${Date.now()}`,
          x: Math.min(drawingRect.startX, drawingRect.currentX),
          y: Math.min(drawingRect.startY, drawingRect.currentY),
          width: width,
          height: height,
          color: rectColor,
        };
      }

      const newRectangles = [...rectangles, finalRect];
      setRectangles(newRectangles);
      addToHistory(newRectangles);

      setDrawingRect(null);

      // Auto-enter transform mode for the new rectangle
      setSelectedRectId(finalRect.id);
      setIsRectTransformMode(true);
      setActiveTool("move");
      return;
    }

    setIsDraggingView(false);
  };

  // Mouse Handlers for Transform
  const handleTransformMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation(); // Prevent view panning
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });

    if (isRectTransformMode) {
      if (selectedRectId) {
        const rect = rectangles.find((r) => r.id === selectedRectId);
        if (rect) {
          setInitialTransform({
            x: rect.x,
            y: rect.y,
            scaleW: rect.width,
            scaleH: rect.height,
            rotate: 0,
          });
        }
      } else if (selectedTextId) {
        const text = texts.find((t) => t.id === selectedTextId);
        if (text) {
          setInitialTransform({
            x: text.x,
            y: text.y,
            scaleW: 0,
            scaleH: 0,
            rotate: 0,
          });
        }
      }
    } else {
      setInitialTransform({ ...transform });
    }
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!activeHandle) return;

      const zoomFactor = zoom / 100;
      // Calculate delta in screen pixels (adjusted for zoom)
      const dx = (e.clientX - dragStart.x) / zoomFactor;
      const dy = (e.clientY - dragStart.y) / zoomFactor;

      if (activeHandle === "move") {
        if (isRectTransformMode) {
          if (selectedRectId) {
            setRectangles((prev) =>
              prev.map((r) =>
                r.id === selectedRectId
                  ? {
                      ...r,
                      x: initialTransform.x + dx,
                      y: initialTransform.y + dy,
                    }
                  : r,
              ),
            );
          } else if (selectedTextId) {
            setTexts((prev) =>
              prev.map((t) =>
                t.id === selectedTextId
                  ? {
                      ...t,
                      x: initialTransform.x + dx,
                      y: initialTransform.y + dy,
                    }
                  : t,
              ),
            );
          }
        } else {
          setTransform((prev) => ({
            ...prev,
            x: initialTransform.x + dx,
            y: initialTransform.y + dy,
          }));
        }
        return;
      }

      if (isRectTransformMode) {
        if (selectedRectId) {
          // Simple resizing logic for rectangles (non-rotated)
          let newX = initialTransform.x;
          let newY = initialTransform.y;
          let newW = initialTransform.scaleW;
          let newH = initialTransform.scaleH;

          switch (activeHandle) {
            case "se":
              newW = Math.max(5, initialTransform.scaleW + dx);
              newH = Math.max(5, initialTransform.scaleH + dy);
              break;
            case "sw":
              newX = Math.min(
                initialTransform.x + initialTransform.scaleW - 5,
                initialTransform.x + dx,
              );
              newW = Math.max(5, initialTransform.scaleW - dx);
              newH = Math.max(5, initialTransform.scaleH + dy);
              break;
            case "ne":
              newY = Math.min(
                initialTransform.y + initialTransform.scaleH - 5,
                initialTransform.y + dy,
              );
              newW = Math.max(5, initialTransform.scaleW + dx);
              newH = Math.max(5, initialTransform.scaleH - dy);
              break;
            case "nw":
              newX = Math.min(
                initialTransform.x + initialTransform.scaleW - 5,
                initialTransform.x + dx,
              );
              newY = Math.min(
                initialTransform.y + initialTransform.scaleH - 5,
                initialTransform.y + dy,
              );
              newW = Math.max(5, initialTransform.scaleW - dx);
              newH = Math.max(5, initialTransform.scaleH - dy);
              break;
          }

          setRectangles((prev) =>
            prev.map((r) =>
              r.id === selectedRectId
                ? {
                    ...r,
                    x: newX,
                    y: newY,
                    width: newW,
                    height: newH,
                  }
                : r,
            ),
          );
        }
        return;
      }

      // Rotate delta to align with local axes
      // We need to rotate the delta vector by -rotation to apply it to width/height
      const rad = (-initialTransform.rotate * Math.PI) / 180;
      const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);

      let deltaW = 0;
      let deltaH = 0;

      // Determine size change based on handle
      switch (activeHandle) {
        case "se": // Bottom Right
          deltaW = localDx;
          deltaH = localDy;
          break;
        case "sw": // Bottom Left
          deltaW = -localDx;
          deltaH = localDy;
          break;
        case "ne": // Top Right
          deltaW = localDx;
          deltaH = -localDy;
          break;
        case "nw": // Top Left
          deltaW = -localDx;
          deltaH = -localDy;
          break;
      }

      // Calculate new scales
      const newScaleW = Math.max(
        0.1,
        initialTransform.scaleW + deltaW / imageDimensions.width,
      );
      const newScaleH = Math.max(
        0.1,
        initialTransform.scaleH + deltaH / imageDimensions.height,
      );

      // Calculate Center Shift (in local space)
      const localShiftX = localDx / 2;
      const localShiftY = localDy / 2;

      // Rotate shift back to global space
      const shiftRad = (initialTransform.rotate * Math.PI) / 180;
      const globalShiftX =
        localShiftX * Math.cos(shiftRad) - localShiftY * Math.sin(shiftRad);
      const globalShiftY =
        localShiftX * Math.sin(shiftRad) + localShiftY * Math.cos(shiftRad);

      setTransform((prev) => ({
        ...prev,
        scaleW: newScaleW,
        scaleH: newScaleH,
        x: initialTransform.x + globalShiftX,
        y: initialTransform.y + globalShiftY,
      }));
    };

    const handleWindowMouseUp = () => {
      setActiveHandle(null);
      if (selectedRectId || selectedTextId) {
        addToHistory(rectangles, texts);
      } else if (isTransformMode) {
        // If image transform, add to history
        // (Currently, image transform is not part of history, but this is where it would go)
      }
    };

    if (activeHandle) {
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [
    activeHandle,
    dragStart,
    initialTransform,
    zoom,
    imageDimensions,
    isRectTransformMode,
    selectedRectId,
    selectedTextId,
    rectangles,
    texts,
    isTransformMode,
  ]);

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden text-gray-800">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar: Tool Selection & Colors */}
        <div className="w-16 bg-white border-r border-gray-300 flex flex-col items-center py-4 gap-4 z-10 select-none">
          {/* Main selection tools */}
          <div className="flex flex-col gap-2">
            <div
              className={`w-10 h-10 flex items-center justify-center rounded cursor-pointer transition-all ${activeTool === "move" ? "bg-blue-100 text-blue-600 shadow-inner" : "text-gray-500 hover:bg-gray-100"}`}
              title="Move Tool (V)"
              onClick={() => setActiveTool("move")}
            >
              <i className="fa-solid fa-arrow-pointer"></i>
            </div>
            <div
              className={`w-10 h-10 flex items-center justify-center rounded cursor-pointer transition-all ${activeTool === "rectangle" ? "bg-blue-100 text-blue-600 shadow-inner" : "text-gray-500 hover:bg-gray-100"}`}
              title="Rectangle Tool (R)"
              onClick={() => setActiveTool("rectangle")}
            >
              <i className="fa-solid fa-vector-square"></i>
            </div>
            <div
              className={`w-10 h-10 flex items-center justify-center rounded cursor-pointer transition-all ${activeTool === "text" ? "bg-blue-100 text-blue-600 shadow-inner" : "text-gray-500 hover:bg-gray-100"}`}
              title="Text Tool (T)"
              onClick={() => setActiveTool("text")}
            >
              <i className="fa-solid fa-font"></i>
            </div>
          </div>

          <div className="w-8 h-px bg-gray-200"></div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2">
            <div
              className="w-10 h-10 flex items-center justify-center rounded cursor-pointer hover:bg-gray-100 text-gray-500 transition-all"
              title="Add Rectangle"
              onClick={addDefaultRectangle}
            >
              <i className="fa-solid fa-square-plus"></i>
            </div>
            <div
              className="w-10 h-10 flex items-center justify-center rounded cursor-pointer hover:bg-gray-100 text-gray-500 transition-all"
              title="Undo (Ctrl+Z)"
              onClick={undo}
            >
              <i className="fa-solid fa-rotate-left"></i>
            </div>
            <div
              className="w-10 h-10 flex items-center justify-center rounded cursor-pointer hover:bg-gray-100 text-gray-500 transition-all"
              title="Redo (Ctrl+Y)"
              onClick={redo}
            >
              <i className="fa-solid fa-rotate-right"></i>
            </div>
          </div>

          <div className="flex-1"></div>

          {/* Sidebar Color Palette (Photoshop Style) */}
          <div className="relative w-10 h-10 mb-4 select-none mr-1">
            {/* Background Color Swatch (Back) - Rectangle Fill */}
            <div
              className="absolute bottom-0 right-0 w-7 h-7 rounded border-2 border-white shadow-md z-0 overflow-hidden cursor-pointer active:scale-95 transition-transform"
              style={{ backgroundColor: rectColor }}
              title="Rectangle Fill Color"
            >
              <input
                type="color"
                value={rectColor}
                onChange={(e) => {
                  const newColor = e.target.value;
                  setRectColor(newColor);
                  if (selectedRectId) {
                    setRectangles((prev) =>
                      prev.map((r) =>
                        r.id === selectedRectId ? { ...r, color: newColor } : r,
                      ),
                    );
                  }
                  if (selectedTextId) {
                    setTexts((prev) =>
                      prev.map((t) =>
                        t.id === selectedTextId ? { ...t, color: newColor } : t,
                      ),
                    );
                  }
                }}
                className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer opacity-0"
              />
            </div>

            {/* Foreground Color Swatch (Front) - Text Color */}
            <div
              className="absolute top-0 left-0 w-7 h-7 rounded border-2 border-white shadow-md z-10 overflow-hidden cursor-pointer active:scale-95 transition-transform"
              style={{ backgroundColor: rectTextColor }}
              title="Text Color"
            >
              <input
                type="color"
                value={rectTextColor}
                onChange={(e) => {
                  const newColor = e.target.value;
                  setRectTextColor(newColor);
                  if (selectedRectId) {
                    setRectangles((prev) =>
                      prev.map((r) =>
                        r.id === selectedRectId
                          ? { ...r, textColor: newColor }
                          : r,
                      ),
                    );
                  }
                }}
                className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer opacity-0"
              />
            </div>

            {/* Swap Button */}
            <button
              className="absolute -top-1 -right-1 w-4 h-4 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[8px] text-gray-500 hover:text-blue-600 hover:border-blue-300 shadow-sm z-20 transition-colors"
              title="Swap Colors (X)"
              onClick={() => {
                const bg = rectColor;
                const fg = rectTextColor;
                setRectColor(fg);
                setRectTextColor(bg);
                if (selectedRectId) {
                  setRectangles((prev) =>
                    prev.map((r) =>
                      r.id === selectedRectId
                        ? { ...r, color: fg, textColor: bg }
                        : r,
                    ),
                  );
                }
                if (selectedTextId) {
                  setTexts((prev) =>
                    prev.map((t) =>
                      t.id === selectedTextId ? { ...t, color: fg } : t,
                    ),
                  );
                }
              }}
            >
              <i className="fa-solid fa-repeat"></i>
            </button>
          </div>
        </div>
        {/* Center: Viewport Area */}
        <div
          id={`image-viewer-canvas-${tabId}`}
          className="flex-1 bg-gray-200 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
          onMouseMove={handleViewMouseMove}
          onMouseUp={handleViewMouseUp}
          onMouseLeave={handleViewMouseUp}
          onMouseDown={handleViewMouseDown}
        >
          {/* Canvas Wrapper (Zoom/Pan) */}
          <div
            ref={canvasWrapperRef}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
              transition:
                isDraggingView || drawingRect
                  ? "none"
                  : "transform 0.1s ease-out",
              width: isLoaded ? imageDimensions.width : "auto",
              height: isLoaded ? imageDimensions.height : "auto",
              cursor:
                activeTool === "rectangle"
                  ? "crosshair"
                  : activeTool === "text"
                    ? "text"
                    : "default",
            }}
            className="relative shadow-2xl bg-white overflow-hidden"
          >
            {/* Checkerboard background */}
            <div className="absolute inset-0 z-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Grey_square_checkerboard.svg/1024px-Grey_square_checkerboard.svg.png')] bg-repeat opacity-20 pointer-events-none"></div>

            {/* Image Layer */}
            <div
              className={`transform-layer absolute inset-0 w-full h-full ${isTransformMode ? "cursor-move" : ""}`}
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scaleW}, ${transform.scaleH}) rotate(${transform.rotate}deg)`,
                transformOrigin: "center center",
              }}
              onMouseDown={(e) =>
                isTransformMode && handleTransformMouseDown(e, "move")
              }
            >
              <img
                src={src}
                alt={name}
                onLoad={handleImageLoad}
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
              />

              {/* Transform Controls Overlay */}
              {isTransformMode && (
                <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none">
                  {/* Corners */}
                  <div
                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 pointer-events-auto cursor-nwse-resize"
                    onMouseDown={(e) => handleTransformMouseDown(e, "nw")} // Todo: implement nw logic
                  />
                  <div
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 pointer-events-auto cursor-nesw-resize"
                    onMouseDown={(e) => handleTransformMouseDown(e, "ne")} // Todo: implement ne logic
                  />
                  <div
                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 pointer-events-auto cursor-nesw-resize"
                    onMouseDown={(e) => handleTransformMouseDown(e, "sw")}
                  />
                  <div
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 pointer-events-auto cursor-nwse-resize"
                    onMouseDown={(e) => handleTransformMouseDown(e, "se")}
                  />
                </div>
              )}
            </div>

            {/* 1. Main Canvas Layer (WYSIWYG) */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none"
              style={{
                width: "100%",
                height: "100%",
              }}
            />

            {/* 2. Hybrid Editing Overlay (DOM for Interactive Inputs - NO HANDLES HERE) */}
            <div className="absolute inset-0 pointer-events-none z-20">
              {/* Rectangle Text Editing */}
              {rectangles.map((rect) => {
                if (editingRectTextId === rect.id) {
                  return (
                    <div
                      key={`edit-rect-${rect.id}`}
                      className="absolute pointer-events-auto"
                      style={{
                        left: rect.x,
                        top: rect.y,
                        width: rect.width,
                        height: rect.height,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transform: "translateZ(0)", // GPU acceleration for crisp text
                      }}
                    >
                      <textarea
                        autoFocus
                        className="bg-transparent border-none outline-none resize-none overflow-hidden p-2 m-0 leading-tight text-center w-full h-full"
                        style={{
                          fontSize: Math.round(
                            Math.min(rect.width, rect.height) * 0.2,
                          ),
                          color: rect.textColor || rectTextColor,
                          fontFamily: "inherit",
                        }}
                        defaultValue={rect.text || ""}
                        onBlur={(e) => {
                          const newText = e.target.value;
                          const updatedRects = rectangles.map((r) =>
                            r.id === rect.id ? { ...r, text: newText } : r,
                          );
                          setRectangles(updatedRects);
                          addToHistory(updatedRects);
                          setEditingRectTextId(null);
                        }}
                      />
                    </div>
                  );
                }
                return null;
              })}

              {/* Text Rendering (Display) */}
              {texts.map((text) => {
                if (editingTextId === text.id) return null; // Don't show if editing

                return (
                  <div
                    key={text.id}
                    className="absolute cursor-move whitespace-pre select-none"
                    style={{
                      left: text.x,
                      top: text.y,
                      fontSize: text.fontSize,
                      color: text.color,
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "auto",
                      border:
                        selectedTextId === text.id
                          ? "1px dashed #3b82f6"
                          : "1px solid transparent",
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedTextId(text.id);
                      setSelectedRectId(null); // Deselect rect
                      setIsRectTransformMode(true);
                      setActiveTool("move");
                      
                      // Initialize move manually since state updates are async
                      setActiveHandle("move");
                      setDragStart({ x: e.clientX, y: e.clientY });
                      setInitialTransform({
                        x: text.x,
                        y: text.y,
                        scaleW: 0,
                        scaleH: 0,
                        rotate: 0,
                      });
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingTextId(text.id);
                      setIsRectTransformMode(false); // Disable transform while editing
                    }}
                  >
                    {text.content}
                  </div>
                );
              })}

              {/* Text Editing */}
              {texts.map((text) => {
                if (editingTextId === text.id) {
                  return (
                    <div
                      key={`edit-text-${text.id}`}
                      className="absolute pointer-events-auto"
                      style={{
                        left: text.x,
                        top: text.y,
                        transform: "translate(-50%, -50%) translateZ(0)",
                      }}
                    >
                      <textarea
                        autoFocus
                        className="bg-transparent border-none outline-none resize-none overflow-hidden p-2 m-0 leading-tight text-center"
                        style={{
                          fontSize: text.fontSize,
                          color: text.color,
                          fontFamily: "inherit",
                          width: "200px", // Arbitrary width for editing
                          height: "auto",
                        }}
                        defaultValue={text.content}
                        onBlur={(e) => {
                          const newContent = e.target.value;
                          const updatedTexts = texts.map((t) =>
                            t.id === text.id
                              ? { ...t, content: newContent }
                              : t,
                          );
                          setTexts(updatedTexts);
                          addToHistory(rectangles, updatedTexts);
                          setEditingTextId(null);
                        }}
                      />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>

          {/* 3. Global Screen-Space Selection & Transform Overlay (INSIDE VIEWPORT) */}
          {isRectTransformMode &&
            selectedRectId &&
            (() => {
              const selectedRect = rectangles.find(
                (r) => r.id === selectedRectId,
              );
              if (!selectedRect) return null;

              // Calculate logical dimensions
              const logicalX = selectedRect.x;
              const logicalY = selectedRect.y;
              const logicalW = selectedRect.width;
              const logicalH = selectedRect.height;

              // Convert to screen space coordinates relative to viewport container
              // Note: We don't use position.x/y or zoom here because the overlay is inside the wrapper
              // This ensures it moves and scales perfectly with the canvas
              const screenX = logicalX;
              const screenY = logicalY;
              const screenW = logicalW;
              const screenH = logicalH;

              // Visual handles that keep a constant 8px size regardless of zoom
              // We divide the handle size by current zoom to keep them visually constant
              const handleScale = 100 / zoom;
              const handleSize = 11 * handleScale;
              const handleOffset = -(handleSize / 2);

              return (
                <div
                  className="absolute border-2 border-dashed border-blue-500 pointer-events-none z-50"
                  style={{
                    left: screenX,
                    top: screenY,
                    width: screenW,
                    height: screenH,
                  }}
                >
                  <div
                    className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-nwse-resize shadow-md rounded-sm"
                    style={{
                      left: handleOffset,
                      top: handleOffset,
                      width: handleSize,
                      height: handleSize,
                      borderWidth: 2 * handleScale,
                    }}
                    onMouseDown={(e) => handleTransformMouseDown(e, "nw")}
                  />
                  <div
                    className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-nesw-resize shadow-md rounded-sm"
                    style={{
                      right: handleOffset,
                      top: handleOffset,
                      width: handleSize,
                      height: handleSize,
                      borderWidth: 2 * handleScale,
                    }}
                    onMouseDown={(e) => handleTransformMouseDown(e, "ne")}
                  />
                  <div
                    className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-nesw-resize shadow-md rounded-sm"
                    style={{
                      left: handleOffset,
                      bottom: handleOffset,
                      width: handleSize,
                      height: handleSize,
                      borderWidth: 2 * handleScale,
                    }}
                    onMouseDown={(e) => handleTransformMouseDown(e, "sw")}
                  />
                  <div
                    className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-nwse-resize shadow-md rounded-sm"
                    style={{
                      right: handleOffset,
                      bottom: handleOffset,
                      width: handleSize,
                      height: handleSize,
                      borderWidth: 2 * handleScale,
                    }}
                    onMouseDown={(e) => handleTransformMouseDown(e, "se")}
                  />
                </div>
              );
            })()}

          {isRectTransformMode &&
            selectedTextId &&
            (() => {
              const selectedText = texts.find((t) => t.id === selectedTextId);
              if (!selectedText) return null;

              // For text, we'll create a bounding box based on its approximate size
              const logicalX = selectedText.x;
              const logicalY = selectedText.y;
              const textWidth =
                selectedText.content.length * (selectedText.fontSize / 2); // Approximation
              const textHeight = selectedText.fontSize * 1.2; // Approximation with line height

              const screenX = logicalX;
              const screenY = logicalY;
              const screenW = textWidth;
              const screenH = textHeight;

              // Visual handles that keep a constant 8px size regardless of zoom
              // We divide the handle size by current zoom to keep them visually constant
              const handleScale = 100 / zoom;
              const handleSize = 11 * handleScale;
              const handleOffset = -(handleSize / 2);

              return (
                <div
                  className="absolute border-2 border-dashed border-blue-500 pointer-events-none z-50"
                  style={{
                    left: screenX,
                    top: screenY,
                    width: screenW,
                    height: screenH,
                  }}
                >
                  <div
                    className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-nwse-resize shadow-md rounded-sm"
                    style={{
                      left: handleOffset,
                      top: handleOffset,
                      width: handleSize,
                      height: handleSize,
                      borderWidth: 2 * handleScale,
                    }}
                    onMouseDown={(e) => handleTransformMouseDown(e, "nw")}
                  />
                  <div
                    className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-nesw-resize shadow-md rounded-sm"
                    style={{
                      right: handleOffset,
                      top: handleOffset,
                      width: handleSize,
                      height: handleSize,
                      borderWidth: 2 * handleScale,
                    }}
                    onMouseDown={(e) => handleTransformMouseDown(e, "ne")}
                  />
                  <div
                    className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-nesw-resize shadow-md rounded-sm"
                    style={{
                      left: handleOffset,
                      bottom: handleOffset,
                      width: handleSize,
                      height: handleSize,
                      borderWidth: 2 * handleScale,
                    }}
                    onMouseDown={(e) => handleTransformMouseDown(e, "sw")}
                  />
                  <div
                    className="absolute bg-white border-2 border-blue-500 pointer-events-auto cursor-nwse-resize shadow-md rounded-sm"
                    style={{
                      right: handleOffset,
                      bottom: handleOffset,
                      width: handleSize,
                      height: handleSize,
                      borderWidth: 2 * handleScale,
                    }}
                    onMouseDown={(e) => handleTransformMouseDown(e, "se")}
                  />
                </div>
              );
            })()}

          {/* Canvas Info Overlay */}
          <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded shadow text-xs font-mono text-gray-600 border border-gray-200 pointer-events-none z-30">
            {name} @ {Math.round(zoom)}%{" "}
            {isTransformMode ? "(Transform Mode)" : ""}
          </div>
        </div>

        {/* Right Sidebar: Layers */}
        <div className="w-64 bg-white border-l border-gray-300 flex flex-col z-10">
          <div className="px-3 py-2 bg-gray-100 border-b border-gray-300 font-semibold text-xs text-gray-700 flex justify-between items-center">
            <span>Layers</span>
            <div className="flex gap-2 text-gray-500">
              <i
                className="fa-solid fa-folder-plus cursor-pointer hover:text-gray-800"
                title="New Folder"
              ></i>
              <i
                className="fa-solid fa-square-plus cursor-pointer hover:text-gray-800"
                title="New Layer"
              ></i>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* Rectangle Layers (Reversed to show newest on top) */}
            {[...rectangles].reverse().map((rect, index) => (
              <div
                key={rect.id}
                className={`flex items-center gap-2 p-2 border rounded cursor-pointer ${selectedRectId === rect.id ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"}`}
                onClick={() => {
                  setSelectedRectId(rect.id);
                  setIsRectTransformMode(true);
                  setActiveTool("move");
                }}
              >
                <div className="w-10 h-10 bg-red-100 border border-gray-200 flex items-center justify-center shrink-0">
                  <div className="w-6 h-4 bg-red-500 opacity-50"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 truncate">
                    Rectangle {rectangles.length - index}
                  </div>
                  <div className="text-[10px] text-gray-500">Shape</div>
                </div>
                <i
                  className="fa-solid fa-trash-can text-xs text-gray-300 hover:text-red-500 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newRects = rectangles.filter((r) => r.id !== rect.id);
                    setRectangles(newRects);
                    addToHistory(newRects);
                  }}
                ></i>
              </div>
            ))}

            {/* Background Image Layer */}
            <div
              className={`flex items-center gap-2 p-2 border rounded cursor-pointer ${isTransformMode ? "bg-blue-100 border-blue-300" : "bg-white border-gray-200"}`}
            >
              <div className="w-10 h-10 bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={src}
                  className="w-full h-full object-cover"
                  alt="Layer Thumbnail"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-800 truncate">
                  {name}
                </div>
                <div className="text-[10px] text-gray-500">Background</div>
              </div>
              {isTransformMode && (
                <i
                  className="fa-solid fa-transform text-xs text-blue-500"
                  title="Transforming"
                ></i>
              )}
              <i className="fa-solid fa-lock text-xs text-gray-400"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 text-gray-600 px-4 py-1 text-[10px] border-t border-gray-300 flex justify-between select-none z-20">
        <div className="flex gap-4">
          <span>Document: {Math.round(zoom)}%</span>
          <span>
            Size: {imageDimensions.width}x{imageDimensions.height}px
          </span>
        </div>
        <span>
          {isTransformMode
            ? "Drag to move, Corner to scale. Enter to save."
            : activeTool === "rectangle"
              ? "Click and drag to draw rectangle. Press V to move."
              : "Ctrl+Alt+T to Free Transform, R for Rectangle"}
        </span>
      </div>
    </div>
  );
}
