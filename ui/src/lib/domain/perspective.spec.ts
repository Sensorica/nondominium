import { describe, it, expect } from 'vitest';
import {
  PERSPECTIVE_ROOTS,
  initialNavigation,
  reduce,
  type NavigationEvent,
  type NavigationState,
  type PerspectiveLocation
} from './perspective';

const run = (events: NavigationEvent[], from: NavigationState = initialNavigation()): NavigationState =>
  events.reduce(reduce, from);

const drillPress: PerspectiveLocation = {
  perspective: 'resource',
  route: '/resource/uhCkk-drill',
  entity: { kind: 'ndo', id: 'uhCkk-drill', label: 'Drill press' }
};
const alice: PerspectiveLocation = {
  perspective: 'agent',
  route: '/agent/uhCAk-alice',
  entity: { kind: 'agent', id: 'uhCAk-alice', label: 'Alice' }
};
const aliceGroups: PerspectiveLocation = { perspective: 'agent', route: '/agent/uhCAk-alice/groups' };

describe('perspective reduce', () => {
  it('starts on a Perspective root with an empty trail', () => {
    expect(initialNavigation('work')).toEqual({
      current: { perspective: 'work', route: '/work' },
      trail: [],
      lastViewState: {}
    });
  });

  it('jump pushes the current location, with its viewState, on the trail', () => {
    const s = run([
      { _tag: 'Jumped', to: drillPress },
      { _tag: 'Jumped', to: alice, viewState: { tab: 'custodians' } },
      { _tag: 'Jumped', to: aliceGroups }
    ]);
    expect(s.current).toEqual(aliceGroups);
    expect(s.trail).toEqual([
      { perspective: 'resource', route: PERSPECTIVE_ROOTS.resource },
      { ...drillPress, viewState: { tab: 'custodians' } },
      alice
    ]);
  });

  it('back restores the popped route and viewState', () => {
    const s = run([
      { _tag: 'Jumped', to: drillPress },
      { _tag: 'Jumped', to: alice, viewState: { tab: 'custodians' } },
      { _tag: 'Back' }
    ]);
    expect(s.current).toEqual({ ...drillPress, viewState: { tab: 'custodians' } });
    expect(s.trail).toEqual([{ perspective: 'resource', route: '/resource' }]);
  });

  it('back on an empty trail changes nothing', () => {
    const start = initialNavigation('agent');
    expect(reduce(start, { _tag: 'Back' })).toBe(start);
    const s = run([{ _tag: 'Jumped', to: alice }, { _tag: 'Back' }, { _tag: 'Back' }], start);
    expect(s).toEqual(start);
  });

  it('switch resets the trail and lands on the Perspective root', () => {
    const s = run([
      { _tag: 'Jumped', to: drillPress },
      { _tag: 'Jumped', to: alice },
      { _tag: 'Switched', perspective: 'work' }
    ]);
    expect(s.current).toEqual({ perspective: 'work', route: '/work' });
    expect(s.trail).toEqual([]);
    expect(run([{ _tag: 'Switched', perspective: 'work' }, { _tag: 'Back' }]).current.perspective).toBe('work');
  });

  it('switch remembers each Perspective last viewState and restores it on return', () => {
    const s = run([
      { _tag: 'Switched', perspective: 'work', viewState: { filter: 'mine' } },
      { _tag: 'Switched', perspective: 'resource', viewState: { column: 'todo' } }
    ]);
    expect(s.current).toEqual({ perspective: 'resource', route: '/resource', viewState: { filter: 'mine' } });
    expect(s.lastViewState).toEqual({ resource: { filter: 'mine' }, work: { column: 'todo' } });
  });
});
