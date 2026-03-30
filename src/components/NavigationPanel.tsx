import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Navigation, X, Volume2, VolumeX } from "lucide-react";
import { FacilityFeature } from "@/lib/layerConfig";

interface NavigationPanelProps {
  allFeatures: FacilityFeature[];
  onRouteReady: (origin: [number, number], destCoord: [number, number]) => void;
  onClearRoute: () => void;
  onClose: () => void;
  routeSummary: { distance: number; time: number } | null;
  onDestinationNameChange?: (name: string) => void;
}

const NavigationPanel = ({
  allFeatures,
  onRouteReady,
  onClearRoute,
  onClose,
  routeSummary,
}: NavigationPanelProps) => {
  const [destination, setDestination] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const destinations = useMemo(() => {
    return allFeatures
      .filter((f) => f.geometry)
      .map((f) => f.name)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
  }, [allFeatures]);

  const filteredDest = useMemo(() => {
    if (!destination.trim()) return destinations.slice(0, 8);
    const q = destination.toLowerCase();
    return destinations.filter((d) => d.toLowerCase().includes(q)).slice(0, 8);
  }, [destination, destinations]);

  // Auto-locate on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude]);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectDestination = useCallback((name: string) => {
    setDestination(name);
    setShowSuggestions(false);
  }, []);

  const calculateRoute = useCallback(() => {
    if (!userLocation) {
      setError("Still locating you… please wait");
      return;
    }
    const destFeature = allFeatures.find(
      (f) => f.name.toLowerCase() === destination.toLowerCase() && f.geometry
    );
    if (!destFeature) {
      setError("Select a destination from the list");
      return;
    }
    setError("");

    let destLat: number, destLng: number;
    const geom = destFeature.geometry;
    if (geom.type === "MultiPolygon") {
      const coords = geom.coordinates[0][0];
      destLng = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
      destLat = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;
    } else if (geom.type === "Polygon") {
      const coords = geom.coordinates[0];
      destLng = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
      destLat = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;
    } else {
      destLng = geom.coordinates[0];
      destLat = geom.coordinates[1];
    }

    onRouteReady(userLocation, [destLng, destLat]);

    if (voiceEnabled && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(`Routing to ${destFeature.name}`);
      utterance.rate = 1;
      speechSynthesis.speak(utterance);
    }
  }, [userLocation, destination, allFeatures, onRouteReady, voiceEnabled]);

  const handleClear = useCallback(() => {
    setDestination("");
    setError("");
    setUserLocation(null);
    onClearRoute();
  }, [onClearRoute]);

  return (
    <div className="bg-white rounded-lg shadow-xl p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-gray-800">
          <Navigation className="w-4 h-4" /> Navigation
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500">
            {locating ? "Locating…" : userLocation ? "📍 Located" : "📍 No GPS"}
          </span>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="p-1 rounded hover:bg-gray-100"
            title={voiceEnabled ? "Mute voice" : "Enable voice"}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { handleClear(); onClose(); }}
            className="p-1 rounded hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Destination input with dropdown */}
      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          value={destination}
          onChange={(e) => {
            setDestination(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search destination..."
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-900 placeholder:text-gray-400"
        />
        {showSuggestions && filteredDest.length > 0 && !routeSummary && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b shadow-lg z-[900] max-h-48 overflow-y-auto">
            {filteredDest.map((d) => (
              <button
                key={d}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectDestination(d);
                }}
                className="w-full text-left px-3 py-2 hover:bg-green-50 text-xs border-b border-gray-50 last:border-0"
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      {!routeSummary && (
        <button
          onClick={calculateRoute}
          className="w-full py-2 rounded bg-green-700 text-white text-xs font-semibold hover:bg-green-800"
        >
          Find Route
        </button>
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}

      {routeSummary && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs bg-green-50 p-2 rounded">
            <span>
              <b>{routeSummary.distance >= 1000 ? (routeSummary.distance / 1000).toFixed(2) + " km" : Math.round(routeSummary.distance) + " m"}</b> distance
            </span>
            <span>
              <b>{Math.ceil(routeSummary.time / 60)} min</b> walking
            </span>
          </div>
          <button
            onClick={handleClear}
            className="w-full px-3 py-1.5 rounded bg-gray-200 text-xs hover:bg-gray-300"
          >
            Clear Route
          </button>
        </div>
      )}
    </div>
  );
};

export default NavigationPanel;
