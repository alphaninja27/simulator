import { useEffect, useState } from 'react';
import { Polygon, useMap } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';

// Convert degrees to radians
const toRad = (deg: number) => (deg * Math.PI) / 180;

// Compute vehicle polygon (rectangle) from center point
function computeVehiclePolygon(
  center: LatLngTuple,
  heading: number,
  length = 0.000022, // ≈2.4m
  width = 0.00001   // ≈1.1m
): LatLngTuple[] {
  const angle = toRad(heading);
  const dx = Math.cos(angle) * length / 2;
  const dy = Math.sin(angle) * length / 2;
  const wx = Math.sin(angle) * width / 2;
  const wy = -Math.cos(angle) * width / 2;

  const [lat, lng] = center;

  return [
    [lat - dy - wy, lng - dx - wx],
    [lat - dy + wy, lng - dx + wx],
    [lat + dy + wy, lng + dx + wx],
    [lat + dy - wy, lng + dx - wx],
  ];
}

export function VehicleAnimator({ path }: { path: LatLngTuple[] }) {
  const [index, setIndex] = useState(0);
  const [polygon, setPolygon] = useState<LatLngTuple[]>([]);
  const map = useMap();

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (index + 1) % path.length;
      const pos = path[index];
      const nextPos = path[nextIndex];

      const dx = nextPos[1] - pos[1];
      const dy = nextPos[0] - pos[0];
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      const poly = computeVehiclePolygon(pos, angle);
      setPolygon(poly);
      setIndex(nextIndex);

      map.panTo(pos, { animate: true });
    }, 120);

    return () => clearInterval(interval);
  }, [path, index, map]);

  return <Polygon positions={polygon} pathOptions={{ color: 'red', fillColor: 'red', weight: 1 }} />;
}
