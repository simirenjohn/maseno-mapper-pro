import { useState, useEffect } from "react";
import CampusMap from "@/components/CampusMap";
import Sidebar from "@/components/Sidebar";
import UserGuide from "@/components/UserGuide";
import { LAYER_CONFIGS, FacilityFeature } from "@/lib/layerConfig";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibleLayers, setVisibleLayers] = useState(LAYER_CONFIGS.map((l) => l.id));
  const [selectedFeature, setSelectedFeature] = useState<FacilityFeature | null>(null);
  const [allFeatures, setAllFeatures] = useState<FacilityFeature[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [destinationName, setDestinationName] = useState("");

  useEffect(() => {
    const loadAll = async () => {
      const features: FacilityFeature[] = [];
      for (const config of LAYER_CONFIGS) {
        try {
          const resp = await fetch(config.file);
          const data = await resp.json();
          data.features.forEach((f: any) => {
            const name = f.properties[config.nameField] || "Unknown";
            features.push({
              layerId: config.id,
              layerName: config.name,
              name,
              properties: f.properties,
              geometry: f.geometry,
              color: config.color,
            });
          });
        } catch (err) {
          console.error(`Failed to load ${config.file}:`, err);
        }
      }
      setAllFeatures(features);
    };
    loadAll();

    const visited = localStorage.getItem("maseno-explorer-visited");
    if (!visited) {
      setShowGuide(true);
      localStorage.setItem("maseno-explorer-visited", "true");
    }
  }, []);

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <Sidebar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        visibleLayers={visibleLayers}
        setVisibleLayers={setVisibleLayers}
        onSelectFeature={setSelectedFeature}
        allFeatures={allFeatures}
        showGuide={showGuide}
        setShowGuide={setShowGuide}
        onOpenNavigation={() => setShowNavigation(true)}
      />
      <div className="flex-1 relative">
        <CampusMap
          selectedFeature={selectedFeature}
          visibleLayers={visibleLayers}
          searchQuery={searchQuery}
          categoryFilter={categoryFilter}
          allFeatures={allFeatures}
          showNavigation={showNavigation}
          onCloseNavigation={() => setShowNavigation(false)}
          destinationName={destinationName}
          onDestinationNameChange={setDestinationName}
        />
      </div>
      <UserGuide open={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
};

export default Index;
