<script lang="ts">
  import { X, MessageSquare, Key, FolderOpen, Settings, Zap } from 'lucide-svelte';
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
  <div class="mx-auto max-w-4xl px-4 py-10">
    <!-- Header -->
    <div class="mb-8 flex items-start justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground">Documentation</p>
        <h1 class="text-3xl font-semibold text-gray-900 dark:text-foreground">Guide d'utilisation</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-muted-foreground">
          Bienvenue dans l'assistant IA multi-fournisseur.
        </p>
      </div>
      <a
        href="/"
        class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-100 dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted"
      >
        <X class="h-3.5 w-3.5" />
        Fermer
      </a>
    </div>

    <div class="space-y-6 text-sm text-gray-600 dark:text-muted-foreground">
      <!-- Getting started -->
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-500/10">
            <Zap class="h-5 w-5 text-teal-500" />
          </div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-foreground">Demarrage rapide</h2>
        </div>
        <ol class="mt-4 space-y-3 pl-2">
          <li class="flex gap-3">
            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">1</span>
            <span>Ajoutez au moins une cle API dans votre profil (icone utilisateur en bas de la barre laterale).</span>
          </li>
          <li class="flex gap-3">
            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">2</span>
            <span>Selectionnez un fournisseur et un modele via le selecteur en haut de la zone de chat.</span>
          </li>
          <li class="flex gap-3">
            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">3</span>
            <span>Tapez votre message et appuyez sur Entree ou sur le bouton d'envoi.</span>
          </li>
        </ol>
      </section>

      <!-- Chat -->
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
            <MessageSquare class="h-5 w-5 text-blue-500" />
          </div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-foreground">Conversations</h2>
        </div>
        <ul class="mt-4 space-y-2 pl-2">
          <li>• Les conversations sont automatiquement sauvegardees dans la barre laterale gauche.</li>
          <li>• Cliquez sur une conversation existante pour la reprendre.</li>
          <li>• Le bouton <span class="font-semibold text-gray-800 dark:text-foreground">Nouvelle conversation</span> cree un nouveau fil de discussion.</li>
          <li>• Vous pouvez renommer ou supprimer une conversation via le menu contextuel.</li>
        </ul>
      </section>

      <!-- API Keys -->
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
            <Key class="h-5 w-5 text-amber-500" />
          </div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-foreground">Cles API</h2>
        </div>
        <ul class="mt-4 space-y-2 pl-2">
          <li>• Fournisseurs supportes : <span class="font-semibold text-gray-800 dark:text-foreground">OpenAI, Gemini, Claude, Mistral, Groq</span>.</li>
          <li>• Vos cles sont chiffrees avant d'etre stockees.</li>
          <li>• Vous pouvez les supprimer a tout moment depuis la zone de danger du profil.</li>
          <li>• Un indicateur vert confirme qu'une cle est bien enregistree pour chaque fournisseur.</li>
        </ul>
      </section>

      <!-- Projects -->
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-500/10">
            <FolderOpen class="h-5 w-5 text-purple-500" />
          </div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-foreground">Projets</h2>
        </div>
        <ul class="mt-4 space-y-2 pl-2">
          <li>• Un projet regroupe des instructions systeme et des donnees de contexte transmises a l'IA.</li>
          <li>• Activez le mode projet via le bouton de bascule dans la barre laterale.</li>
          <li>• Selectionnez le projet a utiliser dans la liste deroulante de la barre laterale.</li>
          <li>• Gerez vos projets depuis la page <span class="font-semibold text-gray-800 dark:text-foreground">Projets</span>.</li>
        </ul>
      </section>

      <!-- Settings -->
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-muted">
            <Settings class="h-5 w-5 text-gray-500 dark:text-muted-foreground" />
          </div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-foreground">Parametres</h2>
        </div>
        <ul class="mt-4 space-y-2 pl-2">
          <li>• Basculez entre le theme clair et sombre depuis les parametres (icone engrenage).</li>
          <li>• Sur l'application de bureau (Tauri), vous pouvez verrouiller l'ecran avec votre biometrie.</li>
        </ul>
      </section>
    </div>
  </div>
</div>
