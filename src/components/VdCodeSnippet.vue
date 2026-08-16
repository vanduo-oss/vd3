<script setup lang="ts">
import { computed, ref } from "vue";
import VdIcon from "./VdIcon.vue";

const TAB_ORDER = [
  { key: "html", label: "HTML" },
  { key: "shell", label: "Shell" },
  { key: "css", label: "CSS" },
  { key: "js", label: "JavaScript" },
  { key: "vue", label: "Vue" },
  { key: "json", label: "JSON" },
] as const;

type TabKey = (typeof TAB_ORDER)[number]["key"];

interface Lang {
  key: TabKey;
  label: string;
  code: string;
}

interface Props {
  code?: string;
  language?: string;
  copyable?: boolean;
  html?: string;
  css?: string;
  js?: string;
  shell?: string;
  vue?: string;
  json?: string;
  defaultOpen?: boolean;
  toggleLabel?: string;
  collapsible?: boolean;
  /**
   * Optional highlighter. When set, the return value is injected with
   * `v-html`. The function MUST return escaped HTML. Copy always uses
   * the raw source. In chrome mode `language` is the tab key (`html`,
   * `js`, `vue`, …), not a cbun id. In simple mode it is the `language`
   * prop.
   */
  highlight?: (code: string, language: string) => string;
}

const props = withDefaults(defineProps<Props>(), {
  code: "",
  language: "html",
  copyable: true,
  defaultOpen: false,
  toggleLabel: "View Code",
  collapsible: true,
});

const langs = computed<Lang[]>(() => {
  const list: Lang[] = [];
  for (const tab of TAB_ORDER) {
    const value = props[tab.key];
    if (value) list.push({ key: tab.key, label: tab.label, code: value });
  }
  return list;
});

const isChrome = computed(() => langs.value.length > 0);

const panes = computed(() =>
  langs.value.map((l) => ({
    ...l,
    html: props.highlight ? props.highlight(l.code, l.key) : null,
  })),
);

const simpleHtml = computed(() =>
  props.highlight ? props.highlight(props.code, props.language) : null,
);

const expanded = ref(props.defaultOpen);
const active = ref<TabKey>(langs.value[0]?.key ?? "html");
const copied = ref(false);

const chromeExpanded = computed(() => !props.collapsible || expanded.value);

const activeCode = computed(
  () => langs.value.find((l) => l.key === active.value)?.code ?? props.code,
);

const toggle = (): void => {
  expanded.value = !expanded.value;
};

const onCopy = async (code: string): Promise<void> => {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  try {
    await navigator.clipboard.writeText(code);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    /* clipboard may be blocked */
  }
};
</script>

<template>
  <div
    v-if="isChrome"
    class="vd-code-snippet"
    v-bind="collapsible ? { 'data-collapsible': true } : {}"
    :data-expanded="chromeExpanded ? 'true' : 'false'"
  >
    <button
      v-if="collapsible"
      type="button"
      class="vd-code-snippet-toggle"
      :aria-expanded="expanded"
      @click="toggle"
    >
      <span class="vd-code-snippet-toggle-icon"></span>
      <span>{{ toggleLabel }}</span>
    </button>
    <div
      class="vd-code-snippet-content"
      :data-visible="chromeExpanded ? 'true' : 'false'"
    >
      <div class="vd-code-snippet-header">
        <div class="vd-code-snippet-tabs" role="tablist">
          <button
            v-for="l in langs"
            :key="l.key"
            class="vd-code-snippet-tab"
            :class="{ 'is-active': active === l.key }"
            :data-lang="l.key"
            type="button"
            role="tab"
            :aria-selected="active === l.key"
            @click="active = l.key"
          >
            {{ l.label }}
          </button>
        </div>
        <button
          v-if="copyable"
          type="button"
          class="vd-code-snippet-copy"
          :class="{ 'is-copied': copied }"
          :aria-label="copied ? 'Copied' : 'Copy code'"
          @click="onCopy(activeCode)"
        >
          <span class="vd-code-snippet-copy-icon"></span>
          <span class="vd-code-snippet-copy-text">{{
            copied ? "Copied" : "Copy"
          }}</span>
        </button>
      </div>
      <div class="vd-code-snippet-body">
        <!-- highlight() MUST return escaped HTML; default path interpolates. -->
        <pre
          v-for="l in panes"
          :key="l.key"
          class="vd-code-snippet-pane"
          :class="{ 'is-active': active === l.key }"
          :data-lang="l.key"
          :tabindex="chromeExpanded && active === l.key ? 0 : -1"
        ><code v-if="l.html != null" v-html="l.html" /><code v-else>{{ l.code }}</code></pre>
      </div>
    </div>
  </div>
  <figure
    v-else
    class="vd-code-snippet vd-code-snippet-simple vd-code-snippet-single"
  >
    <div v-if="copyable" class="vd-code-snippet-header">
      <button
        type="button"
        class="vd-btn vd-btn-ghost vd-btn-sm vd-code-snippet-copy"
        :class="{ 'is-copied': copied }"
        :aria-label="copied ? 'Copied' : 'Copy code'"
        @click="onCopy(code)"
      >
        <VdIcon :name="copied ? 'check' : 'copy'" />
        <span>{{ copied ? "Copied" : "Copy" }}</span>
      </button>
    </div>
    <pre
      :class="['vd-code-snippet-pre', `language-${language}`]"
      :data-language="language"
    ><code v-if="simpleHtml != null" v-html="simpleHtml" /><code v-else>{{ code }}</code></pre>
  </figure>
</template>
