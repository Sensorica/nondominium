<script lang="ts">
import { onMount } from "svelte";
import { setContext } from "svelte";
import logo from "./assets/holochainLogo.svg";
import ClientProvider from "./ClientProvider.svelte";
import { CLIENT_CONTEXT_KEY, createClientStore } from "./contexts";

const clientStore = createClientStore();
setContext(CLIENT_CONTEXT_KEY, clientStore);

let { error, loading } = $derived($clientStore);

onMount(() => {
  clientStore.connect();
});
</script>

<ClientProvider>
  <div>
    <div>
      <a href="https://developer.holochain.org/get-started/" target="_blank">
        <img src={logo} class="logo holochain" alt="holochain logo" />
      </a>
    </div>
    <h1>Holochain Svelte hApp</h1>
    <div>
      <div class="card">
        {#if loading}
          <p>connecting...</p>
        {:else if error}
          <p>{error.message}</p>
        {:else}
          <p>Client is connected.</p>
        {/if}
      </div>
      <p>
        Import scaffolded components into <code>src/App.svelte</code> to use
        your hApp
      </p>
      <p class="read-the-docs">Click on the Holochain logo to learn more</p>
    </div>
  </div>
</ClientProvider>

<style>
.logo {
  height: 15em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
  width: auto;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.holochain:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}
</style>
