import {
    Alert,
    styled,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from '@mui/material';
import type { FeatureSearchResponseSchema } from 'openapi';
import { FeatureToggleSwitch } from 'component/project/Project/ProjectFeatureToggles/FeatureToggleSwitch/FeatureToggleSwitch';
import { useFeatureToggleSwitch } from 'component/project/Project/ProjectFeatureToggles/FeatureToggleSwitch/useFeatureToggleSwitch';

const StyledFlagName = styled(TableCell)(({ theme }) => ({
    fontWeight: theme.typography.fontWeightBold,
    wordBreak: 'break-word',
}));

interface IDemoFeatureFlagsTableProps {
    projectId: string;
    features: FeatureSearchResponseSchema[];
    environments: string[];
    refetch: () => void;
}

export const DemoFeatureFlagsTable = ({
    projectId,
    features,
    environments,
    refetch,
}: IDemoFeatureFlagsTableProps) => {
    const { onToggle: onFeatureToggle, modals } =
        useFeatureToggleSwitch(projectId);

    if (features.length === 0) {
        return (
            <Alert severity='info'>
                This project has no feature flags yet. Create one on the project
                page to see it here.
            </Alert>
        );
    }

    return (
        <>
            <Table size='small'>
                <TableHead>
                    <TableRow>
                        <TableCell>Feature flag</TableCell>
                        {environments.map((environment) => (
                            <TableCell key={environment} align='center'>
                                {environment}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {features.map((feature) => (
                        <TableRow key={feature.name}>
                            <StyledFlagName>{feature.name}</StyledFlagName>
                            {environments.map((environmentName) => {
                                const environment = feature.environments?.find(
                                    ({ name }) => name === environmentName,
                                );

                                return (
                                    <TableCell
                                        key={environmentName}
                                        align='center'
                                    >
                                        <FeatureToggleSwitch
                                            projectId={projectId}
                                            featureId={feature.name}
                                            environmentName={environmentName}
                                            value={
                                                environment?.enabled ?? false
                                            }
                                            onToggle={(newState, onRollback) =>
                                                onFeatureToggle(newState, {
                                                    projectId,
                                                    featureId: feature.name,
                                                    environmentName,
                                                    environmentType:
                                                        environment?.type,
                                                    hasStrategies:
                                                        environment?.hasStrategies,
                                                    hasEnabledStrategies:
                                                        environment?.hasEnabledStrategies,
                                                    isChangeRequestEnabled: false,
                                                    onRollback,
                                                    onSuccess: refetch,
                                                })
                                            }
                                        />
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {modals}
        </>
    );
};
