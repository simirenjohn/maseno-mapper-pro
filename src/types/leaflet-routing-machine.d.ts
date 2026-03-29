import * as L from "leaflet";

declare module "leaflet" {
  namespace Routing {
    interface Waypoint {
      latLng: L.LatLng;
      name?: string;
      options?: any;
    }

    interface IError {
      status: number;
      message: string;
    }

    interface IInstruction {
      type: string;
      text: string;
      distance: number;
      time: number;
      road?: string;
      index?: number;
      direction?: string;
    }

    interface IRouteSummary {
      totalDistance: number;
      totalTime: number;
    }

    interface IRoute {
      name: string;
      coordinates: L.LatLng[];
      summary: IRouteSummary;
      instructions: IInstruction[];
      inputWaypoints: Waypoint[];
      waypoints: Waypoint[];
    }

    interface RoutingControlOptions {
      waypoints?: L.LatLng[];
      router?: any;
      plan?: any;
      lineOptions?: {
        styles?: L.PathOptions[];
        extendToWaypoints?: boolean;
        missingRouteTolerance?: number;
        addWaypoints?: boolean;
      };
      show?: boolean;
      addWaypoints?: boolean;
      routeWhileDragging?: boolean;
      fitSelectedRoutes?: boolean | string;
      showAlternatives?: boolean;
      collapsible?: boolean;
      containerClassName?: string;
    }

    interface RoutingControl extends L.Control {
      setWaypoints(waypoints: L.LatLng[]): this;
      getWaypoints(): Waypoint[];
      spliceWaypoints(index: number, waypointsToRemove: number, ...waypoints: L.LatLng[]): Waypoint[];
      getPlan(): any;
      getRouter(): any;
      on(event: string, fn: (...args: any[]) => void): this;
    }

    function control(options?: RoutingControlOptions): RoutingControl;
  }
}
