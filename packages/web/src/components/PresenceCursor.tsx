import { GlobalStyles } from '@mui/material';

/**
 * Global CSS for presence cursor decorations.
 * These styles are injected once and target the DOM elements
 * created by presenceCursorsPlugin.
 */
const presenceCursorStyles = `
  /* Cursor container (widget decoration) */
  .presence-cursor {
    position: relative;
    display: inline;
    width: 0;
    overflow: visible;
    pointer-events: none;
  }

  /* Name label pill — fades after 3s idle */
  .presence-cursor__label {
    animation: presence-cursor-fade 3s ease-in-out forwards;
  }

  /* Label fade animation: visible for 70%, then fades out */
  @keyframes presence-cursor-fade {
    0% { opacity: 1; }
    70% { opacity: 1; }
    100% { opacity: 0; }
  }

  /* Hover restores label instantly */
  .presence-cursor:hover .presence-cursor__label {
    opacity: 1 !important;
    animation: none;
  }

  /* Cursor line blink animation */
  .presence-cursor__line {
    animation: presence-cursor-blink 1.2s ease-in-out infinite;
  }

  /* Blink: dims to 0.4 opacity, never disappears completely */
  @keyframes presence-cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* Selection range (inline decoration) */
  .presence-cursor__selection {
    border-radius: 2px;
    pointer-events: none;
  }

  /* Lifecycle: cursor entry */
  @keyframes presence-cursor-enter {
    0% {
      opacity: 0;
      transform: scaleY(0.3);
    }
    100% {
      opacity: 1;
      transform: scaleY(1);
    }
  }

  /* Lifecycle: cursor exit */
  @keyframes presence-cursor-exit {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }

  .presence-cursor--entering {
    animation: presence-cursor-enter 200ms cubic-bezier(0.2, 0, 0, 1) forwards;
  }

  .presence-cursor--exiting {
    animation: presence-cursor-exit 200ms ease-in forwards;
  }

  /* Label state modifiers */
  .presence-cursor__label--visible {
    opacity: 1 !important;
    animation: none !important;
  }

  .presence-cursor__label--idle {
    opacity: 0;
    transition: opacity 1.5s ease-out;
  }

  /* Suppress blink while cursor is moving */
  .presence-cursor__line--moving {
    animation: none;
    opacity: 1;
  }

  /* Reduced motion: disable all animations */
  @media (prefers-reduced-motion: reduce) {
    .presence-cursor__line {
      animation: none;
      opacity: 1;
    }

    .presence-cursor__label {
      animation: none;
      transition: none;
    }

    .presence-cursor--entering,
    .presence-cursor--exiting {
      animation: none;
    }
  }
`;

export function PresenceCursorStyles() {
  return <GlobalStyles styles={presenceCursorStyles} />;
}
