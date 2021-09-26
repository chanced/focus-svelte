import { readable } from "svelte/store";
import type { Unsubscriber } from "svelte/store";

export interface FocusOptions {
	/**
	 * enables focus
	 */
	enabled?: boolean;
	/**
	 * determines whether or not to assign `area-hidden="true"` to elements
	 * outside of the trap
	 */
	assignAriaHidden?: boolean;
	/**
	 * focusable indicates whether or not to make the containing element
	 * focusable
	 */
	focusable?: boolean;

	/**
	 * the element to focus upon.
	 *
	 * If the element is not tabbable and `focusable` is set to `true`, the
	 * element with `use:focus` will be granted focus. If `focusable` is falsy,
	 * the first tabbable child node will be granted focus.
	 *
	 * `string` values will be considered query selectors
	 */
	element?: HTMLElement | string;
}

type Options = FocusOptions & {
	trap: HTMLElement;
};

const OVERRIDE = "focusOverride";
const DATA_OVERRIDE = "data-focus-override";

type Operation = null | (() => void);
// eslint-disable-next-line @typescript-eslint/ban-types
type Key = {};

class NodeState {
	private tabIndexOriginAssigned!: number | null;
	private tabIndexOriginValue!: number;
	private tabIndexAssigned: number | null;
	private override!: boolean;
	private ariaHiddenOrigin!: boolean | null;
	private ariaHiddenAssignedValue: boolean | null;
	private unfocusedBy: Set<Key>;
	private focusedBy: Set<Key>;
	private hiddenBy: Set<Key>;
	private shownBy: Set<Key>;
	constructor(node: HTMLElement) {
		this.shownBy = new Set();
		this.hiddenBy = new Set();
		this.focusedBy = new Set();
		this.unfocusedBy = new Set();
		this.updateTabIndexOrigin(node);
		this.updateOverride(node);
		this.updateAriaHiddenOrigin(node);
		this.tabIndexAssigned = null;
		this.ariaHiddenAssignedValue = null;
	}

	tabbable(): boolean {
		if (this.tabIndexAssigned !== null && this.tabIndexAssigned === -1) {
			return false;
		}
		if (this.tabIndexAssigned !== null && this.tabIndexAssigned > -1) {
			return true;
		}
		if (this.tabIndexOriginValue === -1) {
			return false;
		}
		if (this.tabIndexOriginValue > -1) {
			return true;
		}
		return false;
	}

	updateAriaHiddenOrigin(node: HTMLElement): boolean {
		const value = this.parseAriaHidden(node);
		if (this.ariaHiddenOrigin === undefined) {
			this.ariaHiddenOrigin = value;
			return true;
		}
		if (this.ariaHiddenOrigin === value || this.ariaHiddenAssignedValue === value) {
			return false;
		}
		this.ariaHiddenOrigin = value;
		return true;
	}

	updateTabIndexOrigin(node: HTMLElement, value?: number | null): boolean {
		if (value !== undefined) {
			if (this.tabIndexAssigned !== value && this.tabIndexOriginAssigned !== value) {
				if (value != null) {
					this.tabIndexOriginValue = value;
				}
				this.tabIndexOriginAssigned = value;
				return true;
			}
			return false;
		}
		const tabIndex = node.tabIndex;
		if (this.tabIndexOriginValue !== tabIndex && this.tabIndexAssigned !== tabIndex) {
			this.tabIndexOriginValue = tabIndex;
			this.tabIndexOriginAssigned = this.parseTabIndex(node);
			return true;
		}
		return false;
	}

