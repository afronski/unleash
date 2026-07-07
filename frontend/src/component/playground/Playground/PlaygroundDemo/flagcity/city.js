import { Path } from './path.js';

// Three one-way (clockwise) rectangular loops. They cross perpendicularly at
// exactly four junctions and never run collinear, so cross-loop conflicts
// exist only inside junction boxes and on crosswalks.
const LOOPS = [
  { id: 'A', points: [[110, 150], [500, 150], [500, 470], [110, 470]] },
  { id: 'B', points: [[700, 150], [1090, 150], [1090, 470], [700, 470]] },
  { id: 'C', points: [[360, 310], [840, 310], [840, 650], [360, 650]] },
];

// phase 0 = the north-south stream, phase 1 = the east-west stream.
const JUNCTIONS = [
  { id: 'J1', x: 360, y: 470, offset: 0, streams: [{ loop: 'C', phase: 0 }, { loop: 'A', phase: 1 }] },
  { id: 'J2', x: 500, y: 310, offset: 4, streams: [{ loop: 'A', phase: 0 }, { loop: 'C', phase: 1 }] },
  { id: 'J3', x: 700, y: 310, offset: 8, streams: [{ loop: 'B', phase: 0 }, { loop: 'C', phase: 1 }] },
  { id: 'J4', x: 840, y: 470, offset: 11, streams: [{ loop: 'C', phase: 0 }, { loop: 'B', phase: 1 }] },
];

// orient 'v' = pedestrians walk vertically (stripe crosses a horizontal road).
// A `junction` entry couples the crosswalk to that junction's stream on the
// same loop: the stream's stop line moves upstream of the stripe and
// pedestrians may cross on red.
const CROSSWALKS = [
  { id: 'cw1', loop: 'A', x: 412, y: 470, orient: 'v', junction: 'J1' },
  { id: 'cw2', loop: 'C', x: 360, y: 514, orient: 'h', junction: 'J1' },
  { id: 'cw3', loop: 'A', x: 220, y: 470, orient: 'v' },
  { id: 'cw4', loop: 'C', x: 648, y: 310, orient: 'v', junction: 'J3' },
  { id: 'cw5', loop: 'B', x: 892, y: 470, orient: 'v', junction: 'J4' },
  { id: 'cw6', loop: 'B', x: 700, y: 362, orient: 'h', junction: 'J3' },
  { id: 'cw7', loop: 'C', x: 360, y: 390, orient: 'h' },
  { id: 'cw8', loop: 'B', x: 770, y: 470, orient: 'v' },
  { id: 'cw9', loop: 'C', x: 840, y: 390, orient: 'h', junction: 'J4' },
  { id: 'cw10', loop: 'C', x: 840, y: 560, orient: 'h' },
  { id: 'cw11', loop: 'A', x: 500, y: 246, orient: 'h', junction: 'J2' },
];

const HOUSES = [
  { x: 200, y: 300 }, { x: 280, y: 220 },
  { x: 950, y: 300 }, { x: 1030, y: 220 },
  { x: 520, y: 570 }, { x: 680, y: 570 },
];

const TREES = [
  { x: 60, y: 90 }, { x: 1140, y: 95 }, { x: 65, y: 610 }, { x: 1135, y: 615 },
  { x: 550, y: 205 }, { x: 652, y: 188 }, { x: 556, y: 425 }, { x: 940, y: 595 },
];

// Closed sidewalk routes. Every `crossings` entry marks the segment from
// vertex fromIdx to fromIdx+1 as a road crossing over the named crosswalk;
// each route crosses every road loop an even number of times.
const PED_ROUTES = [
  {
    id: 'P1', spawnIdx: 0,
    points: [
      [220, 340], [332, 340], [332, 390], [388, 390], [412, 390], [412, 442],
      [412, 498], [388, 498], [388, 514], [332, 514], [220, 514], [220, 498], [220, 442],
    ],
    crossings: [
      { fromIdx: 2, cw: 'cw7' }, { fromIdx: 5, cw: 'cw1' },
      { fromIdx: 8, cw: 'cw2' }, { fromIdx: 11, cw: 'cw3' },
    ],
  },
  {
    id: 'P2', spawnIdx: 0,
    points: [
      [930, 340], [868, 340], [868, 390], [812, 390], [770, 390], [770, 442],
      [770, 498], [560, 498], [560, 600], [812, 600], [812, 560], [868, 560],
      [892, 560], [892, 498], [892, 442], [930, 442],
    ],
    crossings: [
      { fromIdx: 2, cw: 'cw9' }, { fromIdx: 5, cw: 'cw8' },
      { fromIdx: 10, cw: 'cw10' }, { fromIdx: 13, cw: 'cw5' },
    ],
  },
  {
    // North route: down through C's middle block, then west across the A-right
    // road (cw11) and diagonally into loop A to join P1's path, and back.
    id: 'P3', spawnIdx: 8,
    points: [
      [648, 282], [648, 338], [672, 338], [672, 362], [728, 362], [770, 362],
      [770, 442], [770, 498], [648, 498], [648, 338], [648, 282], [648, 246],
      [528, 246], [472, 246], [372, 246], [282, 340], [372, 246], [472, 246],
      [528, 246], [648, 246],
    ],
    crossings: [
      { fromIdx: 0, cw: 'cw4' }, { fromIdx: 3, cw: 'cw6' },
      { fromIdx: 6, cw: 'cw8' }, { fromIdx: 9, cw: 'cw4' },
      { fromIdx: 12, cw: 'cw11' }, { fromIdx: 17, cw: 'cw11' },
    ],
  },
];

export function buildCity(makeJunction) {
  const loops = LOOPS.map((def) => ({
    id: def.id,
    path: new Path(def.points, { cornerRadius: 16 }),
    cars: [],
    junctionStreams: [],
    crosswalks: [],
  }));
  const loopsById = Object.fromEntries(loops.map((l) => [l.id, l]));

  const junctions = JUNCTIONS.map((def) => makeJunction(def, loopsById));
  const junctionsById = Object.fromEntries(junctions.map((j) => [j.id, j]));

  const crosswalks = CROSSWALKS.map((def) => {
    const loop = loopsById[def.loop];
    const cw = {
      id: def.id,
      x: def.x,
      y: def.y,
      orient: def.orient,
      loop,
      roadS: loop.path.sAtPoint(def.x, def.y),
      pedsOn: 0,
      junction: null,
      phase: 0,
    };
    if (def.junction) {
      const j = junctionsById[def.junction];
      const stream = j.streams.find((st) => st.loop === loop);
      stream.coupleCrosswalk(cw.roadS);
      cw.junction = j;
      cw.phase = stream.phase;
    }
    loop.crosswalks.push(cw);
    return cw;
  });

  for (const j of junctions) j.finalize();

  const pedRoutes = PED_ROUTES.map((def) => {
    const path = new Path(def.points);
    return {
      id: def.id,
      path,
      spawnS: path.sAtVertex(def.spawnIdx),
      crossings: def.crossings.map((c) => {
        const sStart = path.sAtVertex(c.fromIdx);
        const sEnd = path.sAtVertex(c.fromIdx + 1);
        return {
          sStart,
          len: sEnd - sStart,
          cw: crosswalks.find((x) => x.id === c.cw),
        };
      }),
    };
  });

  return { loops, junctions, crosswalks, pedRoutes, houses: HOUSES, trees: TREES };
}
