import { Chip, styled, Tooltip } from '@mui/material';
import { FLAG_CITY_PROJECT_ID } from 'component/playground/Playground/PlaygroundDemo/flagCityDefinitions.ts';

const StyledDemoChip = styled(Chip)(({ theme }) => ({
    fontWeight: theme.typography.fontWeightBold,
    letterSpacing: '0.05em',
    color: theme.palette.warning.contrastText,
    backgroundColor: theme.palette.warning.main,
}));

interface IDemoProjectBadgeProps {
    id: string;
}

/** Marks the Playground demo project ("Flag City") in the projects list. */
export const DemoProjectBadge = ({ id }: IDemoProjectBadgeProps) => {
    if (id !== FLAG_CITY_PROJECT_ID) {
        return null;
    }

    return (
        <Tooltip
            title='Created by the Playground demo — drives the Flag City simulation.'
            arrow
        >
            <StyledDemoChip
                size='small'
                label='DEMO'
                data-testid='demo-project-badge'
            />
        </Tooltip>
    );
};