	private parseOverride(value: string | null | undefined): boolean {
		if (!value) {
			return false;
		}
		value = value.toLowerCase();
		return value === "true" || value === "focus";
	}
	updateOverride(node: HTMLElement, value?: string): boolean {
		value = value !== undefined ? value : node.dataset[OVERRIDE];
		const val = this.parseOverride(value);
		if (this.override !== val) {
			this.override = val;
			return true;
		}
		return false;
	}
	operationsFor(node: HTMLElement, assignAriaHidden: boolean): Operation[] {
		return [this.tabIndexOp(node), this.ariaHiddenOp(node, assignAriaHidden)];
	}
	ariaHiddenOp(node: HTMLElement, assignAriaHidden: boolean): Operation {
		if (!assignAriaHidden || this.override) {
			return null;
		}
		if (this.shownBy.size) {
			this.ariaHiddenAssignedValue = false;
		} else if (this.hiddenBy.size) {
			this.ariaHiddenAssignedValue = true;
		} else {
			if (this.ariaHiddenAssignedValue !== null) {
				if (this.ariaHiddenOrigin === null) {
					return () => {
						node.removeAttribute("aria-hidden");
						this.ariaHiddenAssignedValue = null;
					};
				}
				const ariaHiddenOrigin = this.ariaHiddenOrigin.toString();
				return () => {
					node.ariaHidden = ariaHiddenOrigin;
				};
			}
		}
		if (this.ariaHiddenAssignedValue !== null) {
			const value = this.ariaHiddenAssignedValue.toString();
			return () => {
				node.ariaHidden = value;
			};
		}
		return null;
	}
	tabIndexOp(node: HTMLElement): Operation {
		if (this.override) {
			return null;
		}
		if (this.focusedBy.size) {
			if (this.tabIndexAssigned === -1 || node.tabIndex !== -1) {
				this.tabIndexAssigned = 0;
			} else if (this.tabIndexAssigned === null || node.tabIndex === this.tabIndexAssigned) {
				return null;
			}
		} else if (this.unfocusedBy.size) {
			const parsed = this.parseTabIndex(node);
			if (
				(parsed !== null && parsed >= 0) ||
				(this.tabIndexAssigned === null && this.tabIndexOriginValue >= 0) ||
				this.tabIndexAssigned === 0
			) {
				this.tabIndexAssigned = -1;
			} else {
				return null;
			}
		} else {
			if (this.tabIndexAssigned !== null) {
				if (this.tabIndexOriginAssigned === null) {
					this.tabIndexAssigned = null;
					return () => {
						node.removeAttribute("tabindex");
					};
				}
				const value = this.tabIndexOriginAssigned;
				this.tabIndexOriginAssigned = null;
				return () => {
					node.tabIndex = value;
				};
			}
		}
		if (this.tabIndexAssigned !== null && node.tabIndex !== this.tabIndexAssigned) {
			const { tabIndexAssigned } = this;
			return () => {
				node.tabIndex = tabIndexAssigned;
			};
		}
		return null;
	}
	addTrap(key: Key, options: Options, node: HTMLElement): Operation[] {
		const { trap, focusable, assignAriaHidden } = options;
		if (node === trap) {
			if (focusable) {
				this.tabIndexAssigned = 0;
				console.log(this);
			}
			this.focusedBy.add(key);
			this.unfocusedBy.delete(key);
			this.shownBy.add(key);
			this.hiddenBy.delete(key);

			return this.operationsFor(node, !!assignAriaHidden);
		}

		if (trap.contains(node) || node.contains(trap)) {
			this.focusedBy.add(key);
			this.unfocusedBy.delete(key);
			if (assignAriaHidden) {
				this.shownBy.add(key);
				this.hiddenBy.delete(key);
			}
			return this.operationsFor(node, !!assignAriaHidden);
		}

		this.unfocusedBy.add(key);
		this.focusedBy.delete(key);
		if (assignAriaHidden) {
			this.hiddenBy.add(key);
			this.shownBy.delete(key);
		}
		return this.operationsFor(node, !!assignAriaHidden);
	}

	removeLock(key: Key) {
		this.focusedBy.delete(key);
		this.unfocusedBy.delete(key);
		this.hiddenBy.delete(key);
		this.shownBy.delete(key);
	}

