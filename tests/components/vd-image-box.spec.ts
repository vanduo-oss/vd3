import { afterEach, describe, expect, it } from "vitest";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import VdImageBox from "../../src/components/VdImageBox.vue";

enableAutoUnmount(afterEach);

const items = [
  { src: "/a.jpg", alt: "Alpha", caption: "Alpha caption" },
  { src: "/b.jpg", alt: "Beta", caption: "Beta caption" },
];

describe("VdImageBox", () => {
  afterEach(() => {
    document.querySelectorAll(".vd-image-box-backdrop").forEach((node) => {
      node.remove();
    });
  });

  it("renders a single image when only src is set", () => {
    const wrapper = mount(VdImageBox, {
      props: {
        src: "/one.jpg",
        fullSrc: "/one-full.jpg",
        alt: "One",
        caption: "Solo",
      },
      attachTo: document.body,
    });
    expect(wrapper.classes()).toContain("vd-image-gallery-single");
    const img = wrapper.get("img");
    expect(img.attributes("src")).toBe("/one.jpg");
    expect(img.attributes("data-image-box-full-src")).toBe("/one-full.jpg");
    expect(img.attributes("loading")).toBe("lazy");
    expect(img.attributes("data-image-box-caption")).toBe("Solo");
    wrapper.unmount();
  });

  it("renders empty when neither src nor items are given, and defaults to grid for multiple items", () => {
    const empty = mount(VdImageBox);
    expect(empty.classes()).toContain("vd-image-gallery-single");
    expect(empty.findAll("img")).toHaveLength(0);

    const singleFallback = mount(VdImageBox, {
      props: { src: "/fallback.jpg" },
    });
    expect(
      singleFallback.get("img").attributes("data-image-box-full-src"),
    ).toBe("/fallback.jpg");
    expect(
      singleFallback.get("img").attributes("data-image-box-caption"),
    ).toBeUndefined();

    const multi = mount(VdImageBox, {
      props: {
        items: [
          { src: "/1.jpg", fullSrc: "/1-hd.jpg" },
          { src: "/2.jpg", caption: "Two" },
        ],
        captionDisplay: "overlay",
      },
    });
    expect(multi.classes()).toContain("vd-image-gallery-grid");
    const imgs = multi.findAll("img");
    expect(imgs[0]?.attributes("alt")).toBe("");
    expect(imgs[0]?.attributes("data-image-box-full-src")).toBe("/1-hd.jpg");
    expect(imgs[0]?.attributes("data-image-box-caption")).toBeUndefined();
    expect(multi.get(".vd-image-box-caption-overlay").text()).toBe("Two");
  });

  it("renders gallery layouts and a below-caption", () => {
    const wrapper = mount(VdImageBox, {
      props: {
        items,
        layout: "masonry",
        columns: 2,
        gap: "fib-8",
        ratio: "3-4",
        captionDisplay: "below",
        group: "photos",
      },
      attachTo: document.body,
    });
    expect(wrapper.classes()).toContain("vd-image-gallery-masonry");
    expect(wrapper.attributes("data-gap")).toBe("fib-8");
    expect(wrapper.attributes("data-ratio")).toBe("3-4");
    expect(wrapper.attributes("style")).toContain("--vd-image-box-columns: 2");
    expect(wrapper.findAll("img")).toHaveLength(2);
    expect(wrapper.get("img").attributes("data-image-box-group")).toBe(
      "photos",
    );
    expect(wrapper.get("figcaption").text()).toBe("Alpha caption");
    wrapper.unmount();

    const bento = mount(VdImageBox, {
      props: { items, layout: "bento" },
    });
    expect(bento.classes()).toContain("vd-image-gallery-bento");
    expect(bento.attributes("style")).toContain("--vd-image-box-columns: 4");
  });
});
