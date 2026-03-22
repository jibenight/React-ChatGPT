<script lang="ts">
  import { Plus, ExternalLink } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { appStore } from '$stores/app.svelte';
  import * as tauri from '$lib/tauri';

  let {
    show,
    onClose,
    projects,
    loadingProjects,
    threads,
    loadingThreads,
    onSelectProject,
    onRefreshProjects,
    onRefreshThreads,
  }: {
    show: boolean;
    onClose: () => void;
    projects: any[];
    loadingProjects: boolean;
    threads: any[];
    loadingThreads: boolean;
    onSelectProject: (projectId: number | null) => void;
    onRefreshProjects: () => void;
    onRefreshThreads: () => void;
  } = $props();

  let showNewProject = $state(false);
  let newProject = $state({ name: '', instructions: '', context_data: '' });
  let newThreadTitle = $state('');
  let creatingProject = $state(false);

  let confirmDelete = $state<{ open: boolean; threadId: string | null }>({ open: false, threadId: null });

  async function handleCreateProject() {
    if (!newProject.name.trim() || creatingProject) return;
    creatingProject = true;
    try {
      const project = await tauri.createProject({
        name: newProject.name.trim(),
        instructions: newProject.instructions.trim() || undefined,
        context_data: newProject.context_data.trim() || undefined,
      });
      newProject = { name: '', instructions: '', context_data: '' };
      showNewProject = false;
      onRefreshProjects();
      if (project?.id) {
        onSelectProject(project.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      creatingProject = false;
    }
  }

  async function handleCreateThread() {
    try {
      const thread = await tauri.createThread({
        title: newThreadTitle.trim() || undefined,
        project_id: appStore.selectedProjectId || undefined,
      });
      newThreadTitle = '';
      onRefreshThreads();
      if (thread?.id) {
        appStore.setSelectedThreadId(thread.id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteThread(threadId: string) {
    try {
      await tauri.deleteThread(threadId);
      if (appStore.selectedThreadId === threadId) {
        appStore.setSelectedThreadId(null);
      }
      onRefreshThreads();
    } catch (err) {
      console.error(err);
    }
  }

  function openProjectsPage() {
    onClose();
    goto('/projects');
  }
</script>

<div
  class="absolute inset-0 z-40 flex h-full flex-col bg-white px-4 py-5 transition-transform duration-300 ease-out dark:bg-sidebar {show ? 'translate-x-0' : 'translate-x-full pointer-events-none'}"
>
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-muted-foreground">Projets</p>
      <h3 class="text-base font-semibold text-gray-900 dark:text-foreground">Gestion des projets</h3>
    </div>
    <button
      type="button"
      onclick={onClose}
      class="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 dark:border-border dark:bg-card dark:text-foreground dark:hover:border-border"
    >
      Fermer
    </button>
  </div>

  <!-- Scrollable content -->
  <div class="mt-4 flex-1 min-h-0 space-y-4 overflow-y-auto pb-4 pr-1">
    <!-- Link to full projects page -->
    <button
      type="button"
      onclick={openProjectsPage}
      class="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 transition hover:border-gray-300 hover:text-gray-900 dark:border-border dark:bg-card dark:text-foreground dark:hover:border-border"
    >
      <span class="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-muted-foreground">Vue projets</span>
      <span class="flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-300">
        Ouvrir <ExternalLink class="h-3 w-3" />
      </span>
    </button>

    <!-- Projects section -->
    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-border dark:bg-card dark:text-foreground">
      <div class="flex items-center justify-between">
        <p class="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-muted-foreground">Projets</p>
        <button
          type="button"
          onclick={() => (showNewProject = !showNewProject)}
          class="rounded-full border border-gray-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-700 transition hover:border-gray-400 hover:text-gray-900 dark:border-border dark:bg-background dark:text-foreground dark:hover:border-border"
        >
          {showNewProject ? 'Annuler' : 'Nouveau'}
        </button>
      </div>

      <!-- Create project form -->
      {#if showNewProject}
        <div class="mt-3 space-y-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-border dark:bg-background">
          <input
            type="text"
            bind:value={newProject.name}
            placeholder="Nom du projet"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-border dark:bg-background dark:text-foreground"
          />
          <textarea
            bind:value={newProject.instructions}
            placeholder="Instructions (optionnel)"
            rows="2"
            class="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-border dark:bg-background dark:text-foreground"
          ></textarea>
          <textarea
            bind:value={newProject.context_data}
            placeholder="Données de contexte (optionnel)"
            rows="2"
            class="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-border dark:bg-background dark:text-foreground"
          ></textarea>
          <div class="flex gap-2">
            <button
              type="button"
              onclick={handleCreateProject}
              disabled={!newProject.name.trim() || creatingProject}
              class="flex-1 rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingProject ? 'Création...' : 'Créer'}
            </button>
            <button
              type="button"
              onclick={() => (showNewProject = false)}
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400 dark:border-border dark:text-foreground dark:hover:border-border"
            >
              Annuler
            </button>
          </div>
        </div>
      {/if}

      <!-- Project list -->
      <div class="mt-3 space-y-1">
        {#if loadingProjects}
          {#each Array(3) as _}
            <div class="h-8 animate-pulse rounded-lg bg-gray-200 dark:bg-muted"></div>
          {/each}
        {:else}
          {#each projects as project (project.id)}
            <button
              type="button"
              onclick={() => onSelectProject(project.id)}
              class="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition {appStore.selectedProjectId === project.id
                ? 'bg-teal-500/20 text-teal-700 dark:text-teal-100'
                : 'text-gray-700 hover:bg-gray-100 dark:text-muted-foreground dark:hover:bg-muted/70'}"
            >
              {project.name}
            </button>
          {/each}
          {#if projects.length === 0}
            <p class="px-3 py-2 text-xs text-gray-500 dark:text-muted-foreground">Aucun projet</p>
          {/if}
        {/if}
      </div>
    </div>

    <!-- Threads section -->
    <div class="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-border dark:bg-card dark:text-foreground">
      <div class="flex items-center justify-between">
        <p class="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-muted-foreground">Conversations</p>
        <button
          type="button"
          onclick={handleCreateThread}
          class="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-muted-foreground dark:hover:bg-background dark:hover:text-foreground"
          title="Nouvelle conversation"
        >
          <Plus class="h-4 w-4" />
        </button>
      </div>
      <input
        type="text"
        bind:value={newThreadTitle}
        placeholder="Titre de conversation (optionnel)"
        onkeydown={(e) => { if (e.key === 'Enter') handleCreateThread(); }}
        class="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-border dark:bg-background dark:text-foreground"
      />
      <div class="mt-3 space-y-1">
        {#if loadingThreads}
          {#each Array(3) as _}
            <div class="h-8 animate-pulse rounded-lg bg-gray-200 dark:bg-muted"></div>
          {/each}
        {:else if threads.length === 0}
          <p class="text-xs text-gray-500 dark:text-muted-foreground">Aucune conversation pour le moment</p>
        {:else}
          {#each threads as thread (thread.id)}
            <div
              class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition {appStore.selectedThreadId === thread.id
                ? 'bg-teal-500/20 text-teal-700 dark:text-teal-100'
                : 'text-gray-700 hover:bg-gray-100 dark:text-muted-foreground dark:hover:bg-muted/70'}"
            >
              <button
                type="button"
                onclick={() => appStore.setSelectedThreadId(thread.id)}
                class="flex-1 text-left truncate"
              >
                {thread.title || 'Conversation sans titre'}
              </button>
              <button
                type="button"
                onclick={() => (confirmDelete = { open: true, threadId: thread.id })}
                class="ml-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400 hover:text-red-300"
              >
                Supprimer
              </button>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Delete confirmation -->
{#if confirmDelete.open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
    <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-card dark:shadow-none">
      <h4 class="text-base font-semibold text-gray-900 dark:text-foreground">Supprimer la conversation</h4>
      <p class="mt-2 text-sm text-gray-600 dark:text-muted-foreground">Cette action est irréversible.</p>
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onclick={() => (confirmDelete = { open: false, threadId: null })}
          class="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted"
        >
          Annuler
        </button>
        <button
          type="button"
          onclick={() => {
            const target = confirmDelete.threadId;
            confirmDelete = { open: false, threadId: null };
            if (target) handleDeleteThread(target);
          }}
          class="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
        >
          Supprimer
        </button>
      </div>
    </div>
  </div>
{/if}
