<script lang="ts">
	import { focus } from "../lib/action";

	let container: HTMLDivElement;
	let focused = false;

	function toggleFocus() {
		focused = !focused;
	}
	function generate() {
		const list = ["div", "p", "input", "select", "textarea"];
		const tag = list[Math.floor(Math.random() * list.length)];
		const div = document.createElement("div");
		const node = document.createElement(tag);
		if (tag === "select") {
			const opt = document.createElement("option");
			opt.innerText = tag;
			node.appendChild(opt);
		} else {
			node.innerText = tag;
		}
		div.appendChild(node);
		container.appendChild(div);
	}
</script>

<div class="container" bind:this={container} use:focus={focused}>
	<div style="display:flex">
		<button on:click={generate}>generate element</button>
		<button on:click={toggleFocus}> {focused ? "unfocus" : "focus"}</button>
	</div>
</div>

<style>
	.container {
		width: 100%;
	}
	.container:focus-within {
		background-color: #f0f0f0;
	}
</style>
