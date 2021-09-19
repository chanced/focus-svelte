<script lang="ts">
	import { focus } from "../../action";
	export let enabled: boolean;
</script>

<div use:focus={enabled}>
	<slot />
</div>
