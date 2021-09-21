<script lang="ts">
	import { Focus } from "../lib";
	let enabled = false;
	function toggle() {
		enabled = !enabled;
	}
</script>

<svelte:head>
	<title>test page</title>
</svelte:head>
<button id="toggle" on:click={toggle}>toggle</button>

<div id="focused">
	<Focus {enabled}>
		<input id="focusInput1" />
		<input id="focusInput2" />
		<input id="focusInput3" />
		<textarea id="focusTextArea" />
	</Focus>
	<div id="outsideFocus">
		<input id="unfocusedInput1" />
		<!-- svelte-ignore a11y-positive-tabindex -->
		<input id="unfocusedInput2" tabindex="3" />
	</div>
</div>
