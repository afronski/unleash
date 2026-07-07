import { Button, styled, Tooltip, Typography } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckIcon from '@mui/icons-material/Check';
import DownloadIcon from '@mui/icons-material/Download';
import LinkIcon from '@mui/icons-material/Link';
import { Markdown } from 'component/common/Markdown/Markdown.tsx';
import { CodeRenderer } from 'component/onboarding/dialog/CodeRenderer.tsx';
import {
    DemoStatusIndicator,
    type DemoConnectionStatus,
} from './DemoStatusIndicator.tsx';

const StyledSection = styled('aside')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    padding: theme.spacing(3),
    borderRadius: `${theme.shape.borderRadiusLarge}px`,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.elevation1,
}));

const StyledStepRow = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    flexWrap: 'wrap',
    marginTop: theme.spacing(1),
}));

const StyledStepHeader = styled(Typography)(({ theme }) => ({
    fontWeight: theme.typography.fontWeightBold,
}));

const StyledPanelHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    flexWrap: 'wrap',
}));

const installSnippet = `\`\`\`sh
npm install unleash-proxy-client
\`\`\``;

const initSnippet = (tokenSecret: string) => `\`\`\`js
import { UnleashClient } from 'unleash-proxy-client';

// one client per city — development shown, production is identical
const flags = new UnleashClient({
    url: '${window.location.origin}/api/frontend',
    clientKey: '${tokenSecret}',
    appName: 'flagcity',
    context: { userId: 'development' },
    refreshInterval: 3,
});

flags.start();
\`\`\``;

const plainUsageSnippet = `\`\`\`js
// sim.js — hardcoded behavior: every change is a redeploy
const carsEnabled = true;
const speedMultiplier = 1.0;

if (carsEnabled) {
    spawnCars({ speedMultiplier });
}
\`\`\``;

const flaggedUsageSnippet = `\`\`\`js
// sim.js — behavior behind flags: every change is a toggle
if (flags.isEnabled('cars')) {
    const speed = flags.getVariant('car-features.speed');
    const speedMultiplier = speed.enabled
        ? Number(speed.payload.value)
        : 1.0;

    spawnCars({ speedMultiplier });
}
\`\`\``;

interface IDemoCodeSampleProps {
    tokenSecret?: string;
    status: DemoConnectionStatus;
    installed: boolean;
    connected: boolean;
    canConnect: boolean;
    flagWrapped: boolean;
    onInstall: () => void;
    onConnect: () => void;
    onWrapChange: (wrapped: boolean) => void;
}

export const DemoCodeSample = ({
    tokenSecret,
    status,
    installed,
    connected,
    canConnect,
    flagWrapped,
    onInstall,
    onConnect,
    onWrapChange,
}: IDemoCodeSampleProps) => {
    const connectTooltip = connected
        ? ''
        : !installed
          ? 'Install the dependencies first'
          : !canConnect
            ? 'Create the demo project, flags and API tokens first'
            : '';
    const wrapTooltip = connected ? '' : 'Connect with the API tokens first';

    return (
        <StyledSection data-testid='demo-code-sample'>
            <StyledPanelHeader>
                <Typography variant='h2'>How the demo app works?</Typography>
                <DemoStatusIndicator status={status} />
            </StyledPanelHeader>
            <Typography variant='body2' color='text.secondary'>
                Flag City is a small traffic simulation whose whole behavior —
                cars, pedestrians, traffic lights, day and night — is steered by
                the feature flags from the table. Three steps connect it to this
                Unleash instance.
            </Typography>
            <StyledStepRow>
                <StyledStepHeader variant='body1'>
                    1. Install the SDK
                </StyledStepHeader>
                <Button
                    variant='contained'
                    size='small'
                    startIcon={installed ? <CheckIcon /> : <DownloadIcon />}
                    onClick={onInstall}
                    disabled={installed}
                    data-testid='demo-install-button'
                >
                    {installed
                        ? 'Dependencies installed'
                        : 'Install dependencies'}
                </Button>
            </StyledStepRow>
            <Markdown components={{ code: CodeRenderer }}>
                {installSnippet}
            </Markdown>
            <StyledStepRow>
                <StyledStepHeader variant='body1'>
                    2. Connect with the API tokens
                </StyledStepHeader>
                <Tooltip title={connectTooltip} arrow>
                    <span>
                        <Button
                            variant='contained'
                            size='small'
                            startIcon={connected ? <CheckIcon /> : <LinkIcon />}
                            onClick={onConnect}
                            disabled={!installed || !canConnect || connected}
                            data-testid='demo-connect-button'
                        >
                            {connected ? 'Connected' : 'Connect'}
                        </Button>
                    </span>
                </Tooltip>
            </StyledStepRow>
            <Markdown components={{ code: CodeRenderer }}>
                {initSnippet(tokenSecret ?? '<YOUR_API_TOKEN>')}
            </Markdown>
            <StyledStepRow>
                <StyledStepHeader variant='body1'>
                    3. Wrap the city in flags
                </StyledStepHeader>
                <Tooltip title={wrapTooltip} arrow>
                    <span>
                        <Button
                            variant={flagWrapped ? 'outlined' : 'contained'}
                            size='small'
                            startIcon={<AutoFixHighIcon />}
                            onClick={() => onWrapChange(!flagWrapped)}
                            disabled={!connected}
                            data-testid='demo-use-flag-button'
                        >
                            {flagWrapped
                                ? 'Remove feature flag'
                                : 'Use feature flag'}
                        </Button>
                    </span>
                </Tooltip>
            </StyledStepRow>
            <Markdown components={{ code: CodeRenderer }}>
                {flagWrapped ? flaggedUsageSnippet : plainUsageSnippet}
            </Markdown>
        </StyledSection>
    );
};
