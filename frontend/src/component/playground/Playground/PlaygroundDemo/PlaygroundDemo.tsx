import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
    keyframes,
    Step,
    StepButton,
    Stepper,
    styled,
    Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { PageContent } from 'component/common/PageContent/PageContent';
import { PageHeader } from 'component/common/PageHeader/PageHeader';
import useProjectOverview from 'hooks/api/getters/useProjectOverview/useProjectOverview';
import { useFeatureSearch } from 'hooks/api/getters/useFeatureSearch/useFeatureSearch';
import { useFrontendApiToggles } from 'hooks/api/getters/useFrontendApiToggles/useFrontendApiToggles';
import { DemoEnvironmentCanvas } from './DemoEnvironmentCanvas.tsx';
import { DemoSetupPanel } from './DemoSetupPanel.tsx';
import type { DemoConnectionStatus } from './DemoStatusIndicator.tsx';
import { DemoFeatureFlagsTable } from './DemoFeatureFlagsTable.tsx';
import { DemoCodeSample } from './DemoCodeSample.tsx';
import { useFlagCitySetup } from './useFlagCitySetup.ts';
import { useFlagCityHints } from './useFlagCityHints.ts';
import {
    FLAG_CITY_ENVIRONMENTS,
    FLAG_CITY_PROJECT_ID,
} from './flagCityDefinitions.ts';

const StyledStack = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
}));

const StyledStepperRow = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(3),
    width: '100%',
}));

const StyledStepper = styled(Stepper)(({ theme }) => ({
    padding: theme.spacing(1, 0),
    flex: 1,
}));

const StyledPulsingStepButton = styled(StepButton, {
    shouldForwardProp: (prop) => prop !== 'pulsing',
})<{ pulsing?: boolean }>(({ theme, pulsing }) => ({
    borderRadius: `${theme.shape.borderRadius}px`,
    ...(pulsing && {
        animation: `${keyframes`
            0% { box-shadow: 0 0 0 0 ${alpha(theme.palette.primary.main, 0.5)}; }
            70% { box-shadow: 0 0 0 10px ${alpha(theme.palette.primary.main, 0)}; }
            100% { box-shadow: 0 0 0 0 ${alpha(theme.palette.primary.main, 0)}; }
        `} 1.8s infinite`,
    }),
}));

const StyledPanelArea = styled('div')(({ theme }) => ({
    width: '100%',
    maxWidth: theme.spacing(110),
    margin: '0 auto',
}));

