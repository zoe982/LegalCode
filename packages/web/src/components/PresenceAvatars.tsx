import { Avatar, AvatarGroup, Tooltip, GlobalStyles } from '@mui/material';

export interface CollaborationUser {
  userId: string;
  email: string;
  color: string;
  name?: string;
  mode?: string;
}

interface PresenceAvatarsProps {
  users: CollaborationUser[];
}

const CURSOR_COLORS: [string, ...string[]] = [
  '#E63946',
  '#457B9D',
  '#2A9D8F',
  '#E9C46A',
  '#6A4C93',
];

function getCursorColor(index: number): string {
  /* v8 ignore next -- fallback is unreachable but required by noUncheckedIndexedAccess */
  return CURSOR_COLORS[index % CURSOR_COLORS.length] ?? '#E63946';
}

function getInitial(email: string): string {
  return email.charAt(0).toUpperCase();
}

function getTooltipLabel(user: CollaborationUser): string {
  const displayName = user.name ?? user.email;
  if (user.mode) {
    return `${displayName} \u00b7 ${user.mode}`;
  }
  return displayName;
}

const avatarEntryKeyframes = `
@keyframes avatarEntry {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes avatarEntry {
    0% { transform: scale(1); }
    100% { transform: scale(1); }
  }
}
`;

export const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({ users }) => {
  return (
    <>
      <GlobalStyles styles={avatarEntryKeyframes} />
      <AvatarGroup max={4} sx={{ ml: 2 }}>
        {users.map((user, index) => {
          const borderColor = getCursorColor(index);
          return (
            <Tooltip key={user.userId} title={getTooltipLabel(user)} enterDelay={500}>
              <Avatar
                sx={{
                  bgcolor: '#ffffff',
                  color: borderColor,
                  border: `2px solid ${borderColor}`,
                  width: 28,
                  height: 28,
                  fontSize: '0.875rem',
                  animation: 'avatarEntry 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                {getInitial(user.email)}
              </Avatar>
            </Tooltip>
          );
        })}
      </AvatarGroup>
    </>
  );
};
