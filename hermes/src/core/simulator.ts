import type { LatLngTuple } from 'leaflet';
import type { Segment } from './types';
import { segments } from '../data/segments';

export class VehicleSimulator {
  private segIndex = 0;
  private blockIndex = 0;

  constructor(public id: string, public route: Segment[] = segments) {}

  step(): LatLngTuple {
    const current = this.route[this.segIndex];

    this.blockIndex++;
    if (this.blockIndex >= current.geometry.length) {
      this.blockIndex = 0;
      this.segIndex = (this.segIndex + 1) % this.route.length;
    }

    return current.geometry[this.blockIndex];
  }

  get position(): LatLngTuple {
    return this.route[this.segIndex].geometry[this.blockIndex];
  }

  get label(): string {
    const current = this.route[this.segIndex];
    return `${this.id}: ${current.id} Block ${this.blockIndex + 1}/${current.geometry.length}`;
  }
}
