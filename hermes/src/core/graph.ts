import type { HermesGraph, GuidewayEdge, Station } from './types';

export function findPath(graph: HermesGraph, startId: string, goalId: string): GuidewayEdge[] {
    console.log('🧠 Entered findPath:', startId, '→', goalId);
    console.log('Stations in graph:', [...graph.stations.keys()]);
  
    const visited = new Set<string>();
    const dist = new Map<string, number>();
    const prev = new Map<string, { edge: GuidewayEdge; from: string }>();
    const queue: [string, number][] = [[startId, 0]];
  
    console.log('Queue init:', JSON.stringify(queue));
  
    for (const stationId of graph.stations.keys()) {
      dist.set(stationId, Infinity);
    }
    dist.set(startId, 0);
  
    try {
      while (queue.length > 0) {
        queue.sort((a, b) => a[1] - b[1]);
        const [current] = queue.shift()!;
        console.log('→ CURRENT:', current);
  
        if (current === goalId) break;
        if (visited.has(current)) {
          console.warn('❌ Already visited', current);
          continue;
        }
        visited.add(current);
  
        const neighbors = graph.neighbors.get(current);
        console.log('→ NEIGHBORS:', neighbors);
        if (!neighbors) continue;
  
        for (const edge of neighbors) {
          const next = edge.to;
          const cost = typeof edge.cost === 'number' && !isNaN(edge.cost) ? edge.cost : 1;
          const currentDistance = dist.get(current) ?? Infinity;
          const alt = currentDistance + cost;
  
          console.log(`  ➤ dist[${next}] = ${dist.get(next)} | edge.cost = ${edge.cost} | alt = ${alt}`);
  
          if (alt < (dist.get(next) ?? Infinity)) {
            dist.set(next, alt);
            prev.set(next, { edge, from: current });
            queue.push([next, alt]);
          }
        }
      }
    } catch (err) {
      console.error('🔥 Dijkstra crashed:', err);
      return [];
    }
  
    const path: GuidewayEdge[] = [];
    let u = goalId;
  
    if (!prev.has(u)) {
      console.warn('No path found from', startId, 'to', goalId);
      console.log('Visited:', Array.from(visited));
      console.log('Prev map:', Array.from(prev.entries()).map(([k, v]) => `${k} ← ${v.from}`));
      console.log('Graph snapshot:', {
        neighbors: Object.fromEntries(
          [...graph.neighbors.entries()].map(([k, v]) => [k, v.map(e => `${e.from}→${e.to}`)])
        ),
      });
      return [];
    }
  
    while (u !== startId) {
      const prevStep = prev.get(u);
      if (!prevStep) {
        console.warn('Backtrack failed at', u);
        return [];
      }
      const { edge, from } = prevStep;
      path.unshift(edge);
      u = from;
    }
  
    console.log('Dijkstra path result:', path.map(e => `${e.from}→${e.to}`));
    return path;
  }  
  

export function buildGraph(stations: Station[], rawEdges: GuidewayEdge[]): HermesGraph {
  const stationMap = new Map<string, Station>();
  const neighborMap = new Map<string, GuidewayEdge[]>();

  for (const s of stations) {
    stationMap.set(s.id, s);
    neighborMap.set(s.id, []);
  }

  const edges: GuidewayEdge[] = [
    ...rawEdges.map(e => ({
      ...e,
      path: e.path.map(([lat, lng]) => [lat, lng] as [number, number]),
    })),
    ...rawEdges.map(e => ({
      from: e.to,
      to: e.from,
      path: e.path.map(([lat, lng]) => [lat, lng] as [number, number]).slice().reverse(),
    })),
  ];

  for (const edge of edges) {
    const clonedPath = edge.path.map(([a, b]) => [a, b] as [number, number]);
    if (clonedPath.length < 2) {
      console.warn('Skipping edge due to insufficient path length:', edge.from, '→', edge.to);
      continue;
    }

    const dist = computeDistance(clonedPath);
    if (isNaN(dist)) {
      console.warn('Edge has invalid distance:', edge.from, '→', edge.to, clonedPath);
    }

    const safeCost = isNaN(dist) ? 1 : dist;
    const edgeCopy = { ...edge, path: clonedPath, cost: safeCost };

    console.log('Adding edge', edgeCopy.from, '→', edgeCopy.to, 'cost:', edgeCopy.cost);

    if (!stationMap.has(edgeCopy.from)) console.warn('Missing FROM station', edgeCopy.from);
    if (!stationMap.has(edgeCopy.to)) console.warn('Missing TO station', edgeCopy.to);

    if (!neighborMap.has(edgeCopy.from)) {
      console.warn('No neighbor map for', edgeCopy.from);
      continue;
    }

    neighborMap.get(edgeCopy.from)!.push(edgeCopy);
  }

  return { stations: stationMap, edges, neighbors: neighborMap };
}

export function computeDistance(path: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const [lat1, lon1] = path[i - 1];
    const [lat2, lon2] = path[i];
    const dx = lat2 - lat1;
    const dy = lon2 - lon1;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}
