<script lang="ts">
  import Skeleton from './Skeleton.svelte';
</script>

<div class="space-y-2 p-2">
  {#each Array(5) as _}
    <div class="flex items-center gap-3 rounded-md px-2 py-2">
      <Skeleton class="h-4 w-4 shrink-0 rounded" />
      <div class="flex-1 space-y-1.5">
        <Skeleton class="h-3.5 w-3/4" />
        <Skeleton class="h-3 w-1/2" />
      </div>
    </div>
  {/each}
</div>
