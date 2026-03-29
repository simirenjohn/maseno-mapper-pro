import L from "leaflet";
import "leaflet-routing-machine";
import { buildGraph, findNearestNode, dijkstra } from "./routing";

/**
 * Custom Leaflet Routing Machine router that uses Dijkstra on a local
 * road network GeoJSON instead of calling an external service like OSRM.
 */
export class GeoJSONRouter {
  private graphPromise: Promise<{
    graph: Record<string, { to: string; weight: number }[]>;
    nodes: Map<string, [number, number]>;
  }>;

  constructor(geojsonUrl: string) {
    this.graphPromise = fetch(geojsonUrl)
      .then((r) => r.json())
      .then((data) => buildGraph(data));
  }

  route(
    waypoints: L.Routing.Waypoint[],
    callback: (err?: L.Routing.IError | Error, routes?: L.Routing.IRoute[]) => void
  ) {
    this.graphPromise
      .then(({ graph, nodes }) => {
        if (waypoints.length < 2) {
          callback(new Error("Need at least 2 waypoints"));
          return;
        }

        const start = waypoints[0].latLng;
        const end = waypoints[waypoints.length - 1].latLng;

        const startKey = findNearestNode(nodes, start.lat, start.lng);
        const endKey = findNearestNode(nodes, end.lat, end.lng);

        const result = dijkstra(graph, nodes, startKey, endKey);

        if (!result) {
          callback(new Error("No route found between these points"));
          return;
        }

        // Convert [lng, lat] path to L.LatLng[]
        const coordinates = result.path.map((c) => L.latLng(c[1], c[0]));

        // Build instructions for Leaflet Routing Machine
        const instructions: L.Routing.IInstruction[] = result.instructions.map(
          (inst, i) => ({
            type: i === 0 ? "Head" : i === result.instructions.length - 1 ? "DestinationReached" : "Turn",
            text: inst.text,
            distance: inst.distance,
            time: inst.distance / (5 / 3.6), // walking speed
            road: "",
            index: 0,
            direction: "",
          })
        );

        const route: L.Routing.IRoute = {
          name: "Walking Route",
          coordinates,
          summary: {
            totalDistance: result.distance,
            totalTime: result.time,
          },
          instructions,
          inputWaypoints: waypoints,
          waypoints: waypoints,
        };

        callback(undefined, [route]);
      })
      .catch((err) => {
        callback(err instanceof Error ? err : new Error(String(err)));
      });
  }
}
