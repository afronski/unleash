/**
 * flags.js — the ONLY module that talks to Unleash. Ported from the Flag City
 * sample for the in-admin demo: the Unleash Toolbar and URL-param config are
 * dropped; each city gets a live client with its own frontend token, and the
 * bootstrap only seeds values until the first fetch (live values win).
 */
import { UnleashClient, InMemoryStorageProvider } from 'unleash-proxy-client';

/** Exact flag names in the Flag City project (semantics live in flag TYPES). */
export const FLAG_NAMES = {
  cars: 'cars', // release parent for the vehicle flags
  taxis: 'cars.taxis',
  buses: 'cars.buses',
  police: 'cars.police',
  carFeatures: 'car-features', // permission parent for the per-car features
  pedestrians: 'pedestrians', // permission parent
  inattentive: 'pedestrians.clumsy', // kill switch
  trafficLights: 'trafficLights',
  daylight: 'daylight', // enabled = day, disabled = night
  sound: 'sound',
  trees: 'trees',
  houses: 'houses',
  carColor: 'car-features.color', // experiment: variants blue|red, sticky per carId
  carSpeed: 'car-features.speed', // experiment: numeric multiplier in the variant name
  headlights: 'car-features.headlights', // gradual rollout, sticky per carId
  beeping: 'car-features.beeping', // strategy constrained on the carType context field
};

export const CAR_COLOR_NAMES = ['blue', 'red'];

/**
 * Offline defaults: an empty, sunny city — no cars, no pedestrians, no
 * traffic lights; scenery (trees, houses) on. The car-color variant
 * bootstraps to 'split': in a real Unleash the flag carries blue/red variants
 * at 50%/50%, and since a frontend SDK evaluates for one context, the sim
 * re-creates the sticky per-car split itself (the flag-ants trick). A 'blue'
 * or 'red' override forces the whole fleet to one color.
 */
function defaultBootstrap() {
  const off = { name: 'disabled', enabled: false };
  const toggle = (name, enabled = true, variant = off) => ({
    name, enabled, variant, impressionData: false,
  });
  // Mirrors the provisioned defaults: an almost-empty daytime city — just
  // scenery and plain cars; everything else waits for its flag.
  return [
    toggle(FLAG_NAMES.cars),
    toggle(FLAG_NAMES.taxis, false),
    toggle(FLAG_NAMES.buses, false),
    toggle(FLAG_NAMES.police, false),
    toggle(FLAG_NAMES.carFeatures, false),
    toggle(FLAG_NAMES.pedestrians, false),
    toggle(FLAG_NAMES.inattentive, false),
    toggle(FLAG_NAMES.trafficLights, false),
    toggle(FLAG_NAMES.daylight),
    toggle(FLAG_NAMES.sound),
    toggle(FLAG_NAMES.trees),
    toggle(FLAG_NAMES.houses),
    toggle(FLAG_NAMES.carColor, false, { name: 'split', enabled: true }),
    toggle(FLAG_NAMES.carSpeed, false, { name: '1.0', enabled: true }),
    toggle(FLAG_NAMES.headlights, false, { name: '10', enabled: true }),
    toggle(FLAG_NAMES.beeping, false, { name: 'carType:taxi', enabled: true }),
  ];
}

/**
 * Build the live flags client for one city. Never throws, never blocks on
 * the network. Returns a tiny Unleash-agnostic facade.
 *
 * The in-memory storage provider is required: two clients on one page (plus
 * the admin UI's own client) would otherwise share the SDK's fixed
 * localStorage key and cross-contaminate.
 */
export function createCityFlags({ url, clientKey, environmentName, refreshInterval = 3 }) {
  const client = new UnleashClient({
    url,
    clientKey,
    appName: 'flagcity',
    // A synthetic carId: strategies sticky on the carId context field fail
    // outright when the field is missing (custom stickiness has no random
    // fallback), so the city evaluates as one representative car. The sim
    // still re-creates the per-car spread locally.
    context: {
      userId: environmentName,
      properties: { carId: `city-${environmentName}` },
    },
    refreshInterval,
    bootstrap: defaultBootstrap(),
    bootstrapOverride: false,
    storageProvider: new InMemoryStorageProvider(),
  });

  client.on('error', (err) => {
    console.warn(`[FlagCity ${environmentName}] Unleash error — continuing on last-known values:`, err);
  });
  client.start();

  return {
    city: { id: environmentName, name: environmentName },
    live: true,
    // Strategy details (rollout %, constraint targets, variant weights) are
    // not exposed by the Frontend API; the demo reads them via the admin API
    // and injects them here before every rebind. Absent hints fall back to
    // the sample's client-side behavior.
    hints: null,
    isEnabled: (name) => client.isEnabled(name),
    /** Variant NAME constrained to an allowed list (typos/disabled → fallback). */
    variant: (name, allowed, fallback) => {
      const v = client.getVariant(name).name;
      return allowed.includes(v) ? v : fallback;
    },
    /** Raw variant name, for free-form encodings. */
    variantRaw: (name) => client.getVariant(name).name,
    /** Numeric variant: the value lives in the variant NAME, with a payload
     * fallback; invalid/disabled → fallback, clamped. */
    variantNumber: (name, fallback, min, max) => {
      const v = client.getVariant(name);
      for (const candidate of [v.name, v.payload && v.payload.value]) {
        const n = Number(candidate);
        if (candidate !== undefined && candidate !== '' && Number.isFinite(n)) {
          return Math.min(max, Math.max(min, n));
        }
      }
      return fallback;
    },
    onUpdate: (listener) => {
      client.on('update', listener);
      client.on('ready', listener);
    },
    stop: () => client.stop(),
  };
}
