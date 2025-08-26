<script lang="ts">
	import { holochainService } from '$lib/services';
	import { onMount } from 'svelte';

	interface Props {
		children?: import('svelte').Snippet;
		autoConnect?: boolean;
		url?: string;
	}

	let { children, autoConnect = true, url }: Props = $props();

	// Simple state without reactive derivation
	let status: string = $state('disconnected');
	let error: Error | null = $state(null);
	let isConnected: boolean = $state(false);

	// Auto-connect on mount using real Holochain connection
	onMount(async () => {
		if (autoConnect) {
			status = 'connecting';
			try {
				await holochainService.connectClient();
				status = 'connected';
				isConnected = true;
				console.log('✅ Successfully connected to Holochain');
			} catch (err) {
				console.error('Auto-connect failed:', err);
				status = 'error';
				error = err instanceof Error ? err : new Error(String(err));
				isConnected = false;
			}
		}
	});

	// Connection retry function
	async function retry() {
		status = 'connecting';
		error = null;
		try {
			await holochainService.connectClient();
			status = 'connected';
			isConnected = true;
			console.log('✅ Successfully connected to Holochain');
		} catch (err) {
			console.error('Retry failed:', err);
			status = 'error';
			error = err instanceof Error ? err : new Error(String(err));
			isConnected = false;
		}
	}
</script>

{#if status === 'connecting'}
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-center">
			<div class="mb-4 animate-pulse text-6xl">⚡</div>
			<p class="text-lg text-gray-600">Connecting to Holochain...</p>
		</div>
	</div>
{:else if status === 'error' && error}
	<div class="flex min-h-screen items-center justify-center">
		<div class="max-w-md text-center">
			<div class="mb-4 text-6xl">❌</div>
			<h2 class="mb-2 text-xl font-semibold text-red-600">Connection Failed</h2>
			<p class="mb-4 text-gray-600">
				Unable to connect to Holochain conductor: {error.message}
			</p>
			<button
				onclick={retry}
				class="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
			>
				Retry Connection
			</button>
			<details class="mt-4 text-left">
				<summary class="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
					Connection Details
				</summary>
				<div class="mt-2 rounded bg-gray-100 p-3 font-mono text-xs">
					<p><strong>URL:</strong> {url || 'ws://localhost:8888'}</p>
					<p><strong>Error:</strong> {error.message}</p>
				</div>
			</details>
		</div>
	</div>
{:else if isConnected}
	{@render children?.()}
{:else}
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-center">
			<div class="mb-4 text-6xl">🔌</div>
			<p class="text-lg text-gray-600">
				Holochain not connected.
				{#if !autoConnect}
					<button
						onclick={() => holochainService.connectClient()}
						class="bg-green-60d0 ml-2 rounded px-3 py-1 text-white transition-colors hover:bg-green-700"
					>
						Connect
					</button>
				{/if}
			</p>
		</div>
	</div>
{/if}
