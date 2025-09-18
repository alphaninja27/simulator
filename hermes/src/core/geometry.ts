// src/core/geometry.ts
import type { LatLngTuple } from 'leaflet';
import type { SegmentType } from './types';

export function generateSegmentGeometry(
  from: LatLngTuple,
  to: LatLngTuple,
  type: SegmentType,
  length: number
): LatLngTuple[] {
    // Reference the 'type' parameter to avoid the unused variable error

  type;

  // Simple linear interpolation (could improve later for curves)
  const points: LatLngTuple[] = [];
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;

  const steps = Math.floor(length / 6); // blocks of 6m
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = lat1 + (lat2 - lat1) * t;
    const lng = lng1 + (lng2 - lng1) * t;
    points.push([lat, lng]);
  }

  return points;
}
