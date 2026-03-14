import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';

export interface RemoteCursor {
  userId: string;
  email: string;
  name: string;
  color: string;
  anchor: number;
  head: number;
}

export interface PresenceCursorsState {
  cursors: RemoteCursor[];
  localUserId: string | null;
}

export const presenceCursorsKey = new PluginKey<PresenceCursorsState>('presenceCursors');

export function createPresenceCursorsPlugin(): Plugin {
  return new Plugin({
    key: presenceCursorsKey,
    state: {
      init(): PresenceCursorsState {
        return { cursors: [], localUserId: null };
      },
      apply(tr, prev): PresenceCursorsState {
        const meta = tr.getMeta(presenceCursorsKey) as Partial<PresenceCursorsState> | undefined;
        if (meta) {
          return {
            cursors: meta.cursors ?? prev.cursors,
            localUserId: meta.localUserId !== undefined ? meta.localUserId : prev.localUserId,
          };
        }
        return prev;
      },
    },
    props: {
      decorations(state) {
        const pluginState = presenceCursorsKey.getState(state);
        if (!pluginState?.cursors.length) return DecorationSet.empty;

        const decorations: Decoration[] = [];
        const docSize = state.doc.content.size;

        for (const cursor of pluginState.cursors) {
          // Skip local user's cursor
          if (cursor.userId === pluginState.localUserId) continue;

          // Clamp positions to valid document range
          const anchor = Math.max(0, Math.min(cursor.anchor, docSize));
          const head = Math.max(0, Math.min(cursor.head, docSize));

          // Cursor line widget at head position
          decorations.push(
            Decoration.widget(
              head,
              () => {
                const container = document.createElement('span');
                container.className = 'presence-cursor';
                container.setAttribute('aria-label', `${cursor.name}'s cursor`);
                container.style.cssText = `position: relative; display: inline; width: 0; overflow: visible;`;

                // Cursor line
                const line = document.createElement('span');
                line.className = 'presence-cursor__line';
                line.style.cssText = `
                  position: absolute;
                  width: 2px;
                  height: 1.2em;
                  background-color: ${cursor.color};
                  border-radius: 1px;
                  z-index: 10;
                  top: 0;
                  left: -1px;
                  pointer-events: none;
                `;
                container.appendChild(line);

                // Name label
                const label = document.createElement('span');
                label.className = 'presence-cursor__label';
                label.textContent = cursor.name;
                label.style.cssText = `
                  position: absolute;
                  bottom: 100%;
                  left: -1px;
                  background-color: ${cursor.color};
                  color: #fff;
                  font-family: "DM Sans", sans-serif;
                  font-size: 11px;
                  font-weight: 500;
                  padding: 1px 6px;
                  border-radius: 4px 4px 4px 0;
                  white-space: nowrap;
                  pointer-events: none;
                  z-index: 11;
                  line-height: 16px;
                `;
                container.appendChild(label);

                return container;
              },
              { side: 1, key: `cursor-${cursor.userId}` },
            ),
          );

          // Selection range (if anchor !== head)
          if (anchor !== head) {
            const from = Math.min(anchor, head);
            const to = Math.max(anchor, head);
            if (from < to && from >= 0 && to <= docSize) {
              decorations.push(
                Decoration.inline(from, to, {
                  class: 'presence-cursor__selection',
                  style: `background-color: ${cursor.color}26;`, // 15% opacity
                  'data-user-id': cursor.userId,
                }),
              );
            }
          }
        }

        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
}
