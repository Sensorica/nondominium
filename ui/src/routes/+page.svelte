<script lang="ts">
  import holochainService from '$lib/services/holochain.service.svelte.js';

  // Simple reactive state access
  let status = $state('disconnected');
  let error = $state(null);
  let isConnected = $state(false);

  // Test function states
  let isTestingPerson = $state(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let testResult: { type: string; data: any; message: string } | null = $state(null);
  let testError: { message: string; type: string } | null = $state(null);

  // Update state based on service
  $effect(() => {
    status = holochainService.isConnected ? 'connected' : 'disconnected';
    isConnected = holochainService.isConnected;
  });

  // Example function to test the service with UI feedback
  async function testPersonCreation() {
    // Reset previous results
    testResult = null;
    testError = null;
    isTestingPerson = true;

    try {
      const person = await holochainService.callZome('zome_person', 'create_person', {
        name: 'Test User',
        nickname: 'tester',
        avatar_url: 'https://example.com/avatar.png'
      });

      console.log('Created person:', person);
      testResult = {
        type: 'person',
        data: person,
        message: 'Successfully created test person!'
      };
    } catch (err) {
      console.error('Failed to create person:', err);
      testError = {
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        type: 'person_creation'
      };
    } finally {
      isTestingPerson = false;
    }
  }

  // Function to manually clear test results
  function clearTestResults() {
    testResult = null;
    testError = null;
  }
</script>

<div class="container mx-auto max-w-4xl p-8">
  <h1 class="mb-6 text-center text-4xl font-bold">Welcome to Nondominium</h1>

  <p class="mb-8 text-center text-lg text-gray-600">
    ValueFlows-compliant resource sharing on Holochain
  </p>

  <div class="mb-8 rounded-lg bg-white p-6 shadow-md">
    <h2 class="mb-4 text-2xl font-semibold">🔗 Connection Status</h2>

    {#if isConnected}
      <div class="flex items-center text-green-600">
        <span class="mr-2 text-2xl">✅</span>
        <span class="font-medium">Connected to Holochain</span>
      </div>
      <p class="mt-2 text-gray-600">Ready to interact with the nondominium hApp</p>
    {:else if status === 'connecting'}
      <div class="flex items-center text-blue-600">
        <span class="mr-2 text-2xl">🔄</span>
        <span class="font-medium">Connecting...</span>
      </div>
    {:else if status === 'error' && error}
      <div class="flex items-center text-red-600">
        <span class="mr-2 text-2xl">❌</span>
        <span class="font-medium">Connection failed</span>
      </div>
    {:else}
      <div class="flex items-center text-gray-600">
        <span class="mr-2 text-2xl">🔌</span>
        <span class="font-medium">Disconnected</span>
      </div>
    {/if}
  </div>

  {#if isConnected}
    <div class="mb-8 rounded-lg bg-white p-6 shadow-md">
      <h2 class="mb-4 text-2xl font-semibold">🧪 Test Functions</h2>

      <div class="space-y-4">
        <button
          onclick={testPersonCreation}
          disabled={isTestingPerson}
          class="w-full rounded px-4 py-2 font-medium text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50
					{isTestingPerson ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'}"
        >
          {#if isTestingPerson}
            <span class="flex items-center justify-center gap-2">
              <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                  class="opacity-25"
                />
                <path
                  fill="currentColor"
                  d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  class="opacity-75"
                />
              </svg>
              Creating Person...
            </span>
          {:else}
            Test Person Creation
          {/if}
        </button>

        <!-- Success Message -->
        {#if testResult}
          <div class="rounded-lg border border-green-200 bg-green-50 p-4">
            <div class="flex items-start justify-between">
              <div class="flex flex-1 items-start">
                <span class="mr-3 text-xl text-green-600">✅</span>
                <div class="flex-1">
                  <h3 class="font-semibold text-green-800">{testResult.message}</h3>
                  {#if testResult.data}
                    <div class="mt-3 rounded border border-green-300 bg-green-100 p-3">
                      <h4 class="mb-2 font-semibold text-green-700">Created Person Entry:</h4>
                      <div class="space-y-2 text-sm">
                        <div class="flex">
                          <span class="w-20 font-medium text-green-700">Name:</span>
                          <span class="text-green-800">{testResult.data.name || 'N/A'}</span>
                        </div>
                        <div class="flex">
                          <span class="w-20 font-medium text-green-700">Nickname:</span>
                          <span class="text-green-800">{testResult.data.nickname || 'N/A'}</span>
                        </div>
                        <div class="flex">
                          <span class="w-20 font-medium text-green-700">Avatar:</span>
                          <span class="break-all text-green-800"
                            >{testResult.data.avatar_url || 'N/A'}</span
                          >
                        </div>
                        {#if testResult.data.agent_pub_key}
                          <div class="flex">
                            <span class="w-20 font-medium text-green-700">Agent:</span>
                            <span class="font-mono text-xs break-all text-green-800"
                              >{testResult.data.agent_pub_key}</span
                            >
                          </div>
                        {/if}
                        {#if testResult.data.created_at}
                          <div class="flex">
                            <span class="w-20 font-medium text-green-700">Created:</span>
                            <span class="text-green-800"
                              >{new Date(testResult.data.created_at / 1000).toLocaleString()}</span
                            >
                          </div>
                        {/if}
                      </div>
                      <details class="mt-3">
                        <summary class="cursor-pointer text-xs text-green-600 hover:text-green-700">
                          View Raw Entry Data
                        </summary>
                        <pre
                          class="mt-2 overflow-auto rounded bg-green-200 p-2 text-xs">{JSON.stringify(
                            testResult.data,
                            null,
                            2
                          )}</pre>
                      </details>
                    </div>
                  {/if}
                </div>
              </div>
              <button
                onclick={clearTestResults}
                class="ml-3 text-sm text-green-500 hover:text-green-700"
                title="Clear result"
              >
                ✕
              </button>
            </div>
          </div>
        {/if}

        <!-- Error Message -->
        {#if testError}
          <div class="rounded-lg border border-red-200 bg-red-50 p-4">
            <div class="flex items-start justify-between">
              <div class="flex flex-1 items-start">
                <span class="mr-3 text-xl text-red-600">❌</span>
                <div class="flex-1">
                  <h3 class="font-semibold text-red-800">Test Failed</h3>
                  <p class="mt-1 text-sm text-red-600">{testError.message}</p>
                  <details class="mt-2">
                    <summary class="cursor-pointer text-xs text-red-500 hover:text-red-600">
                      Troubleshooting Tips
                    </summary>
                    <div class="mt-2 space-y-1 text-xs text-red-600">
                      <p>• Make sure the Holochain conductor is running</p>
                      <p>
                        • Try running: <code class="rounded bg-red-100 px-1">bun run start</code>
                      </p>
                      <p>• Check that the nondominium hApp is properly installed</p>
                    </div>
                  </details>
                </div>
              </div>
              <button
                onclick={clearTestResults}
                class="ml-3 text-sm text-red-500 hover:text-red-700"
                title="Clear error"
              >
                ✕
              </button>
            </div>
          </div>
        {/if}

        <p class="text-sm text-gray-500">
          {#if isTestingPerson}
            Testing in progress...
          {:else if testResult || testError}
            Click the ✕ button to clear the result
          {:else}
            Results will appear here when you run the test
          {/if}
        </p>
      </div>
    </div>

    <div class="rounded-lg bg-white p-6 shadow-md">
      <h2 class="mb-4 text-2xl font-semibold">📋 Available Zome Functions</h2>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded border p-4">
          <h3 class="mb-2 font-semibold text-blue-600">👤 Person Zome</h3>
          <ul class="space-y-1 text-sm">
            <li>• create_person</li>
            <li>• get_all_persons</li>
            <li>• create_encrypted_profile</li>
            <li>• assign_role</li>
            <li>• get_roles</li>
          </ul>
        </div>

        <div class="rounded border p-4">
          <h3 class="mb-2 font-semibold text-green-600">📦 Resource Zome</h3>
          <ul class="space-y-1 text-sm">
            <li>• create_resource_specification</li>
            <li>• get_all_resource_specifications</li>
            <li>• create_economic_resource</li>
            <li>• get_resources_by_custodian</li>
          </ul>
        </div>

        <div class="rounded border p-4">
          <h3 class="mb-2 font-semibold text-purple-600">⚖️ Governance Zome</h3>
          <ul class="space-y-1 text-sm">
            <li>• create_commitment</li>
            <li>• fulfill_commitment</li>
            <li>• create_economic_event</li>
            <li>• get_events_by_agent</li>
          </ul>
        </div>
      </div>
    </div>
  {/if}
</div>
