<script setup lang="ts">
interface Props {
  value?: number;
  max?: number;
  indeterminate?: boolean;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  value: 0,
  max: 100,
  indeterminate: false,
  label: "",
});

const pct = (): number => {
  if (props.indeterminate) return 0;
  const m = props.max || 100;
  return Math.max(0, Math.min(100, (props.value / m) * 100));
};
</script>

<template>
  <div
    class="vd-progress"
    :class="[indeterminate ? 'is-indeterminate' : null]"
    role="progressbar"
    :aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuenow="indeterminate ? undefined : value"
    :aria-label="label || 'Progress'"
  >
    <div class="vd-progress-track">
      <div
        class="vd-progress-fill"
        :style="indeterminate ? undefined : { width: `${pct()}%` }"
      />
    </div>
    <span
      v-if="!indeterminate && label"
      class="vd-progress-label vd-text-sm vd-muted"
    >
      {{ label }} — {{ Math.round(pct()) }}%
    </span>
  </div>
</template>
