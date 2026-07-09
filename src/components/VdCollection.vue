<script setup lang="ts">
type Size = "sm" | "md" | "lg";

interface CollectionItem {
  id: string | number;
  avatar?: string;
  title: string;
  subtitle?: string;
  action?: string;
}

interface Props {
  items: readonly CollectionItem[];
  header?: string;
  hoverable?: boolean;
  bordered?: boolean;
  size?: Size;
}

withDefaults(defineProps<Props>(), {
  header: "",
  hoverable: false,
  bordered: false,
  size: "md",
});
</script>

<template>
  <div
    class="vd-collection"
    :class="[
      `vd-collection-${size}`,
      {
        'vd-collection-hoverable': hoverable,
        'vd-collection-bordered': bordered,
      },
    ]"
  >
    <div v-if="header" class="vd-collection-header">
      <h3 class="vd-collection-title">
        {{ header }}
      </h3>
    </div>
    <ul class="vd-collection-list">
      <li v-for="item in items" :key="item.id" class="vd-collection-item">
        <div v-if="item.avatar" class="vd-collection-avatar">
          <img :src="item.avatar" :alt="item.subtitle || item.title" />
        </div>
        <div class="vd-collection-content">
          <div class="vd-collection-text">
            <strong class="vd-collection-title">{{ item.title }}</strong>
            <span v-if="item.subtitle" class="vd-collection-text-secondary">{{
              item.subtitle
            }}</span>
          </div>
        </div>
        <div v-if="item.action" class="vd-collection-action">
          {{ item.action }}
        </div>
      </li>
    </ul>
  </div>
</template>
