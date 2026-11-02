import type { ComputedRef, InjectionKey, Ref } from "vue";
import type {
  DockItemLayout,
  DockPlacement,
} from "../composables/useDockOrientation";

export interface VdDockContext {
  placement: Ref<DockPlacement>;
  itemLayout: ComputedRef<DockItemLayout>;
}

export const VD_DOCK_KEY: InjectionKey<VdDockContext> = Symbol("vd-dock");
