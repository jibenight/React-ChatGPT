<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { X } from 'lucide-svelte';
  import * as tauri from '$lib/tauri';
  import { appStore } from '$lib/stores/app.svelte';
  import ThreadListSkeleton from '$lib/components/ui/ThreadListSkeleton.svelte';

  type Project = {
    id: number;
    name: string;
    description?: string;
    instructions?: string;
    context_data?: string;
  };

  type Thread = {
    id: string;
    title?: string | null;
  };

  type Status = { type: 'success' | 'error'; text: string } | null;

  let projects = $state<Project[]>([]);
  let selectedProject = $state<Project | null>(null);
  let threads = $state<Thread[]>([]);
  let loadingProjects = $state(false);
  let loadingThreads = $state(false);
  let status = $state<Status>(null);
  let confirmProjectDelete = $state(false);
  let confirmThreadDelete = $state<{ open: boolean; threadId: string | null }>({ open: false, threadId: null });
  let editingThreadId = $state<string | null>(null);
  let editingThreadTitle = $state('');

  let newProject = $state({ name: '', description: '', instructions: '', context_data: '' });
  let editProject = $state({ name: '', description: '', instructions: '', context_data: '' });

  async function loadProjects() {
    loadingProjects = true;
    try {
      const data = await tauri.listProjects();
      projects = (data || []) as Project[];
    } catch (err) {
      console.error(err);
    } finally {
      loadingProjects = false;
    }
  }

  async function loadThreads(projectId: number) {
    loadingThreads = true;
    try {
      const data = await tauri.listThreads(projectId);
      threads = (data || []) as Thread[];
    } catch (err) {
      console.error(err);
    } finally {
      loadingThreads = false;
    }
  }

  function selectProject(project: Project) {
    selectedProject = project;
    editProject = {
      name: project.name || '',
      description: project.description || '',
      instructions: project.instructions || '',
      context_data: project.context_data || '',
    };
    loadThreads(project.id);
  }

  async function handleCreate() {
    if (!newProject.name.trim()) return;
    try {
      const created = await tauri.createProject(newProject) as Project;
      newProject = { name: '', description: '', instructions: '', context_data: '' };
      status = { type: 'success', text: 'Projet cree.' };
      await loadProjects();
      if (created?.id) selectProject(created);
    } catch (err) {
      console.error(err);
      status = { type: 'error', text: 'Impossible de creer le projet.' };
    }
  }

  async function handleUpdate() {
    if (!selectedProject) return;
    try {
      await tauri.updateProject(selectedProject.id, editProject);
      status = { type: 'success', text: 'Projet mis a jour.' };
      await loadProjects();
    } catch (err) {
      console.error(err);
      status = { type: 'error', text: 'Impossible de mettre a jour le projet.' };
    }
  }

  async function handleDelete() {
    if (!selectedProject) return;
    try {
      await tauri.deleteProject(selectedProject.id);
      selectedProject = null;
      threads = [];
      status = { type: 'success', text: 'Projet supprime.' };
      await loadProjects();
    } catch (err) {
      console.error(err);
      status = { type: 'error', text: 'Impossible de supprimer le projet.' };
    }
  }

  async function handleDeleteThread(threadId: string) {
    if (!selectedProject) return;
    try {
      await tauri.deleteThread(threadId);
      await loadThreads(selectedProject.id);
    } catch (err) {
      console.error(err);
      status = { type: 'error', text: 'Impossible de supprimer la conversation.' };
    }
  }

  async function handleRenameThread(threadId: string) {
    if (!selectedProject) return;
    try {
      await tauri.updateThread(threadId, { title: editingThreadTitle });
      status = { type: 'success', text: 'Conversation renommee.' };
      editingThreadId = null;
      editingThreadTitle = '';
      await loadThreads(selectedProject.id);
    } catch (err) {
      console.error(err);
      status = { type: 'error', text: 'Impossible de renommer la conversation.' };
    }
  }

  function openInChat(projectId: number, threadId?: string) {
    appStore.setSelectedProjectId(projectId);
    if (threadId) appStore.setSelectedThreadId(threadId);
    goto('/');
  }

  onMount(() => {
    loadProjects();
  });
