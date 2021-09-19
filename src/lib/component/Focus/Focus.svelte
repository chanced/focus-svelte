<script lang="ts">
	import { onMount } from "svelte";
	import { focus } from "$lib/action";
	let isMounted = false;
	$: if (isMounted) {
	}
	onMount(() => {
		isMounted = true;
	});
	export let enabled: boolean;
</script>

<div use:focus={enabled}>
	<slot />
</div>
