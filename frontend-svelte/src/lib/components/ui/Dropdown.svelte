<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    onToggle: () => void;
    children: Snippet;
    menu: Snippet;
  }

  let { open, onToggle, children, menu }: Props = $props();

  function clickOutside(node: HTMLElement, handler: () => void) {
    function handleClick(event: MouseEvent) {
      if (!node.contains(event.target as Node)) {
        handler();
      }
    }

    document.addEventListener('click', handleClick, true);

    return {
      destroy() {
        document.removeEventListener('click', handleClick, true);
      },
    };
  }
</script>

<div class="relative inline-block" use:clickOutside={open ? onToggle : () => {}}>
  <div onclick={onToggle} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && onToggle()}>
    {@render children()}
  </div>

  {#if open}
    <div class="absolute right-0 z-50 mt-1 min-w-[10rem] rounded-md border border-border bg-popover p-1 shadow-md">
      {@render menu()}
    </div>
  {/if}
</div>
