import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LAYER_CONFIGS, ROOM_DATA_MAP, FacilityFeature } from "@/lib/layerConfig";
import { RouteResult } from "@/lib/routing";
import NavigationPanel from "./NavigationPanel";

const BASEMAPS = {
  OpenStreetMap: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  Satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  Topographic: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
};

interface CampusMapProps {
  selectedFeature: FacilityFeature | null;
  visibleLayers: string[];
  searchQuery: string;
  categoryFilter: string;
  allFeatures: FacilityFeature[];
  showNavigation: boolean;
  onCloseNavigation: () => void;
}

const CampusMap = ({
  selectedFeature,
  visibleLayers,
  allFeatures,
  showNavigation,
  onCloseNavigation,
}: CampusMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layerGroupsRef = useRef<Record<string, L.GeoJSON>>({});
  const baseTileRef = useRef<L.TileLayer | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const roomDataCache = useRef<Record<number, any[]>>({});

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

      // Check if this building has rooms
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
            const name =
              feature.properties[config.nameField] || "Unknown";
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
          const config = LAYER_CONFIGS.find(
            (c) => c.id === selectedFeature.layerId
          );
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

  // Display route on map
  const handleRouteCalculated = useCallback((route: RouteResult | null) => {
    const map = mapRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (route) {
      const latLngs = route.path.map((c) => L.latLng(c[1], c[0]));
      routeLayerRef.current = L.polyline(latLngs, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.8,
        dashArray: "10, 10",
      }).addTo(map);
      map.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Navigation panel overlay */}
      {showNavigation && (
        <div className="absolute top-3 left-3 z-[800] w-72">
          <NavigationPanel
            allFeatures={allFeatures}
            onRouteCalculated={handleRouteCalculated}
            onClose={onCloseNavigation}
          />
        </div>
      )}
    </div>
  );
};

export default CampusMap;
