import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import { stations } from '../data/stations';
import { rawEdges } from '../data/edges';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const vehicleIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/61/61168.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

type GuidewayEdge = {
  from: string;
  to: string;
  path: LatLngTuple[];
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

function VehicleAnimator({ path }: { path: LatLngTuple[] }) {
  const [index, setIndex] = useState(0);
  const map = useMap();

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(i => (i < path.length - 1 ? i + 1 : 0)); // loop
      map.panTo(path[index], { animate: true });
    }, 120); // adjust speed

    return () => clearInterval(interval);
  }, [path, index, map]);

  return <Marker position={path[index]} icon={vehicleIcon} />;
}

export default function MapView() {
  const [edges, setEdges] = useState<GuidewayEdge[]>([]);
  const [route, setRoute] = useState<LatLngTuple[]>([]);

  useEffect(() => {
    const fetchAllRoutes = async () => {
      const results: GuidewayEdge[] = [];

      for (const { from, to } of rawEdges) {
        const start = stationMap[from];
        const end = stationMap[to];
        try {
          const path = await fetchRoute(start, end);
          results.push({ from, to, path });
        } catch {
          console.warn(`No route from ${from} to ${to}`);
        }
      }

      setEdges(results);
      setRoute(results.flatMap(e => e.path));
    };

    fetchAllRoutes();
  }, []);

  return (
    <MapContainer center={[28.6139, 77.2090]} zoom={13} style={{ height: '100vh', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {edges.map((edge, i) => (
        <Polyline key={i} positions={edge.path} color="black" weight={5} />
      ))}

      {stations.map(s => (
        <Marker key={s.id} position={s.position}>
          <Popup>{s.name}</Popup>
        </Marker>
      ))}

      {route.length > 0 && <VehicleAnimator path={route} />}
    </MapContainer>
  );
}
