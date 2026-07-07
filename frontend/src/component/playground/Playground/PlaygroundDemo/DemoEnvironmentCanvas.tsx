import { styled, Typography } from '@mui/material';
import { FlagCityCard } from './FlagCityCard.tsx';
import type { FlagCityHintsByEnv } from './useFlagCityHints.ts';

const StyledRow = styled('div')(({ theme }) => ({
    display: 'grid',
    gridAutoColumns: 'minmax(0, 1fr)',
    gridAutoFlow: 'column',
    gap: theme.spacing(3),
    [theme.breakpoints.down('md')]: {
        gridAutoFlow: 'row',
    },
}));

const StyledEnvironmentBox = styled('section')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
    padding: theme.spacing(2.5),
    borderRadius: `${theme.shape.borderRadiusLarge}px`,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.elevation1,
}));

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
    tokensByEnv: Record<string, string | undefined>;
    hintsByEnv?: FlagCityHintsByEnv;
}

export const DemoEnvironmentCanvas = ({
    environments,
    tokensByEnv,
    hintsByEnv,
}: IDemoEnvironmentCanvasProps) => (
    <StyledRow>
        {environments.map((environment) => {
            const tokenSecret = tokensByEnv[environment];

            return (
                <StyledEnvironmentBox
                    key={environment}
                    data-testid={`demo-canvas-${environment}`}
                >
                    <Typography variant='h3'>{environment}</Typography>
                    {tokenSecret ? (
                        <FlagCityCard
                            environmentName={environment}
                            tokenSecret={tokenSecret}
                            hints={hintsByEnv?.[environment]}
                        />
                    ) : (
                        <StyledDemoCanvas>
                            <Typography variant='body2'>
                                Visual demo coming soon
                            </Typography>
                        </StyledDemoCanvas>
                    )}
                </StyledEnvironmentBox>
            );
        })}
    </StyledRow>
);
