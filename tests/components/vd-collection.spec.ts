import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import VdCollection from "../../src/components/VdCollection.vue";

const items = [
  { id: 1, title: "Alpha" },
  { id: 2, title: "Beta", subtitle: "Second entry" },
  {
    id: 3,
    title: "Gamma",
    subtitle: "Third entry",
    avatar: "/img/g.png",
    action: "View",
  },
];

describe("VdCollection", () => {
  it("renders div.vd-collection with a ul.vd-collection-list of items", () => {
    const wrapper = mount(VdCollection, { props: { items } });
    const root = wrapper.get("div.vd-collection");
    const listItems = root.findAll("ul.vd-collection-list > li");
    expect(listItems).toHaveLength(3);
    expect(
      listItems.every((li) => li.classes().includes("vd-collection-item")),
    ).toBe(true);
  });

  it("defaults to vd-collection-md without hoverable/bordered modifiers", () => {
    const wrapper = mount(VdCollection, { props: { items } });
    const classes = wrapper.get(".vd-collection").classes();
    expect(classes).toContain("vd-collection-md");
    expect(classes).not.toContain("vd-collection-hoverable");
    expect(classes).not.toContain("vd-collection-bordered");
  });

  it.each(["sm", "md", "lg"] as const)(
    "maps size=%s to vd-collection-%s",
    (size) => {
      const wrapper = mount(VdCollection, { props: { items, size } });
      expect(wrapper.get(".vd-collection").classes()).toContain(
        `vd-collection-${size}`,
      );
    },
  );

  it("adds vd-collection-hoverable and vd-collection-bordered when enabled", () => {
    const wrapper = mount(VdCollection, {
      props: { items, hoverable: true, bordered: true },
    });
    const classes = wrapper.get(".vd-collection").classes();
    expect(classes).toContain("vd-collection-hoverable");
    expect(classes).toContain("vd-collection-bordered");
  });

  it("renders the header block with a title only when header is set", () => {
    const bare = mount(VdCollection, { props: { items } });
    expect(bare.find(".vd-collection-header").exists()).toBe(false);

    const wrapper = mount(VdCollection, {
      props: { items, header: "People" },
    });
    const header = wrapper.get(".vd-collection-header");
    expect(header.get("h3.vd-collection-title").text()).toBe("People");
  });

  it("renders item title, optional subtitle, avatar and action per item", () => {
    const wrapper = mount(VdCollection, { props: { items } });
    const [first, second, third] = wrapper.findAll(".vd-collection-item");

    expect(first!.get("strong.vd-collection-title").text()).toBe("Alpha");
    expect(first!.find(".vd-collection-text-secondary").exists()).toBe(false);
    expect(first!.find(".vd-collection-avatar").exists()).toBe(false);
    expect(first!.find(".vd-collection-action").exists()).toBe(false);

    expect(second!.get(".vd-collection-text-secondary").text()).toBe(
      "Second entry",
    );

    const avatarImg = third!.get(".vd-collection-avatar img");
    expect(avatarImg.attributes("src")).toBe("/img/g.png");
    expect(third!.get(".vd-collection-action").text()).toBe("View");
  });

  it("uses the subtitle (falling back to title) as the avatar alt text", () => {
    const wrapper = mount(VdCollection, {
      props: {
        items: [
          { id: "a", title: "Only title", avatar: "/a.png" },
          { id: "b", title: "Titled", subtitle: "Subbed", avatar: "/b.png" },
        ],
      },
    });
    const imgs = wrapper.findAll(".vd-collection-avatar img");
    expect(imgs[0]!.attributes("alt")).toBe("Only title");
    expect(imgs[1]!.attributes("alt")).toBe("Subbed");
  });

  it("wraps each item's text in vd-collection-content > vd-collection-text", () => {
    const wrapper = mount(VdCollection, { props: { items } });
    const item = wrapper.get(".vd-collection-item");
    expect(
      item.find(".vd-collection-content > .vd-collection-text").exists(),
    ).toBe(true);
  });
});
