<script lang="ts">
	import { focus } from "../../action";
	export let enabled: boolean;
	export let assignAriaHidden = false;
	export let element: HTMLElement | string | undefined = undefined;
	export let focusable = false;
</script>

<div use:focus={{ enabled, assignAriaHidden, element, focusable }}>
	<slot />
</div>
