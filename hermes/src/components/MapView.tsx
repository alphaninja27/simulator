import { useEffect, useState, useMemo, useRef } from 'react';
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

// Calculates the distance between two lat-lng coordinates in meters.
function haversineDistance(a: LatLngTuple, b: LatLngTuple): number {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const φ1 = toRad(lat1),
    φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1),
    Δλ = toRad(lon2 - lon1);
  const a_ =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a_), Math.sqrt(1 - a_));
}

type GuidewayEdge = {
  from: string;
  to: string;
  path: LatLngTuple[];
  type?: string;
};

const stationMap = Object.fromEntries(stations.map(s => [s.id, s.position]));

// Fetches a route between two points using the OSRM API.
function fetchRoute(
  from: LatLngTuple,
  to: LatLngTuple
): Promise<LatLngTuple[]> {
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

// A component that renders and animates a vehicle as a pentagon on the map.
function VehiclePentagon({
  path,
  offset,
  paused,
  color,
  speed = 45,
}: {
  path: LatLngTuple[];
  offset: number;
  paused: boolean;
  color: string;
  speed: number;
}) {
  const [position, setPosition] = useState<LatLngTuple>(() => path[0]);
  const [heading, setHeading] = useState(0);

  const distanceTraveledRef = useRef(0);
  const lastTimestampRef = useRef(performance.now());
  const animationFrameRef = useRef<number>(0);

  // Pre-calculate cumulative distances for each point in the path.
  const { cumulativeDistances, totalPathDistance } = useMemo(() => {
    if (path.length === 0) {
      return { cumulativeDistances: [], totalPathDistance: 0 };
    }
    const distances = [0];
    for (let i = 1; i < path.length; i++) {
      const dist = haversineDistance(path[i - 1], path[i]);
      distances.push(distances[i - 1] + dist);
    }
    return {
      cumulativeDistances: distances,
      totalPathDistance: distances[distances.length - 1],
    };
  }, [path]);

  // Set the initial position based on the offset.
  useEffect(() => {
    if (path.length > 0 && cumulativeDistances.length > offset) {
      distanceTraveledRef.current = cumulativeDistances[offset % cumulativeDistances.length];
    }
  }, [offset, cumulativeDistances, path]);

  // Main animation loop using requestAnimationFrame.
  useEffect(() => {
    if (!totalPathDistance) return;

    const animate = (now: number) => {
      if (!paused) {
        const deltaTimeSec = (now - lastTimestampRef.current) / 1000;
        lastTimestampRef.current = now;

        const speedMetersPerSec = (speed * 1000) / 3600;
        distanceTraveledRef.current += speedMetersPerSec * deltaTimeSec;

        // Loop the animation when the end of the path is reached.
        if (distanceTraveledRef.current > totalPathDistance) {
          distanceTraveledRef.current %= totalPathDistance;
        }

        const { newPosition, newHeading } = interpolatePosition(
          path,
          cumulativeDistances,
          distanceTraveledRef.current
        );

        setPosition(newPosition);
        setHeading(newHeading);
      } else {
        lastTimestampRef.current = now;
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimestampRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [paused, speed, path, cumulativeDistances, totalPathDistance]);

  const getHeading = (from: LatLngTuple, to: LatLngTuple): number => {
    const dx = to[1] - from[1];
    const dy = to[0] - from[0];
    return Math.atan2(dy, dx);
  };

  // Interpolates the vehicle's position and heading based on distance traveled.
  const interpolatePosition = (
    path: LatLngTuple[],
    cumulativeDistances: number[],
    distance: number
  ) => {
    let segmentIndex = cumulativeDistances.findIndex(d => d >= distance);
    if (segmentIndex === -1) segmentIndex = path.length - 1;
    if (segmentIndex === 0) segmentIndex = 1;

    const startPoint = path[segmentIndex - 1];
    const endPoint = path[segmentIndex];
    const segmentStartDistance = cumulativeDistances[segmentIndex - 1];
    const segmentLength = cumulativeDistances[segmentIndex] - segmentStartDistance;

    if (segmentLength === 0) {
      return { newPosition: startPoint, newHeading: getHeading(startPoint, endPoint) };
    }

    const distanceIntoSegment = distance - segmentStartDistance;
    const fraction = distanceIntoSegment / segmentLength;

    const lat = startPoint[0] + (endPoint[0] - startPoint[0]) * fraction;
    const lng = startPoint[1] + (endPoint[1] - startPoint[1]) * fraction;

    return {
      newPosition: [lat, lng] as LatLngTuple,
      newHeading: getHeading(startPoint, endPoint),
    };
  };

  const getPentagon = (
    center: LatLngTuple,
    headingRad: number
  ): LatLngTuple[] => {
    const angle = (Math.PI * 2) / 5;
    const points: LatLngTuple[] = [];
    const size = 0.00008; // Adjusted for better visibility
    for (let i = 0; i < 5; i++) {
      const theta = headingRad + angle * i;
      const dx = Math.cos(theta) * size;
      const dy = Math.sin(theta) * size;
      points.push([center[0] + dy, center[1] + dx]);
    }
    return points;
  };

  const polygon = getPentagon(position, heading);

  return <Polygon positions={polygon} pathOptions={{ color, fillColor: color }} />;
}

// The main map view component.
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
        } else {
          try {
            const path = await fetchRoute(start, end);
            results.push({ from, to, path, type });
          } catch {
            console.warn(`No route from ${from} to ${to}`);
          }
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
      <MapContainer
        center={[28.6139, 77.209]}
        zoom={13}
        style={{ height: '100vh', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {edges.map((edge, i) => (
          <Polyline
            key={`edge-${i}`}
            positions={edge.path}
            color="black"
            weight={5}
          />
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
            <VehiclePentagon path={route} offset={50} paused={paused} color="orange" speed={speed} />
            <VehiclePentagon path={route} offset={100} paused={paused} color="green" speed={speed} />
          </>
        )}
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
          fontFamily: 'sans-serif',
        }}
      >
        <div>
          <button onClick={() => setPaused(p => !p)} style={{ width: '80px', marginBottom: '5px' }}>
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
        <div>
          <button onClick={() => setSpeed(s => Math.max(5, s - 5))}>-</button>
          <span style={{ margin: '0 8px', color: 'black', display: 'inline-block', width: '90px', textAlign: 'center' }}>
            Speed: {speed} km/h
          </span>
          <button onClick={() => setSpeed(s => Math.min(120, s + 5))}>+</button>
        </div>
      </div>
    </div>
  );
}
