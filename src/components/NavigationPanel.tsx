import { useState, useEffect, useCallback, useMemo } from "react";
import { Navigation, X, MapPin, Locate, Volume2, VolumeX } from "lucide-react";
import { buildGraph, findNearestNode, dijkstra, speakInstruction, RouteResult } from "@/lib/routing";
import { FacilityFeature } from "@/lib/layerConfig";

interface NavigationPanelProps {
  allFeatures: FacilityFeature[];
  onRouteCalculated: (route: RouteResult | null) => void;
  onClose: () => void;
}

const NavigationPanel = ({ allFeatures, onRouteCalculated, onClose }: NavigationPanelProps) => {
  const [destination, setDestination] = useState("");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [roadData, setRoadData] = useState<any>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [currentInstruction, setCurrentInstruction] = useState(0);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Load road network
  useEffect(() => {
    fetch("/data/road_network.geojson")
      .then((r) => r.json())
      .then(setRoadData)
      .catch(() => setError("Failed to load road network"));
  }, []);

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
      { enableHighAccuracy: true }
    );
  }, []);

  const calculateRoute = useCallback(() => {
    if (!roadData || !userLocation) {
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
    const { graph, nodes } = buildGraph(roadData);

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

    const startNode = findNearestNode(nodes, userLocation[1], userLocation[0]);
    const endNode = findNearestNode(nodes, destLat, destLng);

    const result = dijkstra(graph, nodes, startNode, endNode);
    if (!result) {
      setError("No route found");
      return;
    }

    setRoute(result);
    setCurrentInstruction(0);
    onRouteCalculated(result);

    if (voiceEnabled && result.instructions.length > 0) {
      speakInstruction(result.instructions[0].text);
    }
  }, [roadData, userLocation, destination, allFeatures, onRouteCalculated, voiceEnabled]);

  // Real-time tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation || !route) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude]);

        // Check if near next instruction
        if (route && currentInstruction < route.instructions.length - 1) {
          const inst = route.instructions[currentInstruction + 1];
          const d = Math.sqrt(
            (pos.coords.latitude - inst.coord[1]) ** 2 + (pos.coords.longitude - inst.coord[0]) ** 2
          ) * 111000;
          if (d < 15) {
            setCurrentInstruction((prev) => prev + 1);
            if (voiceEnabled) {
              speakInstruction(inst.text);
            }
          }
        }
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
    setWatchId(id);
  }, [route, currentInstruction, voiceEnabled]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setDestination("");
    setCurrentInstruction(0);
    stopTracking();
    onRouteCalculated(null);
  }, [stopTracking, onRouteCalculated]);

  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

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
          <button onClick={() => { clearRoute(); onClose(); }} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Location */}
      <div className="flex gap-2">
        <button
          onClick={locateUser}
          disabled={locating}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-50"
        >
          <Locate className="w-3 h-3" />
          {locating ? "Locating..." : userLocation ? "Located ✓" : "Get Location"}
        </button>
      </div>

      {/* Destination search */}
      <div className="relative">
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Type destination..."
          className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        {filteredDest.length > 0 && !route && (
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

      {!route && (
        <button
          onClick={calculateRoute}
          className="w-full py-1.5 rounded bg-green-700 text-white text-xs font-semibold hover:bg-green-800"
        >
          Find Route
        </button>
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}

      {/* Route info */}
      {route && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs bg-green-50 p-2 rounded">
            <span><b>{Math.round(route.distance)}m</b> distance</span>
            <span><b>{Math.ceil(route.time / 60)} min</b> walking</span>
          </div>

          <div className="flex gap-2">
            {watchId === null ? (
              <button
                onClick={startTracking}
                className="flex-1 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
              >
                Start Navigation
              </button>
            ) : (
              <button
                onClick={stopTracking}
                className="flex-1 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
              >
                Stop Tracking
              </button>
            )}
            <button
              onClick={clearRoute}
              className="px-3 py-1 rounded bg-gray-200 text-xs hover:bg-gray-300"
            >
              Clear
            </button>
          </div>

          {/* Turn-by-turn */}
          <div className="max-h-32 overflow-y-auto space-y-1">
            {route.instructions.map((inst, i) => (
              <div
                key={i}
                className={`text-xs px-2 py-1 rounded ${
                  i === currentInstruction
                    ? "bg-green-100 font-semibold border-l-2 border-green-600"
                    : i < currentInstruction
                    ? "text-gray-400 line-through"
                    : "text-gray-600"
                }`}
              >
                {inst.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationPanel;
