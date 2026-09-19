import Decimal from 'decimal.js';

// A resource limit, not an assertion of accuracy at every basin boundary.
export const MAX_PRECISION = 512;
export type Point = [string, string];
export type View = { center: Point; zoom: string };

export function precisionFor(view: View, height: number): number {
  const D = Decimal.clone({ precision: 32 });
  const pixel = new D(2).div(height).div(view.zoom);
  const magnitude = D.max(1, new D(view.center[0]).abs(), new D(view.center[1]).abs());
  return Math.max(40, magnitude.e - pixel.e + 32);
}

export class Camera {
  private D = Decimal.clone({ precision: 64 });
  center: Point = ['0', '0'];
  zoom = '1';

  snapshot(): View { return { center: [...this.center], zoom: this.zoom }; }

  private prepare(height: number, zoom = this.zoom) {
    const precision = precisionFor({ center: this.center, zoom }, height);
    if (precision > MAX_PRECISION - 48) throw new Error('Zoom precision limit reached');
    this.D.set({ precision: Math.max(this.D.precision, precision + 16) });
  }

  point(x: number, y: number, width: number, height: number): Point {
    this.prepare(height);
    const D = this.D;
    return [
      new D(this.center[0]).add(new D(x).mul(2).sub(width).div(height).div(this.zoom)).toString(),
      new D(this.center[1]).add(new D(height).sub(new D(y).mul(2)).div(height).div(this.zoom)).toString(),
    ];
  }

  project(point: Point, width: number, height: number): [number, number] {
    this.prepare(height);
    return [
      new this.D(point[0]).sub(this.center[0]).mul(this.zoom).mul(height).add(width).div(2).toNumber(),
      new this.D(height).sub(new this.D(point[1]).sub(this.center[1]).mul(this.zoom).mul(height)).div(2).toNumber(),
    ];
  }

  pan(dx: number, dy: number, height: number) {
    this.prepare(height);
    this.center = [
      new this.D(this.center[0]).sub(new this.D(dx).mul(2).div(height).div(this.zoom)).toString(),
      new this.D(this.center[1]).add(new this.D(dy).mul(2).div(height).div(this.zoom)).toString(),
    ];
  }

  zoomAt(x: number, y: number, width: number, height: number, factor: string) {
    const next = new this.D(this.zoom).mul(factor).toString();
    this.prepare(height, next);
    const before = this.point(x, y, width, height);
    this.zoom = next;
    const after = this.point(x, y, width, height);
    this.center = this.center.map((v, i) => new this.D(v).add(new this.D(before[i]).sub(after[i])).toString()) as Point;
  }
}
