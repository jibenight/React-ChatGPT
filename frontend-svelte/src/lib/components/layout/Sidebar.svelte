<script lang="ts">
  import { PanelLeftClose, User, Settings } from 'lucide-svelte';
  import { appStore } from '$stores/app.svelte';
  import { userStore } from '$stores/user.svelte';
  import * as tauri from '$lib/tauri';
  import SidebarSearch from './SidebarSearch.svelte';
  import SidebarModeToggle from './SidebarModeToggle.svelte';
  import SidebarProjectList from './SidebarProjectList.svelte';
  import SidebarThreadList from './SidebarThreadList.svelte';

  let projects = $state<any[]>([]);
  let threads = $state<any[]>([]);
  let loadingProjects = $state(false);
  let loadingThreads = $state(false);
  let newThreadTitle = $state('');

  let activeProject = $derived(
    projects.find((p) => p.id === appStore.selectedProjectId),
  );

  async function fetchProjects() {
    loadingProjects = true;
    try {
      const data = await tauri.listProjects();
      projects = data || [];
    } catch (err) {
      console.error(err);
    } finally {
      loadingProjects = false;
    }
  }

  async function fetchThreads(projectId?: number | null) {
    loadingThreads = true;
    try {
      const data = await tauri.listThreads(projectId);
      threads = data || [];
    } catch (err) {
      console.error(err);
    } finally {
      loadingThreads = false;
    }
  }

  $effect(() => {
    if (userStore.userData?.id) {
      fetchProjects();
    }
  });

  $effect(() => {
    fetchThreads(appStore.projectMode ? appStore.selectedProjectId : null);
  });

  $effect(() => {
    if (!appStore.projectMode) {
      appStore.setSelectedProjectId(null);
      appStore.setSelectedThreadId(null);
    }
  });

  async function handleCreateThread() {
    try {
      const targetProjectId = appStore.projectMode ? appStore.selectedProjectId : null;
      const thread = await tauri.createThread({
        title: newThreadTitle || undefined,
        project_id: targetProjectId || undefined,
      });
      newThreadTitle = '';
      await fetchThreads(appStore.projectMode ? targetProjectId : null);
      if (thread?.id) {
        appStore.setSelectedThreadId(thread.id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function refreshThreads() {
    fetchThreads(appStore.projectMode ? appStore.selectedProjectId : null);
  }

  function handleSelectProject(projectId: number | null) {
    if (projectId !== null) {
      appStore.setProjectMode(true);
    }
    appStore.setSelectedProjectId(projectId);
    appStore.setSelectedThreadId(null);
  }
</script>

<aside
  class="relative flex shrink-0 flex-col overflow-hidden rounded-2xl bg-white text-gray-900 transition-all duration-300 ease-in-out dark:bg-sidebar dark:text-foreground"
  class:w-80={!appStore.sidebarCollapsed}
  class:w-0={appStore.sidebarCollapsed}
  class:opacity-0={appStore.sidebarCollapsed}
  class:pointer-events-none={appStore.sidebarCollapsed}
  aria-hidden={appStore.sidebarCollapsed}
>
  <!-- Mode toggle (Projet / Libre) -->
  <div class="pt-3">
    <SidebarModeToggle />
  </div>

  <!-- Project selector (only in project mode) -->
  <SidebarProjectList
    {activeProject}
    {projects}
    onSelectProject={handleSelectProject}
    onOpenSettings={() => appStore.setSettingsOpen(true, 'projects')}
  />

  <!-- Search -->
  <SidebarSearch />

  <!-- Conversations -->
  <div class="flex-1 min-h-0 px-4 pb-2 pt-2">
    <div class="flex h-full min-h-0 flex-col">
      <SidebarThreadList
        {threads}
        {projects}
        {loadingThreads}
        bind:newThreadTitle
        onCreateThread={handleCreateThread}
        onRefreshThreads={refreshThreads}
      />
    </div>
  </div>

  <!-- Bottom icons: collapse, profile, settings -->
  <div class="border-t border-gray-200 px-4 py-2.5 dark:border-white/[0.06]">
    <div class="flex items-center justify-around">
      <button
        type="button"
        onclick={() => appStore.setSidebarCollapsed(true)}
        class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-muted-foreground dark:hover:bg-card dark:hover:text-foreground"
        aria-label="Masquer la barre latérale"
        title="Masquer la sidebar"
      >
        <PanelLeftClose class="h-4 w-4" />
      </button>
      <button
        type="button"
        onclick={() => appStore.setProfil(true)}
        class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-muted-foreground dark:hover:bg-card dark:hover:text-foreground"
        title="Profil"
      >
        <User class="h-4 w-4" />
      </button>
      <button
        type="button"
        onclick={() => appStore.setSettingsOpen(true)}
        class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-muted-foreground dark:hover:bg-card dark:hover:text-foreground"
        title="Paramètres"
      >
        <Settings class="h-4 w-4" />
      </button>
    </div>
  </div>
</aside>
