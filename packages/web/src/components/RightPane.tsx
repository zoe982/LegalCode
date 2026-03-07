import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Box, Tabs, Tab, IconButton } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { springTransitions, springTransition, reducedMotionQuery } from '../theme/motion.js';

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

const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 360;
const MAX_WIDTH = 480;
const SURFACE_SECONDARY = '#E6D9C6';
const TAB_COLOR = '#451F61';
const ACCENT = '#8027FF';
const BORDER_SUBTLE = '#D4C5B2';

export function RightPane({ open, onToggle, tabs, defaultTab = 0 }: RightPaneProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(DEFAULT_WIDTH);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const clampWidth = (w: number): number => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w));

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Moving left (negative delta) increases width since handle is on left edge
    const delta = dragStartX.current - e.clientX;
    setWidth(clampWidth(dragStartWidth.current + delta));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartWidth.current = width;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [width, handleMouseMove, handleMouseUp],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <Box
      data-testid="right-pane"
      sx={{
        width: open ? width : 0,
        height: '100%',
        bgcolor: SURFACE_SECONDARY,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 40,
        overflow: open ? 'visible' : 'hidden',
        opacity: open ? 1 : 0,
        position: 'relative',
        transition: springTransitions(['width', 'opacity'], 'expressive'),
        [`@media ${reducedMotionQuery}`]: {
          transition: 'none',
        },
      }}
    >
      {/* Resize handle on left edge */}
      {open && (
        <Box
          data-testid="right-pane-resize-handle"
          onMouseDown={handleResizeStart}
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            cursor: 'col-resize',
            zIndex: 50,
            '&:hover': {
              backgroundColor: BORDER_SUBTLE,
            },
          }}
        />
      )}

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

      {/* Tab content with crossfade */}
      <Box
        data-testid="right-pane-content"
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
