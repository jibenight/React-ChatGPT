<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import LegalLayout from '$lib/components/common/LegalLayout.svelte';
  import type { TranslationKey } from '$lib/i18n/i18n.svelte';

  type BadgeType = 'new' | 'fix' | 'improve';
  type ChangelogItem = { key: TranslationKey };
  type ChangelogVersion = {
    version: string;
    titleKey: TranslationKey;
    dateKey: TranslationKey;
    badge: BadgeType;
    items: ChangelogItem[];
  };

  const VERSIONS: ChangelogVersion[] = [
    {
      version: 'v1.4',
      titleKey: 'changelogV14Title',
      dateKey: 'changelogV14Date',
      badge: 'improve',
      items: [
        { key: 'changelogV14Item1' },
        { key: 'changelogV14Item2' },
        { key: 'changelogV14Item3' },
        { key: 'changelogV14Item4' },
      ],
    },
    {
      version: 'v1.3',
      titleKey: 'changelogV13Title',
      dateKey: 'changelogV13Date',
      badge: 'new',
      items: [
        { key: 'changelogV13Item1' },
        { key: 'changelogV13Item2' },
        { key: 'changelogV13Item3' },
        { key: 'changelogV13Item4' },
      ],
    },
    {
      version: 'v1.2',
      titleKey: 'changelogV12Title',
      dateKey: 'changelogV12Date',
      badge: 'new',
      items: [
        { key: 'changelogV12Item1' },
        { key: 'changelogV12Item2' },
        { key: 'changelogV12Item3' },
        { key: 'changelogV12Item4' },
      ],
    },
    {
      version: 'v1.1',
      titleKey: 'changelogV11Title',
      dateKey: 'changelogV11Date',
      badge: 'improve',
      items: [
        { key: 'changelogV11Item1' },
        { key: 'changelogV11Item2' },
        { key: 'changelogV11Item3' },
      ],
    },
    {
      version: 'v1.0',
      titleKey: 'changelogV10Title',
      dateKey: 'changelogV10Date',
      badge: 'new',
      items: [
        { key: 'changelogV10Item1' },
        { key: 'changelogV10Item2' },
        { key: 'changelogV10Item3' },
        { key: 'changelogV10Item4' },
        { key: 'changelogV10Item5' },
      ],
    },
  ];

  const BADGE_STYLES: Record<BadgeType, string> = {
    new: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
    fix: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    improve: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  };

  const BADGE_KEYS: Record<BadgeType, TranslationKey> = {
    new: 'changelogBadgeNew',
    fix: 'changelogBadgeFix',
    improve: 'changelogBadgeImprove',
  };
</script>

<svelte:head>
  <title>ChatBot AI — {i18n.t('changelogPageTitle')}</title>
</svelte:head>

<LegalLayout title={i18n.t('changelogPageTitle')}>
  <p class="text-sm text-gray-600 dark:text-gray-300">
    {i18n.t('changelogIntro')}
  </p>

  <!-- Timeline -->
  <div class="relative space-y-8">
    <!-- Ligne verticale -->
    <div class="absolute left-[22px] top-0 h-full w-px bg-gray-200 dark:bg-border"></div>

    {#each VERSIONS as version (version.version)}
      <div class="relative flex gap-6">
        <!-- Point de la timeline -->
        <div class="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-xs font-bold text-gray-600 dark:border-border dark:bg-slate-900 dark:text-muted-foreground">
          {version.version}
        </div>

        <!-- Contenu -->
        <div class="flex-1 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none">
          <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-base font-semibold text-gray-900 dark:text-foreground">
                  {i18n.t(version.titleKey)}
                </h3>
                <span class="rounded-full px-2 py-0.5 text-xs font-medium {BADGE_STYLES[version.badge]}">
                  {i18n.t(BADGE_KEYS[version.badge])}
                </span>
              </div>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-muted-foreground">
                {i18n.t(version.dateKey)}
              </p>
            </div>
          </div>

          <ul class="space-y-2">
            {#each version.items as item (item.key)}
              <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span>
                {i18n.t(item.key)}
              </li>
            {/each}
          </ul>
        </div>
      </div>
    {/each}
  </div>
</LegalLayout>
