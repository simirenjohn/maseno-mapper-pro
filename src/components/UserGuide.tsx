import { X, Search, MapPin, Layers, Filter, Mouse } from "lucide-react";

interface UserGuideProps {
  open: boolean;
  onClose: () => void;
}

const UserGuide = ({ open, onClose }: UserGuideProps) => {
  if (!open) return null;

  const steps = [
    {
      icon: <Search className="w-5 h-5" />,
      title: "Search Facilities",
      desc: "Type any facility name in the search bar to quickly find buildings, labs, halls, and offices across campus.",
    },
    {
      icon: <Filter className="w-5 h-5" />,
      title: "Filter by Category",
      desc: "Use the dropdown to narrow results by category — Lecture Halls, Administration, Labs, Religious Centres, or Workers' Quarters.",
    },
    {
      icon: <Layers className="w-5 h-5" />,
      title: "Toggle Layers",
      desc: "Click the legend checkboxes to show or hide specific facility types on the map.",
    },
    {
      icon: <Mouse className="w-5 h-5" />,
      title: "Select & Explore",
      desc: "Click a facility from the list to zoom in on the map and view its details in a popup. You can also click directly on map features.",
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      title: "Switch Basemaps",
      desc: "Use the layer control (top-right of map) to switch between OpenStreetMap, Satellite, and Topographic views.",
    },
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card text-card-foreground rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-auto">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary">User Guide</h2>
            <p className="text-xs text-muted-foreground">How to use Maseno Campus Explorer</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                {step.icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Got it, let's explore!
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
