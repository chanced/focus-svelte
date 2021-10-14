<script lang="ts">
	import { focus } from "../../action";
	export let enabled: boolean;
	export let assignAriaHidden = false;
	export let element: HTMLElement | string | undefined = undefined;
	export let focusable = false;
	export let focusDelay: number | (() => Promise<void>) | undefined = undefined;
	export let preventScroll = false;
</script>

<div use:focus={{ enabled, assignAriaHidden, element, focusable, focusDelay, preventScroll }}>
	<slot />
</div>
