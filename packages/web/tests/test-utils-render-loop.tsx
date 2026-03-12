import { useRef } from 'react';
import type { ComponentType } from 'react';

interface RenderLoopDetectionOptions {
  maxRenders?: number;
  label?: string;
}

export function withRenderLoopDetection<P extends Record<string, unknown>>(
  Component: ComponentType<P>,
  options: RenderLoopDetectionOptions = {},
): ComponentType<P> {
  const label = options.label ?? Component.displayName ?? Component.name;
  const maxRenders = options.maxRenders ?? 50;

  function RenderLoopDetector(props: P) {
    const renderCount = useRef(0);
    renderCount.current += 1;

    if (renderCount.current > maxRenders) {
      throw new Error(
        `Render loop detected in ${label}: ${String(renderCount.current)} renders exceeded threshold of ${String(maxRenders)}`,
      );
    }

    return <Component {...props} />;
  }

  RenderLoopDetector.displayName = `RenderLoopDetector(${label})`;

  return RenderLoopDetector;
}