const StyledTableHint = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.spacing(20),
    borderRadius: `${theme.shape.borderRadiusLarge}px`,
    border: `2px dashed ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
    padding: theme.spacing(3),
}));

// completed steps of the wizard, pure session state — a page refresh restarts
// it (the server-side actions are idempotent, so replaying always succeeds):
// 1 = project created, 2 = flags created, 3 = tokens created,
// 4 = dependencies installed, 5 = connected, 6 = code wrapped in a flag
type SetupProgress = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const PlaygroundDemo = () => {
    const navigate = useNavigate();
    const { projectId } = useParams();
    const [activeStep, setActiveStep] = useState(0);
    const [setupProgress, setSetupProgress] = useState<SetupProgress>(0);

    const projectCreated = setupProgress >= 1;
    const flagsCreated = setupProgress >= 2;
    const tokensCreated = setupProgress >= 3;
    const installed = setupProgress >= 4;
    const connected = setupProgress >= 5;
    const flagWrapped = setupProgress >= 6;

    const {
        createDemoProject,
        createDemoFlags,
        createDemoTokens,
        busyStep,
        devToken,
        prodToken,
    } = useFlagCitySetup();

    // refresh clears the wizard: bounce off the deep URL back to the start
    useEffect(() => {
        if (projectId && setupProgress === 0) {
            navigate('/playground/demo', { replace: true });
        }
    }, [projectId, setupProgress, navigate]);

    const { project } = useProjectOverview(
        flagsCreated ? FLAG_CITY_PROJECT_ID : '',
    );
    const { features, refetch: refetchFlags } = useFeatureSearch(
        {
            project: `IS:${FLAG_CITY_PROJECT_ID}`,
            limit: '100',
            offset: '0',
        },
        { refreshInterval: 15_000 },
    );

    const { error: sdkError } = useFrontendApiToggles(
        connected ? devToken?.secret : undefined,
    );
    const hintsByEnv = useFlagCityHints(flagsCreated);
    const connectionStatus: DemoConnectionStatus =
        connected && sdkError
            ? 'error'
            : flagWrapped
              ? 'evaluated'
              : connected
                ? 'connected'
                : installed
                  ? 'dependencies'
                  : 'disconnected';

    const environments =
        project.environments && project.environments.length > 0
            ? project.environments.map(({ environment }) => environment)
            : [...FLAG_CITY_ENVIRONMENTS];

    const advanceTo = (progress: SetupProgress) =>
        setSetupProgress((current) =>
            current < progress ? progress : current,
        );

    const onCreateProject = async () => {
        if (await createDemoProject()) {
            advanceTo(1);
            navigate(`/playground/demo/${FLAG_CITY_PROJECT_ID}`);
        }
    };

    const onCreateFlags = async () => {
        if (await createDemoFlags()) {
            refetchFlags();
            advanceTo(2);
        }
    };

    const onCreateTokens = async () => {
        if (await createDemoTokens()) {
            advanceTo(3);
        }
    };

    return (
        <PageContent
            header={
                <PageHeader
                    title='Demo'
                    subtitle='Release features at the flip of a switch — no redeploys, no waiting, instant impact.'
                />
            }
        >
            <StyledStack>
                <StyledStepperRow>
                    <StyledStepper nonLinear activeStep={activeStep}>
                        <Step completed={tokensCreated}>
                            <StepButton
                                onClick={() => setActiveStep(0)}
                                data-testid='demo-step-configure'
                            >
                                Configure Unleash
                            </StepButton>
                        </Step>
                        <Step completed={flagWrapped}>
                            <StyledPulsingStepButton
                                onClick={() => setActiveStep(1)}
                                disabled={!tokensCreated}
                                pulsing={tokensCreated && activeStep === 0}
                                data-testid='demo-step-setup'
                            >
                                Setup demo app
                            </StyledPulsingStepButton>
                        </Step>
                        <Step>
                            <StyledPulsingStepButton
                                onClick={() => setActiveStep(2)}
                                disabled={!flagWrapped}
                                pulsing={flagWrapped && activeStep < 2}
                                data-testid='demo-step-live'
                            >
                                See it live!
                            </StyledPulsingStepButton>
                        </Step>
                    </StyledStepper>
                </StyledStepperRow>
                {activeStep === 0 ? (
                    <StyledPanelArea>
                        <DemoSetupPanel
                            projectCreated={projectCreated}
                            flagsCreated={flagsCreated}
                            tokensCreated={tokensCreated}
                            busyStep={busyStep}
                            onCreateProject={onCreateProject}
                            onCreateFlags={onCreateFlags}
                            onCreateTokens={onCreateTokens}
                        />
                    </StyledPanelArea>
                ) : null}
                {activeStep === 1 ? (
                    <StyledPanelArea>
                        <DemoCodeSample
                            tokenSecret={devToken?.secret}
                            status={connectionStatus}
                            installed={installed}
                            connected={connected}
                            canConnect={tokensCreated}
                            flagWrapped={flagWrapped}
                            onInstall={() => advanceTo(4)}
                            onConnect={() => advanceTo(5)}
                            onWrapChange={(wrapped) =>
                                setSetupProgress(wrapped ? 6 : 5)
                            }
                        />
                    </StyledPanelArea>
                ) : null}
                {activeStep === 2 ? (
                    <DemoEnvironmentCanvas
                        environments={environments}
                        tokensByEnv={{
                            development: devToken?.secret,
                            production: prodToken?.secret,
                        }}
                        hintsByEnv={hintsByEnv}
                    />
                ) : null}
                {projectId && flagsCreated ? (
                    <DemoFeatureFlagsTable
                        projectId={projectId}
                        features={features}
                        environments={environments}
                        refetch={refetchFlags}
                    />
                ) : (
                    <StyledTableHint>
                        <Typography variant='body2'>
                            Create the demo project to load its feature flags.
                        </Typography>
                    </StyledTableHint>
                )}
            </StyledStack>
        </PageContent>
    );
};

export default PlaygroundDemo;
