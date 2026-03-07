import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Avatar,
  Switch,
  FormControlLabel,
  CircularProgress,
  Collapse,
} from '@mui/material';
import ChatBubbleOutline from '@mui/icons-material/ChatBubbleOutline';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import { useComments } from '../hooks/useComments.js';
import type { Comment, CommentThread } from '../types/comments.js';

interface CommentsTabProps {
  templateId: string | undefined;
  pendingAnchor?: { anchorText: string; anchorFrom: string; anchorTo: string } | null | undefined;
  onSubmitNew?:
    | ((
        content: string,
        anchor: { anchorText: string; anchorFrom: string; anchorTo: string },
      ) => void)
    | undefined;
  onCancelNew?: (() => void) | undefined;
}

const AVATAR_COLORS = ['#8027FF', '#1976d2', '#2e7d32', '#d32f2f', '#ed6c02', '#9c27b0'];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length] ?? '#8027FF';
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${String(diffMin)}m ago`;
  if (diffHr < 24) return `${String(diffHr)}h ago`;
  if (diffDay < 30) return `${String(diffDay)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface CommentRowProps {
  comment: Comment;
  authorIndex: number;
  onDelete: (commentId: string) => void;
  testIdPrefix: string;
}

function CommentRow({ comment, authorIndex, onDelete, testIdPrefix }: CommentRowProps) {
  return (
    <Box data-testid={testIdPrefix} sx={{ mb: 1 }}>
      {/* Author row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Avatar
          sx={{
            width: 24,
            height: 24,
            fontSize: '0.75rem',
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
          sx={{ fontSize: '0.75rem', color: '#9B9DB0', fontFamily: '"DM Sans", sans-serif' }}
        >
          {formatRelativeTime(comment.createdAt)}
        </Typography>
        <Box sx={{ flex: 1 }} />
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
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
      {/* Comment text */}
      <Typography
        sx={{
          fontSize: '0.9375rem',
          color: '#37354A',
          ml: 4,
          fontFamily: '"DM Sans", sans-serif',
        }}
      >
        {comment.content}
      </Typography>
    </Box>
  );
}

interface ThreadCardProps {
  thread: CommentThread;
  threadIndex: number;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (parentId: string, content: string) => void;
}

function ThreadCard({ thread, threadIndex, onResolve, onDelete, onReply }: ThreadCardProps) {
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
        data-testid={`thread-${thread.comment.id}`}
        sx={{
          p: 1.5,
          borderRadius: '8px',
          backgroundColor: '#F9F9FB',
          mb: 1,
          opacity: 0.7,
          cursor: 'pointer',
        }}
        onClick={() => {
          setExpanded((prev) => !prev);
        }}
      >
        <Typography
          sx={{ fontSize: '0.75rem', color: '#6B6D82', fontFamily: '"DM Sans", sans-serif' }}
        >
          <CheckIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
          {thread.comment.authorName} resolved
        </Typography>
        <Collapse in={expanded}>
          <Box sx={{ mt: 1 }}>
            <CommentRow
              comment={thread.comment}
              authorIndex={threadIndex}
              onDelete={() => {
                onDelete(thread.comment.id);
              }}
              testIdPrefix={`resolved-comment-${thread.comment.id}`}
            />
          </Box>
        </Collapse>
      </Box>
    );
  }

  return (
    <Box
      data-testid={`thread-${thread.comment.id}`}
      sx={{
        p: 1.5,
        borderRadius: '8px',
        backgroundColor: '#F9F9FB',
        mb: 1,
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
      <CommentRow
        comment={thread.comment}
        authorIndex={threadIndex}
        onDelete={() => {
          onDelete(thread.comment.id);
        }}
        testIdPrefix={`comment-${thread.comment.id}`}
      />

      {/* Actions row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 4, mt: 0.5, mb: 1 }}>
        <Button
          size="small"
          startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
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
        <Box sx={{ pl: 2 }}>
          {thread.replies.map((reply, rIdx) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              authorIndex={threadIndex + rIdx + 1}
              onDelete={() => {
                onDelete(reply.id);
              }}
              testIdPrefix={`reply-${reply.id}`}
            />
          ))}
        </Box>
      )}

      {/* Reply input */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, ml: 2 }}>
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
            // Delay to allow Send button click to register
            setTimeout(() => {
              setReplyFocused(false);
            }, 200);
          }}
          sx={{
            flex: 1,
            '& .MuiInputBase-input': { fontSize: '0.8125rem', py: 0.75, px: 1.5 },
          }}
        />
        {(replyFocused || replyText !== '') && (
          <IconButton
            size="small"
            aria-label="send"
            onClick={handleSendReply}
            sx={{ color: '#8027FF' }}
          >
            <SendIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}

export function CommentsTab({
  templateId,
  pendingAnchor,
  onSubmitNew,
  onCancelNew,
}: CommentsTabProps) {
  const [newCommentText, setNewCommentText] = useState('');
  const {
    threads,
    isLoading,
    createComment,
    resolveComment,
    deleteComment,
    showResolved,
    toggleShowResolved,
  } = useComments(templateId);

  const handleResolve = useCallback(
    (commentId: string) => {
      if (templateId == null) return;
      resolveComment({ templateId, commentId });
    },
    [templateId, resolveComment],
  );

  const handleDelete = useCallback(
    (commentId: string) => {
      if (templateId == null) return;
      deleteComment({ templateId, commentId });
    },
    [templateId, deleteComment],
  );

  const handleReply = useCallback(
    (parentId: string, content: string) => {
      if (templateId == null) return;
      createComment({ templateId, content, parentId });
    },
    [templateId, createComment],
  );

  if (isLoading) {
    return (
      <Box data-testid="comments-tab" sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Count stats
  const totalThreads = threads.length;
  const resolvedCount = threads.filter((t) => t.comment.resolved).length;
  const unresolvedCount = totalThreads - resolvedCount;

  return (
    <Box
      data-testid="comments-tab"
      sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* Header bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderBottom: '1px solid #E4E5ED',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.8125rem',
            color: '#12111A',
            fontWeight: 600,
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          {totalThreads === 0
            ? 'No comments'
            : `${String(unresolvedCount)} comment${unresolvedCount !== 1 ? 's' : ''}${resolvedCount > 0 ? ` \u00B7 ${String(resolvedCount)} resolved` : ''}`}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={showResolved}
              onChange={toggleShowResolved}
              data-testid="show-resolved-toggle"
              slotProps={{ input: { 'aria-label': 'Show resolved' } }}
            />
          }
          label={
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: '#9B9DB0',
                fontFamily: '"DM Sans", sans-serif',
              }}
            >
              Show resolved
            </Typography>
          }
          sx={{ mr: 0 }}
        />
      </Box>

      {/* New comment card */}
      {pendingAnchor != null && (
        <Box
          sx={{
            p: 1.5,
            borderRadius: '8px',
            backgroundColor: '#FFF8E1',
            mx: 1.5,
            mt: 1,
            border: '1px solid #F5A623',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontStyle: 'italic',
              color: '#6B6D82',
              fontFamily: '"DM Sans", sans-serif',
              borderLeft: '2px solid #F5A623',
              pl: 1,
              mb: 1,
            }}
          >
            {pendingAnchor.anchorText}
          </Typography>
          <TextField
            size="small"
            placeholder="Add a comment..."
            value={newCommentText}
            onChange={(e) => {
              setNewCommentText(e.target.value);
            }}
            autoFocus
            fullWidth
            multiline
            maxRows={4}
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              size="small"
              onClick={() => {
                setNewCommentText('');
                onCancelNew?.();
              }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                if (newCommentText.trim()) {
                  onSubmitNew?.(newCommentText.trim(), pendingAnchor);
                  setNewCommentText('');
                }
              }}
              sx={{ backgroundColor: '#8027FF' }}
            >
              Comment
            </Button>
          </Box>
        </Box>
      )}

      {/* Thread list or empty state */}
      {threads.length === 0 ? (
        <Box
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            gap: 1,
          }}
        >
          <ChatBubbleOutline sx={{ fontSize: 48, color: '#9B9DB0' }} />
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#12111A',
              textAlign: 'center',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            No comments yet
          </Typography>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#6B6D82',
              textAlign: 'center',
              maxWidth: 240,
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            Select text in the editor and press Cmd+Opt+M to comment.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
          {threads.map((thread, idx) => (
            <ThreadCard
              key={thread.comment.id}
              thread={thread}
              threadIndex={idx}
              onResolve={handleResolve}
              onDelete={handleDelete}
              onReply={handleReply}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
