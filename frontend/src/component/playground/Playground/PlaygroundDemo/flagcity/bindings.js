/**
 * bindings.js — THE BRIDGE (same seam as flag-ants).
 *
 * The single place where flag state becomes simulation config. Called once at
 * startup and again on every Unleash `update` (server refresh or toolbar
 * override), so flips re-bind the live sim without a reload.
 */
import { FLAG_NAMES, CAR_COLOR_NAMES } from './flags.js';

// Values the beeping strategy may constrain on, per context field.
const BEEP_FIELDS = {
  carType: ['car', 'taxi', 'bus', 'police'],
  carColor: ['blue', 'red', 'yellow', 'orange', 'black'],
};

export function bindFlagsToSim(flags, sim) {
  const cfg = sim.config;
  const changes = [];
  const set = (key, next) => {
    if (cfg[key] !== next) {
      cfg[key] = next;
      changes.push(key);
    }
  };

  set('carsEnabled', flags.isEnabled(FLAG_NAMES.cars));
  set('taxiEnabled', flags.isEnabled(FLAG_NAMES.taxis));
  set('busEnabled', flags.isEnabled(FLAG_NAMES.buses));
  set('policeEnabled', flags.isEnabled(FLAG_NAMES.police));
  set('pedsEnabled', flags.isEnabled(FLAG_NAMES.pedestrians));
  set('inattentive', flags.isEnabled(FLAG_NAMES.inattentive));
  set('daylight', flags.isEnabled(FLAG_NAMES.daylight));
  set('sound', flags.isEnabled(FLAG_NAMES.sound));
  set('treesEnabled', flags.isEnabled(FLAG_NAMES.trees));
  set('housesEnabled', flags.isEnabled(FLAG_NAMES.houses));

  const hints = flags.hints || {};

  // Car speed multiplier lives in the variant payload ('1.0' default, 0-3).
  // With more than one strategy or variant there is no single fleet-wide
  // multiplier — the card label shows 'mixed' instead (admin-API hint).
  set('speedMult', flags.variantNumber(FLAG_NAMES.carSpeed, 1, 0, 3));
  set('speedMixed', Boolean(hints.speed && hints.speed.mixed));

  // Port: headlights is a real gradual rollout (sticky per carId) in Unleash.
  // The Frontend API can't evaluate per car, so the demo reads the rollout
  // percentage from the strategy via admin-API hints and re-creates the
  // sticky per-car hash locally, exactly like the sample did.
  const rawPct = hints.headlights
    ? (hints.headlights.enabled ? hints.headlights.rollout : 0)
    : flags.isEnabled(FLAG_NAMES.headlights)
      ? flags.variantNumber(FLAG_NAMES.headlights, 10, 0, 100)
      : 0;
  set('headlightsPct', rawPct > 1 ? rawPct / 100 : rawPct);

  // Port: beeping carries a real activation-strategy constraint on the
  // carType/carColor context fields; the target comes from admin-API hints
  // (the Frontend API hides constraints of per-car evaluations).
  const beepHint = hints.beeping;
  set('beeping', beepHint ? beepHint.enabled : flags.isEnabled(FLAG_NAMES.beeping));
  const [field, value] = beepHint && beepHint.field
    ? [beepHint.field, beepHint.value]
    : (flags.variantRaw(FLAG_NAMES.beeping) || '').split(/[:-]/);
  const validTarget = BEEP_FIELDS[field] && BEEP_FIELDS[field].includes(value);
  set('beepField', validTarget ? field : 'carType');
  set('beepValue', validTarget ? value : 'taxi');

  // Traffic lights go through setLights(): the mode transition resets
  // reservation queues.
  const lights = flags.isEnabled(FLAG_NAMES.trafficLights);
  if (cfg.lightsEnabled !== lights) {
    sim.setLights(lights);
    changes.push('lightsEnabled');
  }

  // Port: car color is an experiment with variants sticky per carId. The sim
  // re-creates the per-car split locally; a single 100% variant (read from
  // admin-API hints) forces the whole fleet to that color.
  const color = hints.carColor
    ? hints.carColor
    : flags.variant(FLAG_NAMES.carColor, CAR_COLOR_NAMES, 'split');
  if (cfg.carColor !== color) {
    sim.setCarColor(color);
    changes.push('carColor');
  }

  return changes;
}
