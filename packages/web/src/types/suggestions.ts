export interface Suggestion {
  id: string;
  templateId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  type: 'insert' | 'delete';
  anchorFrom: string;
  anchorTo: string;
  originalText: string;
  replacementText: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSuggestionInput {
  templateId: string;
  type: 'insert' | 'delete';
  anchorFrom: string;
  anchorTo: string;
  originalText: string;
  replacementText?: string;
}
