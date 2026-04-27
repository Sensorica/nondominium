<script lang="ts">
  import { page } from '$app/stores';
  import { appContext } from '$lib/stores/app.context.svelte';

  const isActive = (href: string) =>
    href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(href);

  const newNdoHref = $derived(
    appContext.selectedGroupId
      ? `/group/${appContext.selectedGroupId}?createNdo=1`
      : '/ndo/new'
  );
</script>

<nav
  class="flex w-52 shrink-0 flex-col border-r border-gray-200 bg-gray-50 p-3"
  aria-label="Primary"
>
  <div class="mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">NDOs</div>
  <ul class="mb-3 space-y-1">
    <li>
      <a
        href="/"
        class="block rounded px-2 py-1.5 text-sm transition-colors {isActive('/')
          ? 'bg-white font-medium text-gray-900 shadow-sm'
          : 'text-gray-600 hover:bg-white hover:text-gray-900'}"
      >
        Browse NDOs
      </a>
    </li>
    <li>
      <a
        href={newNdoHref}
        class="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition-colors {isActive('/ndo/new')
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-blue-600 hover:bg-white hover:text-blue-800'}"
      >
        <span class="text-base leading-none">+</span> New NDO
      </a>
    </li>
  </ul>
</nav>
