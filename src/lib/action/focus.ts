import { readable } from "svelte/store";
import type { Unsubscriber } from "svelte/store";

export interface FocusOptions {
	enabled?: boolean;
	assignAriaHidden?: boolean;
}

const OVERRIDE = "focusOverride";
const DATA_OVERRIDE = "data-focus-override";

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

	assignAriaHidden(node: HTMLElement, assignAriaHidden: boolean) {
		if (!assignAriaHidden || this.override) {
			return;
		}
		if (this.shownBy.size) {
			this.ariaHiddenAssignedValue = false;
		} else if (this.hiddenBy.size) {
			this.ariaHiddenAssignedValue = true;
		} else {
			if (this.ariaHiddenAssignedValue !== null) {
				if (this.ariaHiddenOrigin === null) {
					node.removeAttribute("aria-hidden");
					this.ariaHiddenAssignedValue = null;
					return;
				}
				node.ariaHidden = this.ariaHiddenOrigin.toString();
				return;
			}
		}
		if (this.ariaHiddenAssignedValue !== null) {
			node.ariaHidden = this.ariaHiddenAssignedValue.toString();
		}
	}
	assignTabIndex(node: HTMLElement) {
		if (this.override) {
			return;
		}
		if (this.focusedBy.size) {
			if (this.tabIndexAssigned === -1 || node.tabIndex < 0) {
				this.tabIndexAssigned = 0;
			} else {
				return;
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
				return;
			}
		} else {
			if (this.tabIndexAssigned !== null) {
				if (this.tabIndexOriginAssigned === null) {
					node.removeAttribute("tabindex");
					this.tabIndexAssigned = null;
					return;
				}
				node.tabIndex = this.tabIndexOriginAssigned;
				this.tabIndexOriginAssigned = null;
				return;
			}
		}
		if (this.tabIndexAssigned !== null && node.tabIndex !== this.tabIndexAssigned) {
			node.tabIndex = this.tabIndexAssigned;
		}
	}
	addLock(key: Key, ariaHidden: boolean, node: HTMLElement, lockNode: HTMLElement) {
		// presumably, any parent wouldn't be a focusable node.
		// doing it this way makes it easier to compute aria-hidden
		// as the calculations only need to run once
		if (lockNode.contains(node) || node.contains(lockNode)) {
			this.focusedBy.add(key);
			this.unfocusedBy.delete(key);
			if (ariaHidden) {
				this.shownBy.add(key);
				this.hiddenBy.delete(key);
			}
		} else {
			this.unfocusedBy.add(key);
			this.focusedBy.delete(key);
			if (ariaHidden) {
				this.hiddenBy.add(key);
				this.shownBy.delete(key);
			}
		}
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

export function focus(lockNode: HTMLElement, opts: FocusOptions | boolean): FocusAction {
	const key = Object.freeze({});
	let state: WeakMap<Node, NodeState>;
	let isEnabled = false;
	let assignAriaHidden = false;
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

	function addLockToNodeState(node: Node) {
		if (!(node instanceof HTMLElement)) {
			return;
		}
		const ns = nodeState(node);
		ns.addLock(key, assignAriaHidden, node, lockNode);
		ns.assignTabIndex(node);
		ns.assignAriaHidden(node, assignAriaHidden);
	}

	function removeLockFromNodeState(node: Node) {
		if (!(node instanceof HTMLElement)) {
			return;
		}

		const ns = state.get(node);
		if (!ns) {
			return;
		}
		ns.removeLock(key);
		ns.assignTabIndex(node);
		ns.assignAriaHidden(node, assignAriaHidden);
	}

	const addLockToState = (nodes: NodeList) => nodes.forEach(addLockToNodeState);
	const removeLockFromState = (nodes: NodeList) => nodes.forEach(removeLockFromNodeState);

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
		switch (attributeName) {
			case "tabindex":
				if (ns.updateTabIndexOrigin(node, node.hasAttribute("tabindex") ? node.tabIndex : null)) {
					ns.assignTabIndex(node);
				}
				return;
			case DATA_OVERRIDE:
				if (ns.updateOverride(node, node.dataset[OVERRIDE])) {
					ns.assignAriaHidden(node, assignAriaHidden);
					ns.assignTabIndex(node);
				}
				return;
			case "aria-hidden":
				if (ns.updateAriaHiddenOrigin(node)) {
					ns.assignAriaHidden(node, assignAriaHidden);
				}
				return;
		}
	}

	function handleNodesAdded(mutation: MutationRecord) {
		const { addedNodes } = mutation;
		if (addedNodes === null) {
			return;
		}
		addLockToState(addedNodes);
		mutation.addedNodes.forEach((node) => {
			addLockToState(node.childNodes);
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

	function update(opts: FocusOptions | boolean) {
		if (typeof opts === "boolean") {
			isEnabled = opts;
			assignAriaHidden = false;
		} else {
			isEnabled = !!opts?.enabled;
			assignAriaHidden = !!opts?.assignAriaHidden;
		}
		if (!isEnabled) {
			return destroy();
		}
		if (!unsubscribe) {
			const unsubscribeFromMutations = mutations.subscribe(handleMutations);
			const unsubscribeFromContext = context.subscribe(($state) => {
				state = $state;
			});
			unsubscribe = () => {
				unsubscribeFromMutations();
				unsubscribeFromContext();
			};
		}
		addLockToState(allBodyNodes());
	}
	function destroy() {
		if (unsubscribe) {
			unsubscribe();
		}
		removeLockFromState(allBodyNodes());
		unsubscribe = undefined;
	}
	if (opts === true || (typeof opts === "object" && opts?.enabled)) {
		update(opts);
	}

	return { update, destroy };
}
