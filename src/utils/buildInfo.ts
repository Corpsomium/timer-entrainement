/** Injected at build time via vite `define`. */
declare const __APP_BUILD__: string;

export function getBuildHash(): string {
  try {
    return typeof __APP_BUILD__ !== 'undefined' && __APP_BUILD__ ? __APP_BUILD__ : 'dev';
  } catch {
    return 'dev';
  }
}

export function getBuildLabel(): string {
  return `build ${getBuildHash()}`;
}
