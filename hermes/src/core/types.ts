// src/core/types.ts
import type { LatLngTuple } from 'leaflet';

export type Station = {
  id: string;
  name: string;
  position: LatLngTuple;
  length: number;     // meters
  blocks: number;     // typically 72m → 12 blocks
};

export type SegmentType = 'straight' | 'curve30' | 'curve20' | 'station';

export type Segment = {
  id: string;
  type: SegmentType;
  from: Station;
  to: Station;
  length: number;
  blocks: number;
  geometry: LatLngTuple[];
};
