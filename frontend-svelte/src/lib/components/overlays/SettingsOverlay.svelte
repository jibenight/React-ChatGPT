<script lang="ts">
  import { onMount } from 'svelte';
  import { X, Moon, Sun, Lock, Globe, Bot, FolderKanban, Palette, Plus, Trash2, FolderOpen, Folder } from 'lucide-svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { appStore } from '$lib/stores/app.svelte';
  import { i18n } from '$lib/i18n';
  import * as tauri from '$lib/tauri';
  import type { ProviderName } from '$lib/types';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const theme = $derived(themeStore.theme);

  type Section = 'provider' | 'projects' | 'appearance' | 'lock';
  const validSections: Section[] = ['provider', 'projects', 'appearance', 'lock'];
  const initialSection = validSections.includes(appStore.settingsSection as Section)
    ? (appStore.settingsSection as Section)
    : 'provider';
  let activeSection = $state<Section>(initialSection);

  // Reset section hint after reading it
  $effect(() => {
    if (appStore.settingsSection) appStore.setSettingsSection('');
  });

  const navItems = $derived<{ id: Section; label: string; icon: any; color: string; tauriOnly?: boolean }[]>([
    { id: 'provider', label: i18n.t('aiProvider'), icon: Bot, color: 'text-teal-500' },
    { id: 'projects', label: i18n.t('projects'), icon: FolderKanban, color: 'text-violet-500' },
    { id: 'appearance', label: i18n.t('appearance'), icon: Palette, color: 'text-amber-400' },
    { id: 'lock', label: i18n.t('lockScreenHeader'), icon: Lock, color: 'text-gray-400', tauriOnly: true },
  ]);

  // ── Provider ──
  const providerModels = $derived<{ provider: ProviderName; label: string; short: string; models: { id: string; name: string; desc?: string }[] }[]>([
    { provider: 'openai', label: 'OpenAI', short: 'OAI', models: [
      { id: 'gpt-4o', name: 'GPT-4o', desc: i18n.t('modelRecommended') },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: i18n.t('modelEconomical') },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', desc: i18n.t('modelFast') },
    ]},
    { provider: 'gemini', label: 'Gemini', short: 'GEM', models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: i18n.t('modelRecommended') },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: i18n.t('modelFast') },
    ]},
    { provider: 'claude', label: 'Claude', short: 'CLD', models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', desc: i18n.t('modelRecommended') },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', desc: i18n.t('modelFast') },
    ]},
    { provider: 'mistral', label: 'Mistral', short: 'MST', models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', desc: i18n.t('modelRecommended') },
      { id: 'mistral-small-latest', name: 'Mistral Small' },
      { id: 'open-mistral-nemo', name: 'Mistral Nemo', desc: i18n.t('modelOpenSource') },
    ]},
    { provider: 'groq', label: 'Groq', short: 'GRQ', models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', desc: i18n.t('modelRecommended') },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    ]},
  ]);

  let selectedProvider = $state<ProviderName>(appStore.selectedOption?.provider || 'openai');
  let selectedModel = $state(appStore.selectedOption?.model || 'gpt-4o');
  let currentModels = $derived(providerModels.find(p => p.provider === selectedProvider)?.models || []);
  let currentLabel = $derived(providerModels.find(p => p.provider === selectedProvider)?.label || '');

  function selectProvider(provider: ProviderName) {
    selectedProvider = provider;
    const models = providerModels.find(p => p.provider === provider)?.models || [];
    selectedModel = models[0]?.id || '';
    applyProvider();
  }

  function selectModel(model: string) {
    selectedModel = model;
    applyProvider();
  }

  function applyProvider() {
    const modelName = currentModels.find(m => m.id === selectedModel)?.name || selectedModel;
    appStore.setSelectedOption({ provider: selectedProvider, model: selectedModel, name: `${currentLabel} – ${modelName}` });
  }

  // ── Projects ──
  let projects = $state<any[]>([]);
  let loadingProjects = $state(false);
  let selectedProjectForEdit = $state<any>(null);
  let showNewProject = $state(false);
  let newProject = $state({ name: '', instructions: '', context_data: '' });
  let creatingProject = $state(false);
  let savingProject = $state(false);
  let confirmDeleteProject = $state<{ open: boolean; id: number | null }>({ open: false, id: null });

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

  onMount(() => { fetchProjects(); });

  function selectProjectForEdit(project: any) {
    selectedProjectForEdit = { ...project };
    showNewProject = false;
  }

  function startNewProject() {
    showNewProject = true;
    selectedProjectForEdit = null;
    newProject = { name: '', instructions: '', context_data: '' };
  }

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
      await fetchProjects();
      if (project?.id) {
        appStore.setSelectedProjectId(project.id);
        selectProjectForEdit(project);
      }
    } catch (err) {
      console.error(err);
    } finally {
      creatingProject = false;
    }
  }

  async function handleSaveProject() {
    if (!selectedProjectForEdit?.id || savingProject) return;
    savingProject = true;
    try {
      await tauri.updateProject(selectedProjectForEdit.id, {
        name: selectedProjectForEdit.name,
        instructions: selectedProjectForEdit.instructions,
        context_data: selectedProjectForEdit.context_data,
      });
      await fetchProjects();
    } catch (err) {
      console.error(err);
    } finally {
      savingProject = false;
    }
  }

  async function handleDeleteProject(id: number) {
    try {
      await tauri.deleteProject(id);
      if (appStore.selectedProjectId === id) {
        appStore.setSelectedProjectId(null);
      }
      if (selectedProjectForEdit?.id === id) {
        selectedProjectForEdit = null;
      }
      await fetchProjects();
    } catch (err) {
      console.error(err);
    }
  }

  // ── Lock ──
  async function handleLock() {
    if (!isTauri) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('lock_screen');
    } catch (err) {
      console.error(err);
    }
  }
