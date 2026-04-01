// Dijkstra shortest path on road network GeoJSON

interface GraphEdge {
  to: string;
  weight: number;
}

type Graph = Record<string, GraphEdge[]>;

function coordKey(coord: [number, number]): string {
  return `${coord[0].toFixed(7)},${coord[1].toFixed(7)}`;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export interface RouteResult {
  path: [number, number][];
  distance: number;
  time: number;
  instructions: TurnInstruction[];
}

export interface TurnInstruction {
  text: string;
  distance: number;
  coord: [number, number];
}

/**
 * Build graph and find the largest connected component so routing always works.
 */
export function buildGraph(geojson: any): { graph: Graph; nodes: Map<string, [number, number]>; mainComponent: Set<string> } {
  const graph: Graph = {};
  const nodes = new Map<string, [number, number]>();

  for (const feature of geojson.features) {
    if (!feature.geometry || feature.geometry.type !== "LineString") continue;
    const coords: [number, number][] = feature.geometry.coordinates;

    for (let i = 0; i < coords.length - 1; i++) {
      const a = coords[i];
      const b = coords[i + 1];
      const keyA = coordKey(a);
      const keyB = coordKey(b);
      nodes.set(keyA, a);
      nodes.set(keyB, b);

      const dist = haversine(a[1], a[0], b[1], b[0]);
      if (!graph[keyA]) graph[keyA] = [];
      if (!graph[keyB]) graph[keyB] = [];
      graph[keyA].push({ to: keyB, weight: dist });
      graph[keyB].push({ to: keyA, weight: dist });
    }
  }

  // BFS to find largest connected component
  const visited = new Set<string>();
  let largestComp = new Set<string>();

  for (const node of Object.keys(graph)) {
    if (visited.has(node)) continue;
    const comp = new Set<string>();
    const queue = [node];
    while (queue.length > 0) {
      const n = queue.pop()!;
      if (visited.has(n)) continue;
      visited.add(n);
      comp.add(n);
      for (const edge of graph[n] || []) {
        if (!visited.has(edge.to)) queue.push(edge.to);
      }
    }
    if (comp.size > largestComp.size) largestComp = comp;
  }

  console.log(`Road graph: ${nodes.size} nodes, largest component: ${largestComp.size} nodes`);

  return { graph, nodes, mainComponent: largestComp };
}

/**
 * Find nearest node that belongs to the main connected component.
 */
export function findNearestNode(
  nodes: Map<string, [number, number]>,
  lat: number,
  lng: number,
  mainComponent?: Set<string>
): string {
  let bestKey = "";
  let bestDist = Infinity;
  for (const [key, coord] of nodes) {
    if (mainComponent && !mainComponent.has(key)) continue;
    const d = haversine(lat, lng, coord[1], coord[0]);
    if (d < bestDist) {
      bestDist = d;
      bestKey = key;
    }
  }
  return bestKey;
}

// Simple priority queue
class PQ {
  private items: { key: string; priority: number }[] = [];
  enqueue(key: string, priority: number) {
    this.items.push({ key, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }
  dequeue() {
    return this.items.shift();
  }
  get size() {
    return this.items.length;
  }
}

export function dijkstra(
  graph: Graph,
  nodes: Map<string, [number, number]>,
  startKey: string,
  endKey: string
): RouteResult | null {
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const pq = new PQ();

  dist[startKey] = 0;
  prev[startKey] = null;
  pq.enqueue(startKey, 0);

  while (pq.size > 0) {
    const current = pq.dequeue()!;
    if (current.key === endKey) break;
    if (current.priority > (dist[current.key] ?? Infinity)) continue;

    for (const edge of graph[current.key] || []) {
      const newDist = dist[current.key] + edge.weight;
      if (newDist < (dist[edge.to] ?? Infinity)) {
        dist[edge.to] = newDist;
        prev[edge.to] = current.key;
        pq.enqueue(edge.to, newDist);
      }
    }
  }

  if (dist[endKey] === undefined) return null;

  const path: [number, number][] = [];
  let current: string | null = endKey;
  while (current) {
    path.unshift(nodes.get(current)!);
    current = prev[current];
  }

  const totalDist = dist[endKey];
  const walkingSpeed = 5 / 3.6;
  const time = totalDist / walkingSpeed;
  const instructions = generateInstructions(path);

  return { path, distance: totalDist, time, instructions };
}

function getDirectionName(deg: number): string {
  if (deg >= 337.5 || deg < 22.5) return "north";
  if (deg >= 22.5 && deg < 67.5) return "northeast";
  if (deg >= 67.5 && deg < 112.5) return "east";
  if (deg >= 112.5 && deg < 157.5) return "southeast";
  if (deg >= 157.5 && deg < 202.5) return "south";
  if (deg >= 202.5 && deg < 247.5) return "southwest";
  if (deg >= 247.5 && deg < 292.5) return "west";
  return "northwest";
}

function generateInstructions(path: [number, number][]): TurnInstruction[] {
  if (path.length < 2) return [];

  const instructions: TurnInstruction[] = [];
  let segDist = 0;

  instructions.push({
    text: `Head ${getDirectionName(bearing(path[0][1], path[0][0], path[1][1], path[1][0]))}`,
    distance: 0,
    coord: path[0],
  });

  for (let i = 1; i < path.length - 1; i++) {
    const d = haversine(path[i - 1][1], path[i - 1][0], path[i][1], path[i][0]);
    segDist += d;

    const b1 = bearing(path[i - 1][1], path[i - 1][0], path[i][1], path[i][0]);
    const b2 = bearing(path[i][1], path[i][0], path[i + 1][1], path[i + 1][0]);
    let turn = ((b2 - b1 + 360) % 360);

    if (turn > 30 && turn < 330 && segDist > 5) {
      let turnText: string;
      if (turn >= 30 && turn < 60) turnText = "Turn slight right";
      else if (turn >= 60 && turn < 120) turnText = "Turn right";
      else if (turn >= 120 && turn < 170) turnText = "Turn sharp right";
      else if (turn >= 170 && turn < 190) turnText = "Make a U-turn";
      else if (turn >= 190 && turn < 240) turnText = "Turn sharp left";
      else if (turn >= 240 && turn < 300) turnText = "Turn left";
      else turnText = "Turn slight left";

      instructions.push({
        text: `${turnText} (in ${Math.round(segDist)}m)`,
        distance: segDist,
        coord: path[i],
      });
      segDist = 0;
    }
  }

  const lastDist = haversine(
    path[path.length - 2][1], path[path.length - 2][0],
    path[path.length - 1][1], path[path.length - 1][0]
  );
  instructions.push({
    text: "Arrive at destination",
    distance: segDist + lastDist,
    coord: path[path.length - 1],
  });

  return instructions;
}

export function speakInstruction(text: string) {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
  }
}
