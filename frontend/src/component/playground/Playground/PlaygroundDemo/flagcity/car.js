import { wrap } from './path.js';
import { CAR_KINDS, CAR_ACCEL, CAR_DECEL, GAP_MIN, LOOKAHEAD } from './config.js';

// The carColor context field for the non-generic kinds (generic cars get
// blue/red from the variant split in Sim.setCarColor).
const KIND_COLORS = { taxi: 'yellow', bus: 'orange', police: 'black' };

// A car's `s` is the arc-length position of its FRONT bumper on its loop.
export class Car {
  constructor(loop, s, kind, emoji, fleetIndex) {
    const spec = CAR_KINDS[kind];
    this.loop = loop;
    this.s = s;
    this.v = 0;
    this.kind = kind;
    this.color = KIND_COLORS[kind] || 'red';
    this.cruise = spec.cruise[0] + Math.random() * (spec.cruise[1] - spec.cruise[0]);
    this.len = spec.len;
    this.size = spec.size;
    this.emoji = emoji;
    this.active = true;
    this.alpha = 1;
    this.respawnTimer = 0;
    // Sticky gradual-rollout hash in [0,1): golden-ratio spacing spreads the
    // fleet evenly, and a car once inside the rollout stays inside as the
    // percentage grows.
    this.rollHash = (fleetIndex * 0.6180339887) % 1;
    this.beepTimer = 2 + Math.random() * 6;
    this.beepFlash = 0;
    this.dObs = Infinity; // for the debug overlay
  }

  update(dt, sim) {
    const cfg = sim.config;
    const L = this.loop.path.length;
    // dHard: physical obstacles (car ahead, junction box) — never overrun.
    // dSoft: crosswalks — braking is best-effort, so an inattentive
    // pedestrian stepping out inside the braking distance CAN be hit.
    let dHard = Infinity;
    let dSoft = Infinity;

    // 1. The car ahead on the same loop.
    const cars = this.loop.cars;
    if (cars.length > 1) {
      const i = cars.indexOf(this);
      const ahead = cars[(i + 1) % cars.length];
      dHard = Math.min(dHard, wrap(ahead.s - this.s, L) - ahead.len);
    }

    // 2/3. Junctions on this loop. A car past the stop line always continues,
    // which falls out naturally: its wrapped distance jumps past LOOKAHEAD.
    for (const st of this.loop.junctionStreams) {
      const dStop = wrap(st.stopS - this.s, L);
      if (dStop > LOOKAHEAD) continue;
      const j = st.junction;
      if (cfg.lightsEnabled) {
        const state = j.ctrl.stateFor(st.phase);
        let stop = state === 'red'
          || (state === 'amber' && dStop > (this.v * this.v) / (2 * CAR_DECEL));
        if (!stop && j.crossBlocked(st)) stop = true;
        if (stop) dHard = Math.min(dHard, dStop);
      } else if (!j.request(this, st)) {
        dHard = Math.min(dHard, dStop);
      }
    }

    // Universal "don't block the box": if braking for whatever is ahead would
    // leave this car standing inside a junction box (e.g. a queue spilling
    // back from the next junction), hold at the stop line instead. This is
    // what keeps cross streets passable and the city gridlock-free.
    // Farthest box first, so the binding clamp is the nearest one.
    if (dHard !== Infinity) {
      const streams = [...this.loop.junctionStreams]
        .sort((a, b) => wrap(b.stopS - this.s, L) - wrap(a.stopS - this.s, L));
      for (const st of streams) {
        const dStop = wrap(st.stopS - this.s, L);
        if (dStop > LOOKAHEAD + 150) continue; // passed, or too far to matter
        const dEntry = wrap(st.entryS - this.s, L);
        const dExit = wrap(st.exitS - this.s, L);
        const rest = dHard - GAP_MIN; // where the braking envelope parks the front
        if (rest > dEntry - 4 && rest - this.len < dExit + 4) {
          dHard = Math.min(dHard, dStop);
        }
      }
    }

    // 4. Crosswalks with pedestrians on them — in both modes.
    for (const cw of this.loop.crosswalks) {
      if (cw.pedsOn <= 0) continue;
      const dCw = wrap(cw.roadS - this.s, L);
      if (dCw < LOOKAHEAD) dSoft = Math.min(dSoft, dCw - 26);
    }

    const d = Math.min(dHard, dSoft);
    this.dObs = d;

    // Kinematic braking envelope: never approach an obstacle faster than the
    // speed from which we can stop GAP_MIN short of it.
    const vSafe = d === Infinity ? Infinity : Math.sqrt(2 * CAR_DECEL * Math.max(0, d - GAP_MIN));
    const target = Math.min(this.cruise * cfg.speedMult, vSafe);
    this.v = this.v < target
      ? Math.min(this.v + CAR_ACCEL * dt, target)
      : Math.max(this.v - CAR_DECEL * dt, target);

    const maxMove = dHard === Infinity ? Infinity : Math.max(0, dHard - 2); // no overshoot
    this.s = wrap(this.s + Math.min(this.v * dt, maxMove), L);

    // Honking: cars matched by the beeping strategy honk when stuck behind
    // something, and occasionally just because.
    this.beepFlash = Math.max(0, this.beepFlash - dt);
    if (sim.beepsFor(this)) {
      this.beepTimer -= dt;
      if (this.beepTimer <= 0) {
        const blocked = this.v < 5 && d < 70;
        if (blocked || Math.random() < 0.25) {
          this.beepFlash = 0.6;
          if (sim.callbacks.onBeep) sim.callbacks.onBeep();
        }
        this.beepTimer = blocked ? 2 + Math.random() * 2 : 5 + Math.random() * 9;
      }
    }
  }

  pose() {
    return this.loop.path.pointAt(this.s - this.len / 2); // sprite center
  }
}
