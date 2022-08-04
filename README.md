# focus-svelte :mouse_trap:

Focus trap for svelte with zero dependencies.

## Installation

```bash
npm install -D focus-svelte
# yarn add -D focus-svelte
# pnpm add -D focus-svelte
```

## Example

[https://svelte.dev/repl/4b31b2f4a45c4ee08230f6d47d31db48](https://svelte.dev/repl/4b31b2f4a45c4ee08230f6d47d31db48?version=3.42.6)

## Description

focus-svelte works a bit differently than other focus traps I've encounted.
Rather than using an event listener to track user activity and override the
default behavior of the browser, the DOM is manipulated instead. All elements
outside of an active focus trap's descendants or ancestory have their
`tabindex` set to `-1` if it was `0` or greater previously.

To keep track of changes after the trap is enabled, a `MutationObserver` monitors
the DOM for updates. Once all focus traps are disabled or removed, the observer
is stopped and the elements' properties are reset. If a focus trap later becomes active,
the observer is restarted and nodes are decorated accordingly.

When a trap becomes active for the first time, the `HTMLElement` that is assigned focus is
determined by the configuration options passed to the component or action. 
- If `element` is 
assigned and is tabbable, it will be focused upon. 
- If `element` is `undefined` or not tabbable and `focusable` is `true`, the `HTMLElement` with `use:focus` is granted focus.
- If neither of the previous conditions are met, focus will be set on the first tabbable element.

## Usage

There is both an action and a component that can be utilized.

### Options

| option             | description                                                                                                                                                                                                                                                                     | type                            | default                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------ |
| `element`          | If `element` is assigned and is tabbable, it will be focused upon when the trap is enabled. `string` values will be considered a query selector.                                                                                                                                | `Element \| string`             | `undefined`                                |
| `focusable`        | The `HTMLElement` the action is assigned to gets a `tabindex` of `0` when the trap becomes active                                                                                                                                                                               | `boolean`                       | `false`                                    |
| `focusDelay`       | can either be a number of ms to wait or an async function that resolves (`void`) when the focus of an element should be set.                                                                                                                                                    | `number \| () => Promise<void>` | [`tick`](https://svelte.dev/tutorial/tick) |
| `delay`            | Determines how long to wait before batching updates to `tabIndex` and `ariaHidden`.                                                                                                                                                                                             | `number \| () => Promise<void>` | [`tick`](https://svelte.dev/tutorial/tick) |
| `assignAriaHidden` | When a focus trap becomes enabled and is `true`, all elements outside of an active trap or their ancestory have their [aria-hidden](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Techniques/Using_the_aria-hidden_attribute) attribute set to `"true"`. | `boolean`                       | `false`                                    |
| `preventScroll`    | sets [`preventScroll`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus#parameters) when focusing.                                                                                                                                                            | `boolean`                       | `false`                                    |
| `enabled`          | If `true`, the focus trap becomes active.                                                                                                                                                                                                                                       | `boolean`                       | `false`                                    |

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
	<input value={enabled ? "focus is trapped here" : "regular tabbable input"} />
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
	<input value={enabled ? "focus is trapped here" : "regular tabbable input"} />
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
	<input value={enabled ? "focus is trapped here" : "regular tabbable input"} />
</Focus>

<input value={enabled ? "can't tab here" : "can be tabbed into!"} />
```

**Note**: As the action needs an `HTMLElement`, the component version wraps your content with a `div`.

### override

If you wish to override the behavior of an element, you can set `data-focus-override="true"`
and it will retain its original tabindex.

## Contributing

Pull requests are always welcome.

## License

[MIT](https://choosealicense.com/licenses/mit/)
