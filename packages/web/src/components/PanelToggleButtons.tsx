import { Box, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { FirstUseTooltip } from './FirstUseTooltip.js';

type PanelType = 'info' | 'comments' | 'history';

const tooltipConfig: Partial<Record<PanelType, { featureId: string; message: string }>> = {
  history: { featureId: 'version-history', message: 'See how your document evolved over time' },
  comments: { featureId: 'comments', message: 'Leave feedback on specific sections' },
};

interface PanelToggleButtonsProps {
  activePanel: PanelType | null;
  onToggle: (panel: PanelType) => void;
  commentCount?: number;
}

const buttons: {
  panel: PanelType;
  label: string;
  testId: string;
  Icon: typeof InfoOutlinedIcon;
}[] = [
  { panel: 'info', label: 'Info panel', testId: 'panel-toggle-info', Icon: InfoOutlinedIcon },
  {
    panel: 'comments',
    label: 'Comments panel',
    testId: 'panel-toggle-comments',
    Icon: ChatBubbleOutlineRoundedIcon,
  },
  {
    panel: 'history',
    label: 'History panel',
    testId: 'panel-toggle-history',
    Icon: HistoryRoundedIcon,
  },
];

export function PanelToggleButtons({
  activePanel,
  onToggle,
  commentCount,
}: PanelToggleButtonsProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {buttons.map(({ panel, label, testId, Icon }) => {
        const isActive = activePanel === panel;
        const showBadge = panel === 'comments' && commentCount != null && commentCount > 0;

        const tooltip = tooltipConfig[panel];
        const iconButton = (
          <IconButton
            data-testid={testId}
            aria-label={label}
            onClick={() => {
              onToggle(panel);
            }}
            sx={{
              width: 32,
              height: 32,
              padding: 0,
              backgroundColor: isActive ? 'rgba(128, 39, 255, 0.06)' : 'transparent',
              color: isActive ? '#8027FF' : '#6B6D82',
              '&:hover': {
                color: isActive ? '#8027FF' : '#12111A',
                backgroundColor: isActive ? 'rgba(128, 39, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
              },
              borderRadius: '50%',
            }}
          >
            <Icon sx={{ fontSize: 20 }} />
          </IconButton>
        );

        return (
          <Box key={panel} sx={{ position: 'relative', display: 'inline-flex' }}>
            {tooltip != null ? (
              <FirstUseTooltip featureId={tooltip.featureId} message={tooltip.message}>
                {iconButton}
              </FirstUseTooltip>
            ) : (
              iconButton
            )}
            {showBadge && (
              <Box
                data-testid="comment-badge"
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  minWidth: 16,
                  height: 16,
                  borderRadius: '8px',
                  backgroundColor: '#8027FF',
                  color: '#FFFFFF',
                  fontSize: '0.625rem',
                  fontFamily: '"DM Sans", sans-serif',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  px: '3px',
                  pointerEvents: 'none',
                }}
              >
                {commentCount}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
