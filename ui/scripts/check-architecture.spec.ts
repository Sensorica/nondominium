import { describe, it, expect } from 'vitest';
import { checkArchitecture, importSpecifiers, type SourceFile } from './check-architecture';

const file = (path: string, source: string): SourceFile => ({ path, source });

const svelte = (script: string) => `<script lang="ts">\n${script}\n</script>\n\n<div class="p-4">x</div>\n`;

const rulesOf = (files: SourceFile[]) => checkArchitecture(files).map((v) => `${v.rule} ${v.path} ${v.specifier}`);

describe('importSpecifiers', () => {
  it('finds static, side-effect, type-only, re-export and dynamic imports', () => {
    const src = [
      "import { Effect as E, pipe } from 'effect';",
      "import type { X } from '$lib/services';",
      "import '../app.css';",
      "import Default, {\n  a,\n  type B\n} from './multi';",
      "export * from './reexported';",
      "export { y } from './named';",
      "const m = await import('./lazy');"
    ].join('\n');
    expect(importSpecifiers(src)).toEqual(
      expect.arrayContaining(['effect', '$lib/services', '../app.css', './multi', './reexported', './named', './lazy'])
    );
  });

  it('ignores imports inside comments', () => {
    const src = "// import { Effect } from 'effect';\n/* import x from '$lib/services'; */\n<!-- import 'effect' -->";
    expect(importSpecifiers(src)).toEqual([]);
  });

  it('finds a dynamic import written with a backtick literal', () => {
    expect(importSpecifiers('const m = await import(`effect`);')).toEqual(['effect']);
  });

  it('does not let a comment marker inside a string hide the imports after it', () => {
    const src = "const g = '/api/*';\nimport { Effect } from 'effect';\nconst h = '*/';";
    expect(importSpecifiers(src)).toEqual(['effect']);
  });

  it('keeps an import that follows an apostrophe in Svelte markup', () => {
    const src = "<p>Don't panic</p>\n<script lang=\"ts\">\nimport { Effect } from 'effect';\n</script>";
    expect(importSpecifiers(src)).toEqual(['effect']);
  });
});

describe('I1: components do not import effect or services', () => {
  it.each([
    ["import { Effect } from 'effect';", 'effect'],
    ["import { Option } from 'effect/Option';", 'effect/Option'],
    ["import { holochainService } from '$lib/services';", '$lib/services'],
    ["import { LobbyServiceTag } from '$lib/services/zomes/lobby.service';", '$lib/services/zomes/lobby.service'],
    ["import type { ZomeName } from '$lib/services/holochain.service.svelte';", '$lib/services/holochain.service.svelte'],
    ["import svc from '../../services/holochain.service.svelte';", '../../services/holochain.service.svelte']
  ])('catches %s', (script, specifier) => {
    const path = 'src/lib/components/ndo/Example.svelte';
    expect(rulesOf([file(path, svelte(script))])).toEqual([`I1 ${path} ${specifier}`]);
  });

  it('applies to route files too', () => {
    const path = 'src/routes/+layout.svelte';
    expect(rulesOf([file(path, svelte("import s from '$lib/services/holochain.service.svelte';"))])).toEqual([
      `I1 ${path} $lib/services/holochain.service.svelte`
    ]);
  });

  it('does not apply to .svelte.ts modules', () => {
    expect(rulesOf([file('src/lib/utils/x.svelte.ts', "import { Effect } from 'effect';")])).toEqual([]);
  });

  it('does not confuse a package named effect-something with effect', () => {
    expect(rulesOf([file('src/lib/components/A.svelte', svelte("import x from 'effect-svelte';"))])).toEqual([]);
  });
});

