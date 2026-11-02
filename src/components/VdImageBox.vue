<script setup lang="ts">
import { computed, ref } from "vue";
import { useImageBox } from "../composables/useImageBox";

export interface VdImageItem {
  src: string;
  fullSrc?: string;
  alt?: string;
  caption?: string;
  orientation?: "landscape" | "portrait" | "square";
}

type GalleryLayout = "grid" | "masonry" | "bento" | "filmstrip" | "single";
type GalleryGap = "fib-5" | "fib-8" | "fib-13" | "fib-21";
type GalleryRatio = "auto" | "1-1" | "4-3" | "16-9" | "3-4" | "golden";

interface Props {
  src?: string;
  fullSrc?: string;
  alt?: string;
  caption?: string;
  items?: VdImageItem[];
  layout?: GalleryLayout;
  columns?: 2 | 3 | 4;
  gap?: GalleryGap;
  ratio?: GalleryRatio;
  captionDisplay?: "lightbox" | "overlay" | "below";
  group?: string;
}

const props = withDefaults(defineProps<Props>(), {
  src: "",
  fullSrc: "",
  alt: "",
  caption: "",
  items: () => [],
  layout: undefined,
  columns: 3,
  gap: "fib-13",
  ratio: "auto",
  captionDisplay: "lightbox",
  group: "",
});

const root = ref<HTMLElement | null>(null);
useImageBox(root);

const images = computed<VdImageItem[]>(() => {
  if (props.items.length > 0) return props.items;
  if (!props.src) return [];
  return [
    {
      src: props.src,
      fullSrc: props.fullSrc || props.src,
      alt: props.alt,
      caption: props.caption,
    },
  ];
});

const layout = computed(() => {
  if (props.layout) return props.layout;
  return images.value.length > 1 ? "grid" : "single";
});

const rootStyle = computed(() => ({
  "--vd-image-box-columns": String(props.columns),
}));
</script>

<template>
  <div
    ref="root"
    class="vd-image-gallery"
    :class="`vd-image-gallery-${layout}`"
    :data-gap="gap"
    :data-ratio="ratio"
    :style="rootStyle"
  >
    <figure
      v-for="(image, index) in images"
      :key="`${image.src}-${index}`"
      class="vd-image-box-figure"
    >
      <img
        class="vd-image-box-thumb"
        :src="image.src"
        :alt="image.alt || ''"
        data-image-box
        :data-image-box-full-src="image.fullSrc || image.src"
        :data-image-box-caption="image.caption || undefined"
        :data-image-box-group="group || undefined"
        :data-orientation="image.orientation"
        loading="lazy"
        decoding="async"
      />
      <figcaption
        v-if="image.caption && captionDisplay === 'below'"
        class="vd-image-box-caption-below"
      >
        {{ image.caption }}
      </figcaption>
      <figcaption
        v-else-if="image.caption && captionDisplay === 'overlay'"
        class="vd-image-box-caption-overlay"
      >
        {{ image.caption }}
      </figcaption>
    </figure>
  </div>
</template>
