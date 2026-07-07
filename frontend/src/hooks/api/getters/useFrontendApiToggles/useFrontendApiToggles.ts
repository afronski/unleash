import type { SWRConfiguration } from 'swr';
import { useCallback } from 'react';
import { formatApiPath } from 'utils/formatPath';
import handleErrorResponses from '../httpErrorResponseHandler.js';
import type { FrontendApiFeaturesSchema } from 'openapi';
import { useConditionalSWR } from '../useConditionalSWR/useConditionalSWR.js';

const fallback: FrontendApiFeaturesSchema = { toggles: [] };

/**
 * Fetches evaluated feature toggles from the Frontend API (`/api/frontend`)
 * using a frontend API token, i.e. the same view a connected SDK would get.
 * The endpoint only returns enabled toggles; disabled flags are absent.
 */
export const useFrontendApiToggles = (
    tokenSecret?: string,
    options: SWRConfiguration = {},
) => {
    const { data, error, mutate } =
        useConditionalSWR<FrontendApiFeaturesSchema>(
            Boolean(tokenSecret),
            fallback,
            ['frontendApiToggles', tokenSecret],
            () => fetcher(tokenSecret!),
            { refreshInterval: 3_000, ...options },
        );

    const refetch = useCallback(() => {
        mutate().catch(console.warn);
    }, [mutate]);

    return {
        toggles: data?.toggles ?? [],
        error,
        loading: !error && !data,
        refetch,
    };
};

const fetcher = async (
    tokenSecret: string,
): Promise<FrontendApiFeaturesSchema> => {
    const path = formatApiPath('api/frontend');
    const res = await fetch(path, {
        headers: { Authorization: tokenSecret },
    }).then(handleErrorResponses('Live SDK view'));
    return res.json();
};
