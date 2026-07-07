import { useMemo, useState } from 'react';
import useProjectApi from 'hooks/api/actions/useProjectApi/useProjectApi';
import useFeatureApi from 'hooks/api/actions/useFeatureApi/useFeatureApi';
import useFeatureStrategyApi from 'hooks/api/actions/useFeatureStrategyApi/useFeatureStrategyApi';
import { useDependentFeaturesApi } from 'hooks/api/actions/useDependentFeaturesApi/useDependentFeaturesApi';
import useContextsApi from 'hooks/api/actions/useContextsApi/useContextsApi';
import useApiTokensApi from 'hooks/api/actions/useApiTokensApi/useApiTokensApi';
import {
    type IApiToken,
    useApiTokens,
} from 'hooks/api/getters/useApiTokens/useApiTokens';
import useToast from 'hooks/useToast';
import { formatUnknownError } from 'utils/formatUnknownError';
import { TokenType } from 'interfaces/token';
import {
    FLAG_CITY_CONTEXT_FIELDS,
    FLAG_CITY_ENVIRONMENTS,
    FLAG_CITY_FLAGS,
    FLAG_CITY_PROJECT_DESCRIPTION,
    FLAG_CITY_PROJECT_ID,
    FLAG_CITY_PROJECT_NAME,
    isEnabledInEnvironment,
} from './flagCityDefinitions.ts';

export type FlagCitySetupStep = 'project' | 'flags' | 'tokens';

const tokenProjects = (token: IApiToken): string[] => {
    if (Array.isArray(token.projects)) {
        return token.projects;
    }
    return [token.projects ?? token.project ?? '*'];
};

export const filterFlagCityTokens = (tokens: IApiToken[]): IApiToken[] =>
    tokens
        .filter((token) => token.type.toUpperCase() === TokenType.FRONTEND)
        .filter(
            (token) =>
                tokenProjects(token).includes('*') ||
                tokenProjects(token).includes(FLAG_CITY_PROJECT_ID),
        );

// Backend duplicate messages vary ("already exists", "already exist",
// "name already in use") — but must NOT match "Resource does not exist"
// (404), which means the project vanished and the step must fail loudly.
const isAlreadyExistsError = (error: unknown): boolean =>
    error instanceof Error &&
    /(already exist|already in use|duplicate)/i.test(error.message);

/**
 * Idempotent provisioning of the Flag City demo resources. Every action is
 * safe to re-run (create-if-missing / overwrite / re-enable no-op), so the
 * wizard can be replayed on an already-provisioned instance.
 */
export const useFlagCitySetup = () => {
    const { createProject } = useProjectApi();
    const { createFeatureToggle, toggleFeatureEnvironmentOn } = useFeatureApi();
    const { addStrategyToFeature } = useFeatureStrategyApi();
    const { addDependency } = useDependentFeaturesApi(FLAG_CITY_PROJECT_ID);
    const { createContext } = useContextsApi();
    const { createToken } = useApiTokensApi();
    const { tokens, refetch: refetchTokens } = useApiTokens();
    const { setToastData, setToastApiError } = useToast();
    const [busyStep, setBusyStep] = useState<FlagCitySetupStep>();

    const flagCityTokens = useMemo(
        () => filterFlagCityTokens(tokens),
        [tokens],
    );
    const devToken = flagCityTokens.find(
        (token) => token.environment === 'development',
    );
    const prodToken = flagCityTokens.find(
        (token) => token.environment === 'production',
    );

    const run = async (
        step: FlagCitySetupStep,
        action: () => Promise<void>,
        successText: string,
    ): Promise<boolean> => {
        setBusyStep(step);
        try {
            await action();
            setToastData({ type: 'success', text: successText });
            return true;
        } catch (error: unknown) {
            setToastApiError(formatUnknownError(error));
            return false;
        } finally {
            setBusyStep(undefined);
        }
    };

    const createDemoProject = () =>
        run(
            'project',
            async () => {
                try {
                    await createProject({
                        id: FLAG_CITY_PROJECT_ID,
                        name: FLAG_CITY_PROJECT_NAME,
                        description: FLAG_CITY_PROJECT_DESCRIPTION,
                    });
                } catch (error: unknown) {
                    if (!isAlreadyExistsError(error)) throw error;
                }
                for (const field of FLAG_CITY_CONTEXT_FIELDS) {
                    try {
                        await createContext(field as any);
                    } catch (error: unknown) {
                        if (!isAlreadyExistsError(error)) throw error;
                    }
                }
            },
            `Project "${FLAG_CITY_PROJECT_NAME}" is ready`,
        );

    const createDemoFlags = () =>
        run(
            'flags',
            async () => {
                // parents are listed before their children, so one pass can
                // create flags, strategies, defaults, and dependencies in order
                for (const flag of FLAG_CITY_FLAGS) {
                    let created = true;
                    try {
                        await createFeatureToggle(FLAG_CITY_PROJECT_ID, {
                            name: flag.name,
                            description: flag.description,
                            type: flag.type,
                            impressionData: false,
                        });
                    } catch (error: unknown) {
                        if (!isAlreadyExistsError(error)) throw error;
                        created = false;
                    }
                    if (created && flag.strategy) {
                        for (const environment of FLAG_CITY_ENVIRONMENTS) {
                            await addStrategyToFeature(
                                FLAG_CITY_PROJECT_ID,
                                flag.name,
                                environment,
                                flag.strategy,
                            );
                        }
                    }
                    if (created) {
                        for (const environment of FLAG_CITY_ENVIRONMENTS) {
                            if (isEnabledInEnvironment(flag, environment)) {
                                await toggleFeatureEnvironmentOn(
                                    FLAG_CITY_PROJECT_ID,
                                    flag.name,
                                    environment,
                                );
                            }
                        }
                    }
                    if (flag.dependsOn) {
                        await addDependency(flag.name, {
                            feature: flag.dependsOn,
                        });
                    }
                }
            },
            `${FLAG_CITY_FLAGS.length} feature flags are ready`,
        );

    const createDemoTokens = () =>
        run(
            'tokens',
            async () => {
                for (const environment of FLAG_CITY_ENVIRONMENTS) {
                    const exists = flagCityTokens.some(
                        (token) => token.environment === environment,
                    );
                    if (!exists) {
                        await createToken({
                            tokenName: `flagcity-${environment}`,
                            type: TokenType.FRONTEND,
                            environment,
                            projects: [FLAG_CITY_PROJECT_ID],
                        });
                    }
                }
                refetchTokens();
            },
            'Frontend API tokens are ready',
        );

    return {
        createDemoProject,
        createDemoFlags,
        createDemoTokens,
        busyStep,
        devToken,
        prodToken,
    };
};
