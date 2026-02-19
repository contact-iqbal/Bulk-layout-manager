"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

interface MapsPanelProps {
  tabId?: string;
  onSelectLocation?: (location: {
    lat: number;
    lng: number;
    address: string;
    mapUrl: string;
  }) => void;
}

// Separate component for Map logic to avoid 'require' hacks
const LeafletMap = dynamic(
  async () => {
    const { MapContainer, TileLayer, Marker, useMapEvents, useMap } =
      await import("react-leaflet");
    const L = await import("leaflet");

    // Fix for default marker icons in Leaflet with Next.js
    const DefaultIcon = L.Icon.Default.prototype as any;
    delete DefaultIcon._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    return function MapComponent({
      lat,
      lng,
      onSelect,
    }: {
      lat: number;
      lng: number;
      onSelect: (lat: number, lng: number) => void;
    }) {
      function MapClickHandler() {
        useMapEvents({
          click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
          },
        });
        return null;
      }

      function ChangeView({ center }: { center: [number, number] }) {
        const map = useMap();
        useEffect(() => {
          if (center[0] && center[1]) {
            map.setView(center, map.getZoom(), { animate: true });
            map.invalidateSize(); // Force map to redraw tiles
          }
        }, [center, map]);
        return null;
      }

      return (
        <MapContainer
          center={[lat, lng]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
          // Force re-render when coordinates change drastically or on first load
          key={`${lat}-${lng}`} 
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]} />
          <MapClickHandler />
          <ChangeView center={[lat, lng]} />
        </MapContainer>
      );
    };
  },
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <i className="fa-solid fa-spinner fa-spin text-orange-500"></i>
      </div>
    ),
  },
);

export default function MapsPanel({ tabId, onSelectLocation }: MapsPanelProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: -6.9147, // Default Bandung
    lng: 107.6098,
  });
  const [address, setAddress] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Load saved search from localStorage
  useEffect(() => {
    if (tabId) {
      const savedLat = localStorage.getItem(`maps_lat_${tabId}`);
      const savedLng = localStorage.getItem(`maps_lng_${tabId}`);
      const savedAddr = localStorage.getItem(`maps_addr_${tabId}`);

      if (savedLat && savedLng) {
        setCoords({ lat: parseFloat(savedLat), lng: parseFloat(savedLng) });
      }
      if (savedAddr) {
        setSearchQuery(savedAddr);
        setAddress(savedAddr);
      }
    }
  }, [tabId]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const newCoords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
        setCoords(newCoords);
        setAddress(data[0].display_name);

        saveLocation(newCoords.lat, newCoords.lng, data[0].display_name);
      } else {
        setError("Lokasi tidak ditemukan");
      }
    } catch (err) {
      setError("Gagal menghubungi layanan peta");
    } finally {
      setIsLoading(false);
    }
  };

  const saveLocation = useCallback(
    (lat: number, lng: number, addr: string) => {
      if (tabId) {
        localStorage.setItem(`maps_lat_${tabId}`, lat.toString());
        localStorage.setItem(`maps_lng_${tabId}`, lng.toString());
        localStorage.setItem(`maps_addr_${tabId}`, addr);
      }

      if (onSelectLocation) {
        onSelectLocation({
          lat,
          lng,
          address: addr,
          mapUrl: `https://www.openstreetmap.org/#map=17/${lat}/${lng}`,
        });
      }
    },
    [tabId, onSelectLocation],
  );

  const handleMapClick = async (lat: number, lng: number) => {
    setCoords({ lat, lng });
    setIsLoading(true);

    try {
      // Reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      );
      const data = await response.json();

      const newAddress =
        data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(newAddress);
      setSearchQuery(newAddress);
      saveLocation(lat, lng, newAddress);
    } catch (err) {
      const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(coordStr);
      setSearchQuery(coordStr);
      saveLocation(lat, lng, coordStr);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    const text = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-400">
        <div className="flex flex-col items-center">
           <i className="fa-solid fa-spinner fa-spin text-2xl text-orange-500 mb-2"></i>
           <span className="text-xs font-medium">Memuat Peta...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">
          Koordinat Lokasi
        </h3>
      </div>
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kota, jalan, atau koordinat..."
            className="w-full px-4 py-2.5 pl-10 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all shadow-sm"
          />
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs group-focus-within:text-orange-500 transition-colors"></i>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setError(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || !searchQuery.trim()}
          className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i>
              <span>Mencari...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-magnifying-glass-location"></i>
              <span>Cari Lokasi</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[10px] flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <i className="fa-solid fa-circle-exclamation text-xs"></i> {error}
        </div>
      )}

      <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative shadow-inner min-h-[250px]">
        <LeafletMap
          lat={coords.lat}
          lng={coords.lng}
          onSelect={handleMapClick}
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg group">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2">
              <i className="fa-solid fa-location-crosshairs text-blue-500 mt-1 text-xs"></i>
              <div>
                <p className="text-xs text-blue-800 font-bold mb-0.5">
                  Koordinat Terpilih
                </p>
                <p className="font-mono text-[10px] text-blue-700 select-all tracking-tight">
                  {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                </p>
              </div>
            </div>
            <button
              onClick={copyToClipboard}
              className={`p-2 rounded-md transition-all ${
                copySuccess
                  ? "bg-orange-500 text-white"
                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
              }`}
              title="Salin Koordinat"
            >
              <i
                className={`fa-solid ${copySuccess ? "fa-check" : "fa-copy"} text-xs`}
              ></i>
            </button>
          </div>
        </div>

        {address && (
          <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg animate-in fade-in duration-500">
            <div className="flex items-start gap-2">
              <i className="fa-solid fa-map-pin text-orange-500 mt-1 text-xs"></i>
              <div>
                <p className="text-xs text-gray-700 font-bold mb-0.5">
                  Alamat Terdeteksi
                </p>
                <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-3">
                  {address}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
