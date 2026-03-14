import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';
import type { SuggestionAnchor } from './suggestionAnchors.js';
import { getSuggestionColor } from '../utils/suggestionColors.js';

export interface SuggestionPluginState {
  anchors: SuggestionAnchor[];
  activeSuggestionId: string | null;
  suggestingMode: boolean;
}

export const suggestionPluginKey = new PluginKey<SuggestionPluginState>('suggestionPlugin');

export interface SuggestionPluginOptions {
  onSuggestInsert?: ((from: number, to: number, text: string) => void) | undefined;
  onSuggestDelete?: ((from: number, to: number, text: string) => void) | undefined;
}

export function createSuggestionPlugin(options: SuggestionPluginOptions = {}): Plugin {
  return new Plugin({
    key: suggestionPluginKey,
    state: {
      init(): SuggestionPluginState {
        return {
          anchors: [],
          activeSuggestionId: null,
          suggestingMode: false,
        };
      },
      apply(tr, prev): SuggestionPluginState {
        const meta = tr.getMeta(suggestionPluginKey) as Partial<SuggestionPluginState> | undefined;
        if (meta) {
          return {
            anchors: meta.anchors ?? prev.anchors,
            activeSuggestionId:
              'activeSuggestionId' in meta
                ? (meta.activeSuggestionId ?? null)
                : prev.activeSuggestionId,
            suggestingMode:
              'suggestingMode' in meta ? (meta.suggestingMode ?? false) : prev.suggestingMode,
          };
        }
        return prev;
      },
    },
    props: {
      decorations(state) {
        const pluginState = suggestionPluginKey.getState(state);
        if (!pluginState?.anchors.length) return DecorationSet.empty;

        const decorations: Decoration[] = [];
        for (const anchor of pluginState.anchors) {
          const isActive = pluginState.activeSuggestionId === anchor.suggestionId;
          const color = getSuggestionColor(anchor.authorEmail);

          if (anchor.type === 'delete') {
            // Delete: strikethrough inline decoration
            if (
              anchor.from < anchor.to &&
              anchor.from >= 0 &&
              anchor.to <= state.doc.content.size
            ) {
              decorations.push(
                Decoration.inline(anchor.from, anchor.to, {
                  class: isActive
                    ? 'suggestion-delete suggestion-delete--active'
                    : 'suggestion-delete',
                  style: `text-decoration: line-through; text-decoration-color: ${color}; background-color: ${color}${isActive ? '40' : '1A'};`,
                  'data-suggestion-id': anchor.suggestionId,
                }),
              );
            }
          } else {
            // Insert: widget decoration at insertion point
            const pos = Math.min(anchor.from, state.doc.content.size);
            if (pos >= 0) {
              decorations.push(
                Decoration.widget(
                  pos,
                  () => {
                    const span = document.createElement('span');
                    span.className = isActive
                      ? 'suggestion-insert suggestion-insert--active'
                      : 'suggestion-insert';
                    span.textContent = anchor.replacementText ?? '';
                    span.style.cssText = `color: ${color}; text-decoration: underline; text-decoration-color: ${color}; background-color: ${color}${isActive ? '40' : '1A'}; cursor: pointer;`;
                    span.dataset.suggestionId = anchor.suggestionId;
                    return span;
                  },
                  { side: 0 },
                ),
              );
            }
          }
        }

        return DecorationSet.create(state.doc, decorations);
      },

      handleTextInput(view, from, to, text) {
        const pluginState = suggestionPluginKey.getState(view.state);
        if (!pluginState?.suggestingMode) return false;

        // In suggesting mode, intercept text input
        if (from !== to) {
          // Selection replacement: both delete and insert
          const deletedText = view.state.doc.textBetween(from, to, ' ');
          options.onSuggestDelete?.(from, to, deletedText);
        }
        options.onSuggestInsert?.(from, to, text);
        return true; // Prevent the actual edit
      },

      handleKeyDown(view, event) {
        const pluginState = suggestionPluginKey.getState(view.state);
        if (!pluginState?.suggestingMode) return false;

        const keyEvent = event;

        if (keyEvent.key === 'Backspace' || keyEvent.key === 'Delete') {
          const { from, to } = view.state.selection;
          if (from === to) {
            // Single char delete
            if (keyEvent.key === 'Backspace' && from > 0) {
              const deletedText = view.state.doc.textBetween(from - 1, from, ' ');
              options.onSuggestDelete?.(from - 1, from, deletedText);
            } else if (keyEvent.key === 'Delete' && to < view.state.doc.content.size) {
              const deletedText = view.state.doc.textBetween(from, from + 1, ' ');
              options.onSuggestDelete?.(from, from + 1, deletedText);
            }
          } else {
            // Selection delete
            const deletedText = view.state.doc.textBetween(from, to, ' ');
            options.onSuggestDelete?.(from, to, deletedText);
          }
          return true; // Prevent the actual delete
        }

        return false;
      },
    },
  });
}
