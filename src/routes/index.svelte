<script lang="ts">
	import Container from "../test/Container.svelte";
	import Focus from "$lib/component/Focus";
	import { focus } from "$lib/action";
	let focused = false;
</script>

<div class="root">
	<Container />
	<Container />
	<Container />
</div>

<style>
	.root {
		display: flex;
		width: 100%;
	}
</style>
