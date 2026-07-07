import { relTo } from './path.js';
import {
  WORLD_W, WORLD_H, ROAD_WIDTH, SIDEWALK_WIDTH, CROSSWALK_HALF,
  CAR_SPRITE_BASE_ANGLE, EMOJI,
} from './config.js';

const COLORS = {
  outside: '#2c332b',
  grass: '#a3c585',
  road: '#4d4d55',
  sidewalk: '#cfc9bb',
  footpath: '#dbcfa4',
  dash: 'rgba(255,255,255,0.7)',
  marking: 'rgba(255,255,255,0.85)',
  chevron: 'rgba(255,255,255,0.3)',
};

const LIGHT_COLORS = { green: '#3fbf5f', amber: '#f5b942', red: '#e04040' };

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sprites = new Map();
    this.debug = false;
    this.resize();
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.canvas.clientWidth * this.dpr);
    this.canvas.height = Math.round(this.canvas.clientHeight * this.dpr);
  }

  // Emoji pre-rendered at 4x for crispness at any zoom.
  sprite(char, size) {
    const key = `${char}@${size}`;
    let s = this.sprites.get(key);
    if (!s) {
      s = document.createElement('canvas');
      s.width = s.height = size * 4;
      const g = s.getContext('2d');
      g.font = `${size * 3.6}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(char, size * 2, size * 2.16);
      this.sprites.set(key, s);
    }
    return s;
  }

  drawSprite(char, size, x, y, { rotate = null, flipX = false, alpha = 1 } = {}) {
    const ctx = this.ctx;
    const img = this.sprite(char, size);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (rotate !== null) ctx.rotate(rotate);
    if (flipX) ctx.scale(-1, 1);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  loopPath2D(loop) {
    if (!loop._p2d) {
      const p = new Path2D();
      const pts = loop.path.pts;
      p.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
      p.closePath();
      loop._p2d = p;
    }
    return loop._p2d;
  }

  routePath2D(route) {
    if (!route._p2d) {
      const p = new Path2D();
      const pts = route.path.pts;
      p.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
      p.closePath();
      route._p2d = p;
    }
    return route._p2d;
  }

  draw(sim) {
    const ctx = this.ctx;
    const cfg = sim.config;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLORS.outside;
    ctx.fillRect(0, 0, cw, ch);

    const scale = Math.min(cw / WORLD_W, ch / WORLD_H);
    const ox = (cw - WORLD_W * scale) / 2;
    const oy = (ch - WORLD_H * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);

    // Ground.
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Footpaths under everything, so pedestrian routes look intentional.
    ctx.strokeStyle = COLORS.footpath;
    ctx.lineWidth = 9;
    ctx.lineJoin = 'round';
    for (const route of sim.city.pedRoutes) ctx.stroke(this.routePath2D(route));

    // Sidewalk bands hug both sides of every road: a wide light stroke
    // underneath the asphalt stroke.
    ctx.strokeStyle = COLORS.sidewalk;
    ctx.lineWidth = ROAD_WIDTH + 2 * SIDEWALK_WIDTH;
    for (const loop of sim.city.loops) ctx.stroke(this.loopPath2D(loop));

    ctx.strokeStyle = COLORS.road;
    ctx.lineWidth = ROAD_WIDTH;
    for (const loop of sim.city.loops) ctx.stroke(this.loopPath2D(loop));

    // Centerline dashes.
    ctx.strokeStyle = COLORS.dash;
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 14]);
    for (const loop of sim.city.loops) ctx.stroke(this.loopPath2D(loop));
    ctx.setLineDash([]);

    // Plain asphalt over junction boxes hides the crossing dashes.
    ctx.fillStyle = COLORS.road;
    for (const j of sim.city.junctions) {
      ctx.fillRect(j.x - ROAD_WIDTH / 2 - 1, j.y - ROAD_WIDTH / 2 - 1, ROAD_WIDTH + 2, ROAD_WIDTH + 2);
    }

    this.drawChevrons(sim);
    this.drawMarkings(sim);

    // Houses and trees (each behind its own flag).
    if (cfg.housesEnabled) {
      sim.city.houses.forEach((h, i) => {
        this.drawSprite(EMOJI.houses[i % EMOJI.houses.length], 54, h.x, h.y);
      });
    }
    if (cfg.treesEnabled) {
      for (const t of sim.city.trees) this.drawSprite(EMOJI.tree, 40, t.x, t.y);
    }

    // Skulls first, so cars and the living pass over them.
    for (const p of sim.peds.peds) {
      if (p.state !== 'dead') continue;
      const pose = p.pose();
      this.drawSprite(EMOJI.skull, 20, pose.x, pose.y, { alpha: pose.alpha });
    }

    // Pedestrians.
    for (const p of sim.peds.peds) {
      if (p.state === 'dead') continue;
      const pose = p.pose();
      this.drawSprite(EMOJI.ped, 22, pose.x, pose.y, { flipX: pose.facing === -1, alpha: pose.alpha });
    }

    // Cars, rotated to their heading. The glyphs face left; a half-turn would
    // put eastbound cars roof-down, so mirror for east-ish headings instead.
    for (const car of sim.cars) {
      if (!car.active) continue;
      const pose = car.pose();
      const east = Math.cos(pose.heading) >= 0;
      this.drawSprite(car.emoji, car.size, pose.x, pose.y, east
        ? { rotate: pose.heading, flipX: true, alpha: car.alpha }
        : { rotate: pose.heading + CAR_SPRITE_BASE_ANGLE, alpha: car.alpha });
    }

    if (sim.night01 > 0.01) this.drawNight(sim);
    this.drawVehicleLights(sim);
    if (cfg.lightsEnabled) this.drawLights(sim);
    if (this.debug) this.drawDebug(sim);
  }

  // Faint one-way arrows so the driving direction reads at a glance.
  drawChevrons(sim) {
    const ctx = this.ctx;
    ctx.strokeStyle = COLORS.chevron;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const loop of sim.city.loops) {
      const L = loop.path.length;
      for (let s = 40; s < L; s += 170) {
        let nearJunction = false;
        for (const st of loop.junctionStreams) {
          if (Math.abs(relTo(s, st.sCenter, L)) < 70) { nearJunction = true; break; }
        }
        if (nearJunction) continue;
        const p = loop.path.pointAt(s);
        const h = p.heading;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(h + 2.5) * 8, p.y + Math.sin(h + 2.5) * 8);
        ctx.lineTo(p.x + Math.cos(h) * 5, p.y + Math.sin(h) * 5);
        ctx.lineTo(p.x + Math.cos(h - 2.5) * 8, p.y + Math.sin(h - 2.5) * 8);
        ctx.stroke();
      }
    }
  }

  drawMarkings(sim) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.marking;

    // Zebra stripes: bars parallel to the road axis, stacked across it.
    for (const cw of sim.city.crosswalks) {
      for (let k = -2; k <= 2; k++) {
        if (cw.orient === 'v') {
          ctx.fillRect(cw.x - CROSSWALK_HALF, cw.y + k * 8 - 2.5, CROSSWALK_HALF * 2, 5);
        } else {
          ctx.fillRect(cw.x + k * 8 - 2.5, cw.y - CROSSWALK_HALF, 5, CROSSWALK_HALF * 2);
        }
      }
    }

    // Stop lines across each approach.
    ctx.strokeStyle = COLORS.marking;
    ctx.lineWidth = 4;
    for (const j of sim.city.junctions) {
      for (const st of j.streams) {
        const p = st.loop.path.pointAt(st.stopS);
        const px = Math.cos(p.heading + Math.PI / 2);
        const py = Math.sin(p.heading + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(p.x - px * 21, p.y - py * 21);
        ctx.lineTo(p.x + px * 21, p.y + py * 21);
        ctx.stroke();
      }
    }
  }

  // Night: dim the whole scene and give every car taillights.
  drawNight(sim) {
    const ctx = this.ctx;
    const n = sim.night01;
    ctx.fillStyle = `rgba(8, 12, 38, ${0.55 * n})`;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    ctx.save();
    for (const car of sim.cars) {
      if (!car.active) continue;
      const pose = car.pose();
      ctx.globalAlpha = car.alpha;
      ctx.fillStyle = `rgba(255, 60, 60, ${0.9 * n})`;
      const px = Math.cos(pose.heading + Math.PI / 2);
      const py = Math.sin(pose.heading + Math.PI / 2);
      const bx = pose.x - Math.cos(pose.heading) * (car.len / 2 + 1);
      const by = pose.y - Math.sin(pose.heading) * (car.len / 2 + 1);
      for (const side of [-8, 8]) {
        ctx.beginPath();
        ctx.arc(bx + px * side, by + py * side, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Headlight beams for cars inside the gradual rollout (subtle running
  // lights by day, bright cones at night) and honk waves for beeping cars.
  drawVehicleLights(sim) {
    const ctx = this.ctx;
    const cfg = sim.config;
    const beamAlpha = 0.32 * (0.4 + 0.6 * sim.night01);

    for (const car of sim.cars) {
      if (!car.active) continue;
      const pose = car.pose();

      if (car.rollHash < cfg.headlightsPct) {
        ctx.save();
        ctx.translate(pose.x, pose.y);
        ctx.rotate(pose.heading);
        ctx.globalAlpha = car.alpha;
        ctx.globalCompositeOperation = 'lighter';
        const front = car.len / 2 + 1;
        const grad = ctx.createLinearGradient(front, 0, front + 58, 0);
        grad.addColorStop(0, `rgba(255, 240, 170, ${beamAlpha})`);
        grad.addColorStop(1, 'rgba(255, 240, 170, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(front, -7);
        ctx.lineTo(front + 58, -20);
        ctx.lineTo(front + 58, 20);
        ctx.lineTo(front, 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (car.beepFlash > 0) {
        ctx.save();
        ctx.translate(pose.x, pose.y);
        ctx.rotate(pose.heading);
        ctx.strokeStyle = sim.night01 > 0.5 ? '#fff' : '#333';
        ctx.globalAlpha = car.alpha * Math.min(1, car.beepFlash * 2.5);
        ctx.lineWidth = 2;
        const spread = (0.6 - car.beepFlash) * 26;
        for (const r of [10 + spread, 17 + spread]) {
          ctx.beginPath();
          ctx.arc(car.len / 2 - 4, 0, r, -0.7, 0.7);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  drawLights(sim) {
    const ctx = this.ctx;
    for (const j of sim.city.junctions) {
      // One decorative glyph per junction, on a grass corner.
      this.drawSprite(EMOJI.light, 28, j.x + 38, j.y - 38);
      // State discs at each stop line, right curb.
      for (const st of j.streams) {
        const p = st.loop.path.pointAt(st.stopS);
        const px = Math.cos(p.heading + Math.PI / 2);
        const py = Math.sin(p.heading + Math.PI / 2);
        const x = p.x + px * 34;
        const y = p.y + py * 34;
        const color = LIGHT_COLORS[j.ctrl.stateFor(st.phase)];
        ctx.fillStyle = '#26262c';
        ctx.beginPath();
        ctx.arc(x, y, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.shadowBlur = 10 * sim.night01;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawDebug(sim) {
    const ctx = this.ctx;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';

    for (const route of sim.city.pedRoutes) {
      ctx.strokeStyle = 'rgba(0,180,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke(this.routePath2D(route));
    }

    for (const j of sim.city.junctions) {
      const occupied = j.occ.size > 0;
      ctx.strokeStyle = occupied ? 'rgba(255,80,80,0.9)' : 'rgba(255,170,0,0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(j.x - j.half, j.y - j.half, j.half * 2, j.half * 2);
      if (occupied) {
        ctx.fillStyle = 'rgba(255,80,80,0.15)';
        ctx.fillRect(j.x - j.half, j.y - j.half, j.half * 2, j.half * 2);
      }
      ctx.fillStyle = '#111';
      ctx.fillText(`${j.id} q:${j.queue.length}${j.reserved ? ' R' : ''}`, j.x, j.y - j.half - 6);
    }

    ctx.fillStyle = '#111';
    for (const car of sim.cars) {
      if (!car.active) continue;
      const pose = car.pose();
      const d = car.dObs === Infinity ? '∞' : Math.round(car.dObs);
      ctx.fillText(`${Math.round(car.v)}/${d}`, pose.x, pose.y - 24);
    }

    for (const cw of sim.city.crosswalks) {
      if (cw.pedsOn > 0) {
        ctx.strokeStyle = 'rgba(255,0,200,0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(cw.x - 14, cw.y - 14, 28, 28);
      }
    }
  }
}
