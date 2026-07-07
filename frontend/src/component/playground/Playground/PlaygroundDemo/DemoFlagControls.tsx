import { useState } from 'react';
import { Chip, Menu, MenuItem, Slider, styled } from '@mui/material';
import useFeatureStrategyApi from 'hooks/api/actions/useFeatureStrategyApi/useFeatureStrategyApi';
import useToast from 'hooks/useToast';
import { formatUnknownError } from 'utils/formatUnknownError';
import type { IFeatureStrategy } from 'interfaces/strategy';
import type { IFeatureVariant } from 'interfaces/featureToggle';
import { FLAG_CITY_PROJECT_ID } from './flagCityDefinitions.ts';

const StyledControls = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
}));

const StyledSlider = styled(Slider)(({ theme }) => ({
    width: theme.spacing(15),
    marginLeft: theme.spacing(1),
}));

const SPEED_PRESETS = ['0.5', '1.0', '1.5', '2.0', '2.5', '3.0'];
const CAR_TYPES = ['car', 'taxi', 'bus', 'police'];

const colorVariant = (name: string, weight: number): IFeatureVariant => ({
    name,
    weight,
    weightType: 'variable',
    stickiness: 'carId',
});

interface IDemoFlagControlsProps {
    flagName: string;
    environment: string;
    strategies: IFeatureStrategy[];
    onUpdated: () => void;
}

/**
 * Small inline editors for the strategy-driven flags: a rollout slider for
 * headlights, variant pills for color and speed, a constraint pill for
 * beeping. They modify the real flag definition through the admin API.
 */
export const DemoFlagControls = ({
    flagName,
    environment,
    strategies,
    onUpdated,
}: IDemoFlagControlsProps) => {
    const { updateStrategyOnFeature } = useFeatureStrategyApi();
    const { setToastApiError } = useToast();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement>();
    const [rollout, setRollout] = useState<number>();

    const strategy = strategies[0];
    if (!strategy) {
        return null;
    }

    const update = async (changes: Partial<IFeatureStrategy>) => {
        try {
            await updateStrategyOnFeature(
                FLAG_CITY_PROJECT_ID,
                flagName,
                environment,
                strategy.id,
                {
                    name: strategy.name,
                    constraints: strategy.constraints ?? [],
                    parameters: strategy.parameters ?? {},
                    variants: strategy.variants ?? [],
                    ...changes,
                },
            );
            onUpdated();
        } catch (error: unknown) {
            setToastApiError(formatUnknownError(error));
        }
    };

    const closeMenu = () => setMenuAnchor(undefined);

    if (flagName === 'car-features.headlights') {
        const value =
            rollout ?? Number(strategy.parameters?.rollout ?? 100) ?? 100;
        return (
            <StyledControls data-testid='demo-control-headlights'>
                <StyledSlider
                    size='small'
                    min={0}
                    max={100}
                    step={10}
                    value={value}
                    valueLabelDisplay='auto'
                    valueLabelFormat={(v) => `${v}%`}
                    onChange={(_, v) => setRollout(v as number)}
                    onChangeCommitted={(_, v) => {
                        setRollout(undefined);
                        update({
                            parameters: {
                                ...strategy.parameters,
                                rollout: String(v),
                            },
                        });
                    }}
                />
                <Chip size='small' variant='outlined' label={`${value}%`} />
            </StyledControls>
        );
    }

    if (flagName === 'car-features.color') {
        const variants = strategy.variants ?? [];
        const forced = variants.length === 1 ? variants[0].name : undefined;
        const weightOf = (name: string) =>
            variants.find((variant) => variant.name === name)?.weight ?? 0;

        return (
            <StyledControls data-testid='demo-control-color'>
                {['blue', 'red'].map((color) => {
                    const isForced = forced === color;
                    const label = forced
                        ? isForced
                            ? `${color} 100%`
                            : color
                        : `${color} ${Math.round(weightOf(color) / 10)}%`;
                    return (
                        <Chip
                            key={color}
                            size='small'
                            label={label}
                            color={isForced ? 'primary' : 'default'}
                            variant={
                                forced && !isForced ? 'outlined' : 'filled'
                            }
                            onClick={() =>
                                update({
                                    variants: isForced
                                        ? [
                                              colorVariant('blue', 500),
                                              colorVariant('red', 500),
                                          ]
                                        : [colorVariant(color, 1000)],
                                })
                            }
                        />
                    );
                })}
            </StyledControls>
        );
    }

    if (flagName === 'car-features.speed') {
        const variants = strategy.variants ?? [];
        if (strategies.length > 1 || variants.length > 1) {
            return (
                <StyledControls data-testid='demo-control-speed'>
                    <Chip size='small' variant='outlined' label='mixed' />
                </StyledControls>
            );
        }
        const current = variants[0]?.payload?.value ?? '1.0';
        return (
            <StyledControls data-testid='demo-control-speed'>
                <Chip
                    size='small'
                    label={`${current}×`}
                    onClick={(event) => setMenuAnchor(event.currentTarget)}
                />
                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={closeMenu}
                >
                    {SPEED_PRESETS.map((preset) => (
                        <MenuItem
                            key={preset}
                            selected={preset === current}
                            onClick={() => {
                                closeMenu();
                                update({
                                    variants: [
                                        {
                                            ...(variants[0] ??
                                                colorVariant(
                                                    'multiplier',
                                                    1000,
                                                )),
                                            payload: {
                                                type: 'number',
                                                value: preset,
                                            },
                                        },
                                    ],
                                });
                            }}
                        >
                            {preset}×
                        </MenuItem>
                    ))}
                </Menu>
            </StyledControls>
        );
    }

    if (flagName === 'car-features.beeping') {
        const constraint = strategy.constraints?.[0];
        const target = constraint?.values?.join(', ') ?? '—';
        return (
            <StyledControls data-testid='demo-control-beeping'>
                <Chip
                    size='small'
                    label={`${constraint?.contextName ?? 'carType'} = ${target}`}
                    onClick={(event) => setMenuAnchor(event.currentTarget)}
                />
                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={closeMenu}
                >
                    {CAR_TYPES.map((carType) => (
                        <MenuItem
                            key={carType}
                            selected={constraint?.values?.includes(carType)}
                            onClick={() => {
                                closeMenu();
                                update({
                                    constraints: [
                                        {
                                            contextName: 'carType',
                                            operator: 'IN',
                                            values: [carType],
                                            caseInsensitive: false,
                                            inverted: false,
                                        },
                                    ],
                                });
                            }}
                        >
                            {carType}
                        </MenuItem>
                    ))}
                </Menu>
            </StyledControls>
        );
    }

    return null;
};
