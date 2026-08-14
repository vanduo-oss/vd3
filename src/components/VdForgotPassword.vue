<script setup lang="ts">
import { ref } from "vue";
import VdAlert from "./VdAlert.vue";
import VdAuthCard from "./VdAuthCard.vue";
import VdButton from "./VdButton.vue";
import VdInput from "./VdInput.vue";
import VdStack from "./primitives/VdStack.vue";
import type { ForgotPasswordSubmit } from "./auth-types";

export type { ForgotPasswordSubmit };

interface Props {
  emailLabel?: string;
  submitLabel?: string;
  loading?: boolean;
  error?: string;
  message?: string;
  title?: string;
  glass?: boolean;
  elevated?: boolean;
  framed?: boolean;
}

withDefaults(defineProps<Props>(), {
  emailLabel: "Email",
  submitLabel: "Send reset link",
  loading: false,
  error: "",
  message: "",
  title: "Reset password",
  glass: true,
  elevated: true,
  framed: true,
});

const emit = defineEmits<{
  submit: [value: ForgotPasswordSubmit];
}>();

const email = ref("");

const onSubmit = (): void => {
  emit("submit", { email: email.value });
};
</script>

<template>
  <VdAuthCard
    :title="title"
    :glass="glass"
    :elevated="elevated"
    :framed="framed"
  >
    <template v-if="$slots.brand" #brand>
      <slot name="brand" />
    </template>
    <template v-if="error || message" #alert>
      <VdAlert v-if="error" variant="danger">{{ error }}</VdAlert>
      <VdAlert v-else-if="message" variant="success">{{ message }}</VdAlert>
    </template>
    <form class="vd-auth-form" @submit.prevent="onSubmit">
      <slot name="extra" />
      <VdStack gap="fib-8">
        <VdInput
          v-model="email"
          type="email"
          :label="emailLabel"
          autocomplete="email"
          required
          name="email"
        />
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
