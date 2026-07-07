import { wrap, relTo } from './path.js';
import {
  PED_TARGET, PED_SPAWN_EVERY, PED_SPEED_MIN, PED_SPEED_MAX,
  PED_CROSS_BOOST, PED_GAP_WINDOW, CROSSWALK_HALF,
  PED_PAUSE_EVERY, PED_PAUSE_FOR, INATTENTIVE_SHARE, KILL_SPEED,
  SKULL_LINGERS, NIGHT_PEDS_GONE,
} from './config.js';

const rand = (lo, hi) => lo + Math.random() * (hi - lo);

// May this pedestrian start crossing right now? Careless pedestrians only
// refuse if a car is physically on the stripe — approaching traffic be damned.
function canCross(crossing, sim, careless) {
  const cfg = sim.config;
  const cw = crossing.cw;
  const loop = cw.loop;
  const L = loop.path.length;

  for (const car of loop.cars) {
    const rel = relTo(car.s, cw.roadS, L);
    if (rel > -(CROSSWALK_HALF + 4) && rel - car.len < CROSSWALK_HALF + 4) return false;
  }

  if (careless) return true;

  const movingCarWithin = (dist) => {
    for (const car of loop.cars) {
      if (car.v < 3) continue;
      if (wrap(cw.roadS - car.s, L) < dist) return true;
    }
    return false;
  };

  // Lights fast-path: on red the stop line (upstream of the stripe) physically
  // holds cars back, so cross if the red lasts long enough to finish.
  if (cfg.lightsEnabled && cw.junction) {
    const crossTime = crossing.len / (PED_SPEED_MIN * PED_CROSS_BOOST) + 1;
    if (cw.junction.ctrl.stateFor(cw.phase) === 'red'
      && cw.junction.ctrl.timeUntilGreen(cw.phase) > crossTime) {
      return !movingCarWithin(60);
    }
  }

  // Universal gap rule (the whole rule when lights are hidden). The window
  // scales with the speed multiplier so fast cars are noticed farther away.
  return !movingCarWithin(PED_GAP_WINDOW * Math.max(1, cfg.speedMult));
}

export class Pedestrian {
  constructor(route, s, dir) {
    this.route = route;
    this.s = s;
    this.dir = dir; // +1 or -1: pedestrians walk the route either way around
    this.base = rand(PED_SPEED_MIN, PED_SPEED_MAX);
    this.alpha = 0;
    this.state = 'walk'; // walk | wait | cross | dead
    this.crossing = null;
    this.crossT = 0; // distance covered on the current crossing
    this.deadT = 0;
    this.careless = Math.random() < INATTENTIVE_SHARE; // acts only when the toggle is on
    this.perp = rand(-4, 4); // lateral jitter, render-only
    this.facing = 1;
    this.leaving = false;
    this.pauseT = 0;
    this.nextPause = rand(PED_PAUSE_EVERY[0], PED_PAUSE_EVERY[1]);
  }

  // The route point a crossing is entered from depends on walking direction.
  crossingEntry(c) {
    const L = this.route.path.length;
    return this.dir > 0 ? c.sStart : wrap(c.sStart + c.len, L);
  }

  die(sim) {
    this.crossing.cw.pedsOn--;
    this.crossing = null;
    this.state = 'dead';
    this.deadT = 0;
    sim.stats.deaths++;
    if (sim.callbacks.onDeath) sim.callbacks.onDeath();
  }

