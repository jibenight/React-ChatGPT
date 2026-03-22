<script lang="ts">
  import { PanelLeftClose, User, Settings, ChevronRight, HardDrive } from 'lucide-svelte';
  import { appStore } from '$stores/app.svelte';
  import { userStore } from '$stores/user.svelte';
  import * as tauri from '$lib/tauri';
  import SidebarSearch from './SidebarSearch.svelte';
  import SidebarModeToggle from './SidebarModeToggle.svelte';
  import SidebarProjectList from './SidebarProjectList.svelte';
  import SidebarThreadList from './SidebarThreadList.svelte';
  import ProjectFormPanel from './ProjectFormPanel.svelte';

  let showProjectPanel = $state(false);

  let projects = $state<any[]>([]);
  let threads = $state<any[]>([]);
  let loadingProjects = $state(false);
  let loadingThreads = $state(false);
  let newThreadTitle = $state('');

  let activeProject = $derived(
    projects.find((p) => p.id === appStore.selectedProjectId),
  );

  let providerAvatar = $derived(appStore.selectedOption?.avatar);

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

  // Load projects when user data is available
  $effect(() => {
    if (userStore.userData?.id) {
      fetchProjects();
    }
  });

  // Load threads when project mode or project changes
  $effect(() => {
    fetchThreads(appStore.projectMode ? appStore.selectedProjectId : null);
  });

  // Reset when project mode changes
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
  <!-- Header compact -->
  <div class="flex items-center gap-3 px-4 pt-3 pb-1">
    {#if providerAvatar}
      <video
        src={providerAvatar}
        autoplay
        muted
        loop
        playsinline
        class="h-7 w-7 rounded-md object-cover"
      ></video>
    {:else}
      <div class="flex h-7 w-7 items-center justify-center rounded-md bg-teal-500/15">
        <HardDrive class="h-4 w-4 text-teal-500" />
      </div>
    {/if}
    <p class="min-w-0 truncate text-sm font-semibold text-gray-900 dark:text-foreground">
      {userStore.userData?.username || 'Chargement...'}
    </p>
  </div>

  <!-- Search -->
  <SidebarSearch />

  <!-- Mode toggle -->
  <SidebarModeToggle />

  <!-- Content: projects + threads -->
  <div class="flex-1 min-h-0 px-4 pb-2 pt-2">
    <div class="flex h-full min-h-0 flex-col gap-2">
      <SidebarProjectList
        {activeProject}
        onOpenPanel={() => (showProjectPanel = true)}
      />

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

  <!-- Project form panel (slides in) -->
  <ProjectFormPanel
    show={showProjectPanel}
    onClose={() => (showProjectPanel = false)}
    {projects}
    {loadingProjects}
    {threads}
    {loadingThreads}
    onSelectProject={handleSelectProject}
    onRefreshProjects={fetchProjects}
    onRefreshThreads={refreshThreads}
  />

  <!-- Provider row compact -->
  <div class="px-4 pb-2">
    <button
      type="button"
      onclick={() => appStore.setSettingsOpen(true)}
      class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-card"
    >
      {#if providerAvatar}
        <video
          src={providerAvatar}
          autoplay
          muted
          loop
          playsinline
          class="h-5 w-5 rounded-full object-cover"
        ></video>
      {:else}
        <div class="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/15">
          <HardDrive class="h-3 w-3 text-teal-500" />
        </div>
      {/if}
      <span class="truncate text-xs font-semibold text-gray-700 dark:text-foreground">
        {appStore.selectedOption?.name || 'Choisir le fournisseur IA'}
      </span>
      <ChevronRight class="ml-auto h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-muted-foreground" />
    </button>
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
