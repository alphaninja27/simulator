import type { LatLngTuple } from 'leaflet';

export type Station = {
  id: string;
  name: string;
  position: LatLngTuple;
};

export type GuidewayEdge = {
  from: string;
  to: string;
  path: LatLngTuple[];
  cost?: number;
};

export type HermesGraph = {
  stations: Map<string, Station>;
  neighbors: Map<string, GuidewayEdge[]>;
  edges: GuidewayEdge[];
};
