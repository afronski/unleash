import { Link } from 'react-router';
import { styled, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import {
    FLAG_CITY_FLAGS,
    FLAG_CITY_PROJECT_ID,
    FLAG_CITY_PROJECT_NAME,
} from './flagCityDefinitions.ts';

const StyledList = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
    padding: theme.spacing(3),
    borderRadius: `${theme.shape.borderRadiusLarge}px`,
    border: `1px solid ${theme.palette.divider}`,
    maxWidth: theme.spacing(110),
    width: '100%',
    margin: '0 auto',
}));

const StyledRow = styled('div', {
    shouldForwardProp: (prop) => prop !== 'done',
})<{ done: boolean }>(({ theme, done }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    flexWrap: 'wrap',
    opacity: done ? 1 : 0.55,
    '& svg': {
        color: done ? theme.palette.success.main : theme.palette.text.disabled,
        fontSize: theme.spacing(2.5),
    },
}));

const StyledLinks = styled('span')(({ theme }) => ({
    display: 'inline-flex',
    gap: theme.spacing(2),
    marginLeft: 'auto',
    whiteSpace: 'nowrap',
    '& a': {
        color: theme.palette.primary.main,
    },
}));

interface IResourceRowProps {
    done: boolean;
    text: string;
    links: Array<{ label: string; to: string }>;
}

const ResourceRow = ({ done, text, links }: IResourceRowProps) => (
    <StyledRow done={done}>
        {done ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
        <Typography variant='body2'>{text}</Typography>
        {done ? (
            <StyledLinks>
                {links.map(({ label, to }) => (
                    <Link
                        key={to}
                        to={to}
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        {label} →
                    </Link>
                ))}
            </StyledLinks>
        ) : null}
    </StyledRow>
);

interface IDemoCreatedResourcesProps {
    projectCreated: boolean;
    flagsCreated: boolean;
    tokensCreated: boolean;
}

/**
 * A small live inventory of what each "Configure Unleash" click created,
 * with links into the real Unleash UI to inspect the results.
 */
export const DemoCreatedResources = ({
    projectCreated,
    flagsCreated,
    tokensCreated,
}: IDemoCreatedResourcesProps) => (
    <StyledList data-testid='demo-created-resources'>
        <ResourceRow
            done={projectCreated}
            text={`Project "${FLAG_CITY_PROJECT_NAME}" with the carId, carType, and carColor context fields`}
            links={[
                { label: 'Project', to: `/projects/${FLAG_CITY_PROJECT_ID}` },
                { label: 'Context fields', to: '/context' },
            ]}
        />
        <ResourceRow
            done={flagsCreated}
            text={`${FLAG_CITY_FLAGS.length} feature flags with types, strategies, variants, and dependencies`}
            links={[
                {
                    label: 'Feature flags',
                    to: `/projects/${FLAG_CITY_PROJECT_ID}`,
                },
            ]}
        />
        <ResourceRow
            done={tokensCreated}
            text='Two frontend API tokens — one per environment'
            links={[{ label: 'API access', to: '/admin/api' }]}
        />
    </StyledList>
);
