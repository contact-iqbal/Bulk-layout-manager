import dynamic from "next/dynamic";

interface MapPreviewProps {
  coords: string; // "lat, lng" atau "lat,lng"
  className?: string;
}

// Komponen inner diload dinamis untuk menghindari SSR issue
const LeafletMapInner = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
      Memuat peta...
    </div>
  ),
});

export default function MapPreview({ coords, className }: MapPreviewProps) {
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

  return (
    <div
      className={`w-full h-full relative ${className ?? ""}`}
      style={{ minHeight: "160px" }}
      data-map-coords={coords}
    >
      <LeafletMapInner lat={lat} lng={lng} />
    </div>
  );
}
