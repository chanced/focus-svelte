# focus-svelte

Focus lock for [svelte](https://svelte.dev/) with zero dependencies.

## Installation

```bash
npm install -D focus-svelte
# yarn add -D focus-svelte
# pnpm install -D focus-svelte
```

## Expanation

focus-svelte works a bit differently than other focus locks I've encounted.
Rather than using an event listener to track user activity and manipulating the
default behavior of the browser, the DOM is manipulated instead. All elements outside of a lock have their `tabindex` set to `-1`.

To keep track of changes after the lock is enabled, a `MutationObserver` monitors the DOM for updates, assigning the node's state
through data attributes respective to environmental conditions.

Once all focus locks are removed, the `MutationObserver` is stopped and all DOM elements properties are reset.
If a focus lock later becomes active, the `MutationObserver` is restarted and all nodes are decorated accordingly.

If `assignAriaHidden` is `true` (default: `false`), when a focus lock becomes enabled, all
elements outside of an active lock or their ancestory have their
[aria-hidden](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Techniques/Using_the_aria-hidden_attribute)
attribute set to `"true"`.

## Example

[https://svelte.dev/repl/4b31b2f4a45c4ee08230f6d47d31db48](https://svelte.dev/repl/4b31b2f4a45c4ee08230f6d47d31db48?version=3.42.6)

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
	<input value={enabled ? "focus is locked here" : "regular tabbable input"} />
</div>
<div><input value={enabled ? "can't tab here" : "can be tabbed into!"} /></div>
```

#### With `assignAriaHidden`

````html
<script>
	import { focus } from "focus-svelte";
	let enabled = true;
	function toggleFocus() {
		enabled = !enabled;
	}
</script>

<button on:click="{toggleFocus}">{enabled ? "disable" : "enable"} focus</button>
<div use:focus="{{enabled, assignAriaHidden: true}}">
	<input value={enabled ? "focus is locked here" : "regular tabbable input"} />
</div>
<div><input value={enabled ? "can't tab here" : "can be tabbed into!"} /></div>

```html
<script>
	import { Focus } from "focus-svelte";
	let enabled = true;
	function toggleFocus() {
		enabled = !enabled;
	}
</script>

<button on:click="{toggleFocus}">{enabled ? "disable" : "enable"} focus</button>

<Focus {enabled} assignAriaHidden="{true}">
	<input value={enabled ? "focus is locked here" : "regular tabbable input"} />
</Focus>

<div><input value={enabled ? "can't tab here" : "can be tabbed into!"} /></div>
````

**Note**: As the action needs an `HTMLElement`, the component version wraps your content within a `div`.

### Multiple locks

It is possible to have as many active focus locks as you'd like. Each lock is considered equal to its peers
so all elements within each lock will become tabbable.

If you wish to override the behavior of an element, you can use `data-focus-override= "focus"` on an element.

## Contributing

Pull requests are always welcome.

## License

[MIT](https://choosealicense.com/licenses/mit/)
