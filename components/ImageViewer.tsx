"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

interface ImageViewerProps {
  src: string;
  name?: string;
  tabId?: string;
}

export default function ImageViewer({ src, name = "Image", tabId }: ImageViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Handle zoom with wheel
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -10 : 10;
        setZoom((prev) => Math.max(10, Math.min(500, prev + delta)));
      }
    };

    const container = document.getElementById(`image-viewer-${tabId}`);
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, [tabId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div 
      id={`image-viewer-${tabId}`}
      className="w-full h-full bg-[#1e1e1e] flex flex-col overflow-hidden relative select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Toolbar / Info */}
      <div className="bg-[#2d2d2d] text-gray-300 px-4 py-2 text-xs flex justify-between items-center border-b border-[#3d3d3d] z-10">
        <div className="font-medium truncate max-w-[50%]">{name}</div>
        <div className="flex gap-4">
          <span>{zoom}%</span>
          <span>RGB/8</span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
           onMouseDown={handleMouseDown}>
        <div 
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
            transition: isDragging ? "none" : "transform 0.1s ease-out"
          }}
          className="relative shadow-2xl"
        >
          {/* Checkerboard background for transparency */}
          <div className="absolute inset-0 z-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Grey_square_checkerboard.svg/1024px-Grey_square_checkerboard.svg.png')] bg-repeat opacity-20 pointer-events-none"></div>
          
          <img
            src={src}
            alt={name}
            className="relative z-10 max-w-none block shadow-black/50 shadow-lg"
            draggable={false}
          />
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="bg-[#2d2d2d] text-gray-400 px-4 py-1 text-[10px] border-t border-[#3d3d3d] flex justify-between">
        <span>Doc: {Math.round(zoom)}%</span>
        <span>Click and drag to pan, Ctrl+Scroll to zoom</span>
      </div>
    </div>
  );
}
