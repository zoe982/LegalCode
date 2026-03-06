import { useState, type ReactNode } from 'react';
import { Box, Tabs, Tab, IconButton } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { springTransition, reducedMotionQuery } from '../theme/motion.js';

interface RightPaneTab {
  label: string;
  content: ReactNode;
}

interface RightPaneProps {
  open: boolean;
  onToggle: () => void;
  tabs: RightPaneTab[];
  defaultTab?: number;
}

const PANE_WIDTH = 400;
const SURFACE_SECONDARY = '#E6D9C6';
const TAB_COLOR = '#451F61';
const ACCENT = '#8027FF';

export function RightPane({ open, onToggle, tabs, defaultTab = 0 }: RightPaneProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (!open) {
    return null;
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box
      data-testid="right-pane"
      sx={{
        width: PANE_WIDTH,
        height: '100%',
        bgcolor: SURFACE_SECONDARY,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 40,
        transition: springTransition('width', 'expressive'),
        [`@media ${reducedMotionQuery}`]: {
          transition: 'none',
        },
      }}
    >
      {/* Tab bar with collapse button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            flex: 1,
            minHeight: 0,
            '& .MuiTab-root': {
              fontFamily: '"Source Sans 3", "Helvetica Neue", Arial, sans-serif',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: TAB_COLOR,
              textTransform: 'none',
              minHeight: 44,
              py: 1.5,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: ACCENT,
              height: 2,
            },
          }}
        >
          {tabs.map((tab) => (
            <Tab key={tab.label} label={tab.label} />
          ))}
        </Tabs>
        <IconButton aria-label="collapse" onClick={onToggle} size="small" sx={{ mr: 0.5 }}>
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Tab content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          transition: springTransition('opacity', 'standard-fast'),
          [`@media ${reducedMotionQuery}`]: {
            transition: 'none',
          },
        }}
      >
        {tabs[activeTab]?.content}
      </Box>
    </Box>
  );
}
