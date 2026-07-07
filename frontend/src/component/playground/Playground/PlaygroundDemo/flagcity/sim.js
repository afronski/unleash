import { buildCity } from './city.js';
import { Junction } from './junction.js';
import { Car } from './car.js';
import { PedManager } from './pedestrian.js';
import { wrap, relTo } from './path.js';
import { EMOJI, FLEET, GAP_MIN, NIGHT_FADE } from './config.js';

export class Sim {
  constructor() {
    this.config = {
      speedMult: 1,
      carsEnabled: false,
      taxiEnabled: true,
      busEnabled: true,
      policeEnabled: true,
      pedsEnabled: false,
      inattentive: false,
      lightsEnabled: false,
      daylight: true, // switch: true = day, false = night
      sound: true,
      treesEnabled: true,
      housesEnabled: true,
      carColor: 'split', // 'split' = 50/50 blue/red per car; 'blue'/'red' = uniform
      headlightsPct: 0.1, // gradual rollout: share of cars that have headlights
      beeping: false,
      beepField: 'carType', // activation-strategy constraint over car context
      beepValue: 'taxi',
    };
    this.city = buildCity((def, loopsById) => new Junction(def, loopsById));
    this.cars = []; // the whole fleet; only cars with .active are in traffic
    this.time = 0;
    this.night01 = 0; // 0 = day, 1 = night
    this.stats = { deaths: 0 };
    this.callbacks = { onDeath: null, onBeep: null };

    const kindCounters = {};
    for (const loop of this.city.loops) {
      const kinds = FLEET[loop.id];
      kinds.forEach((kind, i) => {
        const glyphs = EMOJI.kinds[kind] || [EMOJI.carColors.red];
        const n = (kindCounters[kind] = (kindCounters[kind] || 0) + 1);
        const car = new Car(
          loop, (i * loop.path.length) / kinds.length + 30, kind,
          glyphs[n % glyphs.length], this.cars.length,
        );
        this.cars.push(car);
        if (this.wantsActive(car)) {
          loop.cars.push(car);
        } else {
          car.active = false;
          car.alpha = 0;
        }
      });
    }
    this.setCarColor(this.config.carColor);

    this.peds = new PedManager(this.city);
  }

  // 'blue' / 'red' force the whole generic fleet; 'split' (the default)
  // re-creates the 50/50 variant split with a sticky per-car assignment.
  setCarColor(mode) {
    this.config.carColor = mode;
    let i = 0;
    for (const car of this.cars) {
      if (car.kind !== 'car') continue;
      car.color = mode === 'split' ? (i % 2 === 0 ? 'blue' : 'red') : mode;
      car.emoji = EMOJI.carColors[car.color];
      i++;
    }
  }

  // Does the beeping flag's activation strategy match this car's context
  // fields ({ carType, carColor })?
  beepsFor(car) {
    const cfg = this.config;
    if (!cfg.beeping) return false;
    const context = { carType: car.kind, carColor: car.color };
    return context[cfg.beepField] === cfg.beepValue;
  }

  update(dt) {
    this.updateDayNight(dt);
    this.manageFleet(dt);
    for (const j of this.city.junctions) j.update(dt, this.config);
    for (const loop of this.city.loops) {
      loop.cars.sort((a, b) => a.s - b.s);
      for (const car of loop.cars) car.update(dt, this);
    }
    this.peds.update(dt, this);
    this.time += dt;
  }

  updateDayNight(dt) {
    const target = this.config.daylight ? 0 : 1;
    const step = dt / NIGHT_FADE;
    this.night01 = this.night01 < target
      ? Math.min(this.night01 + step, target)
      : Math.max(this.night01 - step, target);
  }

  wantsActive(car) {
    const cfg = this.config;
    return cfg.carsEnabled && (car.kind === 'car' || cfg[`${car.kind}Enabled`]);
  }

  manageFleet(dt) {
    for (const car of this.cars) {
      const desired = this.wantsActive(car);
      if (car.active) {
        if (!desired) {
          car.alpha -= dt * 2;
          if (car.alpha <= 0) this.deactivate(car);
        } else {
          car.alpha = Math.min(1, car.alpha + dt * 2);
        }
      } else if (desired) {
        car.respawnTimer -= dt;
        if (car.respawnTimer <= 0 && !this.tryActivate(car)) car.respawnTimer = 0.5;
      }
    }
  }

  deactivate(car) {
    car.active = false;
    car.v = 0;
    const i = car.loop.cars.indexOf(car);
    if (i !== -1) car.loop.cars.splice(i, 1);
    for (const j of this.city.junctions) j.dropCar(car);
  }

  // Re-enter traffic at the first position around the loop with a free gap,
  // clear of junction approach zones and occupied crosswalks.
  tryActivate(car) {
    const loop = car.loop;
    const L = loop.path.length;
    for (let k = 0; k < 20; k++) {
      const s = wrap(car.s + (k * L) / 20, L);
      const clearOfCars = loop.cars.every((o) =>
        wrap(o.s - s, L) - o.len >= GAP_MIN + 8 && wrap(s - o.s, L) - car.len >= GAP_MIN + 8);
      if (!clearOfCars) continue;
      const clearOfJunctions = loop.junctionStreams.every((st) => {
        const rel = relTo(s, st.sCenter, L);
        return rel <= st.stopRel - car.len - 10 || rel - car.len >= st.junction.half + 10;
      });
      if (!clearOfJunctions) continue;
      const clearOfCrosswalks = loop.crosswalks.every((cw) => {
        const rel = relTo(s, cw.roadS, L);
        return rel <= -14 || rel - car.len >= 14;
      });
      if (!clearOfCrosswalks) continue;
      car.s = s;
      car.v = 0;
      car.alpha = 0;
      car.active = true;
      loop.cars.push(car);
      return true;
    }
    return false;
  }

  setLights(on) {
    this.config.lightsEnabled = on;
    for (const j of this.city.junctions) j.clearReservations();
  }
}
