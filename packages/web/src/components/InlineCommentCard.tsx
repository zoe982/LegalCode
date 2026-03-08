import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Collapse,
  Menu,
  MenuItem,
} from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SendIcon from '@mui/icons-material/Send';
import type { CommentThread, Comment } from '../types/comments.js';
import { formatRelativeTime, getAvatarColor } from '../utils/commentHelpers.js';

export interface InlineCommentCardProps {
  thread: CommentThread;
  threadIndex: number;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (parentId: string, content: string) => void;
  isActive?: boolean;
  style?: React.CSSProperties;
}

function CommentRow({
  comment,
  authorIndex,
  isReply,
}: {
  comment: Comment;
  authorIndex: number;
  isReply?: boolean;
}) {
  const avatarSize = isReply === true ? 20 : 24;
  const fontSize = isReply === true ? '0.75rem' : '0.875rem';

  return (
    <Box sx={{ mb: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
        <Avatar
          sx={{
            width: avatarSize,
            height: avatarSize,
            fontSize: isReply === true ? '0.625rem' : '0.75rem',
            bgcolor: getAvatarColor(authorIndex),
          }}
        >
          {comment.authorName.charAt(0).toUpperCase()}
        </Avatar>
        <Typography
          sx={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#12111A',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {comment.authorName}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#9B9DB0',
            fontFamily: '"DM Sans", sans-serif',
            marginLeft: 'auto',
          }}
        >
          {formatRelativeTime(comment.createdAt)}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', pl: 4 }}>
        <Typography
          sx={{
            fontSize,
            color: '#37354A',
            fontFamily: '"DM Sans", sans-serif',
            flex: 1,
          }}
        >
          {comment.content}
        </Typography>
      </Box>
    </Box>
  );
}

export function InlineCommentCard({
  thread,
  threadIndex,
  onResolve,
  onDelete,
  onReply,
  isActive,
  style,
}: InlineCommentCardProps) {
  const [replyText, setReplyText] = useState('');
  const [replyFocused, setReplyFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleSendReply = useCallback(() => {
    if (replyText.trim() === '') return;
    onReply(thread.comment.id, replyText.trim());
    setReplyText('');
    setReplyFocused(false);
  }, [replyText, onReply, thread.comment.id]);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handleDelete = useCallback(() => {
    onDelete(thread.comment.id);
    setMenuAnchor(null);
  }, [onDelete, thread.comment.id]);

  const handleEdit = useCallback(() => {
    // Edit functionality — close menu for now
    setMenuAnchor(null);
  }, []);

  // Resolved thread: collapsed view
  if (thread.comment.resolved) {
    return (
      <Box
        role="article"
        aria-label={`Comment by ${thread.comment.authorName}`}
        style={style}
        sx={{
          p: 1.5,
          borderRadius: '8px',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
          opacity: 0.7,
          cursor: 'pointer',
          width: '100%',
          boxSizing: 'border-box',
        }}
        onClick={() => {
          setExpanded((prev) => !prev);
        }}
      >
        <Typography
          sx={{ fontSize: '0.75rem', color: '#6B6D82', fontFamily: '"DM Sans", sans-serif' }}
        >
          <CheckRoundedIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
          {thread.comment.authorName} resolved
        </Typography>
        <Collapse in={expanded}>
          <Box sx={{ mt: 1 }}>
            <CommentRow comment={thread.comment} authorIndex={threadIndex} />
          </Box>
        </Collapse>
      </Box>
    );
  }

  return (
    <Box
      role="article"
      aria-label={`Comment by ${thread.comment.authorName}`}
      style={style}
      {...(isActive === true ? { 'data-active': 'true' } : {})}
      sx={{
        p: 1.5,
        borderRadius: '8px',
        backgroundColor: isActive === true ? 'rgba(128, 39, 255, 0.04)' : '#FFFFFF',
        boxShadow:
          isActive === true
            ? '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)'
            : '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header row: Avatar + author + timestamp + resolve + more menu */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        <Avatar
          sx={{
            width: 24,
            height: 24,
            fontSize: '0.75rem',
            bgcolor: getAvatarColor(threadIndex),
          }}
        >
          {thread.comment.authorName.charAt(0).toUpperCase()}
        </Avatar>
        <Typography
          sx={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#12111A',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {thread.comment.authorName}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#9B9DB0',
            fontFamily: '"DM Sans", sans-serif',
            flex: 1,
          }}
        >
          {formatRelativeTime(thread.comment.createdAt)}
        </Typography>
        <IconButton
          size="small"
          aria-label="resolve"
          onClick={() => {
            onResolve(thread.comment.id);
          }}
          sx={{ color: '#6B6D82' }}
        >
          <CheckRoundedIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton
          size="small"
          aria-label="more options"
          onClick={handleMenuOpen}
          sx={{ color: '#6B6D82' }}
        >
          <MoreVertIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <Menu anchorEl={menuAnchor} open={menuAnchor != null} onClose={handleMenuClose}>
          <MenuItem onClick={handleEdit}>Edit</MenuItem>
          <MenuItem onClick={handleDelete}>Delete</MenuItem>
        </Menu>
      </Box>

      {/* Comment content */}
      <Box sx={{ pl: 4 }}>
        <Typography
          sx={{
            fontSize: '0.875rem',
            color: '#37354A',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {thread.comment.content}
        </Typography>
      </Box>

      {/* Replies */}
      {thread.replies.length > 0 && (
        <Box sx={{ pl: 4, mt: 0.5 }}>
          {thread.replies.map((reply, rIdx) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              authorIndex={threadIndex + rIdx + 1}
              isReply
            />
          ))}
        </Box>
      )}

      {/* Reply input */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, ml: 2 }}>
        <TextField
          size="small"
          placeholder="Reply..."
          value={replyText}
          onChange={(e) => {
            setReplyText(e.target.value);
          }}
          onFocus={() => {
            setReplyFocused(true);
          }}
          onBlur={() => {
            setTimeout(() => {
              setReplyFocused(false);
            }, 200);
          }}
          sx={{
            flex: 1,
            '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.5, px: 1 },
          }}
        />
        {(replyFocused || replyText !== '') && (
          <IconButton
            size="small"
            aria-label="send"
            onClick={handleSendReply}
            sx={{ color: '#8027FF' }}
          >
            <SendIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}
