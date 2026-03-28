import { useState, useEffect, useMemo } from "react";
import { Search, X, MapPin, ChevronDown, HelpCircle, Layers, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LAYER_CONFIGS, FacilityFeature } from "@/lib/layerConfig";

interface SidebarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  visibleLayers: string[];
  setVisibleLayers: (layers: string[]) => void;
  onSelectFeature: (f: FacilityFeature) => void;
  allFeatures: FacilityFeature[];
  showGuide: boolean;
  setShowGuide: (s: boolean) => void;
}

const Sidebar = ({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  visibleLayers,
  setVisibleLayers,
  onSelectFeature,
  allFeatures,
  showGuide,
  setShowGuide,
}: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const filteredFeatures = useMemo(() => {
    let features = allFeatures;

    if (categoryFilter && categoryFilter !== "all") {
      features = features.filter((f) => f.layerId === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      features = features.filter((f) =>
        f.name.toLowerCase().includes(q) ||
        f.layerName.toLowerCase().includes(q) ||
        Object.values(f.properties).some(
          (v) => v && String(v).toLowerCase().includes(q)
        )
      );
    }

    return features;
  }, [allFeatures, categoryFilter, searchQuery]);

  const clearAll = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setVisibleLayers(LAYER_CONFIGS.map((l) => l.id));
  };

  const hasActiveFilters = searchQuery || categoryFilter !== "all";

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 left-3 z-[1000] md:hidden bg-sidebar text-sidebar-foreground p-2 rounded-lg shadow-lg"
      >
        <Layers className="w-5 h-5" />
      </button>

      <div
        className={`
          fixed md:relative z-[999] h-full
          bg-sidebar text-sidebar-foreground
          w-[320px] min-w-[320px] flex flex-col
          transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          shadow-xl md:shadow-none
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg font-bold text-sidebar-primary-foreground tracking-tight">
              🗺️ Maseno Campus Explorer
            </h1>
            <button
              onClick={() => setShowGuide(true)}
              className="text-sidebar-accent-foreground hover:text-sidebar-primary transition-colors"
              title="User Guide"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-sidebar-accent-foreground">
            Interactive Campus Spatial Database
          </p>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-sidebar-border space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-accent-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search facilities by name..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-sidebar-accent text-sidebar-foreground text-sm placeholder:text-sidebar-accent-foreground/60 border border-sidebar-border focus:outline-none focus:ring-2 focus:ring-sidebar-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sidebar-accent-foreground hover:text-sidebar-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category dropdown */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-accent-foreground" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-sidebar-accent text-sidebar-foreground text-sm border border-sidebar-border focus:outline-none focus:ring-2 focus:ring-sidebar-primary appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {LAYER_CONFIGS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-accent-foreground pointer-events-none" />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="w-full py-1.5 text-xs rounded-md bg-sidebar-accent hover:bg-sidebar-border text-sidebar-accent-foreground transition-colors flex items-center justify-center gap-1"
            >
              <X className="w-3 h-3" /> Clear All Filters
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="p-3 border-b border-sidebar-border">
          <p className="text-xs font-semibold text-sidebar-accent-foreground mb-2 uppercase tracking-wider">
            Legend
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {LAYER_CONFIGS.map((l) => (
              <label
                key={l.id}
                className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-sidebar-accent rounded px-1.5 py-1 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={visibleLayers.includes(l.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setVisibleLayers([...visibleLayers, l.id]);
                    } else {
                      setVisibleLayers(visibleLayers.filter((v) => v !== l.id));
                    }
                  }}
                  className="sr-only"
                />
                <span
                  className="w-3 h-3 rounded-sm border flex-shrink-0"
                  style={{
                    backgroundColor: visibleLayers.includes(l.id) ? l.color : "transparent",
                    borderColor: l.color,
                  }}
                />
                <span className={visibleLayers.includes(l.id) ? "text-sidebar-foreground" : "text-sidebar-accent-foreground line-through"}>
                  {l.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-3 py-2 flex items-center justify-between">
            <p className="text-xs text-sidebar-accent-foreground">
              {filteredFeatures.length} facilit{filteredFeatures.length === 1 ? "y" : "ies"} found
            </p>
          </div>

          <ScrollArea className="flex-1 px-3 pb-3">
            <div className="space-y-1.5">
              {filteredFeatures.map((feature, idx) => (
                <button
                  key={`${feature.layerId}-${idx}`}
                  onClick={() => onSelectFeature(feature)}
                  className="w-full text-left p-2.5 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent border border-transparent hover:border-sidebar-border transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <MapPin
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      style={{ color: feature.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate group-hover:text-sidebar-primary-foreground">
                        {feature.name}
                      </p>
                      <p className="text-[11px] text-sidebar-accent-foreground mt-0.5">
                        {feature.layerName}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {filteredFeatures.length === 0 && (
                <div className="text-center py-8 text-sidebar-accent-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No facilities match your search</p>
                  <button onClick={clearAll} className="text-xs text-sidebar-primary mt-1 hover:underline">
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
