import { useState, useCallback } from 'react';
import { Box, Typography, TextField, IconButton, Button, Avatar, Collapse } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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
  onDelete,
  isReply,
}: {
  comment: Comment;
  authorIndex: number;
  onDelete: (commentId: string) => void;
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
        <IconButton
          size="small"
          aria-label="delete comment"
          onClick={() => {
            onDelete(comment.id);
          }}
          sx={{
            opacity: 0,
            transition: 'opacity 0.2s',
            '.MuiBox-root:hover > &, .MuiBox-root:hover > .MuiBox-root > &': { opacity: 1 },
            '&:focus-visible': { opacity: 1 },
            ml: 0.5,
            flexShrink: 0,
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 14 }} />
        </IconButton>
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

  const handleSendReply = useCallback(() => {
    if (replyText.trim() === '') return;
    onReply(thread.comment.id, replyText.trim());
    setReplyText('');
    setReplyFocused(false);
  }, [replyText, onReply, thread.comment.id]);

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
          backgroundColor: '#F9F9FB',
          borderLeft: '2px solid var(--comment-highlight, #F5A623)',
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
            <CommentRow comment={thread.comment} authorIndex={threadIndex} onDelete={onDelete} />
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
        backgroundColor: isActive === true ? 'rgba(128, 39, 255, 0.04)' : '#F9F9FB',
        borderLeft:
          isActive === true
            ? '2px solid var(--comment-active, #8027FF)'
            : '2px solid var(--comment-highlight, #F5A623)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Anchor quote */}
      {thread.comment.anchorText != null && thread.comment.anchorText !== '' && (
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontStyle: 'italic',
            color: '#6B6D82',
            fontFamily: '"DM Sans", sans-serif',
            borderLeft: '2px solid var(--comment-highlight, #F5A623)',
            pl: 1,
            mb: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {thread.comment.anchorText}
        </Typography>
      )}

      {/* Parent comment */}
      <CommentRow comment={thread.comment} authorIndex={threadIndex} onDelete={onDelete} />

      {/* Resolve button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 4, mt: 0.5, mb: 0.5 }}>
        <Button
          size="small"
          startIcon={<CheckRoundedIcon sx={{ fontSize: 14 }} />}
          onClick={() => {
            onResolve(thread.comment.id);
          }}
          aria-label="resolve"
          sx={{
            fontSize: '0.75rem',
            color: '#6B6D82',
            fontFamily: '"DM Sans", sans-serif',
            textTransform: 'none',
            minWidth: 'auto',
            p: '2px 8px',
          }}
        >
          Resolve
        </Button>
      </Box>

      {/* Replies */}
      {thread.replies.length > 0 && (
        <Box sx={{ pl: 4 }}>
          {thread.replies.map((reply, rIdx) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              authorIndex={threadIndex + rIdx + 1}
              onDelete={onDelete}
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