</script>

<div class="relative min-h-full overflow-x-hidden text-gray-900 dark:text-foreground">
  <div class="mx-auto max-w-6xl px-4 py-10">
    <!-- Header -->
    <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground">Projets</p>
        <h1 class="text-3xl font-semibold text-gray-900 dark:text-foreground">Espace projets</h1>
        <p class="text-sm text-gray-500 dark:text-muted-foreground">Gerer les instructions et le contexte de chaque projet.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <a
          href="/"
          class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-800 dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
        >
          <X class="h-3.5 w-3.5" />
          Fermer
        </a>
      </div>
    </div>

    <!-- Status banner -->
    {#if status}
      <div
        class={`mb-6 rounded-xl border px-4 py-3 text-sm ${
          status.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
        }`}
      >
        {status.text}
      </div>
    {/if}

    <div class="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
      <!-- Create project -->
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-foreground">Creer un projet</h2>
        <div class="mt-4 grid gap-4">
          <input
            bind:value={newProject.name}
            type="text"
            placeholder="Nom du projet"
            class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"
          />
          <input
            bind:value={newProject.description}
            type="text"
            placeholder="Description courte (optionnel)"
            class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"
          />
          <textarea
            bind:value={newProject.instructions}
            rows={4}
            placeholder="Instructions pour l'IA (optionnel)"
            class="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"
          ></textarea>
          <textarea
            bind:value={newProject.context_data}
            rows={4}
            placeholder="Donnees de contexte (optionnel)"
            class="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"
          ></textarea>
          <button
            type="button"
            onclick={handleCreate}
            class="inline-flex items-center justify-center rounded-full bg-teal-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600"
          >
            Creer le projet
          </button>
        </div>
      </section>

      <!-- Project list + detail -->
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-foreground">Vos projets</h2>
        <div class="mt-4 grid gap-3">
          {#if loadingProjects}
            <div class="space-y-2">
              {#each Array(3) as _}
                <div class="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-muted"></div>
              {/each}
            </div>
          {:else if projects.length === 0}
            <p class="text-sm text-gray-500 dark:text-muted-foreground">Aucun projet pour le moment.</p>
          {:else}
            {#each projects as project (project.id)}
              <div
                class={`rounded-xl border px-4 py-3 text-sm transition ${
                  selectedProject?.id === project.id
                    ? 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-100'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-teal-200 hover:bg-teal-50 dark:border-border dark:bg-card/60 dark:text-foreground dark:hover:border-teal-500/40 dark:hover:bg-teal-500/10'
                }`}
              >
                <button
                  type="button"
                  onclick={() => selectProject(project)}
                  class="w-full text-left"
                >
                  <p class="font-semibold">{project.name}</p>
                  <p class="text-xs text-gray-500 dark:text-muted-foreground">
                    {project.description || 'Aucune description'}
                  </p>
                </button>
                <button
                  type="button"
                  onclick={() => openInChat(project.id)}
                  class="mt-2 inline-flex text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200"
                >
                  Ouvrir dans le chat
                </button>
              </div>
            {/each}
          {/if}
        </div>

        {#if selectedProject}
          <div class="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-border dark:bg-card/60">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-foreground">Modifier le projet</h3>
            <button
              type="button"
              onclick={() => openInChat(selectedProject!.id)}
              class="mt-2 inline-flex text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200"
            >
              Ouvrir le projet dans le chat
            </button>
            <div class="mt-3 grid gap-3">
              <input
                bind:value={editProject.name}
                type="text"
                class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"
              />
              <input
                bind:value={editProject.description}
                type="text"
                class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"
              />
              <textarea
                bind:value={editProject.instructions}
                rows={4}
                class="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"
              ></textarea>
              <textarea
                bind:value={editProject.context_data}
                rows={4}
                class="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"
              ></textarea>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  onclick={handleUpdate}
                  class="rounded-full bg-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-600"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onclick={() => { confirmProjectDelete = true; }}
                  class="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10"
                >
                  Supprimer le projet
                </button>
              </div>
            </div>

            <!-- Conversations -->
            <div class="mt-6 border-t border-gray-200 pt-4 dark:border-border">
              <h4 class="text-sm font-semibold text-gray-700 dark:text-foreground">Conversations</h4>
              <div class="mt-3 space-y-2">
                {#if loadingThreads}
                  <ThreadListSkeleton />
                {:else if threads.length === 0}
                  <p class="text-xs text-gray-500 dark:text-muted-foreground">Aucune conversation pour ce projet.</p>
                {:else}
                  {#each threads as thread (thread.id)}
                    <div class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs dark:border-border dark:bg-card">
                      {#if editingThreadId === thread.id}
                        <input
                          bind:value={editingThreadTitle}
                          type="text"
                          placeholder="Titre de conversation"
                          class="mr-3 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"
                        />
                      {:else}
                        <span class="font-semibold text-gray-700 dark:text-foreground">
                          {thread.title || 'Conversation sans titre'}
                        </span>
                      {/if}
                      <div class="flex items-center gap-2">
                        {#if editingThreadId === thread.id}
                          <button
                            type="button"
                            onclick={() => handleRenameThread(thread.id)}
                            class="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200"
                          >
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            onclick={() => { editingThreadId = null; editingThreadTitle = ''; }}
                            class="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-muted-foreground dark:hover:text-foreground"
                          >
                            Annuler
                          </button>
                        {:else}
                          <button
                            type="button"
                            onclick={() => openInChat(selectedProject!.id, thread.id)}
                            class="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200"
                          >
                            Ouvrir
                          </button>
                          <button
                            type="button"
                            onclick={() => { editingThreadId = thread.id; editingThreadTitle = thread.title || ''; }}
                            class="text-xs font-semibold text-gray-600 hover:text-gray-800 dark:text-muted-foreground dark:hover:text-foreground"
                          >
                            Renommer
                          </button>
                          <button
                            type="button"
                            onclick={() => { confirmThreadDelete = { open: true, threadId: thread.id }; }}
                            class="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
                          >
                            Supprimer
                          </button>
                        {/if}
                      </div>
                    </div>
                  {/each}
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </section>
    </div>
  </div>

  <!-- Modal: confirm thread delete -->
  {#if confirmThreadDelete.open}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-card dark:shadow-none">
        <h4 class="text-base font-semibold text-gray-900 dark:text-foreground">Supprimer la conversation</h4>
        <p class="mt-2 text-sm text-gray-600 dark:text-muted-foreground">Cette action est irreversible.</p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted"
            onclick={() => { confirmThreadDelete = { open: false, threadId: null }; }}
          >
            Annuler
          </button>
          <button
            type="button"
            class="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
            onclick={() => {
              const target = confirmThreadDelete.threadId;
              confirmThreadDelete = { open: false, threadId: null };
              if (target) handleDeleteThread(target);
            }}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Modal: confirm project delete -->
  {#if confirmProjectDelete}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-card dark:shadow-none">
        <h4 class="text-base font-semibold text-gray-900 dark:text-foreground">Supprimer le projet</h4>
        <p class="mt-2 text-sm text-gray-600 dark:text-muted-foreground">
          Ce projet sera supprime et ses conversations detachees. Action irreversible.
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted"
            onclick={() => { confirmProjectDelete = false; }}
          >
            Annuler
          </button>
          <button
            type="button"
            class="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
            onclick={() => { confirmProjectDelete = false; handleDelete(); }}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
