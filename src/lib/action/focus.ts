import { readable } from "svelte/store";
import type { Unsubscriber } from "svelte/store";

export interface FocusOptions {
	enabled?: boolean;
	assignAriaHidden?: boolean;
}

export interface FocusAction {
	update(enabled: boolean);
	update(opts: FocusOptions);
	destroy();
}
const FOCUSED = "focusEnabledBy";
const UNFOCUSED = "focusDisabledBy";
const OVERRIDE = "focusOverride";
const DATA_OVERRIDE = "data-focus-override";
const ORIGINAL_TABINDEX = "focusTabindex";
const HAS_TABINDEX = "focusHasTabindex";
const ARIA_HIDDEN = "focusAriaHidden";
const ARIA_HIDDEN_BY = "focusHiddenBy";
const ARIA_SHOWN_BY = "focusShownBy";
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
		attributeFilter: ["tabindex", DATA_OVERRIDE], //DATA_FOCUSED, DATA_UNFOCUSED,
		attributeOldValue: true,
		childList: true,
		subtree: true,
	});
	return () => {
		observer.disconnect();
	};
});

function allNodes(): NodeListOf<Element> {
	return document.querySelectorAll("*");
}

function dataIdList(node: HTMLElement, key: string): string[] {
	return (node.dataset[key] || "").split(" ").filter((v) => v);
}

function addIdToDataset(node: HTMLElement, key: string, id: string) {
	const list = dataIdList(node, key);
	if (!list.includes(id)) {
		list.push(id);
	}

	node.dataset[key] = list.join(" ");
	return list;
}

function removeIdFromDataset(node: HTMLElement, key: string, id: string) {
	const val = node.dataset[key];
	if (val === undefined) {
		return [];
	}
	const result = val.split(" ").filter((v) => v !== id && v.trim() !== "");

	if (result.length === 0) {
		delete node.dataset[key];
		return result;
	}
	node.dataset[key] = result.join(" ");
	return result;
}

function assignFocused(node: HTMLElement, id: string) {
	return addIdToDataset(node, FOCUSED, id);
}

function assignUnfocused(node: HTMLElement, id: string) {
	return addIdToDataset(node, UNFOCUSED, id);
}

function removeFocused(node: HTMLElement, id: string) {
	return removeIdFromDataset(node, FOCUSED, id);
}

function removeUnfocused(node: HTMLElement, id: string) {
	return removeIdFromDataset(node, UNFOCUSED, id);
}

function nodeHasState(node: HTMLElement): boolean {
	return !!node.dataset[FOCUSED] || !!node.dataset[UNFOCUSED];
}

const usedIds = new Set<string>();

function generateId(): string {
	const val = [...crypto.getRandomValues(new Uint8Array(7))]
		.map(
			(x, i) => (
				(i = ((x / 255) * 61) | 0), String.fromCharCode(i + (i > 9 ? (i > 35 ? 61 : 55) : 48))
			),
		)
		.join("");
	if (usedIds.has(val)) {
		return generateId();
	}
	usedIds.add(val);
	return val;
}