  // Returns false when finished (faded out, or skull expired).
  update(dt, sim) {
    if (this.state === 'dead') {
      this.deadT += dt;
      this.alpha = this.deadT > SKULL_LINGERS - 2 ? Math.max(0, (SKULL_LINGERS - this.deadT) / 2) : 1;
      return this.deadT < SKULL_LINGERS;
    }

    if (this.leaving && this.state !== 'cross') {
      this.alpha -= dt * 2;
      if (this.alpha <= 0) return false;
    } else {
      this.alpha = Math.min(1, this.alpha + dt * 2);
    }

    const L = this.route.path.length;
    const careless = sim.config.inattentive && this.careless;

    if (this.state === 'wait') {
      if (canCross(this.crossing, sim, careless)) {
        this.state = 'cross';
        this.crossing.cw.pedsOn++;
        this.crossT = 0;
      }
      return true;
    }

    // Random idle pauses break up single-file processions.
    if (this.state === 'walk') {
      if (this.pauseT > 0) {
        this.pauseT -= dt;
        return true;
      }
      this.nextPause -= dt;
      if (this.nextPause <= 0) {
        this.pauseT = rand(PED_PAUSE_FOR[0], PED_PAUSE_FOR[1]);
        this.nextPause = rand(PED_PAUSE_EVERY[0], PED_PAUSE_EVERY[1]);
        return true;
      }
    }

    const step = this.base * (this.state === 'cross' ? PED_CROSS_BOOST : 1) * dt;

    if (this.state === 'cross') {
      this.crossT += step;
      this.s = wrap(this.s + this.dir * step, L);
      if (this.crossT >= this.crossing.len) {
        this.crossing.cw.pedsOn--;
        this.crossing = null;
        this.state = 'walk';
      } else if (this.crossT > 8 && this.crossT < this.crossing.len - 8) {
        // On the asphalt: a fast car sweeping the stripe is lethal.
        const cw = this.crossing.cw;
        const cwL = cw.loop.path.length;
        for (const car of cw.loop.cars) {
          const rel = relTo(car.s, cw.roadS, cwL);
          if (rel > -8 && rel - car.len < 8 && car.v > KILL_SPEED) {
            this.die(sim);
            break;
          }
        }
      }
    } else {
      // Does this step reach the entry point of a crossing?
      let hit = null;
      for (const c of this.route.crossings) {
        const entry = this.crossingEntry(c);
        const dTo = this.dir > 0 ? wrap(entry - this.s, L) : wrap(this.s - entry, L);
        if (dTo <= step && (!hit || dTo < hit.dTo)) hit = { c, dTo, entry };
      }
      if (hit) {
        if (canCross(hit.c, sim, careless)) {
          this.crossing = hit.c;
          this.state = 'cross';
          hit.c.cw.pedsOn++;
          this.crossT = step - hit.dTo;
          this.s = wrap(this.s + this.dir * step, L);
        } else {
          this.s = hit.entry;
          this.state = 'wait';
          this.crossing = hit.c;
        }
      } else {
        this.s = wrap(this.s + this.dir * step, L);
      }
    }

    const h = this.route.path.pointAt(this.s).heading;
    const cos = Math.cos(h) * this.dir;
    if (Math.abs(cos) > 0.2) this.facing = cos > 0 ? -1 : 1; // Apple 🚶 faces left

    return true;
  }

  pose() {
    const p = this.route.path.pointAt(this.s);
    const px = Math.cos(p.heading + Math.PI / 2) * this.perp;
    const py = Math.sin(p.heading + Math.PI / 2) * this.perp;
    return {
      x: p.x + px,
      y: p.y + py,
      facing: this.facing,
      alpha: this.alpha,
      dead: this.state === 'dead',
    };
  }
}

export class PedManager {
  constructor(city) {
    this.city = city;
    this.peds = [];
    this.timer = 0;
  }

  // A spawn point anywhere on the route, but never on or right next to a
  // crossing segment.
  randomSpawnS(route) {
    const L = route.path.length;
    for (let tries = 0; tries < 20; tries++) {
      const s = Math.random() * L;
      const clear = route.crossings.every(
        (c) => wrap(s - c.sStart, L) > c.len + 12 && wrap(c.sStart - s, L) > 12,
      );
      if (clear) return s;
    }
    return route.spawnS;
  }

  update(dt, sim) {
    const enabled = sim.config.pedsEnabled && sim.night01 < NIGHT_PEDS_GONE;
    if (enabled) {
      for (const p of this.peds) p.leaving = false;
      this.timer -= dt;
      const alive = this.peds.filter((p) => p.state !== 'dead').length;
      if (alive < PED_TARGET && this.timer <= 0) {
        const routes = this.city.pedRoutes;
        const route = routes[Math.floor(Math.random() * routes.length)];
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.peds.push(new Pedestrian(route, this.randomSpawnS(route), dir));
        this.timer = PED_SPAWN_EVERY * rand(0.6, 1.8);
      }
    } else {
      for (const p of this.peds) p.leaving = true;
    }
    this.peds = this.peds.filter((p) => p.update(dt, sim));
  }
}
