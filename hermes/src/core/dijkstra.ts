// import type { HermesGraph, GuidewayEdge } from './types';

// export function findPath(graph: HermesGraph, startId: string, goalId: string): GuidewayEdge[] {
//   const visited = new Set<string>();
//   const dist = new Map<string, number>();
//   const prev = new Map<string, { edge: GuidewayEdge; from: string }>();

//   for (const stationId of graph.stations.keys()) {
//     dist.set(stationId, Infinity);
//   }
//   dist.set(startId, 0);

//   const queue: [string, number][] = [[startId, 0]];

//   while (queue.length > 0) {
//     queue.sort((a, b) => a[1] - b[1]);
//     const [current] = queue.shift()!;

//     if (current === goalId) break;
//     if (visited.has(current)) continue;
//     visited.add(current);

//     const neighbors = graph.neighbors.get(current) || [];
//     for (const edge of neighbors) {
//       const next = edge.to;
//       const alt = (dist.get(current) || Infinity) + (edge.cost || 1);
//       if (alt < (dist.get(next) || Infinity)) {
//         dist.set(next, alt);
//         prev.set(next, { edge, from: current });
//         queue.push([next, alt]);
//       }
//     }
//   }

//   // Reconstruct path
//   const path: GuidewayEdge[] = [];
//   let u = goalId;

//   console.log('DISTANCES:', Object.fromEntries(dist.entries()));

//   if (!prev.has(u)) {
//     console.warn('No path found from', startId, 'to', goalId);
//     return [];
//   }

//   while (u !== startId) {
//     const prevStep = prev.get(u);
//     if (!prevStep) {
//       console.warn('Backtrack failed at', u);
//       return [];
//     }
//     const { edge, from } = prevStep;
//     path.unshift(edge);
//     u = from;
//   }

//   console.log('Dijkstra success: Path =', path.map(e => `${e.from}->${e.to}`));
//   return path;
// }
