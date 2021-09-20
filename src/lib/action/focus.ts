import { readable } from "svelte/store";
import type { Unsubscriber } from "svelte/store";

export interface FocusAction {
	update(enabled: boolean);
	destroy();
}

const FOCUSED = "focusEnabledBy";

const UNFOCUSED = "focusDisabledBy";

const OVERRIDE = "focusOverride";

const DATA_OVERRIDE = `data-focus-override`;

const ORIGINAL_TABINDEX = "focusTabindex";

const HAS_TABINDEX = "focusHasTabindex";

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
	const result = val.split(" ").filter((v) => v !== id && v !== "");

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

export function focus(element: HTMLElement, enabled: boolean): FocusAction {
	// bail if this is the server
	// not sure if document from $app/env can be used in non-sveltekit projects
	if (typeof document === "undefined") {
		return;
	}
	// source https://stackoverflow.com/a/62504318/48266
	const id = [...crypto.getRandomValues(new Uint8Array(7))]
		.map(
			(x, i) => (
				(i = ((x / 255) * 61) | 0), String.fromCharCode(i + (i > 9 ? (i > 35 ? 61 : 55) : 48))
			),
		)
		.join("");
	function assignStateToNode(node: Node) {
		if (!(node instanceof HTMLElement)) {
			return;
		}
		if (!nodeHasState(node)) {
			node.dataset[ORIGINAL_TABINDEX] = node.tabIndex.toString();
			if (node.getAttribute("tabindex") === null) {
				node.dataset[HAS_TABINDEX] = "false";
			} else {
				node.dataset[HAS_TABINDEX] = "true";
			}
		}

		let focused: string[] = [];
		let unfocused: string[] = [];
		if (element.contains(node)) {
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
		if (focused.length) {
			node.tabIndex = +node.dataset[ORIGINAL_TABINDEX];
		}
	}
	function removeStateFromNode(node: Node) {
		if (!(node instanceof HTMLElement)) {
			return;
		}
		if (element.contains(node)) {
			removeFocused(node, id);
		} else {
			removeUnfocused(node, id);
		}
		if (!nodeHasState(node)) {
			const tabindex = +node.dataset[ORIGINAL_TABINDEX];
			delete node.dataset[ORIGINAL_TABINDEX];
			if (node.dataset[HAS_TABINDEX] === "false") {
				node.removeAttribute("tabindex");
			} else {
				node.tabIndex = tabindex;
			}
			delete node.dataset[HAS_TABINDEX];
			return;
		}
		if (!dataIdList(node, FOCUSED).length && node.dataset[OVERRIDE] !== "focus") {
			node.tabIndex = -1;
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

	function update(enabled: boolean) {
		if (!enabled) {
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
	if (enabled) {
		update(enabled);
	}

	return { update, destroy };
}
