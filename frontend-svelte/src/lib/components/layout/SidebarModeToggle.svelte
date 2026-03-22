<script lang="ts">
  import { appStore } from '$stores/app.svelte';
</script>

<div class="flex gap-1 px-4 pt-2" role="tablist" aria-label="Mode de navigation">
  <button
    type="button"
    role="tab"
    aria-selected={appStore.projectMode}
    onclick={() => appStore.setProjectMode(true)}
    class="flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition {appStore.projectMode
      ? 'border-teal-300 bg-teal-500/15 text-teal-700 dark:border-teal-500/40 dark:text-teal-100'
      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-muted-foreground dark:hover:text-foreground'}"
  >
    Projet
  </button>
  <button
    type="button"
    role="tab"
    aria-selected={!appStore.projectMode}
    onclick={() => appStore.setProjectMode(false)}
    class="flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition {!appStore.projectMode
      ? 'border-teal-300 bg-teal-500/15 text-teal-700 dark:border-teal-500/40 dark:text-teal-100'
      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-muted-foreground dark:hover:text-foreground'}"
  >
    Libre
  </button>
</div>
