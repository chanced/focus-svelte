# focus-svelte

Focus lock for svelte with zero dependencies.

## Installation

```bash
npm install -D focus-svelte
# yarn add -D focus-svelte
# pnpm add -D focus-svelte
```

## Example

[https://svelte.dev/repl/4b31b2f4a45c4ee08230f6d47d31db48](https://svelte.dev/repl/4b31b2f4a45c4ee08230f6d47d31db48?version=3.42.6)

## Explanation

#### tabindex

focus-svelte works a bit differently than other focus locks I've encounted.
Rather than using an event listener to track user activity and overriding the
default behavior of the browser, the DOM is manipulated instead. All elements
outside of an active focus lock's descendants or ancestory have their
`tabindex` set to `-1` if it was `0` or greater previously.

To keep track of changes after the lock is enabled, a `MutationObserver` monitors
the DOM for updates. Once all focus locks are disabled or removed, the `MutationObserver`
is stopped and the elements' properties are reset. If a focus lock later becomes active,
the `MutationObserver` is restarted and nodes are decorated accordingly.

#### aria-hidden

If `assignAriaHidden` is `true` (default: `false`), when a focus lock becomes enabled, all
elements outside of an active lock or their ancestory have their
[aria-hidden](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Techniques/Using_the_aria-hidden_attribute)
attribute set to `"true"`.

## Usage

There is both an action and a component that can be utilized.

### action

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

<input value={enabled ? "can't tab here" : "can be tabbed into!"} />
```

#### With `assignAriaHidden`

```html
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

<input value={enabled ? "can't tab here" : "can be tabbed into!"} />
```

### component

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

<input value={enabled ? "can't tab here" : "can be tabbed into!"} />
```

**Note**: As the action needs an `HTMLElement`, the component version wraps your content within a `div`.

### override

If you wish to override the behavior of an element, you can set `data-focus-override="true"`
and it will retain its original tabindex.

## Contributing

Pull requests are always welcome.

## License

[MIT](https://choosealicense.com/licenses/mit/)
