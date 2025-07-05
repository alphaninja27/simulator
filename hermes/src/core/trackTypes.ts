import type { LatLngTuple } from 'leaflet';

export type TrackSegmentType = 'straight' | 'curve20' | 'curve30' | 'station';

export interface TrackSegment {
  id: string;
  type: TrackSegmentType;
  from: string;
  to: string;
  length: number;
  blocks: number;
  geometry: LatLngTuple[];
}
