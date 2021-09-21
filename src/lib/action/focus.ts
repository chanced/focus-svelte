import { readable } from "svelte/store";
import type { Unsubscriber } from "svelte/store";

export interface FocusOptions {
	enabled?: boolean;
	assignAriaHidden?: boolean;
}

const OVERRIDE = "focusOverride";

// eslint-disable-next-line @typescript-eslint/ban-types
type Key = {};

class NodeState {
	private tabIndexOriginAssigned!: number | null;
	private tabIndexOriginValue!: number;
	private tabIndexAssigned: number | null;
	private override!: boolean;
	private ariaHiddenOrigin: boolean | null;
	private ariaHiddenAssignedValue: boolean | null;
	private unfocusedBy: Set<Key>;
	private focusedBy: Set<Key>;
	private hiddenBy: Set<Key>;
	private shownBy: Set<Key>;
	private tag: string;
	constructor(node: HTMLElement) {
		this.shownBy = new Set();
		this.hiddenBy = new Set();
		this.focusedBy = new Set();
		this.unfocusedBy = new Set();
		this.updateTabIndexOrigin(node);
		this.updateOverride(node);
		this.tabIndexAssigned = null;
		this.ariaHiddenOrigin = this.parseAriaHidden(node);
		this.ariaHiddenAssignedValue = null;
		this.tag = node.tagName;
	}

	private parseAriaHidden(node: HTMLElement): boolean | null {
		let val = node.getAttribute("aria-hidden");
		if (val === null || val === undefined) {
			return null;
		}
		val = val.toLowerCase();
		if (val === "true") {
			return true;
		}
		if (val === "false") {
			return false;
		}
		return null;
	}

	updateTabIndexOrigin(
		node: HTMLElement,
		value?: string | null,
		oldValue?: string | null,
	): boolean {
		if (value !== undefined || oldValue !== undefined) {
			const parsed = this.parseTabIndex(node, value);
			if (this.tabIndexAssigned !== parsed) {
				this.tabIndexOriginAssigned = parsed;
				return true;
			}
			return false;
		}
		const tabIndex = node.tabIndex;
		if (this.tabIndexOriginValue !== tabIndex) {
			this.tabIndexOriginValue = tabIndex;
			this.tabIndexOriginAssigned = this.parseTabIndex(node);
			return true;
		}
		return false;
	}

	updateOverride(node: HTMLElement) {
		const v = node.dataset[OVERRIDE]?.toLowerCase();
		this.override = v === "true" || v === "focus";
	}

	assignAriaHidden(node: HTMLElement, assignAriaHidden: boolean) {
		if (!assignAriaHidden) {
			return;
		}
		if (this.shownBy.size) {
			console.log("this.shownBy.size", this.shownBy.size);
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
				node.setAttribute("aria-hidden", this.ariaHiddenOrigin.toString());
				return;
			}
		}
		if (this.ariaHiddenAssignedValue !== null) {
			node.setAttribute("aria-hidden", this.ariaHiddenAssignedValue.toString());
		}
	}
	assignTabIndex(node: HTMLElement) {
		if (this.focusedBy.size) {
			if (this.tabIndexAssigned === -1 || node.tabIndex !== -1) {
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
			value = node.getAttribute("tabindex");
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
}

let state: WeakMap<HTMLElement, NodeState>;

export interface FocusAction {
	update(enabled: boolean): void;
	update(opts: FocusOptions): void;
	destroy(): void;
}
// const OVERRIDE = "focusOverride";
// const DATA_OVERRIDE = "data-focus-override";

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
		attributeFilter: ["tabindex", "aria-hidden"],
		attributeOldValue: true,
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
	const key: Key = {};
	let isEnabled = false;
	let assignAriaHidden = false;

	if (typeof document === "undefined") {
		return { update: noop, destroy: noop };
	}
	if (!state) {
		state = new WeakMap();
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
	let unsubscribe: Unsubscriber | undefined = undefined;

	function handleAttributeChange(mutation: MutationRecord) {
		const { target } = mutation;
		if (!(target instanceof HTMLElement)) {
			return;
		}
		const attrName = mutation.attributeName;
		if (attrName === null) {
			return;
		}
		const value = target.getAttribute(attrName);
		const { attributeName, oldValue } = mutation;
		if (oldValue === value) {
			return;
		}

		if (attributeName === "tabindex") {
			console.log(`tabindex changed from ${oldValue} to ${value}`);
			const ns = state.get(target);
			if (ns) {
				if (ns.updateTabIndexOrigin(target, value, oldValue)) {
					console.log("should be assigning");
					ns.assignTabIndex(target);
				}
			}
		}
	}

	function handleMutation(mutation: MutationRecord) {
		if (mutation.type === "childList" && mutation.addedNodes) {
			const { addedNodes } = mutation;
			if (addedNodes !== null) {
				addLockToState(addedNodes);
			}
			mutation.addedNodes.forEach((node) => {
				addLockToState(node.childNodes);
			});
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
			unsubscribe = mutations.subscribe(handleMutations);
		}
		addLockToState(allBodyNodes());
	}
	function destroy() {
		if (unsubscribe) {
			unsubscribe();
			unsubscribe = undefined;
		}
		removeLockFromState(allBodyNodes());
	}
	if (opts === true || (typeof opts === "object" && opts?.enabled)) {
		update(opts);
	}

	return { update, destroy };
}
