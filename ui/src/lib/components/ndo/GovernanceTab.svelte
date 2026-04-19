<script lang="ts">
  import type { ActionHash, AgentPubKey } from '@holochain/client';
  import type { GovernanceRule, PersonRole } from '@nondominium/shared-types';
  import { onMount } from 'svelte';
  import { Effect as E, Exit, pipe } from 'effect';
  import { PersonServiceTag, PersonServiceResolved } from '$lib/services/zomes/person.service';
  import { ResourceServiceTag, ResourceServiceResolved } from '$lib/services/zomes/resource.service';

  interface Props {
    specActionHash: ActionHash;
  }

  let { specActionHash }: Props = $props();

  let rules = $state<GovernanceRule[]>([]);
  let roles = $state<PersonRole[]>([]);
  let myAgent = $state<AgentPubKey | null>(null);

  onMount(() => {
    void (async () => {
      const specProgram = E.gen(function* () {
        const r = yield* ResourceServiceTag;
        return yield* r.getResourceSpecificationWithRules(specActionHash);
      });
      const specExit = await E.runPromiseExit(
        pipe(specProgram, E.provide(ResourceServiceResolved))
      );
      if (Exit.isSuccess(specExit)) {
        rules = specExit.value.governance_rules;
      }

      const profileProgram = E.gen(function* () {
        const p = yield* PersonServiceTag;
        return yield* p.getMyPersonProfile();
      });
      const profExit = await E.runPromiseExit(
        pipe(profileProgram, E.provide(PersonServiceResolved))
      );
      if (!Exit.isSuccess(profExit) || !profExit.value.person) {
        roles = [];
        myAgent = null;
        return;
      }
      myAgent = profExit.value.person.agent_pub_key;

      const rolesProgram = E.gen(function* () {
        const p = yield* PersonServiceTag;
        return yield* p.getPersonRoles(profExit.value.person!.agent_pub_key);
      });
      const rolesExit = await E.runPromiseExit(pipe(rolesProgram, E.provide(PersonServiceResolved)));
      roles = Exit.isSuccess(rolesExit) ? rolesExit.value : [];
    })();
  });
</script>

<div class="space-y-6">
  <section>
    <h3 class="mb-2 text-base font-semibold text-gray-900">Governance rules (resource zome)</h3>
    {#if rules.length === 0}
      <p class="text-sm text-gray-500">No governance rules linked to this specification.</p>
    {:else}
      <ul class="space-y-2">
        {#each rules as rule, i (i)}
          <li class="rounded border border-gray-200 bg-white p-3 text-sm">
            <div class="font-medium text-gray-800">{rule.rule_type}</div>
            <pre class="mt-1 overflow-x-auto text-xs text-gray-600">{rule.rule_data}</pre>
            {#if rule.enforced_by}
              <div class="mt-1 text-xs text-gray-500">Enforced by: {rule.enforced_by}</div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <h3 class="mb-2 text-base font-semibold text-gray-900">My roles (person zome)</h3>
    {#if !myAgent}
      <p class="text-sm text-gray-500">No person profile loaded for this agent.</p>
    {:else if roles.length === 0}
      <p class="text-sm text-gray-500">No roles returned for your agent.</p>
    {:else}
      <ul class="space-y-2">
        {#each roles as role, i (i)}
          <li class="rounded border border-gray-200 bg-white px-3 py-2 text-sm">
            <span class="font-medium text-gray-800">{role.role_name}</span>
          </li>
        {/each}
      </ul>
      <button type="button" class="mt-3 rounded bg-amber-100 px-3 py-1.5 text-xs text-amber-800" disabled>
        AccountableAgent (governance-gated)
      </button>
    {/if}
  </section>
</div>
