<script lang="ts">
  import { page } from '$app/stores';

  const links: readonly { href: string; label: string }[] = [
    { href: '/', label: 'Lobby' },
    { href: '/group/solo', label: 'Group (stub)' }
  ] as const;
</script>

<nav
  class="flex w-52 shrink-0 flex-col border-r border-gray-200 bg-gray-50 p-3"
  aria-label="Primary"
>
  <div class="mb-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">Navigate</div>
  <ul class="space-y-1">
    {#each links as link}
      <li>
        <a
          href={link.href}
          class="block rounded px-2 py-1.5 text-sm transition-colors {$page.url.pathname === link.href
            ? 'bg-white font-medium text-gray-900 shadow-sm'
            : 'text-gray-600 hover:bg-white hover:text-gray-900'}"
        >
          {link.label}
        </a>
      </li>
    {/each}
  </ul>
</nav>
