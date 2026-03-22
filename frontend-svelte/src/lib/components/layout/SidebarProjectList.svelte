<script lang="ts">
  import { FolderOpen, ChevronRight } from 'lucide-svelte';
  import { appStore } from '$stores/app.svelte';

  let { activeProject, onOpenPanel }: {
    activeProject: any;
    onOpenPanel: () => void;
  } = $props();
</script>

{#if appStore.projectMode}
  <button
    type="button"
    onclick={onOpenPanel}
    class="flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 dark:text-foreground dark:hover:bg-card"
  >
    <FolderOpen class="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-muted-foreground" />
    <span class="truncate font-semibold">
      {activeProject?.name || 'Aucun projet sélectionné'}
    </span>
    <ChevronRight class="ml-auto h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-muted-foreground" />
  </button>
{/if}
