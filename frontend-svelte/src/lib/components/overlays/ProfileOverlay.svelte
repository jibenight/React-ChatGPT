<script lang="ts">
  import { onDestroy } from 'svelte';
  import { X, User, KeyRound, ShieldAlert } from 'lucide-svelte';
  import * as tauri from '$lib/tauri';
  import { userStore } from '$lib/stores/user.svelte';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  type ActionMessage = { type: 'success' | 'error'; text: string } | null;
  type Section = 'account' | 'apikeys' | 'danger';

  let activeSection = $state<Section>('account');
  let isSaving = $state(false);
  let isDeleting = $state(false);
  let actionMessage = $state<ActionMessage>(null);
  let actionMessageTimer: ReturnType<typeof setTimeout> | null = null;

  let apiStatus = $state({
    openai: false,
    gemini: false,
    claude: false,
    mistral: false,
    groq: false,
  });

  let confirmDelete = $state<{ open: boolean; provider: string | null }>({
    open: false,
    provider: null,
  });

  // Form fields
  let usernameInput = $state('');
  let openaiKey = $state('');
  let geminiKey = $state('');
  let claudeKey = $state('');
  let mistralKey = $state('');
  let groqKey = $state('');

  const apiProviders = [
    { key: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
    { key: 'gemini', label: 'Gemini', placeholder: 'AIza...' },
    { key: 'claude', label: 'Claude', placeholder: 'sk-ant-...' },
    { key: 'mistral', label: 'Mistral', placeholder: 'mistral-...' },
    { key: 'groq', label: 'Groq', placeholder: 'gsk_...' },
  ];

  const navItems: { id: Section; label: string; icon: any; color: string }[] = [
    { id: 'account', label: 'Compte', icon: User, color: 'text-teal-500' },
    { id: 'apikeys', label: 'Clés API', icon: KeyRound, color: 'text-violet-500' },
    { id: 'danger', label: 'Zone de danger', icon: ShieldAlert, color: 'text-red-400' },
  ];

  const userData = $derived(userStore.userData);
  const displayName = $derived(userData?.username || 'Utilisateur');
  const displayEmail = $derived(userData?.email || '—');
  const initials = $derived(
    (displayName || 'U')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join(''),
  );

  let enabledCount = $derived(Object.values(apiStatus).filter(Boolean).length);

  function showActionMessage(msg: ActionMessage) {
    if (actionMessageTimer) clearTimeout(actionMessageTimer);
    actionMessage = msg;
    actionMessageTimer = setTimeout(() => { actionMessage = null; }, 3500);
  }

  onDestroy(() => {
    if (actionMessageTimer) clearTimeout(actionMessageTimer);
  });

  async function fetchApiKeys() {
    try {
      const result = await tauri.listApiKeys();
      const providers = result?.providers || [];
      const next = { openai: false, gemini: false, claude: false, mistral: false, groq: false };
      providers.forEach((p: string) => {
        if (Object.prototype.hasOwnProperty.call(next, p)) {
          (next as any)[p] = true;
        }
      });
      apiStatus = next;
    } catch (err) {
      console.error(err);
    }
  }

  $effect(() => {
    void userData?.username;
    fetchApiKeys();
  });

  function getKeyValue(key: string) {
    const map: Record<string, string> = { openai: openaiKey, gemini: geminiKey, claude: claudeKey, mistral: mistralKey, groq: groqKey };
    return map[key] || '';
  }

  function setKeyValue(key: string, value: string) {
    if (key === 'openai') openaiKey = value;
    else if (key === 'gemini') geminiKey = value;
    else if (key === 'claude') claudeKey = value;
    else if (key === 'mistral') mistralKey = value;
    else if (key === 'groq') groqKey = value;
  }

  async function handleSaveUsername() {
    const trimmed = usernameInput.trim();
    if (!trimmed || isSaving) return;
    isSaving = true;
    try {
      await tauri.updateUsername(trimmed);
      userStore.setUserData({ ...userData, username: trimmed });
      usernameInput = '';
      showActionMessage({ type: 'success', text: 'Nom d\'utilisateur mis à jour.' });
    } catch (err) {
      console.error(err);
      showActionMessage({ type: 'error', text: 'Impossible de mettre à jour le profil.' });
    } finally {
      isSaving = false;
    }
  }

  async function handleSaveApiKey(provider: string) {
    const value = getKeyValue(provider).trim();
    if (!value || isSaving) return;
    isSaving = true;
    try {
      await tauri.saveApiKey(provider, value);
      setKeyValue(provider, '');
      apiStatus = { ...apiStatus, [provider]: true };
      showActionMessage({ type: 'success', text: `Clé ${provider.toUpperCase()} enregistrée.` });
    } catch (err) {
      console.error(err);
      showActionMessage({ type: 'error', text: 'Impossible d\'enregistrer la clé API.' });
    } finally {
      isSaving = false;
    }
  }

  async function handleDeleteApiKey(provider: string) {
    isDeleting = true;
    try {
      await tauri.deleteApiKey(provider);
      apiStatus = { ...apiStatus, [provider]: false };
      showActionMessage({ type: 'success', text: `Clé ${provider.toUpperCase()} supprimée.` });
    } catch (err) {
      console.error(err);
      showActionMessage({ type: 'error', text: `Impossible de supprimer la clé ${provider.toUpperCase()}.` });
    } finally {
      isDeleting = false;
    }
  }

  function openDeleteConfirm(provider: string) {
    confirmDelete = { open: true, provider };
  }

  function closeDeleteConfirm() {
    confirmDelete = { open: false, provider: null };
  }

  async function confirmDeleteKey() {
    const provider = confirmDelete.provider;
    closeDeleteConfirm();
    if (provider) await handleDeleteApiKey(provider);
  }
</script>

<div class="flex h-full overflow-hidden">
  <!-- ── Navigation gauche ── -->
  <nav
    class="flex w-52 shrink-0 flex-col border-r border-gray-100 bg-gray-50/80 px-3 py-5 dark:border-white/[0.06] dark:bg-slate-900/60"
    aria-label="Navigation du profil"
  >
    <!-- Profile card mini -->
    <div class="mb-5 flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm dark:bg-card">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-sm font-semibold text-white">
        {initials || 'U'}
      </div>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-gray-900 dark:text-foreground">{displayName}</p>
        <p class="truncate text-xs text-gray-500 dark:text-muted-foreground">{displayEmail}</p>
      </div>
    </div>

    <ul class="flex flex-col gap-0.5">
      {#each navItems as item}
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
            {#if item.id === 'apikeys'}
              <span class="ml-auto rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-muted dark:text-muted-foreground">{enabledCount}/5</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>

    <div class="mt-auto pt-4">
      <button
        type="button"
        onclick={onClose}
        class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-200/70 hover:text-gray-900 dark:text-muted-foreground dark:hover:bg-white/[0.06]"
        aria-label="Fermer le profil"
      >
        <X class="h-4 w-4" />
        Fermer
      </button>
    </div>
  </nav>

  <!-- ── Contenu droite ── -->
  <div class="flex flex-1 flex-col overflow-y-auto">

    <!-- Action message -->
    {#if actionMessage}
      <div class="mx-8 mt-4 rounded-xl border px-4 py-3 text-sm {actionMessage.type === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'}">
        {actionMessage.text}
      </div>
    {/if}

    <!-- ═══ Compte ═══ -->
    {#if activeSection === 'account'}
      <section class="flex-1 px-8 py-8" aria-labelledby="section-account">
        <header class="mb-6">
          <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground">Informations</p>
          <h3 id="section-account" class="mt-1 text-xl font-semibold text-gray-900 dark:text-foreground">Compte</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-muted-foreground">Gérez vos informations personnelles.</p>
        </header>

        <!-- Profile card -->
        <div class="mb-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60">
          <div class="flex items-center gap-5">
            <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-xl font-semibold text-white shadow">
              {initials || 'U'}
            </div>
            <div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-foreground">{displayName}</h4>
              <p class="text-sm text-gray-500 dark:text-muted-foreground">{displayEmail}</p>
            </div>
          </div>
        </div>

        <!-- Edit username -->
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card/60">
          <h4 class="mb-4 text-sm font-semibold text-gray-800 dark:text-foreground">Modifier le nom d'utilisateur</h4>
          <div class="flex gap-3">
            <input
              type="text"
              bind:value={usernameInput}
              placeholder="Nouveau nom d'utilisateur"
              class="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"
            />
            <button
              type="button"
              onclick={handleSaveUsername}
              disabled={!usernameInput.trim() || isSaving}
              class="rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        <!-- API Status overview -->
        <div class="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card/60">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-sm font-semibold text-gray-800 dark:text-foreground">Statut des fournisseurs</h4>
            <span class="text-xs text-gray-400 dark:text-muted-foreground">{enabledCount} sur 5 configurés</span>
          </div>
          <div class="grid grid-cols-5 gap-2">
            {#each apiProviders as provider}
              {@const enabled = (apiStatus as any)[provider.key]}
              <div class="flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center {enabled
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                : 'border-gray-200 bg-gray-50 dark:border-border dark:bg-card'}">
                <span class="h-2.5 w-2.5 rounded-full {enabled ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-border'}"></span>
                <span class="text-xs font-medium {enabled ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-muted-foreground'}">{provider.label}</span>
              </div>
            {/each}
          </div>
          <div class="mt-4 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-2.5 text-xs text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200">
            Vos clés API sont chiffrées et stockées en base de données.
          </div>
        </div>
      </section>
    {/if}

    <!-- ═══ Clés API ═══ -->
    {#if activeSection === 'apikeys'}
      <section class="flex-1 px-8 py-8" aria-labelledby="section-apikeys">
        <header class="mb-6">
          <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground">Authentification</p>
          <h3 id="section-apikeys" class="mt-1 text-xl font-semibold text-gray-900 dark:text-foreground">Clés API</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-muted-foreground">Ajoutez vos clés pour accéder à chaque fournisseur IA.</p>
        </header>

        <div class="space-y-3">
          {#each apiProviders as provider}
            {@const enabled = (apiStatus as any)[provider.key]}
            <div class="rounded-2xl border bg-white p-5 shadow-sm transition dark:bg-card/60 {enabled
              ? 'border-emerald-200 dark:border-emerald-500/30'
              : 'border-gray-200 dark:border-border'}">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <span class="h-2.5 w-2.5 rounded-full {enabled ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-border'}"></span>
                  <h4 class="text-sm font-semibold text-gray-800 dark:text-foreground">{provider.label}</h4>
                </div>
                <span class="text-xs font-medium {enabled ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-400 dark:text-muted-foreground'}">
                  {enabled ? 'Configurée' : 'Non renseignée'}
                </span>
              </div>
              <div class="flex gap-2">
                <input
                  id="{provider.key}-key"
                  value={getKeyValue(provider.key)}
                  oninput={(e) => setKeyValue(provider.key, (e.target as HTMLInputElement).value)}
                  type="password"
                  autocomplete="off"
                  placeholder={enabled ? '••••••••' : provider.placeholder}
                  class="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30"
                />
                <button
                  type="button"
                  onclick={() => handleSaveApiKey(provider.key)}
                  disabled={!getKeyValue(provider.key).trim() || isSaving}
                  class="rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {enabled ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ═══ Zone de danger ═══ -->
    {#if activeSection === 'danger'}
      <section class="flex-1 px-8 py-8" aria-labelledby="section-danger">
        <header class="mb-6">
          <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400 dark:text-red-300">Attention</p>
          <h3 id="section-danger" class="mt-1 text-xl font-semibold text-red-700 dark:text-red-300">Zone de danger</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-muted-foreground">Actions irréversibles sur vos clés API.</p>
        </header>

        <div class="rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-500/40 dark:bg-card/60">
          <p class="mb-5 text-sm text-gray-600 dark:text-muted-foreground">
            La suppression d'une clé est définitive. Vous devrez en saisir une nouvelle pour réutiliser le fournisseur.
          </p>
          <div class="space-y-3">
            {#each apiProviders as provider}
              {@const enabled = (apiStatus as any)[provider.key]}
              <div class="flex items-center justify-between rounded-xl border px-4 py-3 transition {enabled
                ? 'border-red-100 bg-red-50/50 dark:border-red-500/20 dark:bg-red-500/5'
                : 'border-gray-100 bg-gray-50 dark:border-border dark:bg-card/40'}">
                <div class="flex items-center gap-3">
                  <span class="h-2.5 w-2.5 rounded-full {enabled ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-border'}"></span>
                  <span class="text-sm font-medium text-gray-700 dark:text-foreground">{provider.label}</span>
                </div>
                <button
                  type="button"
                  onclick={() => openDeleteConfirm(provider.key)}
                  disabled={!enabled || isDeleting}
                  class="rounded-xl border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                >
                  Supprimer
                </button>
              </div>
            {/each}
          </div>
        </div>
      </section>
    {/if}
  </div>
</div>

<!-- Delete confirmation -->
{#if confirmDelete.open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title">
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-card dark:shadow-none">
      <h4 id="confirm-delete-title" class="text-lg font-semibold text-gray-900 dark:text-foreground">Supprimer la clé API</h4>
      <p class="mt-2 text-sm text-gray-600 dark:text-muted-foreground">
        Confirmer la suppression de la clé
        <span class="font-semibold">{confirmDelete.provider?.toUpperCase()}</span>.
        Cette action est irréversible.
      </p>
      <div class="mt-6 flex justify-end gap-3">
        <button type="button" onclick={closeDeleteConfirm} disabled={isDeleting} class="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted">Annuler</button>
        <button type="button" onclick={confirmDeleteKey} disabled={isDeleting} class="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{isDeleting ? 'Suppression...' : 'Supprimer'}</button>
      </div>
    </div>
  </div>
{/if}
