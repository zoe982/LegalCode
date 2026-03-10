declare const __BUILD_TIMESTAMP__: string;

/* v8 ignore next 2 -- __BUILD_TIMESTAMP__ is injected by Vite define at build time, unavailable in tests */
export const BUILD_TIMESTAMP: string =
  typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : 'dev';
