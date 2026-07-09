<script setup lang="ts">
import { computed, ref } from "vue";

/**
 * Reactive reimplementation of framework/js/components/transfer.js — a dual-list
 * picker generated from a `data-vd-transfer` JSON array. Reproduces the
 * framework's generated DOM (`.vd-transfer` → panels + actions), per-panel
 * search, checkbox selection, and the move buttons. Dispatches a native
 * `transfer:change` CustomEvent so the documented
 * `el.addEventListener('transfer:change', ...)` API works.
 *
 * Two fixes-to-documented-intent vs the Vanilla JS:
 *  - items use `.is-selected` (what transfer.css actually styles); the docs API
 *    table's `.is-checked` is a stale typo.
 *  - the event detail is `{ selected, available }` (the documented shape used by
 *    the demo snippet's `e.detail.selected`); the Vanilla JS fired the wrong
 *    `{ source, target }`, so the documented `e.detail.selected` was undefined.
 */
interface TransferItem {
  id: string;
  label: string;
}

const props = defineProps<{ items: TransferItem[] }>();

const root = ref<HTMLElement | null>(null);
const sourceData = ref<TransferItem[]>(props.items.map((i) => ({ ...i })));
const targetData = ref<TransferItem[]>([]);
const sourceSelected = ref<Set<string>>(new Set());
const targetSelected = ref<Set<string>>(new Set());
const sourceFilter = ref("");
const targetFilter = ref("");

const filterItems = (data: TransferItem[], filter: string): TransferItem[] => {
  if (!filter) return data;
  const f = filter.toLowerCase();
  return data.filter((d) => d.label.toLowerCase().includes(f));
};

const filteredSource = computed(() =>
  filterItems(sourceData.value, sourceFilter.value),
);
const filteredTarget = computed(() =>
  filterItems(targetData.value, targetFilter.value),
);

const toggle = (which: "source" | "target", id: string): void => {
  const sel = which === "source" ? sourceSelected : targetSelected;
  const next = new Set(sel.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  sel.value = next;
};

const fireChange = (): void => {
  root.value?.dispatchEvent(
    new CustomEvent("transfer:change", {
      bubbles: true,
      detail: {
        selected: targetData.value.map((d) => d.id),
        available: sourceData.value.map((d) => d.id),
      },
    }),
  );
};

const moveRight = (): void => {
  if (sourceSelected.value.size === 0) return;
  const move = sourceData.value.filter((d) => sourceSelected.value.has(d.id));
  sourceData.value = sourceData.value.filter(
    (d) => !sourceSelected.value.has(d.id),
  );
  targetData.value = [...targetData.value, ...move];
  sourceSelected.value = new Set();
  fireChange();
};

const moveLeft = (): void => {
  if (targetSelected.value.size === 0) return;
  const move = targetData.value.filter((d) => targetSelected.value.has(d.id));
  targetData.value = targetData.value.filter(
    (d) => !targetSelected.value.has(d.id),
  );
  sourceData.value = [...sourceData.value, ...move];
  targetSelected.value = new Set();
  fireChange();
};

defineExpose({
  getSelected: () => targetData.value.map((d) => d.id),
});
</script>

<template>
  <div ref="root" class="vd-transfer">
    <!-- Source panel -->
    <div class="vd-transfer-panel">
      <div class="vd-transfer-header">
        <span>Source</span>
        <span class="vd-transfer-count" aria-live="polite">
          {{ sourceSelected.size }}/{{ sourceData.length }}
        </span>
      </div>
      <div class="vd-transfer-search">
        <input
          v-model="sourceFilter"
          type="text"
          placeholder="Search..."
          aria-label="Search source"
        />
      </div>
      <ul class="vd-transfer-list" role="listbox" aria-multiselectable="true">
        <li
          v-for="item in filteredSource"
          :key="item.id"
          class="vd-transfer-item"
          :class="{ 'is-selected': sourceSelected.has(item.id) }"
          role="option"
          :aria-selected="sourceSelected.has(item.id)"
          @click="toggle('source', item.id)"
        >
          <input
            type="checkbox"
            :checked="sourceSelected.has(item.id)"
            :aria-label="item.label"
            tabindex="-1"
          />
          <span>{{ item.label }}</span>
        </li>
      </ul>
    </div>

    <!-- Actions -->
    <div class="vd-transfer-actions">
      <button
        type="button"
        class="vd-transfer-btn"
        aria-label="Move to target"
        :disabled="sourceSelected.size === 0"
        @click="moveRight"
      >
        &#8250;
      </button>
      <button
        type="button"
        class="vd-transfer-btn"
        aria-label="Move to source"
        :disabled="targetSelected.size === 0"
        @click="moveLeft"
      >
        &#8249;
      </button>
    </div>

    <!-- Target panel -->
    <div class="vd-transfer-panel">
      <div class="vd-transfer-header">
        <span>Target</span>
        <span class="vd-transfer-count" aria-live="polite">
          {{ targetSelected.size }}/{{ targetData.length }}
        </span>
      </div>
      <div class="vd-transfer-search">
        <input
          v-model="targetFilter"
          type="text"
          placeholder="Search..."
          aria-label="Search target"
        />
      </div>
      <ul class="vd-transfer-list" role="listbox" aria-multiselectable="true">
        <li
          v-for="item in filteredTarget"
          :key="item.id"
          class="vd-transfer-item"
          :class="{ 'is-selected': targetSelected.has(item.id) }"
          role="option"
          :aria-selected="targetSelected.has(item.id)"
          @click="toggle('target', item.id)"
        >
          <input
            type="checkbox"
            :checked="targetSelected.has(item.id)"
            :aria-label="item.label"
            tabindex="-1"
          />
          <span>{{ item.label }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