	private parseTabIndex(node: HTMLElement, value?: string | null): number | null {
		if (value === undefined) {
			if (!node.hasAttribute("tabindex")) {
				return null;
			}
			return node.tabIndex;
		}
		if (value == null) {
			value = "";
		}
		value = value.trim();
		if (value === "") {
			return null;
		}
		const parsed = parseInt(value);
		if (isNaN(parsed)) {
			return null;
		}
		return parsed;
	}
	private parseAriaHidden(node: HTMLElement): boolean | null {
		const val = node.getAttribute("aria-hidden");
		if (val === "true") {
			return true;
		}
		if (val === "false") {
			return false;
		}
		return null;
	}
}

const context = readable<WeakMap<Node, NodeState>>(undefined, (set) => {
	set(new WeakMap());
	return () => {
		set(new WeakMap());
	};
});

export interface FocusAction {
	update(enabled: boolean): void;
	update(opts: FocusOptions): void;
	destroy(): void;
}

let observer: MutationObserver;

const mutations = readable<MutationRecord[]>([], function (set) {
	if (typeof document === "undefined") {
		set([]);
		return;
	}
	if (!observer) {
		observer = new MutationObserver((mutations) => {
			set(mutations);
		});
	}
	observer.observe(document.body, {
		attributes: true,
		attributeFilter: ["tabindex", "aria-hidden", DATA_OVERRIDE],
		attributeOldValue: false,
		childList: true,
		subtree: true,
	});
	return () => {
		observer.disconnect();
	};
});

const allBodyNodes = (): NodeListOf<Element> => document.body.querySelectorAll("*");

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

const exec = (op: Operation) => op && op();

