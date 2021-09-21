<script context="module" lang="ts">
	interface LoadParams {
		page: {
			query: URLSearchParams;
		};
	}
	export function load({ page }: LoadParams) {
		const seed = parseInt(page.query.get("seed") || "") || undefined;
		if (seed) {
			return { status: 200, props: { seed } };
		} else {
			return { status: 200 };
		}
	}
</script>

<script lang="ts">
	export let seed = 10;
	import Container from "../test/Container.svelte";
</script>

<div class="root">
	<Container {seed} />
	<Container {seed} />
	<Container {seed} />
</div>

<style>
	.root {
		display: flex;
		width: 100%;
	}
</style>
