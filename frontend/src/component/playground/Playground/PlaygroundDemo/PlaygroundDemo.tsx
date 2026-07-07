import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    keyframes,
    Step,
    StepButton,
    Stepper,
    styled,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { alpha } from '@mui/material/styles';
import { PageContent } from 'component/common/PageContent/PageContent';
import { PageHeader } from 'component/common/PageHeader/PageHeader';
import useProjectOverview from 'hooks/api/getters/useProjectOverview/useProjectOverview';
import { useFeatureSearch } from 'hooks/api/getters/useFeatureSearch/useFeatureSearch';
import { useFrontendApiToggles } from 'hooks/api/getters/useFrontendApiToggles/useFrontendApiToggles';
import { DemoEnvironmentCanvas } from './DemoEnvironmentCanvas.tsx';
import { DemoSetupPanel } from './DemoSetupPanel.tsx';
import { DemoCreatedResources } from './DemoCreatedResources.tsx';
import type { DemoConnectionStatus } from './DemoStatusIndicator.tsx';
import { DemoFeatureFlagsTable } from './DemoFeatureFlagsTable.tsx';
import { DemoFlagControls } from './DemoFlagControls.tsx';
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

const StyledWizardAccordion = styled(Accordion)(({ theme }) => ({
    boxShadow: 'none',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: `${theme.shape.borderRadiusLarge}px`,
    '&:before': { display: 'none' },
    '&.Mui-expanded': { margin: 0 },
}));

const StyledStepper = styled(Stepper)(({ theme }) => ({
    padding: theme.spacing(1, 0),
    flex: 1,
}));

const StyledStepButton = styled(StepButton, {
    shouldForwardProp: (prop) => prop !== 'pulsing',
})<{ pulsing?: boolean }>(({ theme, pulsing }) => ({
    borderRadius: `${theme.shape.borderRadius}px`,
    // the button stretches across the stepper; only the dot and the label
    // of a READY step should invite a click
    cursor: 'default',
    '&:not(.Mui-disabled) .MuiStepLabel-label, &:not(.Mui-disabled) .MuiStepIcon-root':
        {
            cursor: 'pointer',
        },
    '&.Mui-disabled, &.Mui-disabled .MuiStepLabel-label, &.Mui-disabled .MuiStepIcon-root':
        {
            cursor: 'default',
        },
    ...(pulsing && {
        '& .MuiStepLabel-label': {
            // emphasized against the muted default in BOTH themes — plain
            // white is illegible on the light theme
            color: theme.palette.text.primary,
            cursor: 'pointer',
        },
        '& .MuiStepIcon-root': {
            color: theme.palette.primary.main,
            borderRadius: '50%',
            cursor: 'pointer',
            animation: `${keyframes`
                0% { box-shadow: 0 0 0 0 ${alpha(theme.palette.primary.main, 0.6)}; }
                70% { box-shadow: 0 0 0 8px ${alpha(theme.palette.primary.main, 0)}; }
                100% { box-shadow: 0 0 0 0 ${alpha(theme.palette.primary.main, 0)}; }
            `} 1.8s infinite`,
        },
    }),
}));

const StyledPanelArea = styled('div')(({ theme }) => ({
    width: '100%',
    maxWidth: theme.spacing(110),
    margin: '0 auto',
}));

