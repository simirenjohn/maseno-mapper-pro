import { useState, useEffect, useCallback, useMemo } from "react";
import { Navigation, X, Volume2, VolumeX } from "lucide-react";
import { FacilityFeature } from "@/lib/layerConfig";

interface NavigationPanelProps {
  allFeatures: FacilityFeature[];
  onRouteReady: (origin: [number, number], destCoord: [number, number]) => void;
  onClearRoute: () => void;
  onClose: () => void;
  routeSummary: { distance: number; time: number } | null;
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

  const destinations = useMemo(() => {
    return allFeatures
      .filter((f) => f.geometry)
      .map((f) => f.name)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
  }, [allFeatures]);

  const filteredDest = useMemo(() => {
    if (!destination.trim()) return [];
    const q = destination.toLowerCase();
    return destinations.filter((d) => d.toLowerCase().includes(q)).slice(0, 8);
  }, [destination, destinations]);

  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude]);
        setLocating(false);
      },
      (err) => {
        setError("Could not get location: " + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const calculateRoute = useCallback(() => {
    if (!userLocation) {
      setError("Please get your location first");
      return;
    }

    const destFeature = allFeatures.find(
      (f) => f.name.toLowerCase() === destination.toLowerCase() && f.geometry
    );
    if (!destFeature) {
      setError("Destination not found");
      return;
    }

    setError("");

    // Get destination centroid
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

    // Voice announcement
    if (voiceEnabled && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Routing to ${destFeature.name}`
      );
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
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="p-1 rounded hover:bg-gray-100"
            title={voiceEnabled ? "Mute voice" : "Enable voice"}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              handleClear();
              onClose();
            }}
            className="p-1 rounded hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Location */}
      <button
        onClick={locateUser}
        disabled={locating}
        className="flex items-center gap-1 px-3 py-1.5 rounded bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-50 w-full justify-center"
      >
        {locating ? "Locating..." : userLocation ? "📍 Located ✓" : "📍 Get My Location"}
      </button>

      {/* Destination search */}
      <div className="relative">
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Type destination..."
          className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        {filteredDest.length > 0 && !routeSummary && (
          <div className="absolute top-full left-0 right-0 bg-white border rounded-b shadow-lg z-10 max-h-40 overflow-y-auto">
            {filteredDest.map((d) => (
              <button
                key={d}
                onClick={() => setDestination(d)}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs"
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
          className="w-full py-1.5 rounded bg-green-700 text-white text-xs font-semibold hover:bg-green-800"
        >
          Find Route
        </button>
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}

      {/* Route summary from Leaflet Routing Machine */}
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
