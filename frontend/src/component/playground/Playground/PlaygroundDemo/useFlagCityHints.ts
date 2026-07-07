import { useMemo } from 'react';
import useSWR from 'swr';
import { formatApiPath } from 'utils/formatPath';
import handleErrorResponses from 'hooks/api/getters/httpErrorResponseHandler.js';
import type { IFeatureToggle } from 'interfaces/featureToggle';
import {
    FLAG_CITY_ENVIRONMENTS,
    FLAG_CITY_PROJECT_ID,
} from './flagCityDefinitions.ts';

/**
 * The Frontend API only returns evaluated results, so per-car strategy
 * details (rollout percentage, constraint targets, variant weights) are read
 * from the admin API and injected into the sims as "hints" — the demo runs
 * inside the admin UI, so the session is already authorized.
 */
export interface IFlagCityCityHints {
    headlights: { enabled: boolean; rollout: number };
    beeping: { enabled: boolean; field?: string; value?: string };
    carColor: 'blue' | 'red' | 'split';
    /** More than one strategy or variant → no single fleet-wide multiplier. */
    speed: { mixed: boolean };
}

export type FlagCityHintsByEnv = Record<string, IFlagCityCityHints>;

const PARENT = 'car-features';
const HEADLIGHTS = 'car-features.headlights';
const BEEPING = 'car-features.beeping';
const CAR_COLOR = 'car-features.color';
const SPEED = 'car-features.speed';

const featurePath = (name: string) =>
    formatApiPath(
        `api/admin/projects/${FLAG_CITY_PROJECT_ID}/features/${name}`,
    );

const fetchFeature = async (name: string): Promise<IFeatureToggle> => {
    const res = await fetch(featurePath(name)).then(
        handleErrorResponses('Flag City hints'),
    );
    return res.json();
};

const fetchAll = () =>
    Promise.all(
        [PARENT, HEADLIGHTS, BEEPING, CAR_COLOR, SPEED].map(fetchFeature),
    );

const environmentOf = (feature: IFeatureToggle | undefined, name: string) =>
    feature?.environments?.find((environment) => environment.name === name);

const deriveHints = ([
    parent,
    headlights,
    beeping,
    carColor,
    speed,
]: IFeatureToggle[]): FlagCityHintsByEnv =>
    Object.fromEntries(
        FLAG_CITY_ENVIRONMENTS.map((environmentName) => {
            const parentEnabled = Boolean(
                environmentOf(parent, environmentName)?.enabled,
            );

            const headlightsEnv = environmentOf(headlights, environmentName);
            const headlightsStrategy = headlightsEnv?.strategies?.find(
                (strategy) => !strategy.disabled,
            );
            const rollout = Number(
                headlightsStrategy?.parameters?.rollout ?? 100,
            );

            const beepingEnv = environmentOf(beeping, environmentName);
            const beepingConstraint = beepingEnv?.strategies?.find(
                (strategy) => !strategy.disabled,
            )?.constraints?.[0];

            // the color experiment carries STRATEGY variants (the modern
            // mechanism) — read them from the first active strategy
            const colorEnv = environmentOf(carColor, environmentName);
            const colorStrategy = colorEnv?.strategies?.find(
                (strategy) => !strategy.disabled,
            );
            const forcedColor = colorStrategy?.variants?.find(
                (variant) =>
                    variant.weight >= 1000 &&
                    ['blue', 'red'].includes(variant.name),
            )?.name as 'blue' | 'red' | undefined;

            const speedEnv = environmentOf(speed, environmentName);
            const speedStrategies = (speedEnv?.strategies ?? []).filter(
                (strategy) => !strategy.disabled,
            );
            const speedMixed =
                speedStrategies.length > 1 ||
                (speedStrategies[0]?.variants?.length ?? 0) > 1;

            const hints: IFlagCityCityHints = {
                headlights: {
                    enabled: parentEnabled && Boolean(headlightsEnv?.enabled),
                    rollout: Number.isFinite(rollout) ? rollout : 100,
                },
                beeping: {
                    enabled: parentEnabled && Boolean(beepingEnv?.enabled),
                    field: beepingConstraint?.contextName,
                    value: beepingConstraint?.values?.[0],
                },
                carColor:
                    parentEnabled && colorEnv?.enabled && forcedColor
                        ? forcedColor
                        : 'split',
                speed: { mixed: speedMixed },
            };

            return [environmentName, hints];
        }),
    );

export const useFlagCityHints = (
    enabled: boolean,
): FlagCityHintsByEnv | undefined => {
    const { data } = useSWR(
        enabled ? 'flagCityStrategyHints' : null,
        fetchAll,
        { refreshInterval: 3_000 },
    );

    return useMemo(() => (data ? deriveHints(data) : undefined), [data]);
};
