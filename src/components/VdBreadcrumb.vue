<script setup lang="ts">
import { computed, useSlots } from "vue";

/**
 * Markup-only breadcrumb honoring `css/components/breadcrumbs.css`: a
 * `nav` (default `aria-label="Breadcrumb"`) wrapping `ol.vd-breadcrumb`
 * whose `li.vd-breadcrumb-item` entries come from `items` or the default
 * slot. Link items render `a.vd-breadcrumb-link`; the current item
 * (explicit `current: true` or, absent any, the last item) renders with
 * `.vd-breadcrumb-current` + `aria-current="page"` and no anchor. Installs
 * no listeners.
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

type Separator = "slash" | "chevron" | "arrow" | "dot" | "pipe";
type Size = "sm" | "lg";

interface Props {
  items?: BreadcrumbItem[];
  separator?: Separator;
  size?: Size;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  separator: "slash",
  ariaLabel: "Breadcrumb",
});

defineSlots<{ default?: () => unknown }>();

const slots = useSlots();
const hasSlot = computed(() => !!slots.default);

const hasExplicitCurrent = computed(() =>
  props.items.some((item) => item.current),
);

const isCurrent = (item: BreadcrumbItem, index: number): boolean => {
  if (hasExplicitCurrent.value) return item.current === true;
  return index === props.items.length - 1;
};

const listClasses = computed(() => [
  "vd-breadcrumb",
  `vd-breadcrumb-separator-${props.separator}`,
  props.size ? `vd-breadcrumb-${props.size}` : null,
]);
</script>

<template>
  <nav class="vd-breadcrumbs" :aria-label="ariaLabel">
    <ol :class="listClasses">
      <slot v-if="hasSlot" />
      <template v-else>
        <li
          v-for="(item, index) in items"
          :key="index"
          class="vd-breadcrumb-item"
          :class="{ 'vd-breadcrumb-current': isCurrent(item, index) }"
          :aria-current="isCurrent(item, index) ? 'page' : undefined"
        >
          <a
            v-if="!isCurrent(item, index) && item.href"
            class="vd-breadcrumb-link"
            :href="item.href"
            >{{ item.label }}</a
          >
          <template v-else>{{ item.label }}</template>
        </li>
      </template>
    </ol>
  </nav>
</template>
