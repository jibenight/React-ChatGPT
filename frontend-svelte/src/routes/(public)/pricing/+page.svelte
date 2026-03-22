<script lang="ts">
  import { planStore } from '$lib/stores/plan.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { i18n } from '$lib/i18n';
  import type { TranslationKey } from '$lib/i18n';

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  interface PricingTier {
    key: 'free' | 'pro' | 'team';
    nameKey: TranslationKey;
    monthlyPrice: number;
    yearlyPrice: number;
    perUser: boolean;
    highlight: boolean;
    features: { key: TranslationKey; included: boolean }[];
  }

  const TIERS: PricingTier[] = [
    {
      key: 'free',
      nameKey: 'billingFree',
      monthlyPrice: 0,
      yearlyPrice: 0,
      perUser: false,
      highlight: false,
      features: [
        { key: 'billingFeatureMessages50PerDay', included: true },
        { key: 'billingFeatureProjects3', included: true },
        { key: 'billingFeatureThreads5', included: true },
        { key: 'billingFeatureGroqOnly', included: true },
        { key: 'billingFeatureAllProviders', included: false },
        { key: 'billingFeatureUnlimitedMessages', included: false },
        { key: 'billingFeatureUnlimitedProjects', included: false },
        { key: 'billingFeatureCollaboration', included: false },
      ],
    },
    {
      key: 'pro',
      nameKey: 'billingPro',
      monthlyPrice: 8,
      yearlyPrice: 6.4,
      perUser: false,
      highlight: true,
      features: [
        { key: 'billingFeatureMessages50PerDay', included: false },
        { key: 'billingFeatureProjects3', included: false },
        { key: 'billingFeatureThreads5', included: false },
        { key: 'billingFeatureGroqOnly', included: false },
        { key: 'billingFeatureAllProviders', included: true },
        { key: 'billingFeatureUnlimitedMessages', included: true },
        { key: 'billingFeatureUnlimitedProjects', included: true },
        { key: 'billingFeatureCollaboration', included: false },
      ],
    },
    {
      key: 'team',
      nameKey: 'billingTeam',
      monthlyPrice: 6,
      yearlyPrice: 4.8,
      perUser: true,
      highlight: false,
      features: [
        { key: 'billingFeatureMessages50PerDay', included: false },
        { key: 'billingFeatureProjects3', included: false },
        { key: 'billingFeatureThreads5', included: false },
        { key: 'billingFeatureGroqOnly', included: false },
        { key: 'billingFeatureAllProviders', included: true },
        { key: 'billingFeatureUnlimitedMessages', included: true },
        { key: 'billingFeatureUnlimitedProjects', included: true },
        { key: 'billingFeatureCollaboration', included: true },
      ],
    },
  ];

  let yearly = $state(false);
  let loadingPlan = $state<string | null>(null);
  let error = $state<string | null>(null);

  let currentPlanKey = $derived(planStore.planName);

  // Lien retour conditionnel selon l'état d'auth
  let backHref = $derived(authStore.isAuthenticated ? '/chat' : '/');

  async function handleSubscribe(tierKey: string) {
    if (isTauri || tierKey === 'free' || tierKey === currentPlanKey) return;
    loadingPlan = tierKey;
    error = null;
    try {
      const url = await planStore.createCheckoutSession(tierKey, yearly ? 'yearly' : 'monthly');
      if (url) window.location.href = url;
    } catch {
      error = i18n.t('billingCheckoutError');
    } finally {
      loadingPlan = null;
    }
  }

  function getPrice(tier: PricingTier) {
    return yearly ? tier.yearlyPrice : tier.monthlyPrice;
  }
</script>