export function focus(trap: HTMLElement, opts: FocusOptions | boolean): FocusAction {
	const key = Object.freeze({});
	let state: WeakMap<Node, NodeState>;
	let enabled = false;
	let assignAriaHidden = false;
	let focusable = false;
	let element: string | HTMLElement | undefined = undefined;
	let options: Options;
	let unsubscribe: Unsubscriber | undefined = undefined;

	if (typeof document === "undefined") {
		return { update: noop, destroy: noop };
	}

	function nodeState(node: HTMLElement): NodeState {
		let ns = state.get(node);
		if (!ns) {
			ns = new NodeState(node);
			state.set(node, ns);
		}
		return ns;
	}

	function addTrapToNodeState(node: Node): Operation[] {
		if (!(node instanceof HTMLElement)) {
			return [];
		}
		const ns = nodeState(node);
		return ns.addTrap(key, options, node);
	}

	function removeTrapFromNodeState(node: Node): (Operation | null)[] {
		if (!(node instanceof HTMLElement)) {
			return [];
		}

		const ns = state.get(node);
		if (!ns) {
			return [];
		}

		ns.removeLock(key);
		return ns.operationsFor(node, assignAriaHidden);
	}

	function createTrap(nodes: NodeList) {
		let ops: Operation[] = [];
		nodes.forEach((node) => {
			ops = ops.concat(addTrapToNodeState(node));
		});
		ops.forEach((fn) => exec(fn));
	}

	function destroyTrap(nodes: NodeList) {
		let ops: Operation[] = [];
		nodes.forEach((node) => {
			ops = ops.concat(removeTrapFromNodeState(node));
		});
		ops.forEach((fn) => exec(fn));
	}

	function handleAttributeChange(mutation: MutationRecord) {
		const { target: node } = mutation;
		if (!(node instanceof HTMLElement)) {
			return;
		}
		const { attributeName } = mutation;
		if (attributeName === null) {
			return;
		}

		const ns = state.get(node);
		if (!ns) {
			return;
		}
		let ops: Operation[] | undefined = undefined;
		switch (attributeName) {
			case "tabindex":
				if (ns.updateTabIndexOrigin(node, node.hasAttribute("tabindex") ? node.tabIndex : null)) {
					ops = [ns.tabIndexOp(node)];
				}
				break;
			case DATA_OVERRIDE:
				if (ns.updateOverride(node, node.dataset[OVERRIDE])) {
					ops = ns.operationsFor(node, assignAriaHidden);
				}
				break;
			case "aria-hidden":
				if (ns.updateAriaHiddenOrigin(node)) {
					ops = [ns.ariaHiddenOp(node, assignAriaHidden)];
				}
				break;
		}
		if (!ops) {
			return;
		}
		ops.forEach((op) => exec(op));
	}

	function handleNodesAdded(mutation: MutationRecord) {
		const { addedNodes } = mutation;
		if (addedNodes === null) {
			return;
		}
		createTrap(addedNodes);
		mutation.addedNodes.forEach((node) => {
			createTrap(node.childNodes);
		});
	}
	function handleMutation(mutation: MutationRecord) {
		if (!state) {
			return;
		}
		if (mutation.type === "childList" && mutation.addedNodes) {
			handleNodesAdded(mutation);
		}
		if (mutation.type === "attributes") {
			handleAttributeChange(mutation);
		}
	}

	const handleMutations = (mutations: MutationRecord[]) => mutations.forEach(handleMutation);

	function assignFocus() {
		if (element) {
			let elem: Element | null = null;
			if (typeof element === "string") {
				try {
					elem = trap.querySelector(element);
				} catch (err) {
					elem = null;
				}
			}
			if (element instanceof Element) {
				elem = element;
			}

			if (elem && elem instanceof HTMLElement) {
				elem.focus();
				return;
			}
		}

		if (trap.tabIndex === 0) {
			trap.focus();
			return;
		}
		const nodes = trap.querySelectorAll("*");
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes.item(i);
			const ns = state.get(node);
			if (!ns) {
				continue;
			}
			if (ns.tabbable() && node instanceof HTMLElement) {
				node.focus();
				return;
			}
		}
	}

	function blurFocus(): boolean {
		const current = document.activeElement;
		if (current instanceof HTMLElement) {
			const ns = state.get(current);
			if (ns && !ns.tabbable()) {
				current.blur();
				return true;
			}
			return false;
		}
		return true;
	}
	function focusFirstElement() {
		if (!state) {
			return;
		}
		assignFocus();
	}

	function update(opts: FocusOptions | boolean) {
		const previouslyEnabled = enabled;
		if (typeof opts === "boolean") {
			enabled = opts;
			assignAriaHidden = false;
			opts = {};
		} else if (typeof opts == "object") {
			enabled = !!opts?.enabled;
		} else {
			enabled = false;
			opts = {};
		}
		assignAriaHidden = !!opts?.assignAriaHidden;
		focusable = !!opts.focusable;
		element = opts.element;
		options = {
			assignAriaHidden,
			enabled,
			focusable,
			trap,
			element,
		};
		if (!enabled) {
			return destroy();
		}
		let unsubscribeFromMutations: Unsubscriber;
		let unsubscribeFromState: Unsubscriber;

		if (!unsubscribe) {
			unsubscribeFromState = context.subscribe(($state) => {
				state = $state;
			});
		}

		createTrap(allBodyNodes());

		if (!unsubscribe) {
			unsubscribeFromMutations = mutations.subscribe(handleMutations);
			unsubscribe = () => {
				unsubscribeFromMutations();
				unsubscribeFromState();
			};
		}

		if (!previouslyEnabled) {
			blurFocus();
			focusFirstElement();
		}
	}
	function destroy() {
		if (unsubscribe) {
			unsubscribe();
		}
		destroyTrap(allBodyNodes());

		unsubscribe = undefined;
	}
	if (opts === true || (typeof opts === "object" && opts?.enabled)) {
		update(opts);
	}

	return { update, destroy };
}
