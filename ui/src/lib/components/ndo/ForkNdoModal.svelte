<script lang="ts">
  import type { NdoDescriptor } from '@nondominium/shared-types';

  interface Props {
    descriptor: NdoDescriptor;
    onclose: () => void;
  }

  let { descriptor, onclose }: Props = $props();

  let copied = $state(false);

  async function copyInitiatorKey() {
    if (!descriptor.initiator) return;
    try {
      await navigator.clipboard.writeText(descriptor.initiator);
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    } catch {
      // clipboard not available
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
  <div
    class="relative w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="fork-modal-title"
  >
    <div class="border-b border-gray-100 px-6 py-4">
      <h2 id="fork-modal-title" class="text-lg font-semibold text-gray-900">Fork this NDO</h2>
      <p class="mt-1 text-sm text-gray-500">{descriptor.name}</p>
    </div>

    <div class="px-6 py-4 space-y-4">
      <div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h3 class="mb-1 text-sm font-semibold text-amber-800">Fork friction — by design</h3>
        <p class="text-sm text-amber-700">
          Forking is intentionally non-trivial in Nondominium. The NDO model discourages
          gratuitous forks that fragment shared resource pools.
        </p>
      </div>

      <div class="space-y-2 text-sm text-gray-700">
        <p>
          <span class="font-medium">Step 1 — Negotiate:</span> Contact the NDO initiator and
          present your case for a fork. Consensus with existing participants is expected.
        </p>
        <p>
          <span class="font-medium">Step 2 — Consensus:</span> A fork requires agreement from
          active participants, not just the initiator. Minority disagreement must be addressed.
        </p>
        <p>
          <span class="font-medium text-gray-400">Step 3 — Unyt payment (future):</span>{' '}
          <span class="text-gray-400">
            Post-MVP, forking will require a Unyt-denominated stake as friction to prevent
            extractive forks. This feature is not yet available.
          </span>
        </p>
      </div>

      <div class="rounded border border-gray-200 bg-gray-50 p-4">
        <p class="mb-2 text-sm font-medium text-gray-700">
          Contact the NDO initiator to begin negotiation:
        </p>
        {#if descriptor.initiator}
          <div class="flex items-center gap-2">
            <code class="flex-1 truncate rounded bg-white px-2 py-1 text-xs text-gray-600 border border-gray-200">
              {descriptor.initiator}
            </code>
            <button
              type="button"
              onclick={copyInitiatorKey}
              class="shrink-0 rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p class="mt-1 text-xs text-gray-400">Agent public key (Holochain)</p>
        {:else}
          <p class="text-xs text-gray-400 italic">Initiator not available.</p>
        {/if}
      </div>

      <p class="text-xs text-gray-400 italic text-center">
        Full fork functionality (claim submission, vote, Unyt stake) is coming in a future release.
      </p>
    </div>

    <div class="flex justify-end border-t border-gray-100 px-6 py-4">
      <button
        type="button"
        onclick={onclose}
        class="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
      >
        Close
      </button>
    </div>
  </div>
</div>
