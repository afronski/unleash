export const wrap = (s, L) => ((s % L) + L) % L;

// Signed position of s relative to center, in (-L/2, L/2].
export const relTo = (s, center, L) => wrap(s - center + L / 2, L) - L / 2;

// Replace each 90-degree corner with two points r before/after it, so the
// heading turns in two 45-degree steps instead of snapping.
function chamfer(points, r) {
  const out = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const v = points[i];
    const p = points[(i - 1 + n) % n];
    const q = points[(i + 1) % n];
    const d1 = Math.hypot(p[0] - v[0], p[1] - v[1]);
    const d2 = Math.hypot(q[0] - v[0], q[1] - v[1]);
    out.push([v[0] + ((p[0] - v[0]) / d1) * r, v[1] + ((p[1] - v[1]) / d1) * r]);
    out.push([v[0] + ((q[0] - v[0]) / d2) * r, v[1] + ((q[1] - v[1]) / d2) * r]);
  }
  return out;
}

// Closed polyline parameterized by arc length s in [0, length).
export class Path {
  constructor(points, { cornerRadius = 0 } = {}) {
    this.pts = cornerRadius > 0 ? chamfer(points, cornerRadius) : points.map((p) => [p[0], p[1]]);
    const n = this.pts.length;
    this.cum = new Array(n + 1);
    this.cum[0] = 0;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = this.pts[i];
      const [bx, by] = this.pts[(i + 1) % n];
      this.cum[i + 1] = this.cum[i] + Math.hypot(bx - ax, by - ay);
    }
    this.length = this.cum[n];
  }

  // Arc length at original vertex i (only meaningful for unchamfered paths).
  sAtVertex(i) {
    return this.cum[i];
  }

  pointAt(s) {
    s = wrap(s, this.length);
    const n = this.pts.length;
    let i = 0;
    while (i < n - 1 && this.cum[i + 1] <= s) i++;
    const [ax, ay] = this.pts[i];
    const [bx, by] = this.pts[(i + 1) % n];
    const segLen = this.cum[i + 1] - this.cum[i];
    const t = segLen > 0 ? (s - this.cum[i]) / segLen : 0;
    return {
      x: ax + (bx - ax) * t,
      y: ay + (by - ay) * t,
      heading: Math.atan2(by - ay, bx - ax),
    };
  }

  // Arc length of the closest point on the path to (x, y).
  sAtPoint(x, y) {
    const n = this.pts.length;
    let bestD = Infinity;
    let bestS = 0;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = this.pts[i];
      const [bx, by] = this.pts[(i + 1) % n];
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;
      let t = ((x - ax) * dx + (y - ay) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = ax + t * dx;
      const py = ay + t * dy;
      const dd = (x - px) * (x - px) + (y - py) * (y - py);
      if (dd < bestD) {
        bestD = dd;
        bestS = this.cum[i] + Math.sqrt(len2) * t;
      }
    }
    return bestS;
  }
}
