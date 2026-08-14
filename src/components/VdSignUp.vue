<script setup lang="ts">
import { computed, ref } from "vue";
import VdAlert from "./VdAlert.vue";
import VdAuthCard from "./VdAuthCard.vue";
import VdAvatar from "./VdAvatar.vue";
import VdButton from "./VdButton.vue";
import VdCheckbox from "./VdCheckbox.vue";
import VdInput from "./VdInput.vue";
import VdStack from "./primitives/VdStack.vue";
import type { SignUpSubmit } from "./auth-types";

export type { SignUpSubmit };

interface Props {
  nameLabel?: string;
  emailLabel?: string;
  passwordLabel?: string;
  confirmLabel?: string;
  termsLabel?: string;
  submitLabel?: string;
  loading?: boolean;
  error?: string;
  message?: string;
  title?: string;
  glass?: boolean;
  elevated?: boolean;
  framed?: boolean;
  avatarSrc?: string;
  avatarInitials?: string;
  requireTerms?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  nameLabel: "Name",
  emailLabel: "Email",
  passwordLabel: "Password",
  confirmLabel: "Confirm password",
  termsLabel: "I agree to the terms",
  submitLabel: "Create account",
  loading: false,
  error: "",
  message: "",
  title: "Create an account",
  glass: true,
  elevated: true,
  framed: true,
  avatarSrc: "",
  avatarInitials: "",
  requireTerms: true,
});

const emit = defineEmits<{
  submit: [value: SignUpSubmit];
}>();

const name = ref("");
const email = ref("");
const password = ref("");
const confirm = ref("");
const terms = ref(false);
const nameError = ref("");
const emailError = ref("");
const passwordError = ref("");
const confirmError = ref("");
const termsError = ref("");

const showBrand = computed(() =>
  Boolean(props.avatarSrc || props.avatarInitials),
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const onSubmit = (): void => {
  nameError.value = "";
  emailError.value = "";
  passwordError.value = "";
  confirmError.value = "";
  termsError.value = "";

  let ok = true;
  if (!name.value.trim()) {
    nameError.value = "This field is required";
    ok = false;
  }
  if (!email.value.trim()) {
    emailError.value = "This field is required";
    ok = false;
  } else if (!EMAIL_RE.test(email.value)) {
    emailError.value = "Please enter a valid email address";
    ok = false;
  }
  if (!password.value) {
    passwordError.value = "This field is required";
    ok = false;
  }
  if (password.value !== confirm.value) {
    confirmError.value = "Fields do not match";
    ok = false;
  }
  if (props.requireTerms && !terms.value) {
    termsError.value = "This field is required";
    ok = false;
  }
  if (!ok) return;

  emit("submit", {
    name: name.value.trim(),
    email: email.value.trim(),
    password: password.value,
    terms: terms.value,
  });
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
          v-model="name"
          type="text"
          :label="nameLabel"
          autocomplete="name"
          required
          name="name"
          :error="nameError"
        />
        <VdInput
          v-model="email"
          type="email"
          :label="emailLabel"
          autocomplete="email"
          required
          name="email"
          :error="emailError"
        />
        <VdInput
          v-model="password"
          type="password"
          :label="passwordLabel"
          autocomplete="new-password"
          reveal-password
          required
          name="password"
          :error="passwordError"
        />
        <VdInput
          v-model="confirm"
          type="password"
          :label="confirmLabel"
          autocomplete="new-password"
          reveal-password
          required
          name="confirm"
          :error="confirmError"
        />
        <div>
          <VdCheckbox v-model="terms" :label="termsLabel" name="terms" />
          <span v-if="termsError" class="vd-form-error">{{ termsError }}</span>
        </div>
        <VdButton type="submit" class="vd-btn-block" :loading="loading">
          {{ submitLabel }}
        </VdButton>
      </VdStack>
    </form>
    <template v-if="$slots.links" #footer>
      <div class="vd-auth-links">
        <slot name="links" />
      </div>
    </template>
  </VdAuthCard>
</template>
