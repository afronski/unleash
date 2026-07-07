import { keyframes, styled, Tooltip, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';

export type DemoConnectionStatus =
    | 'disconnected'
    | 'dependencies'
    | 'connected'
    | 'evaluated'
    | 'error';

const statusColor = (theme: Theme, status: DemoConnectionStatus) => {
    switch (status) {
        case 'evaluated':
            return theme.palette.success.main;
        case 'error':
            return theme.palette.error.main;
        case 'disconnected':
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
    shouldForwardProp: (prop) => prop !== 'status',
})<{ status: DemoConnectionStatus }>(({ theme, status }) => ({
    width: theme.spacing(1.5),
    height: theme.spacing(1.5),
    borderRadius: '50%',
    backgroundColor: statusColor(theme, status),
    ...(status === 'evaluated' && {
        animation: `${pulse} 2s infinite`,
    }),
}));

const StyledStatusText = styled(Typography, {
    shouldForwardProp: (prop) => prop !== 'status',
})<{ status: DemoConnectionStatus }>(({ theme, status }) => ({
    fontWeight: theme.typography.fontWeightBold,
    color: statusColor(theme, status),
}));

const statusLabels: Record<DemoConnectionStatus, string> = {
    disconnected: 'NOT CONNECTED',
    dependencies: 'DEPENDENCIES INSTALLED',
    connected: 'CONNECTED: READY TO EVALUATE FLAGS',
    evaluated: 'FLAG EVALUATED',
    error: 'CONNECTION ERROR',
};

const statusTooltips: Record<DemoConnectionStatus, string> = {
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
    <Tooltip title={statusTooltips[status]} arrow>
        <StyledIndicator data-testid='demo-live-indicator'>
            <StyledDot status={status} />
            <StyledStatusText variant='body2' status={status}>
                {statusLabels[status]}
            </StyledStatusText>
        </StyledIndicator>
    </Tooltip>
);
