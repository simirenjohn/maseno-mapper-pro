export interface FilterField {
  key: string;
  label: string;
  type: "select";
}

export interface LayerConfig {
  id: string;
  name: string;
  file: string;
  color: string;
  fillColor: string;
  nameField: string;
  visible: boolean;
  filters?: FilterField[];
  roomDataFile?: string; // for buildings with room tables
  roomBuildingId?: number; // building_id to match rooms
  roomNameField?: string;
}

// Hostels first as requested
export const LAYER_CONFIGS: LayerConfig[] = [
  {
    id: "hostels",
    name: "Hostels",
    file: "/data/hostels.geojson",
    color: "#e0943a",
    fillColor: "#e0943a",
    nameField: "Name",
    visible: true,
    filters: [
      { key: "Gender", label: "Gender", type: "select" },
      { key: "Price", label: "Price", type: "select" },
      { key: "Capacity Per Room", label: "Capacity/Room", type: "select" },
    ],
  },
  {
    id: "lecture_halls",
    name: "Lecture Halls",
    file: "/data/lecture_halls.geojson",
    color: "#2d8a56",
    fillColor: "#2d8a56",
    nameField: "Name",
    visible: true,
    filters: [
      { key: "LECTURE CAPACITY", label: "Lecture Capacity", type: "select" },
      { key: "EXAMINATION CAPACITY", label: "Exam Capacity", type: "select" },
      { key: "CURRENT NUMBER OF SEATS", label: "Current Seats", type: "select" },
    ],
  },
  {
    id: "administration",
    name: "Administration",
    file: "/data/administration.geojson",
    color: "#3b6de0",
    fillColor: "#3b6de0",
    nameField: "name",
    visible: true,
    filters: [
      { key: "type", label: "Type", type: "select" },
    ],
  },
  {
    id: "labs",
    name: "Laboratories",
    file: "/data/labs.geojson",
    color: "#8b3dc9",
    fillColor: "#8b3dc9",
    nameField: "NAME",
    visible: true,
    filters: [
      { key: "CAPACITY", label: "Capacity", type: "select" },
    ],
  },
  {
    id: "religious_centres",
    name: "Religious Centres",
    file: "/data/religious_centres.geojson",
    color: "#d9911a",
    fillColor: "#d9911a",
    nameField: "Name",
    visible: true,
  },
  {
    id: "workers_quarter",
    name: "Workers' Quarters",
    file: "/data/workers_quarter.geojson",
    color: "#d95032",
    fillColor: "#d95032",
    nameField: "name",
    visible: true,
  },
];

// Room data mapping: building_id -> room data file
export const ROOM_DATA_MAP: Record<number, { file: string; nameField: string; buildingName: string }> = {
  0: { file: "/data/new_library_rooms.json", nameField: "lecture_room_name", buildingName: "NEW LIBRARY" },
  11: { file: "/data/pgm_rooms.json", nameField: "LECTURE ROOM NAME", buildingName: "PROFESSOR GEORGE MAGOHA" },
};

export interface FacilityFeature {
  layerId: string;
  layerName: string;
  name: string;
  properties: Record<string, any>;
  geometry: any;
  color: string;
}
