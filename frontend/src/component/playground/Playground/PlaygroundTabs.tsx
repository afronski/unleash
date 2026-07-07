import { Paper, styled, Tab, Tabs } from '@mui/material';
import { Route, Routes, useLocation } from 'react-router';
import { TabLink } from 'component/common/TabNav/TabLink';
import AdvancedPlayground from './AdvancedPlayground.tsx';
import { LazyPlaygroundDemo } from './PlaygroundDemo/LazyPlaygroundDemo.tsx';

const StyledTabsContainer = styled(Paper)(({ theme }) => ({
    marginBottom: theme.spacing(2),
    padding: theme.spacing(0, 2),
    borderRadius: `${theme.shape.borderRadiusLarge}px`,
    boxShadow: 'none',
}));

const tabs = [
    { label: 'Playground', path: '/playground' },
    { label: 'Demo', path: '/playground/demo' },
];

export const PlaygroundTabs = () => {
    const { pathname } = useLocation();
    const activeTab = pathname.startsWith('/playground/demo')
        ? '/playground/demo'
        : '/playground';

    return (
        <div>
            <StyledTabsContainer>
                <Tabs
                    value={activeTab}
                    indicatorColor='primary'
                    textColor='primary'
                    variant='scrollable'
                    allowScrollButtonsMobile
                >
                    {tabs.map(({ label, path }) => (
                        <Tab
                            key={path}
                            value={path}
                            label={
                                <TabLink to={path}>
                                    <span>{label}</span>
                                </TabLink>
                            }
                            sx={{ padding: 0 }}
                        />
                    ))}
                </Tabs>
            </StyledTabsContainer>
            <Routes>
                <Route
                    path='demo/:projectId?'
                    element={<LazyPlaygroundDemo />}
                />
                <Route path='*' element={<AdvancedPlayground />} />
            </Routes>
        </div>
    );
};

export default PlaygroundTabs;
