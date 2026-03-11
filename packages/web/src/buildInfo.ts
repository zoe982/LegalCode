declare const __BUILD_TIMESTAMP__: string;
declare const __BUILD_HASH__: string;

/* v8 ignore next 2 -- __BUILD_TIMESTAMP__ is injected by Vite define at build time, unavailable in tests */
export const BUILD_TIMESTAMP: string =
  typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : 'dev';

/* v8 ignore next 2 -- __BUILD_HASH__ is injected by Vite define at build time, unavailable in tests */
export const BUILD_HASH: string = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev';
