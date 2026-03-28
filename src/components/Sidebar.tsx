import { useState, useMemo } from "react";
import { Search, X, MapPin, ChevronRight, ChevronDown, HelpCircle, Layers } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LAYER_CONFIGS, FacilityFeature } from "@/lib/layerConfig";

interface HostelFilters {
  gender: string;
  price: string;
  capacity: string;
}

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
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [hostelFilters, setHostelFilters] = useState<HostelFilters>({
    gender: "all",
    price: "all",
    capacity: "all",
  });

  // Get unique hostel filter values
  const hostelOptions = useMemo(() => {
    const hostels = allFeatures.filter((f) => f.layerId === "hostels");
    const genders = [...new Set(hostels.map((f) => f.properties["Gender"]).filter(Boolean))].sort();
    const prices = [...new Set(hostels.map((f) => f.properties["Price"]).filter(Boolean))].sort((a, b) => a - b);
    const capacities = [...new Set(hostels.map((f) => f.properties["Capacity Per Room"]).filter(Boolean))].sort((a, b) => a - b);
    return { genders, prices, capacities };
  }, [allFeatures]);

  // Group features by category
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

  // Filtered hostels based on multi-criteria
  const filteredHostels = useMemo(() => {
    let hostels = categorizedFeatures["hostels"] || [];
    if (hostelFilters.gender !== "all") {
      hostels = hostels.filter((f) => f.properties["Gender"] === hostelFilters.gender);
    }
    if (hostelFilters.price !== "all") {
      hostels = hostels.filter((f) => String(f.properties["Price"]) === hostelFilters.price);
    }
    if (hostelFilters.capacity !== "all") {
      hostels = hostels.filter((f) => String(f.properties["Capacity Per Room"]) === hostelFilters.capacity);
    }
    return hostels;
  }, [categorizedFeatures, hostelFilters]);

  const clearHostelFilters = () => {
    setHostelFilters({ gender: "all", price: "all", capacity: "all" });
  };

  const hasHostelFilters =
    hostelFilters.gender !== "all" || hostelFilters.price !== "all" || hostelFilters.capacity !== "all";

  const toggleCategory = (id: string) => {
    setExpandedCategory(expandedCategory === id ? null : id);
  };

  const getFeaturesForCategory = (layerId: string) => {
    if (layerId === "hostels") return filteredHostels;
    return categorizedFeatures[layerId] || [];
  };

  const getCategoryCount = (layerId: string) => {
    if (layerId === "hostels") return filteredHostels.length;
    return (categorizedFeatures[layerId] || []).length;
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 left-3 z-[1000] md:hidden p-2 rounded-lg shadow-lg"
        style={{ backgroundColor: "hsl(152, 40%, 28%)", color: "#fff" }}
      >
        <Layers className="w-5 h-5" />
      </button>

      <div
        className={`
          fixed md:relative z-[999] h-full
          bg-sidebar text-sidebar-foreground
          w-[300px] min-w-[300px] flex flex-col
          transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          shadow-xl md:shadow-none border-r border-sidebar-border
        `}
      >
        {/* Dark green header */}
        <div className="px-4 py-3" style={{ backgroundColor: "hsl(152, 40%, 28%)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">
                Maseno University
              </h1>
              <p className="text-xs text-green-200/80">
                Facilities Management
              </p>
            </div>
            <button
              onClick={() => setShowGuide(true)}
              className="text-green-200/80 hover:text-white transition-colors"
              title="User Guide"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-sidebar-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-accent-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search facilities..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-sidebar-accent text-sidebar-foreground text-sm placeholder:text-sidebar-accent-foreground/60 border border-sidebar-border focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
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
        </div>

        {/* Categories */}
        <div className="px-3 pt-3 pb-1">
          <p className="text-xs font-semibold text-sidebar-accent-foreground uppercase tracking-wider">
            Categories
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-3 pb-3">
            {LAYER_CONFIGS.map((layer) => {
              const isExpanded = expandedCategory === layer.id;
              const count = getCategoryCount(layer.id);
              const features = getFeaturesForCategory(layer.id);
              const isHostel = layer.id === "hostels";

              return (
                <div key={layer.id} className="border-b border-sidebar-border last:border-0">
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(layer.id)}
                    className="w-full flex items-center justify-between py-2.5 hover:bg-sidebar-accent rounded px-1 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-sidebar-accent-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-sidebar-accent-foreground" />
                      )}
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-sm font-semibold text-sidebar-foreground uppercase tracking-wide">
                        {layer.name}
                      </span>
                    </div>
                    <span className="text-xs font-medium bg-sidebar-accent text-sidebar-accent-foreground rounded-full px-2 py-0.5">
                      {count}
                    </span>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="pb-2">
                      {/* Hostel multi-criteria filters */}
                      {isHostel && (
                        <div className="px-2 pb-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-sidebar-accent-foreground uppercase">
                              Filters
                            </p>
                            {hasHostelFilters && (
                              <button
                                onClick={clearHostelFilters}
                                className="text-xs text-red-500 hover:underline flex items-center gap-0.5"
                              >
                                <X className="w-3 h-3" /> Clear
                              </button>
                            )}
                          </div>

                          {/* Gender */}
                          <div>
                            <label className="text-xs text-sidebar-accent-foreground">Gender</label>
                            <select
                              value={hostelFilters.gender}
                              onChange={(e) =>
                                setHostelFilters({ ...hostelFilters, gender: e.target.value })
                              }
                              className="w-full mt-0.5 px-2 py-1.5 rounded bg-sidebar-accent text-sidebar-foreground text-sm border border-sidebar-border focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
                            >
                              <option value="all">All Gender</option>
                              {hostelOptions.genders.map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </div>

                          {/* Price */}
                          <div>
                            <label className="text-xs text-sidebar-accent-foreground">Price</label>
                            <select
                              value={hostelFilters.price}
                              onChange={(e) =>
                                setHostelFilters({ ...hostelFilters, price: e.target.value })
                              }
                              className="w-full mt-0.5 px-2 py-1.5 rounded bg-sidebar-accent text-sidebar-foreground text-sm border border-sidebar-border focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
                            >
                              <option value="all">All Price</option>
                              {hostelOptions.prices.map((p) => (
                                <option key={p} value={String(p)}>{p}</option>
                              ))}
                            </select>
                          </div>

                          {/* Capacity */}
                          <div>
                            <label className="text-xs text-sidebar-accent-foreground">Capacity</label>
                            <select
                              value={hostelFilters.capacity}
                              onChange={(e) =>
                                setHostelFilters({ ...hostelFilters, capacity: e.target.value })
                              }
                              className="w-full mt-0.5 px-2 py-1.5 rounded bg-sidebar-accent text-sidebar-foreground text-sm border border-sidebar-border focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
                            >
                              <option value="all">All Capacity</option>
                              {hostelOptions.capacities.map((c) => (
                                <option key={c} value={String(c)}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Feature list */}
                      <div className="space-y-0.5 px-1">
                        {features.map((feature, idx) => (
                          <button
                            key={`${feature.layerId}-${idx}`}
                            onClick={() => onSelectFeature(feature)}
                            className="w-full text-left px-2 py-1.5 rounded hover:bg-sidebar-accent transition-colors flex items-center gap-2 group"
                          >
                            <MapPin
                              className="w-3.5 h-3.5 flex-shrink-0"
                              style={{ color: feature.color }}
                            />
                            <span className="text-sm text-sidebar-foreground truncate group-hover:text-sidebar-primary">
                              {feature.name}
                            </span>
                          </button>
                        ))}
                        {features.length === 0 && (
                          <p className="text-xs text-sidebar-accent-foreground py-2 text-center">
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
