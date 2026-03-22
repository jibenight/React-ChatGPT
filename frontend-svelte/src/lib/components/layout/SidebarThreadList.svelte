<script lang="ts">
  import { Plus } from 'lucide-svelte';
  import { appStore } from '$stores/app.svelte';
  import * as tauri from '$lib/tauri';

  let {
    threads,
    projects,
    loadingThreads,
    newThreadTitle = $bindable(''),
    onCreateThread,
    onRefreshThreads,
  }: {
    threads: any[];
    projects: any[];
    loadingThreads: boolean;
    newThreadTitle: string;
    onCreateThread: () => void;
    onRefreshThreads: () => void;
  } = $props();

  let editingThreadId = $state<string | null>(null);
  let editingThreadTitle = $state('');
  let showThreadManager = $state(false);
  let showNewInput = $state(false);
  let confirmThreadDelete = $state<{ open: boolean; threadId: string | null }>({
    open: false,
    threadId: null,
  });

  let visibleThreads = $derived(
    appStore.projectMode
      ? threads
      : threads.filter((t) => t.project_id === null || t.project_id === undefined),
  );

  function handleStartRename(thread: any) {
    editingThreadId = thread.id;
    editingThreadTitle = thread.title || '';
  }

  function handleCancelRename() {
    editingThreadId = null;
    editingThreadTitle = '';
  }

  async function handleRename(threadId: string) {
    try {
      await tauri.updateThread(threadId, { title: editingThreadTitle });
      handleCancelRename();
      onRefreshThreads();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAssign(threadId: string, projectId: number | null) {
    try {
      await tauri.updateThread(threadId, { project_id: projectId });
      if (appStore.projectMode && projectId !== appStore.selectedProjectId) {
        appStore.setSelectedThreadId(null);
      }
      onRefreshThreads();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(threadId: string) {
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
</script>

<div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 dark:border-border dark:bg-card dark:text-foreground">
  <div class="border-b border-gray-200 px-3 py-2 dark:border-border">
    <div class="flex items-center justify-between">
      <p class="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-muted-foreground">
        Conversations ({visibleThreads.length})
      </p>
      <div class="flex items-center gap-1">
        <button
          type="button"
          onclick={() => (showNewInput = !showNewInput)}
          class="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-muted-foreground dark:hover:bg-background dark:hover:text-foreground"
          title="Nouvelle conversation"
        >
          <Plus class="h-4 w-4" />
        </button>
        {#if visibleThreads.length > 0}
          <button
            type="button"
            onclick={() => {
              showThreadManager = !showThreadManager;
              handleCancelRename();
            }}
            class="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600 transition hover:border-gray-400 hover:text-gray-900 dark:border-border dark:bg-background dark:text-muted-foreground dark:hover:border-border dark:hover:text-foreground"
          >
            {showThreadManager ? 'Fermer' : 'Gérer'}
          </button>
        {/if}
      </div>
    </div>

    {#if showNewInput}
      <div class="mt-2 flex items-center gap-2">
        <input
          type="text"
          bind:value={newThreadTitle}
          placeholder="Titre (optionnel)"
          autofocus
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              onCreateThread();
              showNewInput = false;
            } else if (e.key === 'Escape') {
              showNewInput = false;
            }
          }}
          class="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-border dark:bg-background dark:text-foreground"
        />
        <button
          type="button"
          onclick={() => {
            onCreateThread();
            showNewInput = false;
          }}
          class="rounded-md bg-teal-500/15 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-500/25 dark:text-teal-100"
        >
          Créer
        </button>
      </div>
    {/if}
  </div>

  <div class="mt-0 flex-1 min-h-0 space-y-2 overflow-y-auto px-2 py-2">
    {#if loadingThreads}
      <div class="space-y-2 px-2">
        {#each Array(5) as _}
          <div class="h-8 animate-pulse rounded-md bg-gray-200 dark:bg-muted"></div>
        {/each}
      </div>
    {:else if visibleThreads.length === 0}
      <p class="px-2 text-xs text-gray-500 dark:text-muted-foreground">
        Aucune conversation pour le moment
      </p>
    {:else if showThreadManager}
      {#each visibleThreads as thread (thread.id)}
        {@const isEditing = editingThreadId === thread.id}
        <div
          class="rounded-lg border px-3 py-3 text-xs transition {appStore.selectedThreadId === thread.id
            ? 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-100'
            : 'border-gray-200 bg-white text-gray-700 dark:border-border dark:bg-background dark:text-muted-foreground'}"
        >
          <div class="text-xs font-semibold text-gray-900 dark:text-foreground">
            {#if isEditing}
              <input
                type="text"
                bind:value={editingThreadTitle}
                placeholder="Titre de conversation"
                class="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-border dark:bg-background dark:text-foreground"
              />
            {:else}
              <span class="line-clamp-2">
                {thread.title || 'Conversation sans titre'}
              </span>
            {/if}
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em]">
            {#if isEditing}
              <button
                type="button"
                onclick={() => handleRename(thread.id)}
                class="text-teal-600 transition hover:text-teal-700 dark:text-teal-200 dark:hover:text-teal-100"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onclick={handleCancelRename}
                class="text-gray-500 transition hover:text-gray-700 dark:text-muted-foreground dark:hover:text-foreground"
              >
                Annuler
              </button>
            {:else}
              <button
                type="button"
                onclick={() => appStore.setSelectedThreadId(thread.id)}
                class="text-teal-600 transition hover:text-teal-700 dark:text-teal-200 dark:hover:text-teal-100"
              >
                Ouvrir
              </button>
              <button
                type="button"
                onclick={() => handleStartRename(thread)}
                class="text-gray-500 transition hover:text-gray-700 dark:text-muted-foreground dark:hover:text-foreground"
              >
                Renommer
              </button>
              <button
                type="button"
                onclick={() => (confirmThreadDelete = { open: true, threadId: thread.id })}
                class="text-red-400 transition hover:text-red-300"
              >
                Supprimer
              </button>
            {/if}
          </div>
          <div class="mt-2">
            <select
              value={thread.project_id ?? ''}
              onchange={(e) => {
                const val = (e.target as HTMLSelectElement).value;
                const parsed = val === '' ? null : Number(val);
                handleAssign(thread.id, Number.isNaN(parsed) ? null : parsed);
              }}
              class="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-border dark:bg-background dark:text-foreground"
            >
              <option value="">Sans projet</option>
              {#each projects as project (project.id)}
                <option value={project.id}>{project.name}</option>
              {/each}
            </select>
          </div>
        </div>
      {/each}
    {:else}
      {#each visibleThreads as thread (thread.id)}
        <button
          type="button"
          onclick={() => appStore.setSelectedThreadId(thread.id)}
          class="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs font-semibold transition {appStore.selectedThreadId === thread.id
            ? 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-100'
            : 'border-transparent text-gray-700 hover:border-gray-200 hover:bg-white dark:text-muted-foreground dark:hover:border-border dark:hover:bg-background'}"
        >
          <span
            class="h-2 w-2 rounded-full {appStore.selectedThreadId === thread.id ? 'bg-teal-300' : 'bg-border'}"
          ></span>
          <span class="truncate">{thread.title || 'Conversation sans titre'}</span>
        </button>
      {/each}
    {/if}
  </div>
</div>

{#if confirmThreadDelete.open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="confirm-thread-delete-title">
    <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-card dark:shadow-none">
      <h4 id="confirm-thread-delete-title" class="text-base font-semibold text-gray-900 dark:text-foreground">
        Supprimer la conversation
      </h4>
      <p class="mt-2 text-sm text-gray-600 dark:text-muted-foreground">
        Cette action est irréversible.
      </p>
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted"
          onclick={() => (confirmThreadDelete = { open: false, threadId: null })}
        >
          Annuler
        </button>
        <button
          type="button"
          class="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          onclick={() => {
            const target = confirmThreadDelete.threadId;
            confirmThreadDelete = { open: false, threadId: null };
            if (target) handleDelete(target);
          }}
        >
          Supprimer
        </button>
      </div>
    </div>
  </div>
{/if}
