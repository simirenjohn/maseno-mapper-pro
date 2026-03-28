import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LAYER_CONFIGS, FacilityFeature } from "@/lib/layerConfig";

const BASEMAPS = {
  "OpenStreetMap": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "Satellite": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  "Topographic": "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
};

interface CampusMapProps {
  selectedFeature: FacilityFeature | null;
  visibleLayers: string[];
  searchQuery: string;
  categoryFilter: string;
}

const CampusMap = ({ selectedFeature, visibleLayers, searchQuery, categoryFilter }: CampusMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layerGroupsRef = useRef<Record<string, L.GeoJSON>>({});
  const baseTileRef = useRef<L.TileLayer | null>(null);
  const allDataRef = useRef<Record<string, any>>({});

  const getPopupContent = useCallback((properties: Record<string, any>, layerName: string, color: string) => {
    const skipKeys = ["fid", "id", "building_id"];
    const entries = Object.entries(properties).filter(
      ([key, val]) => !skipKeys.includes(key.toLowerCase()) && val !== null && val !== undefined && val !== ""
    );

    return `
      <div class="campus-popup-inner">
        <div class="popup-title" style="color: ${color}">${layerName}</div>
        ${entries.map(([key, val]) => `
          <div class="popup-row">
            <span class="popup-label">${key.replace(/_/g, " ")}</span>
            <span class="popup-value">${val}</span>
          </div>
        `).join("")}
      </div>
    `;
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-0.003, 34.605],
      zoom: 16,
      zoomControl: true,
    });

    baseTileRef.current = L.tileLayer(BASEMAPS["OpenStreetMap"], {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Basemap control
    const baseLayers: Record<string, L.TileLayer> = {};
    Object.entries(BASEMAPS).forEach(([name, url]) => {
      baseLayers[name] = L.tileLayer(url, { maxZoom: 19, attribution: '© OpenStreetMap / Esri / OpenTopoMap' });
    });
    baseLayers["OpenStreetMap"] = baseTileRef.current;
    L.control.layers(baseLayers, undefined, { position: "topright" }).addTo(map);

    mapRef.current = map;

    // Load all GeoJSON data
    LAYER_CONFIGS.forEach(async (config) => {
      try {
        const resp = await fetch(config.file);
        const data = await resp.json();
        allDataRef.current[config.id] = data;

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
              { className: "campus-popup", maxWidth: 280 }
            );
            layer.bindTooltip(name, { sticky: true, className: "campus-tooltip" });
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

  // Handle layer visibility
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

  // Handle selected feature zoom
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedFeature) return;

    try {
      const geoLayer = L.geoJSON(selectedFeature.geometry);
      const bounds = geoLayer.getBounds();
      map.flyToBounds(bounds, { maxZoom: 19, padding: [50, 50], duration: 1 });

      // Open popup on the matching feature
      const targetLayer = layerGroupsRef.current[selectedFeature.layerId];
      if (targetLayer) {
        targetLayer.eachLayer((layer: any) => {
          const config = LAYER_CONFIGS.find(c => c.id === selectedFeature.layerId);
          if (config && layer.feature?.properties[config.nameField] === selectedFeature.name) {
            setTimeout(() => layer.openPopup(), 600);
          }
        });
      }
    } catch (err) {
      console.error("Error zooming to feature:", err);
    }
  }, [selectedFeature]);

  return (
    <div ref={mapContainerRef} className="w-full h-full" />
  );
};

export default CampusMap;
