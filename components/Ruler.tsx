"use client";

import { useEffect, useRef } from "react";

interface RulerProps {
  orientation: "horizontal" | "vertical";
  scale: number;
  scrollPos: number;
  originOffset: number; // Offset in pixels from the start of the ruler to the 0 point
  unit?: number; // Pixels per unit (e.g., 3.78 for mm, or 1 for pixels)
  length?: number; // Length of the ruler in pixels (if not provided, uses container width/height)
}

export default function Ruler({
  orientation,
  scale,
  scrollPos,
  originOffset,
  unit = 3.78, // Default to approx 1mm
}: RulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match parent size
    const updateSize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Logical size
        const width = orientation === "horizontal" ? rect.width : 20;
        const height = orientation === "vertical" ? rect.height : 20;

        // Physical size
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        // CSS size
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        ctx.scale(dpr, dpr);
        drawRuler(width, height);
      }
    };

    const drawRuler = (width: number, height: number) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#f3f4f6"; // bg-gray-100
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = "#374151"; // text-gray-700
      ctx.strokeStyle = "#9ca3af"; // border-gray-400
      ctx.lineWidth = 1;
      ctx.font = "10px sans-serif";

      // Effective pixel size of one unit (scaled)
      const stepPixels = unit * scale;
      
      // Determine labeled step size (e.g., every 10mm, 50mm, etc.)
      // We want labels not to overlap. Min label spacing ~50px.
      let labelStep = 10; // units
      if (stepPixels * labelStep < 50) labelStep = 50;
      if (stepPixels * labelStep < 50) labelStep = 100;

      // Calculate start and end units based on scroll and offset
      // Visible range starts at: -originOffset + scrollPos
      // But we draw relative to the canvas 0.
      // 0 on canvas = (0 - scrollPos) + originOffset in ruler coordinates?
      // Let's think:
      // Ruler Coordinate 0 should be drawn at canvas coordinate `originOffset - scrollPos`.
      // Canvas coord X = (RulerVal * stepPixels) + originOffset - scrollPos.
      
      const startPixel = 0;
      const endPixel = orientation === "horizontal" ? width : height;
      
      // Inverse: RulerVal = (CanvasX - originOffset + scrollPos) / stepPixels
      const startValue = Math.floor((startPixel - originOffset + scrollPos) / stepPixels);
      const endValue = Math.ceil((endPixel - originOffset + scrollPos) / stepPixels);

      // Draw ticks
      for (let i = startValue; i <= endValue; i++) {
        const pos = (i * stepPixels) + originOffset - scrollPos;
        
        // Major tick (every 10 units usually, or labelStep)
        const isMajor = i % 10 === 0;
        const isLabel = i % labelStep === 0;
        
        let tickLength = 4;
        if (isMajor) tickLength = 8;
        if (isLabel) tickLength = 12;

        if (orientation === "horizontal") {
          ctx.beginPath();
          ctx.moveTo(pos, height);
          ctx.lineTo(pos, height - tickLength);
          ctx.stroke();

          if (isLabel) {
            ctx.fillText(i.toString(), pos + 2, 10);
          }
        } else {
          ctx.beginPath();
          ctx.moveTo(width, pos);
          ctx.lineTo(width - tickLength, pos);
          ctx.stroke();

          if (isLabel) {
             // Rotate text for vertical ruler
             ctx.save();
             ctx.translate(2, pos + 10);
             ctx.rotate(-Math.PI / 2);
             ctx.fillText(i.toString(), 0, 0);
             ctx.restore();
          }
        }
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [orientation, scale, scrollPos, originOffset, unit]);

  return <canvas ref={canvasRef} className="block pointer-events-none" />;
}
