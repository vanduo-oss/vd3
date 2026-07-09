<script setup lang="ts">
import { reactive, ref } from "vue";
import VdTreeNode, { type TreeNode } from "./VdTreeNode.vue";

/**
 * Reactive reimplementation of framework/js/components/tree.js — renders
 * hierarchical `data-vd-tree` JSON as an expand/collapse tree with optional
 * checkbox selection and parent→child cascade. Reproduces the framework's
 * generated DOM (`.vd-tree[role=tree]` → `.vd-tree-node` → `.vd-tree-node-content`
 * → `.vd-tree-children`), `getChecked()`, and keyboard navigation.
 *
 * Fixes-to-documented-intent vs the Vanilla JS:
 *  - fires `tree:toggle` with `{ id, open }` (listed in the docs API table but
 *    never dispatched by the Vanilla JS) and `tree:check` with the documented
 *    `{ checked: string[], node: string }` shape (Vanilla fired a single
 *    `{ id, checked: boolean, label }`).
 *  - Arrow Left/Right collapse/expand the focused branch (documented keyboard
 *    support the Vanilla JS omitted; it only handled Up/Down).
 */
const props = defineProps<{
  nodes: TreeNode[];
  checkbox?: boolean;
  cascade?: boolean;
}>();

const root = ref<HTMLElement | null>(null);

const clone = (nodes: TreeNode[]): TreeNode[] =>
  nodes.map((n) => ({
    ...n,
    children: n.children ? clone(n.children) : undefined,
  }));

const tree = reactive(clone(props.nodes));

const setChildChecked = (items: TreeNode[], checked: boolean): void => {
  items.forEach((item) => {
    item.checked = checked;
    if (item.children) setChildChecked(item.children, checked);
  });
};

const collectChecked = (items: TreeNode[], acc: string[] = []): string[] => {
  items.forEach((i) => {
    if (i.checked) acc.push(i.id ?? i.label ?? "");
    if (i.children) collectChecked(i.children, acc);
  });
  return acc;
};

const onCheck = (node: TreeNode, checked: boolean): void => {
  node.checked = checked;
  if ((props.cascade ?? true) && node.children) {
    setChildChecked(node.children, checked);
  }
  root.value?.dispatchEvent(
    new CustomEvent("tree:check", {
      bubbles: true,
      detail: { checked: collectChecked(tree), node: node.id },
    }),
  );
};

const onToggle = (node: TreeNode): void => {
  root.value?.dispatchEvent(
    new CustomEvent("tree:toggle", {
      bubbles: true,
      detail: { id: node.id, open: !!node.open },
    }),
  );
};

const onKeydown = (e: KeyboardEvent): void => {
  const host = root.value;
  const active = document.activeElement;
  if (!host || !active || !host.contains(active)) return;
  const contents = Array.from(
    host.querySelectorAll<HTMLElement>(".vd-tree-node-content"),
  );
  const current = active.closest(".vd-tree-node-content") as HTMLElement | null;
  const idx = current ? contents.indexOf(current) : -1;
  if (idx === -1) return;

  const focusAt = (i: number): void => {
    contents[i]
      ?.querySelector<HTMLElement>(".vd-tree-toggle, .vd-tree-label")
      ?.focus();
  };

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      if (idx < contents.length - 1) focusAt(idx + 1);
      break;
    case "ArrowUp":
      e.preventDefault();
      if (idx > 0) focusAt(idx - 1);
      break;
    case "ArrowRight": {
      e.preventDefault();
      const node = current?.closest(".vd-tree-node");
      const toggle =
        current?.querySelector<HTMLButtonElement>(".vd-tree-toggle");
      if (toggle && !node?.classList.contains("is-open")) toggle.click();
      break;
    }
    case "ArrowLeft": {
      e.preventDefault();
      const node = current?.closest(".vd-tree-node");
      const toggle =
        current?.querySelector<HTMLButtonElement>(".vd-tree-toggle");
      if (toggle && node?.classList.contains("is-open")) toggle.click();
      break;
    }
  }
};

defineExpose({ getChecked: () => collectChecked(tree) });
</script>

<template>
  <div ref="root" class="vd-tree" role="tree" @keydown="onKeydown">
    <VdTreeNode
      v-for="(node, i) in tree"
      :key="node.id ?? i"
      :node="node"
      :checkbox="!!checkbox"
      @toggle="onToggle"
      @check="onCheck"
    />
  </div>
</template>
