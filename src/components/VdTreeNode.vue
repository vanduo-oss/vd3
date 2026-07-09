<script setup lang="ts">
import { computed } from "vue";

/** A single recursive tree node — see VdTree.vue for the data model and events. */
export interface TreeNode {
  id?: string;
  label?: string;
  icon?: string;
  open?: boolean;
  checked?: boolean;
  children?: TreeNode[];
}

const props = defineProps<{ node: TreeNode; checkbox: boolean }>();
const emit = defineEmits<{
  (e: "toggle", node: TreeNode): void;
  (e: "check", node: TreeNode, checked: boolean): void;
}>();

const hasChildren = computed(
  () => !!props.node.children && props.node.children.length > 0,
);

const onToggle = (): void => {
  // The tree mutates its shared, reactive node model in place by design — the
  // parent VdTree owns the node objects and reacts to the change.
  // eslint-disable-next-line vue/no-mutating-props
  props.node.open = !props.node.open;
  emit("toggle", props.node);
};

const onCheck = (e: Event): void => {
  emit("check", props.node, (e.target as HTMLInputElement).checked);
};
</script>

<template>
  <li
    class="vd-tree-node"
    role="treeitem"
    :class="{ 'is-open': node.open }"
    :aria-expanded="hasChildren ? (node.open ? 'true' : 'false') : undefined"
  >
    <div class="vd-tree-node-content">
      <button
        v-if="hasChildren"
        type="button"
        class="vd-tree-toggle"
        aria-label="Toggle"
        @click.stop="onToggle"
      ></button>
      <span v-else class="vd-tree-toggle-placeholder"></span>

      <input
        v-if="checkbox"
        type="checkbox"
        class="vd-tree-checkbox"
        :checked="node.checked"
        :aria-label="node.label"
        @change.stop="onCheck"
        @click.stop
      />

      <span v-if="node.icon" class="vd-tree-icon" :class="node.icon"></span>
      <span class="vd-tree-label" tabindex="-1">{{ node.label }}</span>
    </div>

    <ul v-if="hasChildren" class="vd-tree-children" role="group">
      <VdTreeNode
        v-for="(child, i) in node.children"
        :key="child.id ?? i"
        :node="child"
        :checkbox="checkbox"
        @toggle="(n) => emit('toggle', n)"
        @check="(n, c) => emit('check', n, c)"
      />
    </ul>
  </li>
</template>