<div class="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 dark:from-background dark:via-background dark:to-card">
  <div class="mx-auto max-w-5xl px-4 py-12">
    <!-- Retour -->
    <div class="mb-2">
      <a
        href={backHref}
        class="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:text-muted-foreground dark:hover:text-foreground"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        {i18n.t('previous')}
      </a>
    </div>

    <!-- En-tête -->
    <div class="mb-10 text-center">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-foreground">
        {i18n.t('billingPricing')}
      </h1>
      <p class="mt-3 text-gray-500 dark:text-muted-foreground">
        {i18n.t('billingPricingSubtitle')}
      </p>

      <!-- Toggle mensuel / annuel -->
      <div class="mt-6 inline-flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm dark:border-border dark:bg-card">
        <button
          type="button"
          onclick={() => { yearly = false; }}
          class="rounded-full px-3 py-1 transition {!yearly
            ? 'bg-teal-500 text-white font-semibold'
            : 'text-gray-600 hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground'}"
        >
          {i18n.t('billingMonthly')}
        </button>
        <button
          type="button"
          onclick={() => { yearly = true; }}
          class="rounded-full px-3 py-1 transition {yearly
            ? 'bg-teal-500 text-white font-semibold'
            : 'text-gray-600 hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground'}"
        >
          {i18n.t('billingYearly')}
          <span class="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
            -20%
          </span>
        </button>
      </div>
    </div>

    <!-- Erreur -->
    {#if error}
      <p class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
        {error}
      </p>
    {/if}

    <!-- Grille des plans -->
    <div class="grid gap-6 md:grid-cols-3">
      {#each TIERS as tier (tier.key)}
        {@const price = getPrice(tier)}
        {@const isCurrent = tier.key === currentPlanKey}
        {@const isLoading = loadingPlan === tier.key}

        <div
          class="relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition dark:bg-card dark:shadow-none {tier.highlight
            ? 'border-teal-300 ring-2 ring-teal-400/30 dark:border-teal-500/60'
            : 'border-gray-200 dark:border-border'}"
        >
          <!-- Barre décorative Pro -->
          {#if tier.highlight}
            <div class="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-linear-to-r from-teal-400 to-teal-500"></div>
          {/if}

          <!-- Badge populaire -->
          {#if tier.highlight}
            <div class="absolute -top-3 left-1/2 -translate-x-1/2">
              <span class="rounded-full bg-teal-500 px-3 py-1 text-[11px] font-bold text-white shadow">
                {i18n.t('billingPopular')}
              </span>
            </div>
          {/if}

          <div class="mb-4">
            <h2 class="text-lg font-bold text-gray-900 dark:text-foreground">
              {i18n.t(tier.nameKey)}
            </h2>
            <div class="mt-2 flex items-baseline gap-1">
              <span class="text-3xl font-extrabold text-gray-900 dark:text-foreground">
                {price === 0 ? i18n.t('billingFree') : `${price}€`}
              </span>
              {#if price > 0}
                <span class="text-sm text-gray-500 dark:text-muted-foreground">
                  /{i18n.t('billingPerMonth')}{tier.perUser ? `/${i18n.t('billingPerUser')}` : ''}
                </span>
              {/if}
            </div>
            {#if yearly && price > 0}
              <p class="mt-1 text-xs text-teal-600 dark:text-teal-400">
                {i18n.t('billingSavePercent')}
              </p>
            {/if}
          </div>

          <!-- Features -->
          <ul class="mb-6 flex-1 space-y-2">
            {#each tier.features as feat (feat.key)}
              <li class="flex items-start gap-2 text-sm">
                {#if feat.included}
                  <svg class="mt-0.5 h-4 w-4 shrink-0 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                {:else}
                  <svg class="mt-0.5 h-4 w-4 shrink-0 text-gray-300 dark:text-border" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                {/if}
                <span class="{feat.included ? 'text-gray-700 dark:text-foreground' : 'text-gray-400 dark:text-muted-foreground'}">
                  {i18n.t(feat.key)}
                </span>
              </li>
            {/each}
          </ul>

          <!-- CTA -->
          <button
            type="button"
            onclick={() => handleSubscribe(tier.key)}
            disabled={isCurrent || isLoading || isTauri}
            class="w-full rounded-full py-2.5 text-sm font-semibold transition {isCurrent
              ? 'cursor-default border border-gray-200 bg-gray-50 text-gray-400 dark:border-border dark:bg-muted dark:text-muted-foreground'
              : tier.highlight
              ? 'bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-60'
              : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted'}"
          >
            {#if isLoading}
              {i18n.t('loading')}
            {:else if isCurrent}
              {i18n.t('billingCurrentPlan')}
            {:else if tier.key === 'free'}
              {i18n.t('billingFree')}
            {:else}
              {i18n.t('billingSubscribe')}
            {/if}
          </button>
        </div>
      {/each}
    </div>
  </div>
</div>