export function focus(element: HTMLElement, opts: FocusOptions | boolean): FocusAction {
	const id = generateId();
	let isEnabled = false;
	let assignAriaHidden = false;
	if (typeof document === "undefined") {
		return;
	}

	function assignStateToNode(node: Node) {
		if (!(node instanceof HTMLElement)) {
			return;
		}
		const hasState = nodeHasState(node);
		if (!hasState) {
			node.dataset[ORIGINAL_TABINDEX] = node.tabIndex.toString();
			if (node.getAttribute("tabindex") === null) {
				node.dataset[HAS_TABINDEX] = "false";
			} else {
				node.dataset[HAS_TABINDEX] = "true";
			}
		}

		let focused: string[] = [];
		let unfocused: string[] = [];

		const elementContainsNode = element.contains(node);

		if (elementContainsNode) {
			focused = assignFocused(node, id);
			unfocused = dataIdList(node, UNFOCUSED);
		} else {
			unfocused = assignUnfocused(node, id);
			focused = dataIdList(node, FOCUSED);
		}

		const override = node.dataset[OVERRIDE];

		if (unfocused.length && !focused.length && override !== "focus") {
			node.tabIndex = -1;
		}
		const originalIndex = +node.dataset[ORIGINAL_TABINDEX];
		if (focused.length && node.tabIndex !== originalIndex) {
			node.tabIndex = originalIndex;
		}

		if (assignAriaHidden) {
			const nodeContainsElement = node.contains(element);

			const existingHidden = node.getAttribute("aria-hidden");
			if (!hasState) {
				if (existingHidden) {
					node.dataset[ARIA_HIDDEN] = existingHidden;
				}
			}
			const ariaHiddenSet = node.dataset[ARIA_HIDDEN];

			let hiddenBy: string[];
			let shownBy: string[];
			if (!nodeContainsElement && !elementContainsNode) {
				hiddenBy = addIdToDataset(node, ARIA_HIDDEN_BY, id);
				shownBy = dataIdList(node, ARIA_SHOWN_BY);
			} else {
				shownBy = addIdToDataset(node, ARIA_SHOWN_BY, id);
				hiddenBy = dataIdList(node, ARIA_HIDDEN_BY);
			}
			if (hiddenBy.length > 0 && shownBy.length === 0 && node.dataset[OVERRIDE] !== "focus") {
				node.setAttribute("aria-hidden", "true");
			} else if (shownBy.length > 0 && node.dataset[OVERRIDE] !== "focus") {
				const ariaHidden = node.getAttribute("aria-hidden");
				if (ariaHiddenSet !== ariaHidden && ariaHidden !== "false") {
					node.setAttribute("aria-hidden", "false");
				}
			}
		}
	}
	function removeStateFromNode(node: Node) {
		if (!(node instanceof HTMLElement)) {
			return;
		}
		removeFocused(node, id);
		removeUnfocused(node, id);
		const { dataset } = node;
		const hasState = nodeHasState(node);

		if (!hasState) {
			const tabindex = +node.dataset[ORIGINAL_TABINDEX];
			delete dataset[ORIGINAL_TABINDEX];
			if (dataset[HAS_TABINDEX] === "false") {
				node.removeAttribute("tabindex");
			} else {
				node.tabIndex = tabindex;
			}
			delete dataset[HAS_TABINDEX];
		} else if (!dataIdList(node, FOCUSED).length && node.dataset[OVERRIDE] !== "focus") {
			node.tabIndex = -1;
		}

		if (assignAriaHidden) {
			const hiddenBy = removeIdFromDataset(node, ARIA_HIDDEN_BY, id);
			const shownBy = removeIdFromDataset(node, ARIA_SHOWN_BY, id);
			const ariaHiddenSet = node.dataset[ARIA_HIDDEN];

			if (shownBy.length > 0 && hiddenBy.length === 0) {
				if (ariaHiddenSet) {
					node.setAttribute("aria-hidden", ariaHiddenSet);
				} else {
					node.removeAttribute("aria-hidden");
				}
			}
			if (!hasState) {
				if (ariaHiddenSet) {
					node.setAttribute("aria-hidden", ariaHiddenSet);
				} else {
					node.removeAttribute("aria-hidden");
				}
				delete dataset[ARIA_HIDDEN];
				delete dataset[ARIA_HIDDEN_BY];
				delete dataset[ARIA_SHOWN_BY];
			}
		}
	}

	const assignStateToNodes = (nodes: NodeListOf<Node>) => nodes.forEach(assignStateToNode);

	const removeStateFromNodes = (nodes: NodeListOf<Node>) => nodes.forEach(removeStateFromNode);
	let unsubscribe: Unsubscriber;

	function handleAttributeChange(mutation: MutationRecord) {
		const { target } = mutation;
		if (!(target instanceof HTMLElement)) {
			return;
		}
		const value = target.getAttribute(mutation.attributeName);
		const { attributeName, oldValue } = mutation;
		if (oldValue === value) {
			return;
		}
		if (attributeName === "tabindex") {
			if (oldValue !== null && value !== "-1" && value !== target.dataset[ORIGINAL_TABINDEX]) {
				target.dataset[ORIGINAL_TABINDEX] = value;
				target.tabIndex = +oldValue;
			}
		}
	}

	function handleMutation(mutation: MutationRecord) {
		if (mutation.type === "childList" && mutation.addedNodes) {
			assignStateToNodes(mutation.addedNodes);
			mutation.addedNodes.forEach((node) => {
				assignStateToNodes(node.childNodes);
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
			isEnabled = opts?.enabled;
			assignAriaHidden = opts?.assignAriaHidden;
		}

		if (!isEnabled) {
			return destroy();
		}
		if (!unsubscribe) {
			unsubscribe = mutations.subscribe(handleMutations);
		}
		assignStateToNodes(allNodes());
	}
	function destroy() {
		if (unsubscribe) {
			unsubscribe();
			unsubscribe = undefined;
		}
		removeStateFromNodes(allNodes());
	}
	if (opts === true || (typeof opts === "object" && opts?.enabled)) {
		update(opts);
	}

	return { update, destroy };
}
