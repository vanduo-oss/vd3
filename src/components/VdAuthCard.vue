<script setup lang="ts">
import VdCard from "./VdCard.vue";
import VdCenter from "./primitives/VdCenter.vue";
import VdCover from "./primitives/VdCover.vue";
import VdStack from "./primitives/VdStack.vue";

interface Props {
  title?: string;
  glass?: boolean;
  elevated?: boolean;
  framed?: boolean;
}

withDefaults(defineProps<Props>(), {
  title: "",
  glass: true,
  elevated: true,
  framed: true,
});
</script>

<template>
  <VdCover v-if="framed" min="screen" gap="fib-8">
    <VdCenter max="fib-377" axis="horizontal">
      <VdCard class="vd-auth" :glass="glass" :elevated="elevated">
        <VdStack gap="fib-13">
          <div v-if="$slots.brand" class="vd-auth-brand">
            <slot name="brand" />
          </div>
          <div v-if="$slots.title || title" class="vd-auth-title">
            <slot name="title">
              <h1 class="vd-auth-heading">{{ title }}</h1>
            </slot>
          </div>
          <div v-if="$slots.alert" class="vd-auth-alert">
            <slot name="alert" />
          </div>
          <slot />
          <div v-if="$slots.footer" class="vd-auth-footer">
            <slot name="footer" />
          </div>
        </VdStack>
      </VdCard>
    </VdCenter>
  </VdCover>
  <VdStack v-else class="vd-auth" gap="fib-13">
    <div v-if="$slots.brand" class="vd-auth-brand">
      <slot name="brand" />
    </div>
    <div v-if="$slots.title || title" class="vd-auth-title">
      <slot name="title">
        <h1 class="vd-auth-heading">{{ title }}</h1>
      </slot>
    </div>
    <div v-if="$slots.alert" class="vd-auth-alert">
      <slot name="alert" />
    </div>
    <slot />
    <div v-if="$slots.footer" class="vd-auth-footer">
      <slot name="footer" />
    </div>
  </VdStack>
</template>
