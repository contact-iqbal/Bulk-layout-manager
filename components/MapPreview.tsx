"use client";

import { useEffect, useState } from "react";

interface MapPreviewProps {
  coords: string; // "lat, lng" atau "lat,lng"
  className?: string;
}

// Komponen inner diload dinamis untuk menghindari SSR issue
let LeafletMapInner: React.ComponentType<{
  lat: number;
  lng: number;
  zoom?: number;
}> | null = null;

export default function MapPreview({ coords, className }: MapPreviewProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{
    lat: number;
    lng: number;
    zoom?: number;
  }> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load Leaflet hanya di client side
    if (LeafletMapInner) {
      setMapComponent(() => LeafletMapInner);
      setIsLoaded(true);
      return;
    }
    import("./LeafletMapInner").then((mod) => {
      LeafletMapInner = mod.default;
      setMapComponent(() => mod.default);
      setIsLoaded(true);
    });
  }, []);

  // Parse koordinat
  const coordStr = coords.replace(/\s/g, "");
  const parts = coordStr.split(",");
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  const isValid = !isNaN(lat) && !isNaN(lng);

  if (!isValid) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs text-center p-2 ${className ?? ""}`}
      >
        <span>{coords || "Koordinat belum diisi"}</span>
      </div>
    );
  }

  if (!isLoaded || !MapComponent) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs ${className ?? ""}`}
      >
        Memuat peta...
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full relative ${className ?? ""}`}
      style={{ minHeight: "160px" }}
    >
      <MapComponent lat={lat} lng={lng} />
    </div>
  );
}
