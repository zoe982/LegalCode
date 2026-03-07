import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';

export interface SelectionInfo {
  hasSelection: boolean;
  text: string;
  buttonPosition: { top: number; left: number } | null;
}

export interface CommentAnchor {
  commentId: string;
  from: number;
  to: number;
  resolved: boolean;
}

export const commentPluginKey = new PluginKey<{
  selection: SelectionInfo;
  anchors: CommentAnchor[];
  activeCommentId: string | null;
}>('commentPlugin');

export interface CommentPluginOptions {
  onSelectionChange?:
    | ((info: SelectionInfo, editorSelection?: { from: number; to: number; text: string }) => void)
    | undefined;
}

export function createCommentPlugin(options: CommentPluginOptions = {}): Plugin {
  return new Plugin({
    key: commentPluginKey,
    state: {
      init(): {
        selection: SelectionInfo;
        anchors: CommentAnchor[];
        activeCommentId: string | null;
      } {
        return {
          selection: { hasSelection: false, text: '', buttonPosition: null },
          anchors: [] as CommentAnchor[],
          activeCommentId: null,
        };
      },
      apply(tr, prev) {
        const meta = tr.getMeta(commentPluginKey) as
          | { anchors?: CommentAnchor[]; activeCommentId?: string | null }
          | undefined;
        if (meta) {
          return {
            ...prev,
            anchors: meta.anchors ?? prev.anchors,
            activeCommentId: meta.activeCommentId ?? prev.activeCommentId,
          };
        }
        return prev;
      },
    },
    props: {
      decorations(state) {
        const pluginState = commentPluginKey.getState(state);
        if (!pluginState?.anchors.length) return DecorationSet.empty;

        const decorations: Decoration[] = [];
        for (const anchor of pluginState.anchors) {
          if (anchor.from >= anchor.to) continue;
          if (anchor.from < 0 || anchor.to > state.doc.content.size) continue;

          const isActive = pluginState.activeCommentId === anchor.commentId;
          decorations.push(
            Decoration.inline(anchor.from, anchor.to, {
              class: isActive ? 'comment-highlight comment-highlight--active' : 'comment-highlight',
              style: isActive
                ? 'background-color: rgba(245,166,35,0.33);'
                : anchor.resolved
                  ? 'background-color: rgba(245,166,35,0.1);'
                  : 'background-color: rgba(245,166,35,0.2);',
            }),
          );
        }

        return DecorationSet.create(state.doc, decorations);
      },
    },
    view() {
      return {
        update(view) {
          const { state } = view;
          const { from, to } = state.selection;
          const hasSelection = from !== to && !state.selection.empty;

          let buttonPosition: { top: number; left: number } | null = null;
          let text = '';

          if (hasSelection) {
            text = state.doc.textBetween(from, to, ' ');
            try {
              const coords = view.coordsAtPos(to);
              const editorRect = view.dom.getBoundingClientRect();
              buttonPosition = {
                top: coords.bottom - editorRect.top + 4,
                left: coords.left - editorRect.left,
              };
            } catch {
              // Position calculation may fail during transitions
            }
          }

          const info: SelectionInfo = { hasSelection, text, buttonPosition };
          options.onSelectionChange?.(info, hasSelection ? { from, to, text } : undefined);
        },
      };
    },
  });
}
