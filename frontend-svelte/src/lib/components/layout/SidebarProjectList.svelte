<script lang="ts">
  import { FolderOpen, ChevronDown, Settings } from 'lucide-svelte';
  import { appStore } from '$stores/app.svelte';
  import { i18n } from '$lib/i18n';

  let { activeProject, projects, onSelectProject, onOpenSettings }: {
    activeProject: any;
    projects: any[];
    onSelectProject: (id: number | null) => void;
    onOpenSettings: () => void;
  } = $props();

  let open = $state(false);
  let dropdownRef = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
        open = false;
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  function select(id: number | null) {
    onSelectProject(id);
    open = false;
  }
</script>

{#if appStore.projectMode}
  <div class="relative mx-4" bind:this={dropdownRef}>
    <button
      type="button"
      onclick={() => (open = !open)}
      class="flex w-full shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 dark:text-foreground dark:hover:bg-card"
    >
      <FolderOpen class="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-muted-foreground" />
      <span class="flex-1 truncate text-left font-semibold">
        {activeProject?.name || i18n.t('noProjectSelected')}
      </span>
      <ChevronDown class="h-3.5 w-3.5 shrink-0 text-gray-400 transition dark:text-muted-foreground {open ? 'rotate-180' : ''}" />
    </button>

    {#if open}
      <div class="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-border dark:bg-card">
        <!-- Project list -->
        <div class="max-h-48 overflow-y-auto">
          {#if projects.length === 0}
            <p class="px-3 py-2 text-xs text-gray-400 dark:text-muted-foreground">{i18n.t('noProjects')}</p>
          {:else}
            {#each projects as project (project.id)}
              <button
                type="button"
                onclick={() => select(project.id)}
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition {appStore.selectedProjectId === project.id
                  ? 'bg-teal-500/10 font-semibold text-teal-700 dark:text-teal-300'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-foreground dark:hover:bg-muted'}"
              >
                <span class="h-1.5 w-1.5 shrink-0 rounded-full {appStore.selectedProjectId === project.id ? 'bg-teal-500' : 'bg-gray-300 dark:bg-border'}"></span>
                <span class="truncate">{project.name}</span>
              </button>
            {/each}
          {/if}
        </div>

        <!-- Separator + manage link -->
        <div class="border-t border-gray-100 pt-1 dark:border-border">
          <button
            type="button"
            onclick={() => { open = false; onOpenSettings(); }}
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
          >
            <Settings class="h-3 w-3" />
            {i18n.t('manage')} {i18n.t('projects')}
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}