</script>

<div class="flex h-full overflow-hidden">
  <!-- ── Navigation gauche ── -->
  <nav
    class="flex w-52 shrink-0 flex-col border-r border-gray-100 bg-gray-50/80 px-3 py-5 dark:border-white/[0.06] dark:bg-slate-900/60"
    aria-label={i18n.t('navSettings')}
  >
    <div class="mb-5 px-2">
      <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground">{i18n.t('settings')}</p>
      <h2 class="mt-0.5 text-base font-semibold text-gray-900 dark:text-foreground">{i18n.t('settings')}</h2>
    </div>

    <ul class="flex flex-col gap-0.5">
      {#each navItems as item}
        {#if !item.tauriOnly || isTauri}
          <li>
            <button
              type="button"
              onclick={() => (activeSection = item.id)}
              class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors {activeSection === item.id
                ? 'font-semibold text-teal-700 bg-teal-500/10 dark:text-teal-300 dark:bg-teal-500/15'
                : 'font-medium text-gray-600 hover:bg-gray-200/70 hover:text-gray-900 dark:text-muted-foreground dark:hover:bg-white/[0.06] dark:hover:text-foreground'}"
              aria-current={activeSection === item.id ? 'page' : undefined}
            >
              <item.icon class="h-4 w-4 shrink-0 {activeSection === item.id ? 'text-teal-500' : item.color}" />
              {item.label}
            </button>
          </li>
        {/if}
      {/each}
    </ul>

    <div class="mt-auto pt-4">
      <button
        type="button"
        onclick={onClose}
        class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-200/70 hover:text-gray-900 dark:text-muted-foreground dark:hover:bg-white/[0.06]"
        aria-label={i18n.t('close')}
      >
        <X class="h-4 w-4" />
        {i18n.t('close')}
      </button>
    </div>
  </nav>

  <!-- ── Contenu droite ── -->
  <div class="flex flex-1 flex-col overflow-y-auto">

    <!-- ═══ Fournisseur IA ═══ -->
    {#if activeSection === 'provider'}
      <section class="flex-1 px-8 py-8" aria-labelledby="section-provider">
        <header class="mb-6">
          <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground">{i18n.t('aiProvider')}</p>
          <h3 id="section-provider" class="mt-1 text-xl font-semibold text-gray-900 dark:text-foreground">{i18n.t('aiProvider')}</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-muted-foreground">{i18n.t('chooseProviderAndModel')}</p>
        </header>

        <!-- Provider pills -->
        <div class="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card/60">
          <p class="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-muted-foreground">{i18n.t('currentProvider')}</p>
          <div class="grid grid-cols-5 gap-2" role="radiogroup" aria-label={i18n.t('aiProvider')}>
            {#each providerModels as p}
              <button
                type="button"
                role="radio"
                aria-checked={selectedProvider === p.provider}
                onclick={() => selectProvider(p.provider)}
                class="flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-center transition {selectedProvider === p.provider
                  ? 'border-2 border-teal-400 bg-teal-50 dark:border-teal-500 dark:bg-teal-500/10'
                  : 'border border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 dark:border-border dark:bg-card dark:hover:bg-muted'}"
              >
                <div class="flex h-8 w-8 items-center justify-center rounded-lg {selectedProvider === p.provider
                  ? 'bg-teal-500/15 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300'
                  : 'bg-gray-200 text-gray-500 dark:bg-muted dark:text-muted-foreground'}">
                  <span class="text-[10px] font-bold">{p.short}</span>
                </div>
                <span class="text-xs {selectedProvider === p.provider
                  ? 'font-semibold text-teal-700 dark:text-teal-300'
                  : 'font-medium text-gray-600 dark:text-muted-foreground'}">{p.label}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Model cards -->
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card/60">
          <p class="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-muted-foreground">{i18n.t('selectedModel')}</p>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={i18n.t('selectedModel')}>
            {#each currentModels as m}
              <button
                type="button"
                role="radio"
                aria-checked={selectedModel === m.id}
                onclick={() => selectModel(m.id)}
                class="rounded-xl px-4 py-3 text-left transition {selectedModel === m.id
                  ? 'border-2 border-teal-400 bg-teal-50 dark:border-teal-500 dark:bg-teal-500/10'
                  : 'border border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 dark:border-border dark:bg-card dark:hover:bg-muted'}"
              >
                <p class="text-sm {selectedModel === m.id ? 'font-semibold text-teal-700 dark:text-teal-300' : 'font-medium text-gray-700 dark:text-foreground'}">{m.name}</p>
                {#if m.desc}
                  <p class="mt-0.5 text-xs {selectedModel === m.id ? 'text-teal-600/70 dark:text-teal-400/70' : 'text-gray-400 dark:text-muted-foreground'}">{m.desc}</p>
                {/if}
              </button>
            {/each}
          </div>

          <div class="mt-4 flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-2.5 dark:border-teal-500/20 dark:bg-teal-500/8">
            <span class="h-2 w-2 rounded-full bg-teal-500"></span>
            <p class="text-xs text-teal-700 dark:text-teal-300">
              {i18n.t('selectedModel')} : <span class="font-semibold">{currentLabel} – {currentModels.find(m => m.id === selectedModel)?.name || selectedModel}</span>
            </p>
          </div>
        </div>
      </section>
    {/if}

    <!-- ═══ Projets ═══ -->
    {#if activeSection === 'projects'}
      <section class="flex-1 px-8 py-8" aria-labelledby="section-projects">
        <header class="mb-6 flex items-start justify-between">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground">{i18n.t('projectManagement')}</p>
            <h3 id="section-projects" class="mt-1 text-xl font-semibold text-gray-900 dark:text-foreground">{i18n.t('projects')}</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-muted-foreground">{i18n.t('manageProjectContext')}</p>
          </div>
          <div class="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm dark:border-border dark:bg-card/60">
            <span class="text-sm font-medium text-gray-700 dark:text-foreground">{i18n.t('projectMode')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={appStore.projectMode}
              aria-label={i18n.t('projectMode')}
              onclick={() => appStore.setProjectMode(!appStore.projectMode)}
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400/30 {appStore.projectMode ? 'bg-teal-500' : 'bg-gray-200 dark:bg-border'}"
            >
              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform {appStore.projectMode ? 'translate-x-6' : 'translate-x-1'}"></span>
            </button>
          </div>
        </header>

        <!-- Master-detail -->
        <div class="grid grid-cols-[1fr_1.5fr] gap-5 items-start">
          <!-- Liste projets -->
          <div class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-border dark:bg-card/60">
            <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-border">
              <p class="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-muted-foreground">{i18n.t('projects')}</p>
              <button
                type="button"
                onclick={startNewProject}
                class="flex h-7 w-7 items-center justify-center rounded-lg text-teal-600 transition hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-500/10"
                aria-label={i18n.t('newProject')}
              >
                <Plus class="h-4 w-4" />
              </button>
            </div>
            <ul class="max-h-80 overflow-y-auto py-1">
              {#if loadingProjects}
                {#each Array(3) as _}
                  <li class="px-4 py-2.5"><div class="h-5 animate-pulse rounded bg-gray-200 dark:bg-muted"></div></li>
                {/each}
              {:else if projects.length === 0}
                <li class="px-4 py-8 text-center">
                  <p class="text-sm text-gray-400 dark:text-muted-foreground">{i18n.t('noProjectsYet')}</p>
                  <p class="mt-1 text-xs text-gray-400 dark:text-muted-foreground">{i18n.t('createProject')}</p>
                </li>
              {:else}
                {#each projects as project (project.id)}
                  <li class="group flex items-center px-4 py-2.5 transition {selectedProjectForEdit?.id === project.id
                    ? 'bg-teal-500/10 border-l-2 border-teal-500 dark:bg-teal-500/15 dark:border-teal-400'
                    : 'border-l-2 border-transparent hover:bg-gray-50 dark:hover:bg-muted/50'}">
                    <button
                      type="button"
                      onclick={() => selectProjectForEdit(project)}
                      class="flex flex-1 items-center gap-3 text-left"
                    >
                      {#if selectedProjectForEdit?.id === project.id}
                        <FolderOpen class="h-4 w-4 shrink-0 text-teal-500" />
                      {:else}
                        <Folder class="h-4 w-4 shrink-0 text-gray-400" />
                      {/if}
                      <span class="flex-1 truncate text-sm {selectedProjectForEdit?.id === project.id
                        ? 'font-semibold text-teal-700 dark:text-teal-300'
                        : 'font-medium text-gray-700 dark:text-foreground'}">{project.name}</span>
                    </button>
                    <button
                      type="button"
                      onclick={() => (confirmDeleteProject = { open: true, id: project.id })}
                      class="ml-2 shrink-0 rounded-md p-1 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      aria-label={i18n.t('deleteProject')}
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </li>
                {/each}
              {/if}
            </ul>
          </div>

          <!-- Formulaire détail / création -->
          <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card/60">
            {#if showNewProject}
              <div class="mb-4 flex items-center justify-between">
                <h4 class="text-sm font-semibold text-gray-800 dark:text-foreground">{i18n.t('newProject')}</h4>
                <span class="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">{i18n.t('createProject')}</span>
              </div>
              <div class="space-y-4">
                <div>
                  <label for="new-project-name" class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-muted-foreground">{i18n.t('projectName')} <span class="text-red-400">*</span></label>
                  <input id="new-project-name" type="text" bind:value={newProject.name} placeholder={i18n.t('projectNameExample')} class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30" />
                </div>
                <div>
                  <label for="new-project-instructions" class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-muted-foreground">{i18n.t('instructionsOptional')}</label>
                  <textarea id="new-project-instructions" rows="4" bind:value={newProject.instructions} placeholder={i18n.t('instructionsExample')} class="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"></textarea>
                </div>
                <div>
                  <label for="new-project-context" class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-muted-foreground">{i18n.t('contextData')}</label>
                  <textarea id="new-project-context" rows="3" bind:value={newProject.context_data} placeholder={i18n.t('contextDataExample')} class="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"></textarea>
                </div>
                <div class="flex gap-2 pt-1">
                  <button type="button" onclick={handleCreateProject} disabled={!newProject.name.trim() || creatingProject} class="flex-1 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60">{creatingProject ? i18n.t('saving') : i18n.t('createProject')}</button>
                  <button type="button" onclick={() => (showNewProject = false)} class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted">{i18n.t('cancel')}</button>
                </div>
              </div>
            {:else if selectedProjectForEdit}
              <div class="mb-4 flex items-center justify-between">
                <h4 class="text-sm font-semibold text-gray-800 dark:text-foreground">{i18n.t('editProject')}</h4>
                <span class="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">{i18n.t('edit')}</span>
              </div>
              <div class="space-y-4">
                <div>
                  <label for="edit-project-name" class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-muted-foreground">{i18n.t('projectName')} <span class="text-red-400">*</span></label>
                  <input id="edit-project-name" type="text" bind:value={selectedProjectForEdit.name} class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30" />
                </div>
                <div>
                  <label for="edit-project-instructions" class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-muted-foreground">{i18n.t('instructionsOptional')}</label>
                  <textarea id="edit-project-instructions" rows="4" bind:value={selectedProjectForEdit.instructions} placeholder={i18n.t('instructionsPlaceholder')} class="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"></textarea>
                </div>
                <div>
                  <label for="edit-project-context" class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-muted-foreground">{i18n.t('contextData')}</label>
                  <textarea id="edit-project-context" rows="3" bind:value={selectedProjectForEdit.context_data} placeholder={i18n.t('contextDataPlaceholder')} class="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"></textarea>
                </div>
                <div class="flex gap-2 pt-1">
                  <button type="button" onclick={handleSaveProject} disabled={savingProject} class="flex-1 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60">{savingProject ? i18n.t('saving') : i18n.t('save')}</button>
                  <button type="button" onclick={() => (selectedProjectForEdit = null)} class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted">{i18n.t('close')}</button>
                </div>
              </div>
            {:else}
              <div class="flex h-full items-center justify-center py-16 text-center">
                <div>
                  <FolderKanban class="mx-auto h-10 w-10 text-gray-300 dark:text-muted-foreground" />
                  <p class="mt-3 text-sm font-medium text-gray-500 dark:text-muted-foreground">{i18n.t('noProjectsYet')}</p>
                </div>
              </div>
            {/if}
          </div>
        </div>
      </section>
    {/if}

    <!-- ═══ Apparence ═══ -->
    {#if activeSection === 'appearance'}
      <section class="flex-1 px-8 py-8" aria-labelledby="section-appearance">
        <header class="mb-6">
          <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground">{i18n.t('appearance')}</p>
          <h3 id="section-appearance" class="mt-1 text-xl font-semibold text-gray-900 dark:text-foreground">{i18n.t('appearance')}</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-muted-foreground">{i18n.t('customizeTheme')}</p>
        </header>

        <!-- Thème -->
        <div class="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card/60">
          <p class="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-muted-foreground">{i18n.t('customizeTheme')}</p>
          <div class="grid grid-cols-2 gap-3" role="radiogroup" aria-label={i18n.t('appearance')}>
            <!-- Clair -->
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'light'}
              onclick={() => { if (theme === 'dark') themeStore.toggleTheme(); }}
              class="group relative overflow-hidden rounded-2xl transition focus:outline-none focus:ring-2 focus:ring-teal-400/40 {theme === 'light' ? 'border-2 border-teal-400' : 'border border-gray-200 hover:border-gray-300 dark:border-border dark:hover:border-border'}"
            >
              <div class="bg-gray-100 p-3">
                <div class="rounded-lg bg-white p-2 shadow-sm">
                  <div class="mb-1.5 h-2 w-3/4 rounded bg-gray-200"></div>
                  <div class="h-2 w-1/2 rounded bg-gray-200"></div>
                </div>
              </div>
              <div class="border-t px-3 py-2 {theme === 'light' ? 'border-teal-100 bg-teal-50 dark:border-teal-500/20 dark:bg-teal-500/10' : 'border-gray-200 bg-gray-50 dark:border-border dark:bg-card'}">
                <div class="flex items-center gap-1.5">
                  <Sun class="h-3.5 w-3.5 {theme === 'light' ? 'text-teal-600 dark:text-teal-400' : 'text-amber-400'}" />
                  <span class="text-xs {theme === 'light' ? 'font-semibold text-teal-700 dark:text-teal-300' : 'font-medium text-gray-600 dark:text-foreground'}">{i18n.t('lightTheme')}</span>
                </div>
              </div>
            </button>
            <!-- Sombre -->
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'dark'}
              onclick={() => { if (theme === 'light') themeStore.toggleTheme(); }}
              class="group relative overflow-hidden rounded-2xl transition focus:outline-none focus:ring-2 focus:ring-teal-400/40 {theme === 'dark' ? 'border-2 border-teal-400' : 'border border-gray-200 hover:border-gray-300 dark:border-border dark:hover:border-border'}"
            >
              <div class="bg-slate-900 p-3">
                <div class="rounded-lg bg-slate-800 p-2 shadow-sm">
                  <div class="mb-1.5 h-2 w-3/4 rounded bg-slate-700"></div>
                  <div class="h-2 w-1/2 rounded bg-slate-700"></div>
                </div>
              </div>
              <div class="border-t px-3 py-2 {theme === 'dark' ? 'border-teal-100 bg-teal-50 dark:border-teal-500/20 dark:bg-teal-500/10' : 'border-gray-200 bg-gray-50 dark:border-border dark:bg-card'}">
                <div class="flex items-center gap-1.5">
                  <Moon class="h-3.5 w-3.5 {theme === 'dark' ? 'text-teal-600 dark:text-teal-400' : 'text-indigo-400'}" />
                  <span class="text-xs {theme === 'dark' ? 'font-semibold text-teal-700 dark:text-teal-300' : 'font-medium text-gray-600 dark:text-foreground'}">{i18n.t('darkTheme')}</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Langue -->
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card/60">
          <div class="flex items-center gap-3 mb-4">
            <Globe class="h-5 w-5 text-blue-400" />
            <div>
              <p class="text-sm font-semibold text-gray-800 dark:text-foreground">{i18n.t('language')}</p>
              <p class="text-xs text-gray-500 dark:text-muted-foreground">{i18n.t('languageName')}</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            {#each [
              { code: 'fr', label: 'FR' },
              { code: 'en', label: 'EN' },
              { code: 'es', label: 'ES' },
              { code: 'de', label: 'DE' },
              { code: 'pt', label: 'PT' },
              { code: 'ja', label: 'JA' },
              { code: 'ko', label: 'KO' },
            ] as lang}
              <button
                class="rounded-full border px-3 py-1.5 text-xs font-semibold transition {i18n.lang === lang.code ? 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200' : 'border-gray-200 bg-gray-100 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:text-foreground'}"
                type="button"
                onclick={() => i18n.setLang(lang.code)}
              >{lang.label}</button>
            {/each}
          </div>
        </div>
      </section>
    {/if}

    <!-- ═══ Verrouillage ═══ -->
    {#if activeSection === 'lock' && isTauri}
      <section class="flex-1 px-8 py-8" aria-labelledby="section-lock">
        <header class="mb-6">
          <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground">{i18n.t('security')}</p>
          <h3 id="section-lock" class="mt-1 text-xl font-semibold text-gray-900 dark:text-foreground">{i18n.t('lockScreenHeader')}</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-muted-foreground">{i18n.t('lockScreenSubtitle')}</p>
        </header>
        <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-muted">
                <Lock class="h-5 w-5 text-gray-500 dark:text-muted-foreground" />
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-800 dark:text-foreground">{i18n.t('lockScreen')}</p>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-muted-foreground">{i18n.t('lockScreenDesc')}</p>
              </div>
            </div>
            <button
              type="button"
              onclick={handleLock}
              class="rounded-xl border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted"
            >
              {i18n.t('lock')}
            </button>
          </div>
        </div>
      </section>
    {/if}
  </div>
</div>

<!-- Delete project confirmation -->
{#if confirmDeleteProject.open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
    <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-card dark:shadow-none">
      <h4 class="text-base font-semibold text-gray-900 dark:text-foreground">{i18n.t('deleteProject')}</h4>
      <p class="mt-2 text-sm text-gray-600 dark:text-muted-foreground">{i18n.t('confirmDeleteProjectDetails')}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button type="button" onclick={() => (confirmDeleteProject = { open: false, id: null })} class="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted">{i18n.t('cancel')}</button>
        <button type="button" onclick={() => { const id = confirmDeleteProject.id; confirmDeleteProject = { open: false, id: null }; if (id) handleDeleteProject(id); }} class="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">{i18n.t('delete')}</button>
      </div>
    </div>
  </div>
{/if}
