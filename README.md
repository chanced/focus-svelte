# focus-svelte

Focus trap for [svelte](https://svelte.dev/) with zero dependencies.

## Installation

```bash
npm install -D focus-svelte
# yarn add -D focus-svelte
# pnpm install -D focus-svelte
```

## Usage

There is both an action and a component that can be utilized.

```html
<script>
	import { focus } from "focus-svelte";
	let enabled = true;
	function toggleFocus() {
		enabled = !enabled;
	}
</script>

<button on:click="{toggleFocus}">{enabled ? "disable" : "enable"} focus</button>

<div use:focus="{enabled}">
	<input value={enabled ? "focus is trapped here" : "regular tabbable input"} />
</div>
<div><input value={enabled ? "can't tab here" : "can be tabbed into!"} /></div>
```

As the action needs an `HTMLElement`, the component version wraps your content within a `div`.

```html
<script>
	import { Focus } from "focus-svelte";
	let enabled = true;
	function toggleFocus() {
		enabled = !enabled;
	}
</script>

<button on:click="{toggleFocus}">{enabled ? "disable" : "enable"} focus</button>

<Focus {enabled}>
	<input value={enabled ? "focus is trapped here" : "regular tabbable input"} />
</Focus>

<div><input value={enabled ? "can't tab here" : "can be tabbed into!"} /></div>
```

### Multiple traps

It is possible to have as many active focus traps as you'd like. Each trap is considered equal to its peers
so all elements within each trap will become tabbable.

If you wish to override the behavior of an element, you can use `data-focus-override= "focus"` on an element.

## Example

[https://svelte.dev/repl/4b31b2f4a45c4ee08230f6d47d31db48](https://svelte.dev/repl/4b31b2f4a45c4ee08230f6d47d31db48?version=3.42.6)

## Explanation

focus-svelte works a bit differently than other focus traps I've encounted.
Rather than using an event listener to track user activity and manipulating the
default behavior of the browser, the DOM is manipulated instead. All elements outside of a trap have their `tabindex` set to `-1`.

To keep track of changes after the trap is enabled, a `MutationObserver` monitors the DOM for updates, assigning the node's state
through data attributes respective to environmental conditions.

Once all focus traps are removed, the `MutationObserver` is stopped and all DOM elements properties are reset.
If a focus trap later becomes active, the `MutationObserver` is restarted and all nodes are decorated accordingly.

## To-do

- tests with playwright

## Contributing

Pull requests are always welcome.

## License

[MIT](https://choosealicense.com/licenses/mit/)
