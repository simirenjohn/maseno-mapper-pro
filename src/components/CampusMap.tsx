import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { LAYER_CONFIGS, ROOM_DATA_MAP, FacilityFeature } from "@/lib/layerConfig";
import { GeoJSONRouter } from "@/lib/customRouter";
import NavigationPanel from "./NavigationPanel";

const BASEMAPS = {
  OpenStreetMap: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  Satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  Topographic: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
};

const STUDY_AREAS = [
  { file: "/data/niles_study_area.geojson", name: "NILES Study Area" },
  { file: "/data/siriba_study_area.geojson", name: "Siriba Study Area" },
  { file: "/data/college_campus_study_area.geojson", name: "College Campus Study Area" },
];

const ROAD_NETWORK_URL = "/data/road_network.geojson";

interface CampusMapProps {
  selectedFeature: FacilityFeature | null;
  visibleLayers: string[];
  searchQuery: string;
  categoryFilter: string;
  allFeatures: FacilityFeature[];
  showNavigation: boolean;
  onCloseNavigation: () => void;
  destinationName?: string;
  onDestinationNameChange?: (name: string) => void;
}

const CampusMap = ({
  selectedFeature,
  visibleLayers,
  allFeatures,
  showNavigation,
  onCloseNavigation,
  destinationName,
  onDestinationNameChange,
}: CampusMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layerGroupsRef = useRef<Record<string, L.GeoJSON>>({});
  const baseTileRef = useRef<L.TileLayer | null>(null);
  const routingControlRef = useRef<L.Routing.RoutingControl | null>(null);
  const roomDataCache = useRef<Record<number, any[]>>({});
  const customRouterRef = useRef<GeoJSONRouter | null>(null);
  const routeMarkersRef = useRef<L.Marker[]>([]);

  const [routeSummary, setRouteSummary] = useState<{ distance: number; time: number } | null>(null);
  const animatedLineRef = useRef<L.Polyline | null>(null);

  // Load room data
  useEffect(() => {
    Object.entries(ROOM_DATA_MAP).forEach(async ([buildingId, config]) => {
      try {
        const resp = await fetch(config.file);
        const data = await resp.json();
        roomDataCache.current[Number(buildingId)] = data.features.map((f: any) => f.properties);
      } catch (err) {
        console.error(`Failed to load rooms for building ${buildingId}:`, err);
      }
    });
  }, []);

  // Initialize custom router once
  useEffect(() => {
    customRouterRef.current = new GeoJSONRouter(ROAD_NETWORK_URL);
  }, []);

  const getRoomTableHtml = useCallback((buildingId: number) => {
    const rooms = roomDataCache.current[buildingId];
    const config = ROOM_DATA_MAP[buildingId];
    if (!rooms || !config) return "";

    const nameField = config.nameField;
    const capFields =
      buildingId === 0
        ? [
            { key: "lecture_capacity", label: "Lec. Cap" },
            { key: "examination_capacity", label: "Exam Cap" },
            { key: "current_number_of_seats", label: "Seats" },
            { key: "floor_number", label: "Floor" },
          ]
        : [
            { key: "LECTURE CAPACITY", label: "Lec. Cap" },
            { key: "EXAMINATION CAPACITY", label: "Exam Cap" },
            { key: "CURRENT NUMBER OF SEATS", label: "Seats" },
            { key: "floor_number", label: "Floor" },
          ];

    return `
      <div class="room-table-wrapper">
        <table class="room-table">
          <thead>
            <tr><th>Room</th>${capFields.map((f) => `<th>${f.label}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rooms
              .map(
                (r) =>
                  `<tr><td>${r[nameField] || "—"}</td>${capFields
                    .map((f) => `<td>${r[f.key] ?? "—"}</td>`)
                    .join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }, []);

  const getPopupContent = useCallback(
    (properties: Record<string, any>, layerName: string, color: string) => {
      const skipKeys = ["fid", "id", "building_id", "room_id"];
      const entries = Object.entries(properties).filter(
        ([key, val]) =>
          !skipKeys.includes(key.toLowerCase()) &&
          val !== null &&
          val !== undefined &&
          val !== ""
      );

      const buildingId = properties["building_id"];
      const roomHtml =
        buildingId !== undefined && ROOM_DATA_MAP[buildingId]
          ? getRoomTableHtml(buildingId)
          : "";

      return `
        <div class="campus-popup-inner">
          <div class="popup-title" style="color: ${color}">${layerName}</div>
          ${entries
            .map(
              ([key, val]) => `
            <div class="popup-row">
              <span class="popup-label">${key.replace(/_/g, " ")}</span>
              <span class="popup-value">${val}</span>
            </div>
          `
            )
            .join("")}
          ${roomHtml}
        </div>
      `;
    },
    [getRoomTableHtml]
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-0.003, 34.605],
      zoom: 16,
      zoomControl: true,
    });

    baseTileRef.current = L.tileLayer(BASEMAPS["OpenStreetMap"], {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const baseLayers: Record<string, L.TileLayer> = {};
    Object.entries(BASEMAPS).forEach(([name, url]) => {
      baseLayers[name] = L.tileLayer(url, {
        maxZoom: 19,
        attribution: "© OpenStreetMap / Esri / OpenTopoMap",
      });
    });
    baseLayers["OpenStreetMap"] = baseTileRef.current;
    L.control.layers(baseLayers, undefined, { position: "topright" }).addTo(map);

    mapRef.current = map;

    // Load study area boundaries
    STUDY_AREAS.forEach(async (area) => {
      try {
        const resp = await fetch(area.file);
        const data = await resp.json();
        L.geoJSON(data, {
          style: () => ({
            color: "#e53e3e",
            weight: 2.5,
            opacity: 0.85,
            fillOpacity: 0,
            dashArray: "6, 4",
          }),
          onEachFeature: (_feature, layer) => {
            layer.bindTooltip(area.name, {
              sticky: true,
              className: "campus-tooltip",
            });
          },
        }).addTo(map);
      } catch (err) {
        console.error(`Failed to load ${area.file}:`, err);
      }
    });

    // Load road network
    fetch(ROAD_NETWORK_URL)
      .then((r) => r.json())
      .then((data) => {
        L.geoJSON(data, {
          style: () => ({
            color: "#4a5568",
            weight: 2.5,
            opacity: 0.7,
            dashArray: "4, 6",
          }),
        }).addTo(map);
      })
      .catch((err) => console.error("Failed to load road network:", err));

    // Load facility layers
    LAYER_CONFIGS.forEach(async (config) => {
      try {
        const resp = await fetch(config.file);
        const data = await resp.json();

        const geoLayer = L.geoJSON(data, {
          style: () => ({
            color: config.color,
            fillColor: config.fillColor,
            fillOpacity: 0.35,
            weight: 2,
            opacity: 0.8,
          }),
          onEachFeature: (feature, layer) => {
            const name = feature.properties[config.nameField] || "Unknown";
            layer.bindPopup(
              getPopupContent(feature.properties, name, config.color),
              { className: "campus-popup", maxWidth: 350 }
            );
            layer.bindTooltip(name, {
              sticky: true,
              className: "campus-tooltip",
            });
          },
        }).addTo(map);

        layerGroupsRef.current[config.id] = geoLayer;
      } catch (err) {
        console.error(`Failed to load ${config.file}:`, err);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [getPopupContent]);

  // Layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.entries(layerGroupsRef.current).forEach(([id, layer]) => {
      if (visibleLayers.includes(id)) {
        if (!map.hasLayer(layer)) map.addLayer(layer);
      } else {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      }
    });
  }, [visibleLayers]);

  // Selected feature zoom
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedFeature) return;
    try {
      const geoLayer = L.geoJSON(selectedFeature.geometry);
      const bounds = geoLayer.getBounds();
      map.flyToBounds(bounds, { maxZoom: 19, padding: [50, 50], duration: 1 });

      const targetLayer = layerGroupsRef.current[selectedFeature.layerId];
      if (targetLayer) {
        targetLayer.eachLayer((layer: any) => {
          const config = LAYER_CONFIGS.find((c) => c.id === selectedFeature.layerId);
          if (
            config &&
            layer.feature?.properties[config.nameField] === selectedFeature.name
          ) {
            setTimeout(() => layer.openPopup(), 600);
          }
        });
      }
    } catch (err) {
      console.error("Error zooming to feature:", err);
    }
  }, [selectedFeature]);

  // Create origin marker with pulse effect
  const createOriginMarker = useCallback((latlng: L.LatLng) => {
    const icon = L.divIcon({
      className: 'pulse-marker',
      html: `<div style="position:relative;display:flex;align-items:center;gap:6px;">
        <div style="width:18px;height:18px;background:#2ecc71;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(46,204,113,0.6);"></div>
        <div style="background:#2563eb;color:white;padding:3px 10px;border-radius:14px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;">📍 You are here</div>
      </div>`,
      iconSize: [0, 0],
      iconAnchor: [9, 9],
    });
    const m = L.marker(latlng, { icon, interactive: false });
    return m;
  }, []);

  // Create destination marker with flag
  const createDestMarker = useCallback((latlng: L.LatLng, name: string) => {
    const icon = L.divIcon({
      className: 'dest-marker',
      html: `<div style="display:flex;align-items:center;gap:6px;">
        <div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🚩</div>
        <div style="background:#dc2626;color:white;padding:3px 10px;border-radius:14px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;">🏁 ${name}</div>
      </div>`,
      iconSize: [0, 0],
      iconAnchor: [12, 24],
    });
    return L.marker(latlng, { icon, interactive: false });
  }, []);

  // Clear route markers helper
  const clearRouteMarkers = useCallback(() => {
    routeMarkersRef.current.forEach(m => m.remove());
    routeMarkersRef.current = [];
  }, []);

  // Add route using Leaflet Routing Machine with custom router
  const handleRouteReady = useCallback(
    (origin: [number, number], destCoord: [number, number]) => {
      const map = mapRef.current;
      if (!map || !customRouterRef.current) return;

      // Remove existing route & markers
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
      clearRouteMarkers();

      const startLatLng = L.latLng(origin[1], origin[0]);
      const endLatLng = L.latLng(destCoord[1], destCoord[0]);

      // Add origin and destination markers
      const originMarker = createLabelMarker(startLatLng, "📍 You are here", "#2563eb");
      const destMarker = createLabelMarker(endLatLng, `🏁 ${destinationName || "Destination"}`, "#dc2626");
      originMarker.addTo(map);
      destMarker.addTo(map);
      routeMarkersRef.current = [originMarker, destMarker];

      const control = L.Routing.control({
        waypoints: [startLatLng, endLatLng],
        router: customRouterRef.current as any,
        lineOptions: {
          styles: [
            { color: "#2563eb", weight: 8, opacity: 0.3 },
            { color: "#2563eb", weight: 4, opacity: 0.9, dashArray: "12, 8", className: "animated-route-line" },
          ],
          extendToWaypoints: true,
          missingRouteTolerance: 50,
          addWaypoints: false,
        },
        show: false,
        addWaypoints: false,
        routeWhileDragging: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
      }).addTo(map);

      control.on("routesfound", (e: any) => {
        const routes = e.routes;
        if (routes.length > 0) {
          const summary = routes[0].summary;
          setRouteSummary({
            distance: summary.totalDistance,
            time: summary.totalTime,
          });
        }
      });

      control.on("routingerror", (e: any) => {
        console.error("Routing error:", e.error);
      });

      routingControlRef.current = control;
    },
    [destinationName, createLabelMarker, clearRouteMarkers]
  );

  const handleClearRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }
    clearRouteMarkers();
    setRouteSummary(null);
  }, [clearRouteMarkers]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {showNavigation && (
        <div className="absolute top-3 left-3 z-[800] w-72">
          <NavigationPanel
            allFeatures={allFeatures}
            onRouteReady={handleRouteReady}
            onClearRoute={handleClearRoute}
            onClose={onCloseNavigation}
            routeSummary={routeSummary}
            onDestinationNameChange={onDestinationNameChange}
          />
        </div>
      )}
    </div>
  );
};

export default CampusMap;
