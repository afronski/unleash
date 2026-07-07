export const WORLD_W = 1200;
export const WORLD_H = 800;

export const ROAD_WIDTH = 44;
export const SIDEWALK_WIDTH = 12;
export const SIDEWALK_OFFSET = 28;       // road centerline -> sidewalk band center

export const CAR_ACCEL = 120;            // logical px/s^2
export const CAR_DECEL = 220;

// Per-kind vehicle properties. 'car' is the generic kind controlled only by
// the parent Cars toggle; the others have their own child toggles.
export const CAR_KINDS = {
  car: { len: 34, size: 40, cruise: [70, 95] },
  taxi: { len: 34, size: 40, cruise: [75, 100] },
  bus: { len: 44, size: 52, cruise: [55, 70] },
  police: { len: 34, size: 40, cruise: [80, 105] },
};

// Fleet composition per loop, in spawn order.
export const FLEET = {
  A: ['car', 'taxi', 'car', 'bus'],
  B: ['car', 'police', 'car', 'taxi'],
  C: ['car', 'bus', 'taxi', 'car', 'police'],
};
export const GAP_MIN = 14;               // resting gap kept by the braking envelope
export const LOOKAHEAD = 220;            // must exceed braking distance at 3x speed

export const JUNCTION_HALF = 32;         // junction box = 64x64
export const STOPLINE_MARGIN = 10;       // stop line this far before the box entry
export const CROSSWALK_STOP_MARGIN = 15; // stop line this far before a coupled crosswalk
export const RESERVE_TIMEOUT = 8;        // s a queue head may starve before force-grant
export const GRANT_DISTANCE = 100;       // reservations are only granted this close to the stop line

// [nsState, ewState, duration(s)] — phase 0 = NS stream, phase 1 = EW stream
export const LIGHT_CYCLE = [
  ['green', 'red', 5],
  ['amber', 'red', 1.5],
  ['red', 'red', 1],
  ['red', 'green', 5],
  ['red', 'amber', 1.5],
  ['red', 'red', 1],
];

export const PED_TARGET = 9;
export const PED_SPAWN_EVERY = 1.5;      // s between spawns while under target
export const PED_SPEED_MIN = 22;
export const PED_SPEED_MAX = 40;
export const PED_CROSS_BOOST = 1.3;      // pedestrians hurry while on the stripes
export const PED_GAP_WINDOW = 150;       // no moving car within this range -> safe to cross
export const CROSSWALK_HALF = 9;         // stripe half-width along the road axis
export const PED_PAUSE_EVERY = [8, 30];  // s between random idle pauses
export const PED_PAUSE_FOR = [1, 3.5];   // s a pause lasts

export const INATTENTIVE_SHARE = 0.65;   // chance a spawned pedestrian is careless (port: raised from 0.35 so the kill switch reads clearly)
export const KILL_SPEED = 12;            // a car this fast on the stripe is lethal
export const SKULL_LINGERS = 8;          // s a skull stays on the road

// Day/night is a switch (daylight flag: enabled = day, disabled = night);
// the scene fades between the two over this many seconds.
export const NIGHT_FADE = 3;
export const NIGHT_PEDS_GONE = 0.5;      // above this darkness pedestrians go home

// Apple/Noto/Segoe vehicle emoji face left, so heading needs a half-turn.
export const CAR_SPRITE_BASE_ANGLE = Math.PI;

export const EMOJI = {
  kinds: {
    taxi: ['\u{1F695}'],             // 🚕
    bus: ['\u{1F68C}'],              // 🚌
    police: ['\u{1F693}'],           // 🚓
  },
  // Generic cars are colored by the car-color variant flag.
  carColors: { red: '\u{1F697}', blue: '\u{1F699}' }, // 🚗 / 🚙
  ped: '\u{1F6B6}',                  // 🚶
  skull: '\u{1F480}',                // 💀
  houses: ['\u{1F3E0}', '\u{1F3E1}'], // 🏠🏡
  tree: '\u{1F333}',                 // 🌳
  light: '\u{1F6A6}',                // 🚦
};

