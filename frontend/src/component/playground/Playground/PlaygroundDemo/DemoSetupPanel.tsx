import {
    Button,
    CircularProgress,
    styled,
    Tooltip,
    Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckIcon from '@mui/icons-material/Check';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { StatusIndicator, type StatusTone } from './DemoStatusIndicator.tsx';
import type { FlagCitySetupStep } from './useFlagCitySetup.ts';

const StyledSection = styled('section')(({ theme }) => ({
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
    marginTop: theme.spacing(1.5),
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

const setupStatus = (
    projectCreated: boolean,
    flagsCreated: boolean,
    tokensCreated: boolean,
): { tone: StatusTone; label: string; tooltip: string; pulsing?: boolean } => {
    if (tokensCreated) {
        return {
            tone: 'success',
            label: 'UNLEASH CONFIGURED',
            tooltip:
                'Project, flags, and tokens are ready — continue to "Setup demo app".',
            pulsing: true,
        };
    }
    if (flagsCreated) {
        return {
            tone: 'warning',
            label: 'FLAGS CREATED',
            tooltip: 'Create the API tokens to finish configuring Unleash.',
        };
    }
    if (projectCreated) {
        return {
            tone: 'warning',
            label: 'PROJECT CREATED',
            tooltip: 'Create the feature flags next.',
        };
    }
    return {
        tone: 'neutral',
        label: 'NOT CONFIGURED',
        tooltip: 'Create the demo project to begin.',
    };
};

interface ISetupButtonProps {
    label: string;
    doneLabel: string;
    icon: React.ReactNode;
    done: boolean;
    disabled: boolean;
    busy: boolean;
    tooltip: string;
    onClick: () => void;
    testId: string;
}

const SetupButton = ({
    label,
    doneLabel,
    icon,
    done,
    disabled,
    busy,
    tooltip,
    onClick,
    testId,
}: ISetupButtonProps) => (
    <Tooltip title={done || busy ? '' : tooltip} arrow>
        <span>
            <Button
                variant='contained'
                size='small'
                startIcon={
                    busy ? (
                        <CircularProgress size={16} color='inherit' />
                    ) : done ? (
                        <CheckIcon />
                    ) : (
                        icon
                    )
                }
                onClick={onClick}
                disabled={done || disabled || busy}
                data-testid={testId}
                style={{ width: '10vw' }}
            >
                {done ? doneLabel : label}
            </Button>
        </span>
    </Tooltip>
);

interface IDemoSetupPanelProps {
    projectCreated: boolean;
    flagsCreated: boolean;
    tokensCreated: boolean;
    busyStep?: FlagCitySetupStep;
    onCreateProject: () => void;
    onCreateFlags: () => void;
    onCreateTokens: () => void;
}

export const DemoSetupPanel = ({
    projectCreated,
    flagsCreated,
    tokensCreated,
    busyStep,
    onCreateProject,
    onCreateFlags,
    onCreateTokens,
}: IDemoSetupPanelProps) => (
    <StyledSection data-testid='demo-setup-panel'>
        <StyledPanelHeader>
            <Typography variant='h2'>Configure Unleash</Typography>
            <StatusIndicator
                {...setupStatus(projectCreated, flagsCreated, tokensCreated)}
                testId='demo-setup-indicator'
            />
        </StyledPanelHeader>
        <Typography variant='body2' color='text.secondary'>
            Three steps prepare this Unleash instance for the demo: a dedicated
            project, its feature flags (with strategies, variants, dependencies,
            and context fields), and one frontend API token per environment.
            Every step is safe to repeat — existing resources pass through.
        </Typography>
        <StyledStepRow>
            <StyledStepHeader variant='body1'>
                1. Create the demo project
            </StyledStepHeader>
            <SetupButton
                label='Create project'
                doneLabel='Project created'
                icon={<AutoFixHighIcon />}
                done={projectCreated}
                disabled={false}
                busy={busyStep === 'project'}
                tooltip='Creates the "Flag City" project and the carId/carType/carColor context fields.'
                onClick={onCreateProject}
                testId='demo-create-project-button'
            />
        </StyledStepRow>
        <StyledStepRow>
            <StyledStepHeader variant='body1'>
                2. Create the feature flags
            </StyledStepHeader>
            <SetupButton
                label='Create feature flags'
                doneLabel='Feature flags created'
                icon={<ToggleOnIcon />}
                done={flagsCreated}
                disabled={!projectCreated}
                busy={busyStep === 'flags'}
                tooltip='Creates the 16 Flag City flags with their types, defaults, strategies, variants, and dependencies.'
                onClick={onCreateFlags}
                testId='demo-create-flags-button'
            />
        </StyledStepRow>
        <StyledStepRow>
            <StyledStepHeader variant='body1'>
                3. Create the API tokens
            </StyledStepHeader>
            <SetupButton
                label='Create API tokens'
                doneLabel='API tokens created'
                icon={<VpnKeyIcon />}
                done={tokensCreated}
                disabled={!flagsCreated}
                busy={busyStep === 'tokens'}
                tooltip='Creates one frontend API token per environment for the demo app.'
                onClick={onCreateTokens}
                testId='demo-create-tokens-button'
            />
        </StyledStepRow>
    </StyledSection>
);
