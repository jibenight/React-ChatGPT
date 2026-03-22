<script lang="ts">
  import { cn } from '$lib/utils';
  import Skeleton from './Skeleton.svelte';
</script>

<div class="space-y-4 p-4">
  {#each Array(4) as _, i}
    <div class={cn('flex gap-3', i % 2 === 0 ? 'justify-end' : '')}>
      <Skeleton class="h-8 w-8 rounded-full" />
      <div class="space-y-2">
        <Skeleton class="h-4 w-48" />
        <Skeleton class="h-4 w-32" />
      </div>
    </div>
  {/each}
</div>
