import type { IFeatureVariant } from 'interfaces/featureToggle';
import type { IFeatureStrategyPayload } from 'interfaces/strategy';

export const FLAG_CITY_PROJECT_ID = 'flag-city';
export const FLAG_CITY_PROJECT_NAME = 'Flag City';
export const FLAG_CITY_PROJECT_DESCRIPTION =
    'DEMO — two-city traffic simulation steered by feature flags from the Playground demo.';
export const FLAG_CITY_ENVIRONMENTS = ['development', 'production'] as const;

/** Context fields the demo evaluates cars against; created with the project. */
export const FLAG_CITY_CONTEXT_FIELDS = [
    {
        name: 'carId',
        description:
            'DEMO — per-car identifier; the stickiness field for per-car rollouts and variants.',
        stickiness: true,
        legalValues: [],
    },
    {
        name: 'carType',
        description: 'DEMO — the kind of vehicle.',
        stickiness: false,
        legalValues: [
            { value: 'car' },
            { value: 'taxi' },
            { value: 'bus' },
            { value: 'police' },
        ],
    },
    {
        name: 'carColor',
        description: 'DEMO — the generic car color.',
        stickiness: false,
        legalValues: [{ value: 'blue' }, { value: 'red' }],
    },
];

const variant = (
    name: string,
    weight: number,
    payload?: IFeatureVariant['payload'],
): IFeatureVariant => ({
    name,
    weight,
    weightType: 'variable',
    stickiness: 'carId',
    payload,
});

type FlagCityEnvironment = (typeof FLAG_CITY_ENVIRONMENTS)[number];

export interface IFlagCityFlagDefinition {
    name: string;
    type:
        | 'release'
        | 'experiment'
        | 'operational'
        | 'kill-switch'
        | 'permission';
    description: string;
    /** Default state; a map allows per-environment defaults. */
    enabled: boolean | Partial<Record<FlagCityEnvironment, boolean>>;
    strategy?: IFeatureStrategyPayload;
    dependsOn?: string;
}

export const isEnabledInEnvironment = (
    flag: IFlagCityFlagDefinition,
    environment: FlagCityEnvironment,
): boolean =>
    typeof flag.enabled === 'boolean'
        ? flag.enabled
        : Boolean(flag.enabled[environment]);

/**
 * The Flag City taxonomy, sorted alphabetically so creation order matches
 * name order. Parents sort before their dot-notation children by
 * construction, so a single provisioning pass can create flags and
 * dependencies in order. Flag TYPES carry the semantics (release,
 * experiment, operational, kill switch, permission) — names stay clean.
 */
export const FLAG_CITY_FLAGS: IFlagCityFlagDefinition[] = [
    {
        name: 'car-features',
        type: 'permission',
        description: 'Parent switch for all per-car features.',
        enabled: false,
    },
    {
        name: 'car-features.beeping',
        type: 'release',
        description:
            'Honking — the activation strategy targets taxis via the carType context field.',
        enabled: false,
        dependsOn: 'car-features',
        strategy: {
            name: 'flexibleRollout',
            constraints: [
                {
                    contextName: 'carType',
                    operator: 'IN',
                    values: ['taxi'],
                    caseInsensitive: false,
                    inverted: false,
                },
            ],
            parameters: {
                rollout: '100',
                stickiness: 'default',
                groupId: 'car-features.beeping',
            },
        },
    },
    {
        name: 'car-features.color',
        type: 'experiment',
        description:
            'Generic car color experiment — strategy variants sticky per carId; force one variant to repaint the fleet.',
        enabled: false,
        dependsOn: 'car-features',
        strategy: {
            name: 'flexibleRollout',
            constraints: [],
            parameters: {
                rollout: '100',
                stickiness: 'carId',
                groupId: 'car-features.color',
            },
            variants: [variant('blue', 500), variant('red', 500)],
        },
    },
    {
        name: 'car-features.headlights',
        type: 'release',
        description:
            'Share of cars with headlights — a gradual rollout, sticky per carId.',
        enabled: false,
        dependsOn: 'car-features',
        strategy: {
            name: 'flexibleRollout',
            constraints: [],
            parameters: {
                rollout: '10',
                stickiness: 'carId',
                groupId: 'car-features.headlights',
            },
        },
    },
    {
        name: 'car-features.speed',
        type: 'experiment',
        description:
            'Cruise-speed multiplier 0–3 — a strategy variant with a number payload.',
        enabled: false,
        dependsOn: 'car-features',
        strategy: {
            name: 'flexibleRollout',
            constraints: [],
            parameters: {
                rollout: '100',
                stickiness: 'carId',
                groupId: 'car-features.speed',
            },
            variants: [
                variant('multiplier', 1000, { type: 'number', value: '1.0' }),
            ],
        },
    },
    {
        name: 'cars',
        type: 'release',
        description: 'All vehicles on the roads. Parent of the vehicle flags.',
        enabled: true,
    },
    {
        name: 'cars.buses',
        type: 'release',
        description: '🚌 buses (longer & slower).',
        enabled: false,
        dependsOn: 'cars',
    },
    {
        name: 'cars.police',
        type: 'release',
        description: '🚓 police.',
        enabled: false,
        dependsOn: 'cars',
    },
    {
        name: 'cars.taxis',
        type: 'release',
        description: '🚕 taxis.',
        enabled: false,
        dependsOn: 'cars',
    },
    {
        name: 'daylight',
        type: 'operational',
        description:
            'Enabled = day, disabled = night (scene dims, headlights on).',
        enabled: { development: false, production: true },
    },
    {
        name: 'houses',
        type: 'operational',
        description: '🏠 houses.',
        enabled: true,
    },
    {
        name: 'pedestrians',
        type: 'permission',
        description: 'Pedestrians walk the sidewalk routes.',
        enabled: false,
    },
    {
        name: 'pedestrians.clumsy',
        type: 'kill-switch',
        description:
            'Some pedestrians stop checking traffic; at higher speeds they get hit.',
        enabled: false,
        dependsOn: 'pedestrians',
    },
    {
        name: 'sound',
        type: 'operational',
        description: 'The Wilhelm scream on casualties and honking.',
        enabled: true,
    },
    {
        name: 'trafficLights',
        type: 'operational',
        description:
            'ON: staggered light cycles. OFF: uncontrolled first-come-first-served junctions.',
        enabled: false,
    },
    {
        name: 'trees',
        type: 'operational',
        description: '🌳 trees.',
        enabled: true,
    },
];
