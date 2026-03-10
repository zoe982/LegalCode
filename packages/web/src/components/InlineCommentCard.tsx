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
import { formatRelativeTime, getAvatarColor, getDisplayName } from '../utils/commentHelpers.js';

export interface InlineCommentCardProps {
  thread: CommentThread;
  threadIndex: number;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (parentId: string, content: string) => void;
  onAnchorClick?: ((commentId: string) => void) | undefined;
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
            fontWeight: 500,
            bgcolor: getAvatarColor(authorIndex),
          }}
        >
          {comment.authorName.charAt(0).toUpperCase()}
        </Avatar>
        <Typography
          title={comment.authorName}
          sx={{
            fontSize: '0.8125rem',
            fontWeight: isReply === true ? 500 : 600,
            color: '#12111A',
            fontFamily: '"DM Sans", sans-serif',
            letterSpacing: '-0.01em',
            maxWidth: 120,
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {getDisplayName(comment.authorName)}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#9B9DB0',
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {`\u00B7 ${formatRelativeTime(comment.createdAt)}`}
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
  onAnchorClick,
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
          p: '10px 16px',
          borderRadius: '10px',
          backgroundColor: '#F9F9FB',
          border: '1px solid #F3F3F7',
          boxShadow: 'none',
          cursor: 'pointer',
          width: '100%',
          boxSizing: 'border-box',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: '-24px',
            top: '20px',
            width: '24px',
            height: '1px',
            backgroundColor: '#D1D2DE',
            transition: 'background-color 200ms ease',
          },
        }}
        onClick={() => {
          setExpanded((prev) => !prev);
        }}
      >
        <Typography
          sx={{ fontSize: '0.75rem', color: '#6B6D82', fontFamily: '"DM Sans", sans-serif' }}
        >
          <CheckRoundedIcon
            sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5, color: '#2e7d32' }}
          />
          {getDisplayName(thread.comment.authorName)} resolved
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
        p: '14px 16px',
        borderRadius: '10px',
        backgroundColor: isActive === true ? 'rgba(128, 39, 255, 0.03)' : '#FFFFFF',
        border: isActive === true ? '1px solid #8027FF' : '1px solid #E4E5ED',
        boxShadow:
          isActive === true
            ? '0 0 0 1px rgba(128,39,255,0.2), 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)'
            : '0 1px 2px rgba(0,0,0,0.04)',
        transition: 'box-shadow 200ms ease, border-color 200ms ease, background-color 200ms ease',
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        '&:hover .comment-actions': { opacity: 1 },
        '& .comment-actions:focus-within': { opacity: 1 },
        '&::before': {
          content: '""',
          position: 'absolute',
          left: '-24px',
          top: '20px',
          width: '24px',
          height: '1px',
          backgroundColor: isActive === true ? '#8027FF' : '#D1D2DE',
          transition: 'background-color 200ms ease',
        },
        ...(isActive !== true && {
          '&:hover': {
            borderColor: '#D1D2DE',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          },
        }),
      }}
    >
      {/* Anchor text quote */}
      {thread.comment.anchorText != null && (
        <Box
          data-testid="anchor-quote"
          onClick={() => {
            onAnchorClick?.(thread.comment.id);
          }}
          sx={{
            fontStyle: 'italic',
            borderLeft: '2px solid #FBBF2433',
            backgroundColor: 'transparent',
            pl: 1,
            py: 0.25,
            pr: 1,
            mb: 1,
            color: '#6B6D82',
            fontSize: '0.8125rem',
            fontFamily: '"DM Sans", sans-serif',
            cursor: 'pointer',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {thread.comment.anchorText}
        </Box>
      )}

      {/* Header row: Avatar + author + timestamp + resolve + more menu */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Avatar
          sx={{
            width: 24,
            height: 24,
            fontSize: '0.75rem',
            fontWeight: 500,
            bgcolor: getAvatarColor(threadIndex),
          }}
        >
          {thread.comment.authorName.charAt(0).toUpperCase()}
        </Avatar>
        <Typography
          title={thread.comment.authorName}
          sx={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#12111A',
            fontFamily: '"DM Sans", sans-serif',
            maxWidth: 120,
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {getDisplayName(thread.comment.authorName)}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#9B9DB0',
            fontFamily: '"DM Sans", sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          {`\u00B7 ${formatRelativeTime(thread.comment.createdAt)}`}
        </Typography>
        <IconButton
          className="comment-actions"
          size="small"
          aria-label="resolve"
          onClick={() => {
            onResolve(thread.comment.id);
          }}
          sx={{
            ml: 'auto',
            color: '#6B6D82',
            opacity: 0,
            transition: 'opacity 0.2s',
            '&:hover': { color: '#059669' },
          }}
        >
          <CheckRoundedIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton
          className="comment-actions"
          size="small"
          aria-label="more options"
          onClick={handleMenuOpen}
          sx={{ color: '#6B6D82', opacity: 0, transition: 'opacity 0.2s' }}
        >
          <MoreVertIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={menuAnchor != null}
          onClose={handleMenuClose}
          slotProps={{
            paper: {
              sx: {
                minWidth: 160,
                borderRadius: '12px',
                border: '1px solid #E4E5ED',
              },
            },
          }}
        >
          <MenuItem onClick={handleEdit} sx={{ py: '8px', px: '12px' }}>
            Edit
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: '#DC2626', py: '8px', px: '12px' }}>
            Delete
          </MenuItem>
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
        <Box sx={{ pl: 6, mt: 1.5, pt: 1, borderTop: '1px solid #F3F3F7' }}>
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
      <Box sx={{ mt: 1.5, pl: 4 }}>
        {replyFocused || replyText !== '' ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextField
              size="small"
              variant="outlined"
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
              autoFocus
              sx={{
                flex: 1,
                '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.5, px: 1 },
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': { borderColor: '#8027FF' },
                },
              }}
            />
            <IconButton
              size="small"
              aria-label="send"
              onClick={handleSendReply}
              sx={{ color: '#8027FF' }}
            >
              <SendIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        ) : (
          <Box
            onClick={() => {
              setReplyFocused(true);
            }}
            sx={{
              backgroundColor: '#F3F3F7',
              borderRadius: '6px',
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: '#9B9DB0',
                fontFamily: '"DM Sans", sans-serif',
              }}
            >
              Reply...
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
