<script lang="ts">
	import { focus } from "../../action";
	export let enabled: boolean;
	export let assignAriaHidden = false;
	export let element: HTMLElement | string | undefined = undefined;
	export let focusable = false;
	export let focusDelay: number | (() => Promise<void>) | undefined = undefined;
	export let preventScroll = false;
	export let delay: number | (() => Promise<void>) | undefined = undefined;
</script>

<div
	use:focus={{ enabled, assignAriaHidden, element, focusable, focusDelay, preventScroll, delay }}
>
	<slot />
</div>
