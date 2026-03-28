import { useState, useMemo } from "react";
import { Search, X, MapPin, ChevronRight, ChevronDown, HelpCircle, Layers, Navigation } from "lucide-react";
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
  onOpenNavigation: () => void;
}

const Sidebar = ({
  searchQuery,
  setSearchQuery,
  visibleLayers,
  setVisibleLayers,
  onSelectFeature,
  allFeatures,
  setShowGuide,
  onOpenNavigation,
}: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  // Generic filters: { [layerId]: { [filterKey]: selectedValue } }
  const [layerFilters, setLayerFilters] = useState<Record<string, Record<string, string>>>({});

  // Build filter options dynamically from data
  const filterOptions = useMemo(() => {
    const opts: Record<string, Record<string, (string | number)[]>> = {};
    for (const config of LAYER_CONFIGS) {
      if (!config.filters) continue;
      opts[config.id] = {};
      const features = allFeatures.filter((f) => f.layerId === config.id);
      for (const filter of config.filters) {
        const values = [
          ...new Set(
            features
              .map((f) => f.properties[filter.key])
              .filter((v) => v !== null && v !== undefined && v !== "")
          ),
        ].sort((a, b) => {
          const na = Number(a), nb = Number(b);
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return String(a).localeCompare(String(b));
        });
        opts[config.id][filter.key] = values;
      }
    }
    return opts;
  }, [allFeatures]);

  // Group and filter features
  const categorizedFeatures = useMemo(() => {
    const groups: Record<string, FacilityFeature[]> = {};
    let features = allFeatures;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      features = features.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.layerName.toLowerCase().includes(q) ||
          Object.values(f.properties).some((v) => v && String(v).toLowerCase().includes(q))
      );
    }

    features.forEach((f) => {
      if (!groups[f.layerId]) groups[f.layerId] = [];
      groups[f.layerId].push(f);
    });

    return groups;
  }, [allFeatures, searchQuery]);

  const getFilteredFeatures = (layerId: string) => {
    let features = categorizedFeatures[layerId] || [];
    const filters = layerFilters[layerId];
    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        if (val && val !== "all") {
          features = features.filter((f) => String(f.properties[key]) === val);
        }
      }
    }
    return features;
  };

  const setFilter = (layerId: string, key: string, value: string) => {
    setLayerFilters((prev) => ({
      ...prev,
      [layerId]: { ...prev[layerId], [key]: value },
    }));
  };

  const clearFilters = (layerId: string) => {
    setLayerFilters((prev) => {
      const next = { ...prev };
      delete next[layerId];
      return next;
    });
  };

  const hasActiveFilters = (layerId: string) => {
    const filters = layerFilters[layerId];
    if (!filters) return false;
    return Object.values(filters).some((v) => v && v !== "all");
  };

  const toggleCategory = (id: string) => {
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  const clearAll = () => {
    setSearchQuery("");
    setLayerFilters({});
    setVisibleLayers(LAYER_CONFIGS.map((l) => l.id));
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 left-3 z-[1000] md:hidden p-2 rounded-lg shadow-lg bg-[hsl(152,40%,28%)] text-white"
      >
        <Layers className="w-5 h-5" />
      </button>

      <div
        className={`
          fixed md:relative z-[999] h-full
          bg-white text-gray-800
          w-[300px] min-w-[300px] flex flex-col
          transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          shadow-xl md:shadow-none border-r border-gray-200
        `}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[hsl(152,40%,28%)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">
                Maseno University
              </h1>
              <p className="text-xs text-green-200/80">Campus Facilities Explorer</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenNavigation}
                className="text-green-200/80 hover:text-white transition-colors"
                title="Navigation"
              >
                <Navigation className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowGuide(true)}
                className="text-green-200/80 hover:text-white transition-colors"
                title="User Guide"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search facilities..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-gray-50 text-gray-800 text-sm placeholder:text-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {(searchQuery || Object.keys(layerFilters).length > 0) && (
            <button
              onClick={clearAll}
              className="mt-2 text-xs text-red-500 hover:underline flex items-center gap-0.5"
            >
              <X className="w-3 h-3" /> Clear All
            </button>
          )}
        </div>

        {/* Categories label */}
        <div className="px-3 pt-3 pb-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categories</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-3 pb-3">
            {LAYER_CONFIGS.map((layer) => {
              const isExpanded = expandedCategory === layer.id;
              const features = getFilteredFeatures(layer.id);
              const count = features.length;
              const hasFilters = hasActiveFilters(layer.id);

              return (
                <div key={layer.id} className="border-b border-gray-100 last:border-0">
                  <button
                    onClick={() => toggleCategory(layer.id)}
                    className="w-full flex items-center justify-between py-2.5 hover:bg-gray-50 rounded px-1 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        {layer.name}
                      </span>
                    </div>
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${hasFilters ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {count}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="pb-2">
                      {/* Dynamic filters */}
                      {layer.filters && layer.filters.length > 0 && (
                        <div className="px-2 pb-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-500 uppercase">Filters</p>
                            {hasFilters && (
                              <button
                                onClick={() => clearFilters(layer.id)}
                                className="text-xs text-red-500 hover:underline flex items-center gap-0.5"
                              >
                                <X className="w-3 h-3" /> Clear
                              </button>
                            )}
                          </div>
                          {layer.filters.map((filter) => (
                            <div key={filter.key}>
                              <label className="text-xs text-gray-500">{filter.label}</label>
                              <select
                                value={layerFilters[layer.id]?.[filter.key] || "all"}
                                onChange={(e) => setFilter(layer.id, filter.key, e.target.value)}
                                className="w-full mt-0.5 px-2 py-1.5 rounded bg-gray-50 text-gray-800 text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-green-500/40"
                              >
                                <option value="all">All {filter.label}</option>
                                {(filterOptions[layer.id]?.[filter.key] || []).map((v) => (
                                  <option key={String(v)} value={String(v)}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Feature list */}
                      <div className="space-y-0.5 px-1">
                        {features.map((feature, idx) => (
                          <button
                            key={`${feature.layerId}-${idx}`}
                            onClick={() => onSelectFeature(feature)}
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 transition-colors flex items-center gap-2 group"
                          >
                            <MapPin
                              className="w-3.5 h-3.5 flex-shrink-0"
                              style={{ color: feature.color }}
                            />
                            <span className="text-sm text-gray-700 truncate group-hover:text-green-700">
                              {feature.name}
                            </span>
                          </button>
                        ))}
                        {features.length === 0 && (
                          <p className="text-xs text-gray-400 py-2 text-center">
                            No facilities match
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default Sidebar;
