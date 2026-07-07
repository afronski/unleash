import { Button, styled, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
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

const installSnippet = `\`\`\`bash
npm install unleash-proxy-client
\`\`\``;

const plainUsageSnippet = `\`\`\`js
// cars.js — show cars at all?
spawnCars();

// speed.js — how fast do they drive?
const speedMultiplier = 1.0;
\`\`\``;

const flaggedUsageSnippet = `\`\`\`js
// cars.js — a regular flag decides
if (flags.isEnabled('cars')) {
  spawnCars();
}

// speed.js — a variant payload decides
const speed = flags.getVariant('car-features.speed');
const speedMultiplier = speed.enabled
  ? Number(speed.payload.value)
  : 1.0;
\`\`\``;

const StyledConnectBlock = styled('pre')(({ theme }) => ({
    backgroundColor: theme.palette.background.elevation1,
    padding: theme.spacing(2),
    borderRadius: `${theme.shape.borderRadius}px`,
    overflow: 'hidden',
    fontSize: theme.typography.body2.fontSize,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    margin: 0,
    color: theme.palette.codeHighlighting.variable,
}));

// hand-colored tokens matching CodeRenderer's hljs theme — the interleaved
// tooltip chips rule out running highlight.js over the whole snippet
const StyledKeyword = styled('span')(({ theme }) => ({
    color: theme.palette.codeHighlighting.keyword,
}));

const StyledString = styled('span')(({ theme }) => ({
    color: theme.palette.codeHighlighting.string,
}));

const StyledNumber = styled('span')(({ theme }) => ({
    color: theme.palette.codeHighlighting.number,
}));

const StyledTitle = styled('span')(({ theme }) => ({
    color: theme.palette.codeHighlighting.title,
}));

const StyledAttr = styled('span')(({ theme }) => ({
    color: theme.palette.codeHighlighting.attr,
}));

const StyledInsertedValue = styled('span', {
    shouldForwardProp: (prop) => prop !== 'placeholder',
})<{ placeholder?: boolean }>(({ theme, placeholder }) => ({
    borderRadius: `${theme.shape.borderRadius}px`,
    padding: theme.spacing(0.25, 0.75),
    cursor: 'help',
    backgroundColor: placeholder
        ? theme.palette.background.paper
        : alpha(theme.palette.primary.main, 0.2),
    border: `1px dashed ${
        placeholder ? theme.palette.divider : theme.palette.primary.main
    }`,
    color: placeholder
        ? theme.palette.text.secondary
        : theme.palette.primary.main,
}));

interface IInsertedValueProps {
    value?: string;
    tooltip: string;
}

const InsertedValue = ({ value, tooltip }: IInsertedValueProps) => (
    <Tooltip title={tooltip} arrow>
        <StyledInsertedValue placeholder={!value}>
            {value ?? 'TODO'}
        </StyledInsertedValue>
    </Tooltip>
);

interface IConnectCodeBlockProps {
    tokenSecret?: string;
    connected: boolean;
}

/**
 * The client-init snippet with the two instance-specific values rendered as
 * inserted chips: 'TODO' placeholders until Connect is clicked, then the
 * real URL and token with tooltips explaining where they came from.
 */
const ConnectCodeBlock = ({
    tokenSecret,
    connected,
}: IConnectCodeBlockProps) => (
    <StyledConnectBlock data-testid='demo-connect-snippet'>
        <code>
            <StyledKeyword>import</StyledKeyword>
            {' { UnleashClient } '}
            <StyledKeyword>from</StyledKeyword>{' '}
            <StyledString>'unleash-proxy-client'</StyledString>
            {';\n\n'}
            <StyledKeyword>const</StyledKeyword>
            {' flags = '}
            <StyledKeyword>new</StyledKeyword>{' '}
            <StyledTitle>UnleashClient</StyledTitle>
            {'({\n  '}
            <StyledAttr>url</StyledAttr>
            {': '}
            <InsertedValue
                value={
                    connected
                        ? `${window.location.origin}/api/frontend`
                        : undefined
                }
                tooltip="The Frontend API of this Unleash instance — the address the SDK polls for evaluated flags (this page's origin + /api/frontend)."
            />
            {',\n  '}
            <StyledAttr>clientKey</StyledAttr>
            {': '}
            <InsertedValue
                value={connected ? tokenSecret : undefined}
                tooltip='The "flagcity-development" frontend API token created in the Configure Unleash step — scoped to the Flag City project and the development environment.'
            />
            {',\n  '}
            <StyledAttr>appName</StyledAttr>
            {': '}
            <StyledString>'flagcity'</StyledString>
            {',\n  '}
            <StyledAttr>refreshInterval</StyledAttr>
            {': '}
            <StyledNumber>3</StyledNumber>
            {',\n});\n\nflags.'}
            <StyledTitle>start</StyledTitle>
            {'();'}
        </code>
    </StyledConnectBlock>
);

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
                Unleash instance:
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
            <ConnectCodeBlock tokenSecret={tokenSecret} connected={connected} />
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
