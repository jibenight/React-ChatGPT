<script lang="ts">
  import { v4 as uuidv4 } from 'uuid';
  import ChatZone from '$lib/components/chat/ChatZone.svelte';

  const sessionId = uuidv4();
</script>

<ChatZone {sessionId} />
