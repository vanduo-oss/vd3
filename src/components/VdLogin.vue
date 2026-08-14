<script setup lang="ts">
import { computed, ref } from "vue";
import VdAlert from "./VdAlert.vue";
import VdAuthCard from "./VdAuthCard.vue";
import VdAvatar from "./VdAvatar.vue";
import VdButton from "./VdButton.vue";
import VdCheckbox from "./VdCheckbox.vue";
import VdIcon from "./VdIcon.vue";
import VdInput from "./VdInput.vue";
import VdSeparator from "./VdSeparator.vue";
import VdStack from "./primitives/VdStack.vue";
import type { AuthProvider, LoginSubmit } from "./auth-types";

export type { AuthProvider, LoginSubmit };

interface Props {
  identifierType?: "email" | "text";
  identifierLabel?: string;
  passwordLabel?: string;
  submitLabel?: string;
  rememberLabel?: string;
  remember?: boolean;
  loading?: boolean;
  error?: string;
  message?: string;
  providers?: readonly AuthProvider[];
  title?: string;
  glass?: boolean;
  elevated?: boolean;
  framed?: boolean;
  avatarSrc?: string;
  avatarInitials?: string;
}

const props = withDefaults(defineProps<Props>(), {
  identifierType: "email",
  identifierLabel: "Email",
  passwordLabel: "Password",
  submitLabel: "Sign in",
  rememberLabel: "Remember me",
  remember: true,
  loading: false,
  error: "",
  message: "",
  providers: () => [],
  title: "Sign in",
  glass: true,
  elevated: true,
  framed: true,
  avatarSrc: "",
  avatarInitials: "",
});

const emit = defineEmits<{
  submit: [value: LoginSubmit];
  social: [id: string];
}>();

const identifier = ref("");
const password = ref("");
const rememberMe = ref(false);

const identifierAutocomplete = computed(() =>
  props.identifierType === "email" ? "email" : "username",
);

const showBrand = computed(() =>
  Boolean(props.avatarSrc || props.avatarInitials),
);

const onSubmit = (): void => {
  emit("submit", {
    identifier: identifier.value,
    password: password.value,
    remember: rememberMe.value,
  });
};

const onSocial = (id: string): void => {
  emit("social", id);
};
</script>

<template>
  <VdAuthCard
    :title="title"
    :glass="glass"
    :elevated="elevated"
    :framed="framed"
  >
    <template v-if="showBrand || $slots.brand" #brand>
      <slot name="brand">
        <VdAvatar :src="avatarSrc" :initials="avatarInitials" size="lg" />
      </slot>
    </template>
    <template v-if="error || message" #alert>
      <VdAlert v-if="error" variant="danger">{{ error }}</VdAlert>
      <VdAlert v-else-if="message" variant="success">{{ message }}</VdAlert>
    </template>
    <form class="vd-auth-form" @submit.prevent="onSubmit">
      <slot name="extra" />
      <VdStack gap="fib-8">
        <VdInput
          v-model="identifier"
          :type="identifierType"
          :label="identifierLabel"
          :autocomplete="identifierAutocomplete"
          required
          name="identifier"
        />
        <VdInput
          v-model="password"
          type="password"
          :label="passwordLabel"
          autocomplete="current-password"
          reveal-password
          required
          name="password"
        />
        <VdCheckbox
          v-if="remember"
          v-model="rememberMe"
          :label="rememberLabel"
          name="remember"
        />
        <VdButton type="submit" class="vd-btn-block" :loading="loading">
          {{ submitLabel }}
        </VdButton>
      </VdStack>
    </form>
    <template v-if="providers.length">
      <VdSeparator label="or" />
      <div class="vd-auth-social">
        <VdButton
          v-for="provider in providers"
          :key="provider.id"
          type="button"
          variant="ghost"
          class="vd-btn-block"
          @click="onSocial(provider.id)"
        >
          <VdIcon v-if="provider.icon" :name="provider.icon" size="sm" />
          {{ provider.label }}
        </VdButton>
      </div>
    </template>
    <template v-if="$slots.links" #footer>
      <div class="vd-auth-links">
        <slot name="links" />
      </div>
    </template>
  </VdAuthCard>
</template>
