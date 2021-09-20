<script lang="ts">
	import { focus } from "../../action";
	export let enabled: boolean;
	export let assignAriaHidden = false;
</script>

<div use:focus={{ enabled, assignAriaHidden }}>
	<slot />
</div>
