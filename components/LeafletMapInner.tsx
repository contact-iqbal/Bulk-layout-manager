"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix icon default path issue di Next.js/webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)[
  "_getIconUrl"
];

// Custom icon menggunakan asset lokal
const customIcon = L.icon({
  iconUrl: "/assets/icon_maps.png",
  iconSize: [32, 40], // ukuran icon [width, height]
  iconAnchor: [16, 40], // titik anchor di bawah tengah icon
  popupAnchor: [0, -40], // posisi popup relatif terhadap icon
});

interface LeafletMapInnerProps {
  lat: number;
  lng: number;
  zoom?: number;
}

/**
 * LeafletMapInner - komponen Leaflet yang diload secara dynamic (client-only).
 *
 * Keunggulan vs iframe Google Maps untuk PDF:
 * - Tile peta di-render sebagai <img> elements di DOM
 * - <img> elements tampil di print/PDF dengan print-color-adjust: exact
 * - Tidak ada cross-origin iframe issue saat print
 */
export default function LeafletMapInner({
  lat,
  lng,
  zoom = 15,
}: LeafletMapInnerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    });

    // Switch to Google Maps tiles for better detail in preview
    L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      crossOrigin: "anonymous",
    }).addTo(map);

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
    markerRef.current = marker;
    mapRef.current = map;

    // Force tiles to load fully (penting untuk print)
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [lat, lng, zoom]);

  useEffect(() => {
    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update posisi jika koordinat berubah
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([lat, lng], zoom);
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng, zoom]);

  return (
    <div
      ref={containerRef}
      className="leaflet-map-container"
      style={{ width: "100%", height: "100%", minHeight: "160px" }}
    />
  );
}
