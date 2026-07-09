<script setup lang="ts">
type Variant =
  "primary" | "secondary" | "success" | "warning" | "error" | "info";

interface Column {
  key: string;
  label: string;
  variant?: Variant;
}

interface Props {
  columns: readonly Column[];
  rows: readonly Record<string, string | number>[];
  striped?: boolean;
  bordered?: boolean;
  hover?: boolean;
  caption?: string;
}

withDefaults(defineProps<Props>(), {
  striped: false,
  bordered: false,
  hover: false,
  caption: "",
});
</script>

<template>
  <div class="vd-table-responsive">
    <table
      class="vd-table"
      :class="{
        'vd-table-striped': striped,
        'vd-table-bordered': bordered,
        'vd-table-hover': hover,
      }"
    >
      <caption v-if="caption" class="vd-table-caption">
        {{
          caption
        }}
      </caption>
      <thead class="vd-table-header">
        <tr>
          <th v-for="col in columns" :key="col.key" scope="col">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIdx) in rows" :key="rowIdx">
          <td v-for="col in columns" :key="col.key">
            {{ row[col.key] }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
