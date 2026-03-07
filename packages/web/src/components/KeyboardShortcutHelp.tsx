import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface KeyboardShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  label: string;
  shortcuts: ShortcutEntry[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    label: 'Editor',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'P'], description: 'Toggle panel' },
      { keys: ['Escape'], description: 'Close pane / dismiss' },
    ],
  },
  {
    label: 'Review',
    shortcuts: [{ keys: ['Ctrl', 'Alt', 'M'], description: 'Comment on selection' }],
  },
  {
    label: 'General',
    shortcuts: [{ keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts' }],
  },
];

const kbdStyle = {
  display: 'inline-block',
  padding: '2px 6px',
  backgroundColor: '#F3F3F7',
  borderRadius: '4px',
  fontSize: '0.75rem',
  fontFamily: '"DM Sans", sans-serif',
  fontWeight: 600,
  color: '#12111A',
  border: '1px solid #E4E5ED',
} as const;

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {keys.map((key, i) => (
        <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {i > 0 && (
            <Typography component="span" sx={{ fontSize: '0.75rem', color: '#9B9DB0' }}>
              +
            </Typography>
          )}
          <Box component="kbd" sx={kbdStyle}>
            {key}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function KeyboardShortcutHelp({ open, onClose }: KeyboardShortcutHelpProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      transitionDuration={{ enter: 200, exit: 150 }}
      slotProps={{
        paper: {
          sx: {
            maxWidth: 480,
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
          },
        },
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#12111A',
          pr: 6,
        }}
      >
        Keyboard Shortcuts
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: '#6B6D82',
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        {shortcutGroups.map((group) => (
          <Box key={group.label} sx={{ mb: 2.5 }}>
            <Typography
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#6B6D82',
                mb: 1,
              }}
            >
              {group.label}
            </Typography>
            {group.shortcuts.map((shortcut) => (
              <Box
                key={shortcut.description}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 0.75,
                }}
              >
                <KeyCombo keys={shortcut.keys} />
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontFamily: '"DM Sans", sans-serif',
                    color: '#37354A',
                  }}
                >
                  {shortcut.description}
                </Typography>
              </Box>
            ))}
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}
