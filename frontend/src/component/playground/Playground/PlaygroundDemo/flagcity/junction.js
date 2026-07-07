import { wrap, relTo } from './path.js';
import {
  LIGHT_CYCLE, JUNCTION_HALF, STOPLINE_MARGIN, CROSSWALK_STOP_MARGIN,
  RESERVE_TIMEOUT, GRANT_DISTANCE, GAP_MIN,
} from './config.js';

export class LightController {
  constructor(offset) {
    this.total = LIGHT_CYCLE.reduce((a, p) => a + p[2], 0);
    this.t = wrap(offset, this.total);
  }

  update(dt) {
    this.t = wrap(this.t + dt, this.total);
  }

  segmentAt(t) {
    for (const seg of LIGHT_CYCLE) {
      if (t < seg[2]) return { seg, remain: seg[2] - t };
      t -= seg[2];
    }
    return { seg: LIGHT_CYCLE[LIGHT_CYCLE.length - 1], remain: 0 };
  }

  stateFor(phase) {
    return this.segmentAt(this.t).seg[phase];
  }

  timeUntilGreen(phase) {
    if (this.stateFor(phase) === 'green') return 0;
    let acc = 0;
    let t = this.t;
    for (let guard = 0; guard < 2 * LIGHT_CYCLE.length; guard++) {
      const { remain } = this.segmentAt(t);
      acc += remain;
      t = wrap(t + remain + 1e-6, this.total);
      if (this.segmentAt(t).seg[phase] === 'green') return acc;
    }
    return acc;
  }
}

// One road junction: two perpendicular one-way streams crossing a shared box.
// Owns the light controller (lights mode) and the FCFS reservation (no-lights
// mode). Physical box occupancy is tracked every tick in both modes.
export class Junction {
  constructor(def, loopsById) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.half = JUNCTION_HALF;
    this.ctrl = new LightController(def.offset);
    this.queue = [];
    this.reserved = null;
    this.headWait = 0;
    this.occ = new Map(); // car -> stream, physical presence in the box
    this.committed = 0;
    this.committedBy = [0, 0];

    this.streams = def.streams.map((sd) => {
      const loop = loopsById[sd.loop];
      const sCenter = loop.path.sAtPoint(def.x, def.y);
      const stream = {
        junction: this,
        loop,
        phase: sd.phase,
        sCenter,
        stopRel: -this.half - STOPLINE_MARGIN,
        stopS: 0,
        entryS: 0,
        exitS: 0,
        coupleCrosswalk(cwS) {
          const rel = relTo(cwS, this.sCenter, this.loop.path.length);
          this.stopRel = Math.min(this.stopRel, rel - CROSSWALK_STOP_MARGIN);
        },
      };
      loop.junctionStreams.push(stream);
      return stream;
    });
  }

  // Called after crosswalk coupling may have moved stop lines upstream.
  finalize() {
    for (const st of this.streams) {
      const L = st.loop.path.length;
      st.stopS = wrap(st.sCenter + st.stopRel, L);
      st.entryS = wrap(st.sCenter - this.half, L);
      st.exitS = wrap(st.sCenter + this.half, L);
    }
  }

  relOf(car, stream) {
    return relTo(car.s, stream.sCenter, stream.loop.path.length);
  }

  streamOf(car) {
    return this.streams.find((st) => st.loop === car.loop);
  }

  update(dt, cfg) {
    this.ctrl.update(dt);

    // occ = physically inside the box. committed = past the stop line but not
    // yet clear of the box; such cars will not stop, so they block both a
    // reservation grant and the cross stream's green (covers e.g. a mode
    // toggle or a slow bus caught between its stop line and the box).
    this.occ.clear();
    this.committedBy = [0, 0];
    this.streams.forEach((st, idx) => {
      for (const car of st.loop.cars) {
        const rel = this.relOf(car, st);
        if (rel > -this.half && rel - car.len < this.half) this.occ.set(car, st);
        if (rel > st.stopRel && rel - car.len < this.half && car !== this.reserved) {
          this.committedBy[idx]++;
        }
      }
    });
    this.committed = this.committedBy[0] + this.committedBy[1];

    if (this.reserved) {
      const st = this.streamOf(this.reserved);
      const rel = this.relOf(this.reserved, st);
      if (rel - this.reserved.len > this.half) {
        this.reserved = null; // fully exited
      } else if (rel < st.stopRel && !this.exitClear(this.reserved, st)) {
        // Reservations are provisional until the stop line: if the holder's
        // exit collapsed before it committed, revoke so cross traffic (or a
        // queue-mate with a clear exit) can use the box. It keeps its place.
        if (!this.queue.includes(this.reserved)) this.queue.unshift(this.reserved);
        this.reserved = null;
      }
    }

    // Drop queue entries that already entered the box (normally popped at grant).
    this.queue = this.queue.filter((car) => this.relOf(car, this.streamOf(car)) < -this.half);

    if (!cfg.lightsEnabled && this.queue.length && this.queue[0].v < 1 && this.occ.size === 0) {
      this.headWait += dt;
    } else {
      this.headWait = 0;
    }
  }

  // Lights mode: even on green, don't enter while cross traffic is in the box
  // or committed to entering it.
  crossBlocked(stream) {
    const other = this.streams[0] === stream ? 1 : 0;
    return this.committedBy[other] > 0;
  }

  dStopOf(car) {
    const st = this.streamOf(car);
    return wrap(st.stopS - car.s, st.loop.path.length);
  }

  // No-lights mode: first-come-first-served reservation of the box, with a
  // head-of-line bypass — a blocked queue head must not gridlock the city.
  request(car, stream) {
    if (this.reserved === car || this.occ.has(car)) return true;
    if (!this.queue.includes(car)) this.queue.push(car);
    if (this.occ.size > 0 || this.committed > 0 || this.reserved !== null) return false;

    let grantee = this.queue.find(
      (c) => this.dStopOf(c) < GRANT_DISTANCE && this.exitClear(c, this.streamOf(c)),
    );
    if (!grantee && this.headWait > RESERVE_TIMEOUT && this.dStopOf(this.queue[0]) < GRANT_DISTANCE) {
      grantee = this.queue[0]; // push through a pathological standstill
    }
    if (grantee !== car) return false;

    this.queue.splice(this.queue.indexOf(car), 1);
    this.reserved = car;
    this.headWait = 0;
    return true;
  }

  // "Don't block the box": only enter if the car can fully clear the far side.
  exitClear(car, stream) {
    const L = stream.loop.path.length;
    const need = wrap(stream.exitS - car.s, L) + car.len + GAP_MIN + 6;
    let nearest = Infinity;
    for (const other of stream.loop.cars) {
      if (other === car) continue;
      const gap = wrap(other.s - car.s, L) - other.len;
      if (gap < nearest) nearest = gap;
    }
    return nearest > need;
  }

  clearReservations() {
    this.queue.length = 0;
    this.reserved = null;
    this.headWait = 0;
  }

  // A car is being removed from traffic (e.g. its type was toggled off).
  dropCar(car) {
    const i = this.queue.indexOf(car);
    if (i !== -1) this.queue.splice(i, 1);
    if (this.reserved === car) this.reserved = null;
  }
}
