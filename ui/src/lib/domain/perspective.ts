/**
 * Perspective navigation as a pure reducer (design D9, `ui_architecture.md §16.2` and §16.3).
 *
 * Pure: no svelte, no effect, no services, no stores. The future `perspective.store` holds one
 * `NavigationState` and feeds it events; no UI, route or store uses it yet.
 */

export type Perspective = 'resource' | 'agent' | 'intelligence' | 'work';

export type EntityRef = {
  readonly kind: 'ndo' | 'agent' | 'group' | 'project';
  readonly id: string;
  readonly label: string;
};

export type PerspectiveLocation = {
  readonly perspective: Perspective;
  readonly route: string; // e.g. '/agent/uhCAk…'
  readonly entity?: EntityRef;
  readonly viewState?: unknown; // filters, scroll, selection; restored on Back
};

export type NavigationState = {
  readonly current: PerspectiveLocation;
  /** Locations a Jump left, most recent last. In memory only, never persisted. */
  readonly trail: readonly PerspectiveLocation[];
  /** Each Perspective's last `viewState`, restored when the agent switches back to it. */
  readonly lastViewState: Readonly<Partial<Record<Perspective, unknown>>>;
};

export type NavigationEvent =
  | { readonly _tag: 'Switched'; readonly perspective: Perspective; readonly viewState?: unknown }
  | { readonly _tag: 'Jumped'; readonly to: PerspectiveLocation; readonly viewState?: unknown }
  | { readonly _tag: 'Back' };

/** Root route of each Perspective (`ui_architecture.md §16.1`). */
export const PERSPECTIVE_ROOTS: Readonly<Record<Perspective, string>> = {
  resource: '/resource',
  agent: '/agent',
  intelligence: '/intelligence',
  work: '/work'
};

export const initialNavigation = (perspective: Perspective = 'resource'): NavigationState => ({
  current: { perspective, route: PERSPECTIVE_ROOTS[perspective] },
  trail: [],
  lastViewState: {}
});

/**
 * Transition rules (`viewState` on an event is the current location's view state at that moment):
 * - Switched: the trail is reset and the agent lands on the Perspective's root, with the
 *   `viewState` it had when last left. The outgoing Perspective's `viewState` is remembered.
 * - Jumped: the current location, with its `viewState`, is pushed on the trail; `to` becomes current.
 * - Back: pops the trail and restores that location's route and `viewState`. An empty trail is a no-op.
 */
export function reduce(state: NavigationState, event: NavigationEvent): NavigationState {
  switch (event._tag) {
    case 'Switched': {
      const lastViewState = {
        ...state.lastViewState,
        [state.current.perspective]: event.viewState ?? state.current.viewState
      };
      const restored = lastViewState[event.perspective];
      return {
        current: {
          perspective: event.perspective,
          route: PERSPECTIVE_ROOTS[event.perspective],
          ...(restored === undefined ? {} : { viewState: restored })
        },
        trail: [],
        lastViewState
      };
    }
    case 'Jumped': {
      const left =
        event.viewState === undefined ? state.current : { ...state.current, viewState: event.viewState };
      return { ...state, current: event.to, trail: [...state.trail, left] };
    }
    case 'Back': {
      const previous = state.trail.at(-1);
      if (!previous) return state;
      return { ...state, current: previous, trail: state.trail.slice(0, -1) };
    }
  }
}
