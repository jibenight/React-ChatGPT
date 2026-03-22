<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';

  let { content }: { content: string } = $props();

  let html = $derived(
    content
      ? DOMPurify.sanitize(
          marked.parse(content, { breaks: true, gfm: true }) as string,
        )
      : '',
  );
</script>

<div class="prose prose-sm max-w-none dark:prose-invert">
  {@html html}
</div>
