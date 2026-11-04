/**
 * Detects whether the UI runs inside Moss (the Weave host) or standalone.
 *
 * Pure on purpose: `detectHost` takes the facts about the page as data so the
 * decision is unit-testable. `currentHostEnv` reads them from `window`.
 *
 * Moss loads a tool in an iframe. A packaged tool is served from the
 * `applet://` protocol and Moss injects `window.__WEAVE_API__`. In `weave`
 * dev mode the tool is served from localhost instead, and Moss appends the
 * encoded iframe kind to the URL as a hash (`@theweave/api` reads it in
 * `initializeHotReload`). That hash, inside an iframe, in a dev build, is the
 * only marker available before the Weave script is loaded.
 */
export type Host = { mode: 'standalone' } | { mode: 'moss'; hotReload: boolean };

export interface HostEnv {
  protocol: string;
  /** `window.__WEAVE_API__` is already injected. */
  hasWeaveApi: boolean;
  /** The page is the top-level browsing context, not an iframe. */
  isTopWindow: boolean;
  /** `location.hash`, including the leading `#`, or an empty string. */
  hash: string;
  /** A Vite dev build (`import.meta.env.DEV`). */
  dev: boolean;
}

export function detectHost(env: HostEnv): Host {
  if (env.protocol === 'applet:' || env.hasWeaveApi) {
    return { mode: 'moss', hotReload: false };
  }
  if (env.dev && !env.isTopWindow && env.hash.length > 1) {
    return { mode: 'moss', hotReload: true };
  }
  return { mode: 'standalone' };
}

export function currentHostEnv(): HostEnv {
  if (typeof window === 'undefined') {
    return { protocol: '', hasWeaveApi: false, isTopWindow: true, hash: '', dev: false };
  }
  return {
    protocol: window.location.protocol,
    hasWeaveApi: '__WEAVE_API__' in window && !!window.__WEAVE_API__,
    isTopWindow: window.self === window.top,
    hash: window.location.hash,
    dev: import.meta.env.DEV
  };
}

export function detectCurrentHost(): Host {
  return detectHost(currentHostEnv());
}
