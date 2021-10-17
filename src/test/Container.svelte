<script lang="ts">
	import { focus } from "../lib/action";
	import { onMount } from "svelte";
	export let title: string;
	export let seed = 10;
	export let assignAriaHidden = false;
	export let preventScroll = false;
	export let focusable = true;
	export let element: HTMLElement | string | undefined = undefined;
	let container: HTMLDivElement;
	let enabled = false;
	function toggleFocus() {
		enabled = !enabled;
	}
	function generate() {
		const list = ["div", "p", "input", "select", "textarea", "details"];
		const tag = list[Math.floor(Math.random() * list.length)];
		const div = document.createElement("div");
		const node = document.createElement(tag);

		switch (tag) {
			case "select":
				node.innerHTML = `<option>${tag}</option>`;
				break;
			case "input":
			case "textarea":
				(node as HTMLInputElement).value = tag;
				break;
			case "details":
				node.innerHTML = `<summary>Summary</summary>\n${tag}`;
				break;
			default:
				node.innerText = tag;
		}

		div.appendChild(node);
		container.appendChild(div);
	}

	onMount(() => {
		for (let i = 0; i < seed; i++) {
			generate();
		}
		const last = document.createElement("div");
		last.innerHTML = `<input class="lastInput">`;
		container.append(last);
	});
</script>

<div
	class="container"
	bind:this={container}
	use:focus={{ enabled, preventScroll, assignAriaHidden, focusable, element }}
>
	<h2>{title}</h2>
	<div style="display:flex; margin-bottom: 1rem">
		<button on:click={generate}>generate element</button>
		<button on:click={toggleFocus}> {enabled ? "unfocus" : "focus"}</button>
	</div>
</div>

<style>
	.container {
		width: 100%;
	}

	:focus {
		background-color: #f0f0f0;
	}
</style>
