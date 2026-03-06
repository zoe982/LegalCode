export interface Comment {
  id: string;
  templateId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  anchorBlockId: string | null;
  anchorText: string | null;
  resolved: boolean;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentInput {
  templateId: string;
  content: string;
  parentId?: string;
  anchorBlockId?: string;
  anchorText?: string;
}

export interface CommentThread {
  comment: Comment;
  replies: Comment[];
}
