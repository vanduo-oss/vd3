import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { reactive } from "vue";
import VdTreeNode, { type TreeNode } from "../../src/components/VdTreeNode.vue";

// Nodes are reactive because VdTree owns a reactive model that VdTreeNode
// mutates in place (documented design in the component source).
const makeLeaf = (): TreeNode => reactive({ id: "leaf", label: "Leaf" });
const makeBranch = (): TreeNode =>
  reactive({
    id: "branch",
    label: "Branch",
    children: [
      { id: "kid-a", label: "Kid A" },
      { id: "kid-b", label: "Kid B" },
    ],
  });

describe("VdTreeNode", () => {
  it("renders a leaf as li.vd-tree-node[role=treeitem] with a toggle placeholder", () => {
    const wrapper = mount(VdTreeNode, {
      props: { node: makeLeaf(), checkbox: false },
    });
    expect(wrapper.element.tagName).toBe("LI");
    expect(wrapper.classes()).toContain("vd-tree-node");
    expect(wrapper.attributes("role")).toBe("treeitem");
    // Leaves have no aria-expanded, no toggle button, and no children group.
    expect(wrapper.attributes("aria-expanded")).toBeUndefined();
    expect(wrapper.find(".vd-tree-toggle").exists()).toBe(false);
    expect(wrapper.find(".vd-tree-toggle-placeholder").exists()).toBe(true);
    expect(wrapper.find(".vd-tree-children").exists()).toBe(false);

    const label = wrapper.get(".vd-tree-label");
    expect(label.text()).toBe("Leaf");
    expect(label.attributes("tabindex")).toBe("-1");
  });

  it("renders a branch with toggle button, aria-expanded, and a role=group child list", () => {
    const wrapper = mount(VdTreeNode, {
      props: { node: makeBranch(), checkbox: false },
    });
    expect(wrapper.attributes("aria-expanded")).toBe("false");
    expect(wrapper.get(".vd-tree-toggle").attributes("aria-label")).toBe(
      "Toggle",
    );
    // The branch's OWN content row renders a real toggle, not a placeholder.
    // (Its leaf children each still render a placeholder, so scope the check to
    // the branch's own .vd-tree-node-content rather than the whole subtree.)
    expect(
      wrapper
        .get(".vd-tree-node-content")
        .find(".vd-tree-toggle-placeholder")
        .exists(),
    ).toBe(false);

    const group = wrapper.get(".vd-tree-children");
    expect(group.attributes("role")).toBe("group");
    expect(group.findAll(".vd-tree-node")).toHaveLength(2);
  });

  it("applies is-open and aria-expanded=true for an open branch", () => {
    const node = makeBranch();
    node.open = true;
    const wrapper = mount(VdTreeNode, { props: { node, checkbox: false } });
    expect(wrapper.classes()).toContain("is-open");
    expect(wrapper.attributes("aria-expanded")).toBe("true");
  });

  it("toggle click flips node.open and emits toggle with the node", async () => {
    const node = makeBranch();
    const wrapper = mount(VdTreeNode, { props: { node, checkbox: false } });

    await wrapper.get(".vd-tree-toggle").trigger("click");
    expect(node.open).toBe(true);
    expect(wrapper.classes()).toContain("is-open");
    expect(wrapper.emitted("toggle")).toHaveLength(1);
    expect(wrapper.emitted("toggle")![0]).toEqual([node]);

    await wrapper.get(".vd-tree-toggle").trigger("click");
    expect(node.open).toBe(false);
    expect(wrapper.emitted("toggle")).toHaveLength(2);
  });

  it("renders a checkbox reflecting node.checked only when checkbox=true", () => {
    const unchecked = mount(VdTreeNode, {
      props: { node: makeLeaf(), checkbox: false },
    });
    expect(unchecked.find(".vd-tree-checkbox").exists()).toBe(false);

    const node = makeLeaf();
    node.checked = true;
    const wrapper = mount(VdTreeNode, { props: { node, checkbox: true } });
    const box = wrapper.get<HTMLInputElement>("input.vd-tree-checkbox");
    expect(box.element.checked).toBe(true);
    expect(box.attributes("aria-label")).toBe("Leaf");
  });

  it("emits check with (node, checked) when the checkbox changes", async () => {
    const node = makeLeaf();
    const wrapper = mount(VdTreeNode, { props: { node, checkbox: true } });

    await wrapper.get(".vd-tree-checkbox").setValue(true);
    expect(wrapper.emitted("check")).toHaveLength(1);
    expect(wrapper.emitted("check")![0]).toEqual([node, true]);
  });

  it("renders node.icon as an extra class on .vd-tree-icon", () => {
    const node = makeLeaf();
    node.icon = "vd-icon-folder";
    const wrapper = mount(VdTreeNode, { props: { node, checkbox: false } });
    const icon = wrapper.get(".vd-tree-icon");
    expect(icon.classes()).toContain("vd-icon-folder");

    const plain = mount(VdTreeNode, {
      props: { node: makeLeaf(), checkbox: false },
    });
    expect(plain.find(".vd-tree-icon").exists()).toBe(false);
  });

  it("forwards toggle and check events from recursive children", async () => {
    const node = reactive<TreeNode>({
      id: "root",
      label: "Root",
      children: [
        {
          id: "mid",
          label: "Mid",
          children: [{ id: "deep", label: "Deep" }],
        },
      ],
    });
    const wrapper = mount(VdTreeNode, { props: { node, checkbox: true } });

    // Second toggle button belongs to the "mid" child node.
    await wrapper.findAll(".vd-tree-toggle")[1].trigger("click");
    const toggles = wrapper.emitted("toggle")!;
    expect(toggles).toHaveLength(1);
    expect((toggles[0][0] as TreeNode).id).toBe("mid");

    // Third checkbox belongs to the "deep" grandchild.
    await wrapper.findAll(".vd-tree-checkbox")[2].setValue(true);
    const checks = wrapper.emitted("check")!;
    expect(checks).toHaveLength(1);
    expect((checks[0][0] as TreeNode).id).toBe("deep");
    expect(checks[0][1]).toBe(true);
  });
});
