// src/components/MapView.tsx
import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  Polygon,
} from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import { stations } from '../data/stations';
import { rawEdges } from '../data/edges';
import 'leaflet/dist/leaflet.css';

type GuidewayEdge = {
  from: string;
  to: string;
  path: LatLngTuple[];
  type?: string;
};

const stationMap = Object.fromEntries(stations.map(s => [s.id, s.position]));

function fetchRoute(from: LatLngTuple, to: LatLngTuple): Promise<LatLngTuple[]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  return fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.routes?.[0]) throw new Error('No route found');
      return data.routes[0].geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as LatLngTuple
      );
    });
}

function VehiclePentagon({
  path,
  offset,
  paused,
  color,
  speed=45,
}: {
  path: LatLngTuple[];
  offset: number;
  paused: boolean;
  color: string;
  speed: number;
}) {
  const [index, setIndex] = useState(offset);

  useEffect(() => {
    if (paused) return;
    const baseSpeed = 45;
    const baseInterval = 120;
    const intervalMs = baseInterval * (baseSpeed / speed);
    const interval = setInterval(() => {
      setIndex(i => (i + 1 < path.length ? i + 1 : 0));
    }, intervalMs);
    return () => clearInterval(interval);
  }, [paused, path, speed]);

  const getHeading = (from: LatLngTuple, to: LatLngTuple): number => {
    const dx = to[1] - from[1];
    const dy = to[0] - from[0];
    return Math.atan2(dy, dx);
  };

  const getPentagon = (center: LatLngTuple, headingRad: number): LatLngTuple[] => {
    const angle = Math.PI * 2 / 5;
    const points: LatLngTuple[] = [];
    for (let i = 0; i < 5; i++) {
      const theta = headingRad + angle * i;
      const dx = Math.cos(theta) * 0.000022;
      const dy = Math.sin(theta) * 0.000022;
      points.push([center[0] + dy, center[1] + dx]);
    }
    return points;
  };

  const center = path[index % path.length];
  const next = path[(index + 1) % path.length];
  const heading = getHeading(center, next);
  const polygon = getPentagon(center, heading);

  return <Polygon positions={polygon} pathOptions={{ color, fillColor: color }} />;
}

export default function MapView() {
  const [edges, setEdges] = useState<GuidewayEdge[]>([]);
  const [stationsOnly, setStationsOnly] = useState<GuidewayEdge[]>([]);
  const [route, setRoute] = useState<LatLngTuple[]>([]);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(45); // km/h, default


  useEffect(() => {
    const fetchAllRoutes = async () => {
      const results: GuidewayEdge[] = [];
      const stationLines: GuidewayEdge[] = [];

      for (const { from, to, type } of rawEdges) {
        const start = stationMap[from];
        const end = stationMap[to];
        if (type === 'station') {
          stationLines.push({ from, to, path: [start, end], type });
        }

        try {
          const path = await fetchRoute(start, end);
          results.push({ from, to, path, type });
        } catch {
          console.warn(`No route from ${from} to ${to}`);
        }
      }

      setEdges(results);
      setStationsOnly(stationLines);
      setRoute(results.flatMap(e => e.path));
    };

    fetchAllRoutes();
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
    <MapContainer center={[28.6139, 77.209]} zoom={13} style={{ height: '100vh', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {edges.map((edge, i) => (
        <Polyline key={`edge-${i}`} positions={edge.path} color="black" weight={5} />
      ))}

      {stationsOnly.map((station, i) => (
        <Polyline
          key={`station-${i}`}
          positions={station.path}
          color="blue"
          weight={10}
          dashArray="6 6"
        />
      ))}

      {stations.map(s => (
        <Marker key={s.id} position={s.position}>
          <Popup>{s.name}</Popup>
        </Marker>
      ))}

      {route.length > 0 && (
         <>
         <VehiclePentagon path={route} offset={0} paused={paused} color="red" speed={speed} />
         <VehiclePentagon path={route} offset={20} paused={paused} color="orange" speed={speed} />
         <VehiclePentagon path={route} offset={40} paused={paused} color="green" speed={speed} />
       </>
      )}

      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1000,
          background: 'white',
          padding: '10px',
          borderRadius: '5px',
        }}
      >
        <button onClick={() => setPaused(true)}>Pause</button>
        <button onClick={() => setPaused(false)}>Resume</button>
        <div>
          <button onClick={() => setSpeed(s => Math.max(5, s - 5))}>-</button>
          <span>Speed: {speed} km/h</span>
          <button onClick={() => setSpeed(s => Math.min(120, s + 5))}>+</button>
        </div>
      </div>
    </MapContainer>
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 1000,
        background: 'white',
        padding: '10px',
        borderRadius: '5px',
      }}
    >
      <button onClick={() => setPaused(true)}>Pause</button>
      <button onClick={() => setPaused(false)}>Resume</button>
      <div>
        <button onClick={() => setSpeed(s => Math.max(5, s - 5))}>-</button>
        <span style={{ margin: '0 8px', color: 'black' }}>Speed: {speed} km/h</span>
        <button onClick={() => setSpeed(s => Math.min(120, s + 5))}>+</button>
      </div>
    </div>
  </div>
  );
}
