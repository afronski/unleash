import { keyframes, styled, Tooltip, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';

export type StatusTone = 'neutral' | 'warning' | 'success' | 'error';

export type DemoConnectionStatus =
    | 'disconnected'
    | 'dependencies'
    | 'connected'
    | 'evaluated'
    | 'error';

const toneColor = (theme: Theme, tone: StatusTone) => {
    switch (tone) {
        case 'success':
            return theme.palette.success.main;
        case 'error':
            return theme.palette.error.main;
        case 'neutral':
            return theme.palette.text.secondary;
        default:
            return theme.palette.warning.main;
    }
};

const StyledIndicator = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    whiteSpace: 'nowrap',
}));

const pulse = keyframes`
    0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.6); }
    70% { box-shadow: 0 0 0 8px rgba(76, 175, 80, 0); }
    100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
`;

const StyledDot = styled('span', {
    shouldForwardProp: (prop) => prop !== 'tone' && prop !== 'pulsing',
})<{ tone: StatusTone; pulsing?: boolean }>(({ theme, tone, pulsing }) => ({
    width: theme.spacing(1.5),
    height: theme.spacing(1.5),
    borderRadius: '50%',
    backgroundColor: toneColor(theme, tone),
    ...(pulsing && {
        animation: `${pulse} 2s infinite`,
    }),
}));

const StyledStatusText = styled(Typography, {
    shouldForwardProp: (prop) => prop !== 'tone',
})<{ tone: StatusTone }>(({ theme, tone }) => ({
    fontWeight: theme.typography.fontWeightBold,
    color: toneColor(theme, tone),
}));

interface IStatusIndicatorProps {
    tone: StatusTone;
    label: string;
    tooltip: string;
    pulsing?: boolean;
    testId?: string;
}

/** A colored dot + bold label with an explanatory tooltip. */
export const StatusIndicator = ({
    tone,
    label,
    tooltip,
    pulsing,
    testId,
}: IStatusIndicatorProps) => (
    <Tooltip title={tooltip} arrow>
        <StyledIndicator data-testid={testId}>
            <StyledDot tone={tone} pulsing={pulsing} />
            <StyledStatusText variant='body2' tone={tone}>
                {label}
            </StyledStatusText>
        </StyledIndicator>
    </Tooltip>
);

const connectionTones: Record<DemoConnectionStatus, StatusTone> = {
    disconnected: 'neutral',
    dependencies: 'warning',
    connected: 'warning',
    evaluated: 'success',
    error: 'error',
};

const connectionLabels: Record<DemoConnectionStatus, string> = {
    disconnected: 'NOT CONNECTED',
    dependencies: 'DEPENDENCIES INSTALLED',
    connected: 'CONNECTED: READY TO EVALUATE FLAGS',
    evaluated: 'FLAG EVALUATED',
    error: 'CONNECTION ERROR',
};

const connectionTooltips: Record<DemoConnectionStatus, string> = {
    disconnected: 'Install the demo app dependencies to get started.',
    dependencies:
        'Dependencies installed — connect the demo app with its API tokens.',
    connected:
        'Connected to the Frontend API — wrap the demo code in a feature flag.',
    evaluated: 'The demo app is evaluating feature flags live.',
    error: 'The Frontend API rejected the demo token.',
};

interface IDemoStatusIndicatorProps {
    status: DemoConnectionStatus;
}

export const DemoStatusIndicator = ({ status }: IDemoStatusIndicatorProps) => (
    <StatusIndicator
        tone={connectionTones[status]}
        label={connectionLabels[status]}
        tooltip={connectionTooltips[status]}
        pulsing={status === 'evaluated'}
        testId='demo-live-indicator'
    />
);
