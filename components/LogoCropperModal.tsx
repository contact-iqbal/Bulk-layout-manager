"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";

interface LogoCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onSave: (croppedImage: string) => void;
}

export default function LogoCropperModal({
  isOpen,
  onClose,
  imageSrc,
  onSave,
}: LogoCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [containerSize, setContainerSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const maxWidth = Math.min(600, window.innerWidth - 40);
      const ASPECT_RATIO = 1070 / 780;
      return { width: maxWidth, height: maxWidth / ASPECT_RATIO };
    }
    return { width: 600, height: 437.38 }; // Default fallback
  });
  const [mounted, setMounted] = useState(false);

  // Target dimensions: 1070 x 780
  const TARGET_WIDTH = 1070;
  const TARGET_HEIGHT = 780;
  const ASPECT_RATIO = TARGET_WIDTH / TARGET_HEIGHT;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  useEffect(() => {
    const updateSize = () => {
      // Max width 600px, but also respect screen width
      // Use window.innerWidth to ensure we have a size even if ref is not ready
      if (typeof window !== 'undefined') {
        const maxWidth = Math.min(600, window.innerWidth - 40);
        const width = maxWidth;
        const height = width / ASPECT_RATIO;
        setContainerSize({ width, height });
      }
    };

    if (isOpen) {
      updateSize();
      // Add a small delay to ensure layout is stable
      const timer = setTimeout(updateSize, 100);
      window.addEventListener("resize", updateSize);
      return () => {
        window.removeEventListener("resize", updateSize);
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  const handleDrag = (e: DraggableEvent, data: DraggableData) => {
    setPosition({ x: data.x, y: data.y });
  };

  const handleSave = () => {
    if (!imageRef.current || !imageSrc) return;

    const canvas = document.createElement("canvas");
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const img = imageRef.current;
    
    // Scale factor between screen pixels and canvas pixels
    // containerSize.width corresponds to TARGET_WIDTH
    const scaleFactor = TARGET_WIDTH / containerSize.width;

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    // Calculate drawing parameters
    // The image on screen has width = containerSize.width * zoom
    // Its top-left corner is at (position.x, position.y) relative to container
    
    const dx = position.x * scaleFactor;
    const dy = position.y * scaleFactor;
    const dWidth = containerSize.width * zoom * scaleFactor; 
    // dWidth = TARGET_WIDTH * zoom
    
    // Maintain aspect ratio for height
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const dHeight = dWidth / aspectRatio;

    ctx.drawImage(img, dx, dy, dWidth, dHeight);

    const croppedDataUrl = canvas.toDataURL("image/png");
    onSave(croppedDataUrl);
    onClose();
  };

  if (!mounted || !isOpen || !imageSrc) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <i className="fa-solid fa-crop-simple text-orange-500"></i>
            Sesuaikan Posisi Logo
          </h3>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center bg-gray-100/50">
            <p className="text-sm text-gray-500 mb-4 text-center">
                Geser dan zoom gambar agar pas di dalam area (1070 x 780 px).
            </p>

            <div 
                ref={containerRef}
                className="relative overflow-hidden bg-white shadow-sm border-2 border-dashed border-gray-300 rounded cursor-move"
                style={{ 
                    width: containerSize.width, 
                    height: containerSize.height,
                }}
            >
                <Draggable
                    nodeRef={draggableRef}
                    position={position}
                    onDrag={handleDrag}
                >
                    <div 
                        ref={draggableRef}
                        style={{ 
                            width: containerSize.width * zoom,
                            transformOrigin: 'top left', // Important for consistent zooming? No, we change width directly.
                            // Actually, changing width changes layout.
                        }}
                    >
                        <img
                            ref={imageRef}
                            src={imageSrc}
                            alt="Logo Preview"
                            style={{
                                width: '100%',
                                height: 'auto',
                                pointerEvents: 'none',
                                userSelect: 'none',
                                display: 'block'
                            }}
                            draggable={false}
                        />
                    </div>
                </Draggable>
                
                {/* Grid Overlay for visual guide */}
                <div className="absolute inset-0 pointer-events-none opacity-20 border border-blue-500">
                    <div className="w-full h-1/3 border-b border-blue-500"></div>
                    <div className="w-full h-1/3 border-b border-blue-500 top-1/3 absolute"></div>
                    <div className="h-full w-1/3 border-r border-blue-500 absolute top-0 left-0"></div>
                    <div className="h-full w-1/3 border-r border-blue-500 absolute top-0 left-1/3"></div>
                </div>
            </div>

            <div className="mt-6 w-full max-w-md space-y-3 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <span>Zoom Out</span>
                    <span>Zoom In</span>
                </div>
                <div className="flex items-center gap-4">
                    <i className="fa-solid fa-magnifying-glass-minus text-gray-400"></i>
                    <input
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-600"
                    />
                    <i className="fa-solid fa-magnifying-glass-plus text-gray-400"></i>
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition hover:bg-gray-100 rounded-lg"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-md hover:shadow-lg transition flex items-center gap-2 transform active:scale-95"
          >
            <i className="fa-solid fa-check"></i>
            Simpan Logo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
