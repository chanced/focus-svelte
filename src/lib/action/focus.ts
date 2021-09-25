import { readable } from "svelte/store";
import type { Unsubscriber } from "svelte/store";

export interface FocusOptions {
	enabled?: boolean;
	assignAriaHidden?: boolean;
}

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
			if (this.tabIndexAssigned === -1 || node.tabIndex < 0) {
				this.tabIndexAssigned = 0;
			} else {
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
			const value = this.tabIndexAssigned;
			return () => {
				node.tabIndex = value;
			};
		}
		return null;
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

	function addLockToNodeState(node: Node): Operation[] {
		if (!(node instanceof HTMLElement)) {
			return [];
		}
		const ns = nodeState(node);
		ns.addLock(key, assignAriaHidden, node, lockNode);
		return [ns.tabIndexOp(node), ns.ariaHiddenOp(node, assignAriaHidden)];
	}

	function removeLockFromNodeState(node: Node): (Operation | null)[] {
		if (!(node instanceof HTMLElement)) {
			return [];
		}

		const ns = state.get(node);
		if (!ns) {
			return [];
		}

		ns.removeLock(key);
		return [ns.tabIndexOp(node), ns.ariaHiddenOp(node, assignAriaHidden)];
	}

	function addLockToState(nodes: NodeList) {
		let ops: Operation[] = [];
		nodes.forEach((node) => {
			ops = [...ops, ...addLockToNodeState(node)];
		});
		ops.forEach((op) => op && op());
	}
	function removeLockFromState(nodes: NodeList) {
		let ops: Operation[] = [];

		nodes.forEach((node) => {
			ops = [...ops, ...removeLockFromNodeState(node)];
		});
		ops.forEach((op) => op && op());
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
		switch (attributeName) {
			case "tabindex":
				if (ns.updateTabIndexOrigin(node, node.hasAttribute("tabindex") ? node.tabIndex : null)) {
					ns.tabIndexOp(node);
				}
				return;
			case DATA_OVERRIDE:
				if (ns.updateOverride(node, node.dataset[OVERRIDE])) {
					ns.ariaHiddenOp(node, assignAriaHidden);
					ns.tabIndexOp(node);
				}
				return;
			case "aria-hidden":
				if (ns.updateAriaHiddenOrigin(node)) {
					ns.ariaHiddenOp(node, assignAriaHidden);
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
