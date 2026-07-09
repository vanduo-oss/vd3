import { describe, expect, it } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import VdTree from "../../src/components/VdTree.vue";
import type { TreeNode } from "../../src/components/VdTreeNode.vue";

const makeNodes = (): TreeNode[] => [
  {
    id: "docs",
    label: "Documents",
    children: [
      { id: "cv", label: "CV.pdf" },
      { id: "notes", label: "Notes.md" },
    ],
  },
  { id: "music", label: "Music" },
];

describe("VdTree", () => {
  it("renders .vd-tree[role=tree] with a node per entry and nested groups", () => {
    const wrapper = mount(VdTree, { props: { nodes: makeNodes() } });
    expect(wrapper.classes()).toContain("vd-tree");
    expect(wrapper.attributes("role")).toBe("tree");

    const nodes = wrapper.findAll(".vd-tree-node");
    expect(nodes).toHaveLength(4); // docs + 2 children + music
    expect(nodes[0].attributes("role")).toBe("treeitem");

    const children = wrapper.get(".vd-tree-children");
    expect(children.attributes("role")).toBe("group");
    expect(children.findAll(".vd-tree-node")).toHaveLength(2);

    const labels = wrapper.findAll(".vd-tree-label").map((l) => l.text());
    expect(labels).toEqual(["Documents", "CV.pdf", "Notes.md", "Music"]);
  });

  it("renders no checkboxes by default and one per node with checkbox prop", () => {
    const plain = mount(VdTree, { props: { nodes: makeNodes() } });
    expect(plain.findAll(".vd-tree-checkbox")).toHaveLength(0);

    const checkable = mount(VdTree, {
      props: { nodes: makeNodes(), checkbox: true },
    });
    expect(checkable.findAll(".vd-tree-checkbox")).toHaveLength(4);
  });

  it("toggles is-open/aria-expanded and fires tree:toggle with { id, open }", async () => {
    const wrapper = mount(VdTree, { props: { nodes: makeNodes() } });
    const events: CustomEvent[] = [];
    wrapper.element.addEventListener("tree:toggle", (e: Event) =>
      events.push(e as CustomEvent),
    );

    const branch = wrapper.findAll(".vd-tree-node")[0];
    expect(branch.classes()).not.toContain("is-open");
    expect(branch.attributes("aria-expanded")).toBe("false");

    await branch.get(".vd-tree-toggle").trigger("click");
    expect(branch.classes()).toContain("is-open");
    expect(branch.attributes("aria-expanded")).toBe("true");
    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ id: "docs", open: true });

    await branch.get(".vd-tree-toggle").trigger("click");
    expect(branch.classes()).not.toContain("is-open");
    expect(events[1].detail).toEqual({ id: "docs", open: false });
  });

  it("cascades a parent check to children when cascade is enabled and fires tree:check", async () => {
    // NOTE: `cascade` must be passed explicitly. Because Vue coerces an absent
    // Boolean prop to `false`, the component's `props.cascade ?? true` default
    // never engages when the prop is omitted, so cascade is only active when
    // `cascade: true` is provided (see suspected component bug in the report).
    const wrapper = mount(VdTree, {
      props: { nodes: makeNodes(), checkbox: true, cascade: true },
    });
    const events: CustomEvent[] = [];
    wrapper.element.addEventListener("tree:check", (e: Event) =>
      events.push(e as CustomEvent),
    );

    const boxes = wrapper.findAll(".vd-tree-checkbox");
    await boxes[0].setValue(true); // Documents

    expect((boxes[1].element as HTMLInputElement).checked).toBe(true);
    expect((boxes[2].element as HTMLInputElement).checked).toBe(true);
    expect((boxes[3].element as HTMLInputElement).checked).toBe(false);

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({
      checked: ["docs", "cv", "notes"],
      node: "docs",
    });
  });

  it("does not cascade when cascade=false", async () => {
    const wrapper = mount(VdTree, {
      props: { nodes: makeNodes(), checkbox: true, cascade: false },
    });
    const events: CustomEvent[] = [];
    wrapper.element.addEventListener("tree:check", (e: Event) =>
      events.push(e as CustomEvent),
    );

    const boxes = wrapper.findAll(".vd-tree-checkbox");
    await boxes[0].setValue(true);

    expect((boxes[1].element as HTMLInputElement).checked).toBe(false);
    expect((boxes[2].element as HTMLInputElement).checked).toBe(false);
    expect(events[0].detail).toEqual({ checked: ["docs"], node: "docs" });
  });

  it("exposes getChecked() reflecting the current check state", async () => {
    const wrapper = mount(VdTree, {
      props: { nodes: makeNodes(), checkbox: true },
    });
    const vm = wrapper.vm as unknown as { getChecked: () => string[] };
    expect(vm.getChecked()).toEqual([]);

    await wrapper.findAll(".vd-tree-checkbox")[3].setValue(true); // Music
    expect(vm.getChecked()).toEqual(["music"]);
  });

  it("does not mutate the caller's nodes array (clones on mount)", async () => {
    const nodes = makeNodes();
    const wrapper = mount(VdTree, { props: { nodes, checkbox: true } });
    await wrapper.findAll(".vd-tree-checkbox")[0].setValue(true);
    expect(nodes[0].checked).toBeUndefined();
    expect(nodes[0].children?.[0].checked).toBeUndefined();
  });

  describe("keyboard navigation (attached to document)", () => {
    const mountAttached = (): VueWrapper =>
      mount(VdTree, {
        props: { nodes: makeNodes() },
        attachTo: document.body,
      });

    it("moves focus down and up between visible node contents", async () => {
      const wrapper = mountAttached();
      const labels = wrapper.findAll(".vd-tree-label");
      (labels[0].element as HTMLElement).focus();

      await wrapper.trigger("keydown", { key: "ArrowDown" });
      // Second content belongs to the leaf CV.pdf -> its label gets focus.
      expect(document.activeElement).toBe(labels[1].element);

      // Moving back up lands on the branch's toggle button (first focusable
      // in `.vd-tree-toggle, .vd-tree-label` document order).
      await wrapper.trigger("keydown", { key: "ArrowUp" });
      expect(document.activeElement).toBe(
        wrapper.findAll(".vd-tree-toggle")[0].element,
      );
      wrapper.unmount();
    });

    it("expands with ArrowRight and collapses with ArrowLeft on a branch", async () => {
      const wrapper = mountAttached();
      const branch = wrapper.findAll(".vd-tree-node")[0];
      (branch.find(".vd-tree-label").element as HTMLElement).focus();

      await wrapper.trigger("keydown", { key: "ArrowRight" });
      expect(branch.classes()).toContain("is-open");

      await wrapper.trigger("keydown", { key: "ArrowLeft" });
      expect(branch.classes()).not.toContain("is-open");
      wrapper.unmount();
    });
  });
});
