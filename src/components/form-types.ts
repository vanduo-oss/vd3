/**
 * Prop/option interfaces for the generic form components (VdRadioGroup,
 * VdSelect). They live in a standalone module — not inline in the `<script setup
 * generic>` block — so `vue-tsc`'s declaration emit can reference them by an
 * exported name (avoids TS4025 "using private name 'Props'").
 */

export interface VdRadioOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
  /** Optional Phosphor icon name rendered before the label. */
  icon?: string;
}

export interface VdRadioGroupProps<T extends string = string> {
  options: readonly VdRadioOption<T>[];
  modelValue: T;
  name: string;
  inline?: boolean;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

export interface VdSelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface VdSelectProps<T extends string = string> {
  modelValue: T;
  options: readonly VdSelectOption<T>[];
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}
