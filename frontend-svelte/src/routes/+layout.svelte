<script lang="ts">
  import './layout.css';
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { Toaster } from 'svelte-sonner';
  import UpgradeModal from '$lib/components/billing/UpgradeModal.svelte';

  let { children } = $props();

  onMount(() => {
    authStore.init();
  });
</script>

{@render children()}

<Toaster richColors position="bottom-right" />
<UpgradeModal />
