import { Avatar, AvatarGroup, Tooltip } from '@mui/material';

export interface CollaborationUser {
  userId: string;
  email: string;
  color: string;
}

interface PresenceAvatarsProps {
  users: CollaborationUser[];
}

function getInitial(email: string): string {
  return email.charAt(0).toUpperCase();
}

export const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({ users }) => {
  return (
    <AvatarGroup max={5} sx={{ ml: 2 }}>
      {users.map((user) => (
        <Tooltip key={user.userId} title={user.email}>
          <Avatar
            sx={{
              bgcolor: '#ffffff',
              color: user.color,
              border: `2px solid ${user.color}`,
              width: 28,
              height: 28,
              fontSize: '0.875rem',
            }}
          >
            {getInitial(user.email)}
          </Avatar>
        </Tooltip>
      ))}
    </AvatarGroup>
  );
};
