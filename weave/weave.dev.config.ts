import * as path from 'node:path';
import { defineConfig } from '@theweave/cli';

/**
 * Dev-mode setup for the Moss pilot: two agents, one group, Nondominium served
 * from the local Vite dev server. `weave` loads this file through ts-node inside
 * Electron, so it is CommonJS (see tsconfig.json next to it).
 *
 * Both agents must use the same config: the group `networkSeed` is what puts
 * them in the same group. To run on two machines, pass the same
 * `--bootstrap-url` and `--relay-url` to every `weave` call (see
 * documentation/specifications/moss-integration.md).
 */
const repoRoot = path.resolve(__dirname, '..');
const icon = { type: 'filesystem', path: path.join(repoRoot, 'ui/static/icon.png') } as const;

/** Port the Vite dev server of `ui/` listens on, matched by `bun run tool-dev`. */
const UI_PORT = 8888;

export default defineConfig({
  groups: [
    {
      name: 'Nondominium Pilot',
      networkSeed: 'nondominium-moss-pilot-dev-v1',
      icon,
      creatingAgent: {
        agentIdx: 1,
        agentProfile: { nickname: 'Alice' }
      },
      joiningAgents: [
        {
          agentIdx: 2,
          agentProfile: { nickname: 'Bob' }
        }
      ],
      tools: [
        {
          name: 'Nondominium',
          instanceName: 'Nondominium',
          registeringAgent: 1,
          joiningAgents: [2]
        }
      ]
    }
  ],
  tools: [
    {
      name: 'Nondominium',
      subtitle: 'Commons-based resource sharing',
      description: 'Resource sharing for open value networks, built on Valueflows.',
      icon,
      source: {
        type: 'localhost',
        happPath: path.join(repoRoot, 'workdir/nondominium.happ'),
        uiPort: UI_PORT
      }
    }
  ],
  toolCurations: []
});
