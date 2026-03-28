export interface LayerConfig {
  id: string;
  name: string;
  file: string;
  color: string;
  fillColor: string;
  nameField: string;
  visible: boolean;
}

export const LAYER_CONFIGS: LayerConfig[] = [
  {
    id: "lecture_halls",
    name: "Lecture Halls",
    file: "/data/lecture_halls.geojson",
    color: "#2d8a56",
    fillColor: "#2d8a56",
    nameField: "Name",
    visible: true,
  },
  {
    id: "administration",
    name: "Administration",
    file: "/data/administration.geojson",
    color: "#3b6de0",
    fillColor: "#3b6de0",
    nameField: "name",
    visible: true,
  },
  {
    id: "labs",
    name: "Laboratories",
    file: "/data/labs.geojson",
    color: "#8b3dc9",
    fillColor: "#8b3dc9",
    nameField: "NAME",
    visible: true,
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
  {
    id: "hostels",
    name: "Hostels",
    file: "/data/hostels.geojson",
    color: "#e0943a",
    fillColor: "#e0943a",
    nameField: "Name",
    visible: true,
  },
];

export interface FacilityFeature {
  layerId: string;
  layerName: string;
  name: string;
  properties: Record<string, any>;
  geometry: any;
  color: string;
}
