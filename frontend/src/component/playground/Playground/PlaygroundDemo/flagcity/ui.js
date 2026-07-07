// Per-city card: header (name, live/offline, speed chip, headlights chip), a
// read-only flag-state strip, and the canvas. All control happens through
// Unleash; the card only REFLECTS flag state. Port note: the car-color chip
// was removed — color is assigned per carId, so there is no fleet-wide label.

const BADGES = [
  { key: 'carsEnabled', icon: '\u{1F697}', label: 'cars' },
  { key: 'taxiEnabled', icon: '\u{1F695}', label: 'cars.taxis' },
  { key: 'busEnabled', icon: '\u{1F68C}', label: 'cars.buses' },
  { key: 'policeEnabled', icon: '\u{1F693}', label: 'cars.police' },
  { key: 'pedsEnabled', icon: '\u{1F6B6}', label: 'pedestrians' },
  { key: 'inattentive', icon: '\u{1F648}', label: 'pedestrians.clumsy' },
  { key: 'lightsEnabled', icon: '\u{1F6A6}', label: 'trafficLights' },
  { key: 'daylight', icon: '\u{1F31E}', iconOff: '\u{1F319}', label: 'daylight' },
  { key: 'sound', icon: '\u{1F50A}', label: 'sound' },
  { key: 'treesEnabled', icon: '\u{1F333}', label: 'trees' },
  { key: 'housesEnabled', icon: '\u{1F3E0}', label: 'houses' },
  { key: 'beeping', icon: '\u{1F4E3}', label: 'car-features.beeping' },
];

export function buildCityCard(root, sim, { name, live }) {
  root.innerHTML = `
    <header>
      <h1>${name}</h1>
      <span class="context">${live ? 'live' : 'offline'}</span>
      <span class="spacer"></span>
      <span class="variant-chip hl-chip" title="car-features.headlights (gradual rollout)">&#x1F4A1; <span class="val">10%</span></span>
      <span class="variant-chip speed-chip" title="car-features.speed">speed <span class="val">1.0&times;</span></span>
    </header>
    <div class="badges">
      ${BADGES.map((b) => `<span data-key="${b.key}" title="${b.label}">${b.icon}</span>`).join('')}
    </div>
    <canvas></canvas>
  `;

  const badgeEls = new Map(
    [...root.querySelectorAll('.badges span')].map((el) => [el.dataset.key, el]),
  );
  const speedVal = root.querySelector('.speed-chip .val');
  const hlChip = root.querySelector('.hl-chip');
  const hlVal = root.querySelector('.hl-chip .val');
  const beepBadge = badgeEls.get('beeping');

  const refresh = () => {
    for (const b of BADGES) {
      const on = Boolean(sim.config[b.key]);
      const el = badgeEls.get(b.key);
      el.classList.toggle('off', !on);
      if (b.iconOff) el.textContent = on ? b.icon : b.iconOff;
    }
    speedVal.textContent = sim.config.speedMixed
      ? 'mixed'
      : `${sim.config.speedMult.toFixed(1)}×`;
    hlVal.textContent = `${Math.round(sim.config.headlightsPct * 100)}%`;
    hlChip.classList.toggle('off', sim.config.headlightsPct === 0);
    beepBadge.title = `car-features.beeping (${sim.config.beepField}:${sim.config.beepValue})`;
  };
  refresh();

  return { canvas: root.querySelector('canvas'), refresh };
}
