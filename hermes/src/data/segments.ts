// src/data/segments.ts
import { generateSegmentGeometry } from '../core/geometry';
import type { Segment } from '../core/types';
import { stations } from './stations';

function getStation(id: string) {
  return stations.find(s => s.id === id)!;
}

export const segments: Segment[] = [
  {
    id: 'cp-indiaGate',
    type: 'straight',
    from: getStation('cp'),
    to: getStation('indiaGate'),
    length: 24,
    blocks: 4,
    geometry: generateSegmentGeometry(
      getStation('cp').position,
      getStation('indiaGate').position,
      'straight',
      24
    )
  },
  {
    id: 'indiaGate-khanMarket',
    type: 'straight',
    from: getStation('indiaGate'),
    to: getStation('khanMarket'),
    length: 30,
    blocks: 5,
    geometry: generateSegmentGeometry(
      getStation('indiaGate').position,
      getStation('khanMarket').position,
      'straight',
      30
    )
  },
  {
    id: 'khanMarket-aiims',
    type: 'station',
    from: getStation('khanMarket'),
    to: getStation('aiims'),
    length: 72,
    blocks: 12,
    geometry: generateSegmentGeometry(
      getStation('khanMarket').position,
      getStation('aiims').position,
      'station',
      72
    )
  }
];