describe('I2: stores do not import other stores', () => {
  it.each([
    ["import { resourceStore } from './resource.store.svelte';", './resource.store.svelte'],
    ["import { lobbyStore } from '$lib/stores/lobby.store.svelte';", '$lib/stores/lobby.store.svelte'],
    ["import type { GroupStore } from './group.store.svelte.ts';", './group.store.svelte.ts']
  ])('catches %s', (source, specifier) => {
    const path = 'src/lib/stores/ndo.store.svelte.ts';
    expect(rulesOf([file(path, source)])).toEqual([`I2 ${path} ${specifier}`]);
  });

  it('catches a non-store file under stores/ importing a store', () => {
    const path = 'src/lib/stores/ndo.context.ts';
    expect(rulesOf([file(path, "import type { NdoStore } from './ndo.store.svelte';")])).toEqual([
      `I2 ${path} ./ndo.store.svelte`
    ]);
  });

  it('allows stores to import services, domain, utils and non-store modules under stores/', () => {
    const source = [
      "import { Effect as E, Layer } from 'effect';",
      "import { NdoServiceTag } from '$lib/services/zomes/ndo.service';",
      "import { reduce } from '$lib/domain/entity-state';",
      "import { ndoDescriptorCache } from './ndo-cache';",
      "import { appContext } from './app.context.svelte';"
    ].join('\n');
    expect(rulesOf([file('src/lib/stores/ndo.store.svelte.ts', source)])).toEqual([]);
  });
});

describe('I3: the domain layer is pure', () => {
  it.each([
    ["import { untrack } from 'svelte';", 'svelte'],
    ["import { writable } from 'svelte/store';", 'svelte/store'],
    ["import { Effect } from 'effect';", 'effect'],
    ["import { NdoServiceTag } from '$lib/services/zomes/ndo.service';", '$lib/services/zomes/ndo.service'],
    ["import { lobbyStore } from '$lib/stores/lobby.store.svelte';", '$lib/stores/lobby.store.svelte'],
    ["import { ndoDescriptorCache } from '../stores/ndo-cache';", '../stores/ndo-cache']
  ])('catches %s', (source, specifier) => {
    const path = 'src/lib/domain/lifecycle.ts';
    expect(rulesOf([file(path, source)])).toEqual([`I3 ${path} ${specifier}`]);
  });

  it('allows shared types, sibling domain modules and vitest', () => {
    const source = [
      "import type { NdoDescriptor } from '@nondominium/shared-types';",
      "import { reduce } from './entity-state';",
      "import { describe, it, expect } from 'vitest';"
    ].join('\n');
    expect(rulesOf([file('src/lib/domain/ndo-filters.spec.ts', source)])).toEqual([]);
  });
});

describe('clean tree', () => {
  it('reports zero violations for sources that respect every rule', () => {
    const files = [
      file(
        'src/lib/components/ndo/NdoView.svelte',
        svelte(
          [
            "import { untrack } from 'svelte';",
            "import { createNdoStore, setNdoStore } from '$lib/stores/ndo.store.svelte';",
            "import { lobbyStore } from '$lib/stores/lobby.store.svelte';",
            "import { reduce } from '$lib/domain/entity-state';",
            "import type { ActionHash } from '@holochain/client';"
          ].join('\n')
        )
      ),
      file(
        'src/lib/stores/lobby.store.svelte.ts',
        "import { Effect as E } from 'effect';\nimport { LobbyServiceTag } from '../services/zomes/lobby.service';"
      ),
      file('src/lib/domain/entity-state.ts', 'export type EntityState = { _tag: "Idle" };'),
      file('src/lib/services/zomes/ndo.service.ts', "import { Effect } from 'effect';")
    ];
    expect(checkArchitecture(files)).toEqual([]);
  });

  it('reports every violation across several files and rules', () => {
    const files = [
      file('src/lib/components/A.svelte', svelte("import { Effect } from 'effect';")),
      file('src/lib/stores/a.store.svelte.ts', "import { b } from './b.store.svelte';"),
      file('src/lib/domain/d.ts', "import { untrack } from 'svelte';")
    ];
    expect(checkArchitecture(files).map((v) => v.rule)).toEqual(['I1', 'I2', 'I3']);
  });
});
