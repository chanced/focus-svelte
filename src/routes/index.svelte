<script lang="ts">
	import Container from "../test/Container.svelte";
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