const StyledEnvTabs = styled(Tabs)(({ theme }) => ({
    minHeight: theme.spacing(5),
    borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StyledLiveGrid = styled('div')(({ theme }) => ({
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(380px, 520px)',
    gap: theme.spacing(3),
    alignItems: 'start',
    [theme.breakpoints.down('lg')]: {
        gridTemplateColumns: '1fr',
    },
}));

const StyledSideTable = styled('div')({
    minWidth: 0,
    overflowX: 'auto',
});

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
    const [wizardExpanded, setWizardExpanded] = useState(true);
    const [activeEnvironment, setActiveEnvironment] = useState<string>(
        FLAG_CITY_ENVIRONMENTS[0],
    );

    const goToStep = (step: number) => {
        setActiveStep(step);
        // going live collapses the wizard chrome, like the project view's
        // onboarding accordion; re-opening a setup step expands it again
        setWizardExpanded(step !== 2);
    };

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
    const {
        hintsByEnv,
        strategiesFor,
        refetch: refetchHints,
    } = useFlagCityHints(flagsCreated);
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
                <StyledWizardAccordion
                    disableGutters
                    expanded={wizardExpanded}
                    onChange={(_, expanded) => setWizardExpanded(expanded)}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        data-testid='demo-wizard-summary'
                    >
                        {/* step clicks must not toggle the accordion */}
                        <div
                            style={{ display: 'flex', flex: 1 }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <StyledStepper nonLinear activeStep={activeStep}>
                                <Step completed={tokensCreated}>
                                    <StyledStepButton
                                        onClick={() => goToStep(0)}
                                        data-testid='demo-step-configure'
                                    >
                                        Configure Unleash
                                    </StyledStepButton>
                                </Step>
                                <Step completed={flagWrapped}>
                                    <StyledStepButton
                                        onClick={() => goToStep(1)}
                                        disabled={!tokensCreated}
                                        pulsing={
                                            tokensCreated && activeStep === 0
                                        }
                                        data-testid='demo-step-setup'
                                    >
                                        Setup demo app
                                    </StyledStepButton>
                                </Step>
                                <Step>
                                    <StyledStepButton
                                        onClick={() => goToStep(2)}
                                        disabled={!flagWrapped}
                                        pulsing={flagWrapped && activeStep < 2}
                                        data-testid='demo-step-live'
                                    >
                                        See it live!
                                    </StyledStepButton>
                                </Step>
                            </StyledStepper>
                        </div>
                    </AccordionSummary>
                    <AccordionDetails>
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
                            <Typography variant='body2' color='text.secondary'>
                                The demo app is live below — switch environments
                                with the tabs and steer the cities from the flag
                                list.
                            </Typography>
                        ) : null}
                    </AccordionDetails>
                </StyledWizardAccordion>
                {activeStep === 0 ? (
                    <DemoCreatedResources
                        projectCreated={projectCreated}
                        flagsCreated={flagsCreated}
                        tokensCreated={tokensCreated}
                    />
                ) : null}
                {activeStep === 2 ? (
                    <>
                        <StyledEnvTabs
                            value={activeEnvironment}
                            onChange={(_, value) => setActiveEnvironment(value)}
                            indicatorColor='primary'
                            textColor='primary'
                        >
                            {environments.map((environment) => (
                                <Tab
                                    key={environment}
                                    value={environment}
                                    label={environment}
                                    data-testid={`demo-env-tab-${environment}`}
                                />
                            ))}
                        </StyledEnvTabs>
                        <StyledLiveGrid>
                            <DemoEnvironmentCanvas
                                environments={environments}
                                activeEnvironment={activeEnvironment}
                                tokensByEnv={{
                                    development: devToken?.secret,
                                    production: prodToken?.secret,
                                }}
                                hintsByEnv={hintsByEnv}
                            />
                            <StyledSideTable>
                                {projectId && flagsCreated ? (
                                    <DemoFeatureFlagsTable
                                        projectId={projectId}
                                        features={features}
                                        environments={[activeEnvironment]}
                                        refetch={refetchFlags}
                                        renderControls={(featureName) => (
                                            <DemoFlagControls
                                                flagName={featureName}
                                                environment={activeEnvironment}
                                                strategies={strategiesFor(
                                                    featureName,
                                                    activeEnvironment,
                                                )}
                                                onUpdated={refetchHints}
                                            />
                                        )}
                                    />
                                ) : (
                                    <StyledTableHint>
                                        <Typography variant='body2'>
                                            Create the demo project to load its
                                            feature flags.
                                        </Typography>
                                    </StyledTableHint>
                                )}
                            </StyledSideTable>
                        </StyledLiveGrid>
                    </>
                ) : null}
            </StyledStack>
        </PageContent>
    );
};

export default PlaygroundDemo;
