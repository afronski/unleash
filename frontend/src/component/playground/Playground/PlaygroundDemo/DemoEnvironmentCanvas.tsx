import { styled, Typography } from '@mui/material';
import { FlagCityCard } from './FlagCityCard.tsx';
import type { FlagCityHintsByEnv } from './useFlagCityHints.ts';

const StyledViewport = styled('div')({
    width: '100%',
    minWidth: 0,
});

const StyledDemoCanvas = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.spacing(22),
    borderRadius: `${theme.shape.borderRadiusLarge}px`,
    border: `2px dashed ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
}));

interface IDemoEnvironmentCanvasProps {
    environments: string[];
    activeEnvironment: string;
    tokensByEnv: Record<string, string | undefined>;
    hintsByEnv?: FlagCityHintsByEnv;
}

/**
 * One big city per environment tab. Every city stays mounted so its state
 * survives tab switches — the hidden ones are display:none and their sim
 * clocks are paused.
 */
export const DemoEnvironmentCanvas = ({
    environments,
    activeEnvironment,
    tokensByEnv,
    hintsByEnv,
}: IDemoEnvironmentCanvasProps) => (
    <StyledViewport>
        {environments.map((environment) => {
            const tokenSecret = tokensByEnv[environment];
            const active = environment === activeEnvironment;

            return (
                <div
                    key={environment}
                    style={active ? undefined : { display: 'none' }}
                    data-testid={`demo-canvas-${environment}`}
                >
                    {tokenSecret ? (
                        <FlagCityCard
                            environmentName={environment}
                            tokenSecret={tokenSecret}
                            hints={hintsByEnv?.[environment]}
                            paused={!active}
                        />
                    ) : (
                        <StyledDemoCanvas>
                            <Typography variant='body2'>
                                Visual demo coming soon
                            </Typography>
                        </StyledDemoCanvas>
                    )}
                </div>
            );
        })}
    </StyledViewport>
);
