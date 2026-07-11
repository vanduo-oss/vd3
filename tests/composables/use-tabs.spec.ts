import { afterEach, describe, expect, it } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref, type Ref } from "vue";
import { useTabs, type UseTabsController } from "../../src/composables/useTabs";

// Each composable runs in a component scope: mount a host whose root ref is
// handed to the composable, with the fixture markup injected as innerHTML so
// the composable's onMounted `querySelectorAll` scan sees real DOM.
const mounted: VueWrapper[] = [];

function mountHost<T>(
  html: string,
  use: (root: Ref<HTMLElement | null>) => T,
): { wrapper: VueWrapper; api: T } {
  let api!: T;
  const Host = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      api = use(root);
      return () => h("div", { ref: root, innerHTML: html });
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper, api };
}

const click = (el: Element): MouseEvent => {
  const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return ev;
};

const key = (el: Element, k: string): KeyboardEvent => {
  const ev = new KeyboardEvent("keydown", {
    key: k,
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(ev);
  return ev;
};

type TabChangeDetail = {
  tab: HTMLElement;
  pane: HTMLElement | null;
  tabId: string;
};

const listeners: Array<() => void> = [];

const collectChanges = (el: Element): TabChangeDetail[] => {
  const events: TabChangeDetail[] = [];
  const handler = (e: Event): void => {
    events.push((e as CustomEvent<TabChangeDetail>).detail);
  };
  el.addEventListener("tab:change", handler);
  listeners.push(() => el.removeEventListener("tab:change", handler));
  return events;
};

afterEach(() => {
  for (const w of mounted) {
    try {
      w.unmount();
    } catch {
      /* already unmounted by the test under test */
    }
  }
  mounted.length = 0;
  listeners.forEach((off) => off());
  listeners.length = 0;
});

const html = `
  <div class="vd-tabs" id="t1">
    <div class="vd-tab-list">
      <button type="button" class="vd-tab-link" data-tab-target="alpha">A</button>
      <button type="button" class="vd-tab-link" data-tab-target="beta">B</button>
      <button type="button" class="vd-tab-link" data-tab-target="gamma">C</button>
    </div>
    <div class="vd-tab-content">
      <div class="vd-tab-pane" id="alpha">Alpha</div>
      <div class="vd-tab-pane" id="beta">Beta</div>
      <div class="vd-tab-pane" id="gamma">Gamma</div>
    </div>
  </div>`;

describe("useTabs", () => {
  describe("mount wiring", () => {
    it("applies tablist/tab/tabpanel ARIA, generated ids, and back-links", () => {
      const { wrapper } = mountHost(html, useTabs);
      const list = wrapper.get(".vd-tab-list").element;
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");
      const panes = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-pane");

      expect(list.getAttribute("role")).toBe("tablist");
      links.forEach((link) => expect(link.getAttribute("role")).toBe("tab"));
      panes.forEach((pane) =>
        expect(pane.getAttribute("role")).toBe("tabpanel"),
      );

      expect(links[0]!.id).toBe("tab-btn-alpha");
      expect(links[0]!.getAttribute("aria-controls")).toBe("alpha");
      expect(panes[0]!.getAttribute("aria-labelledby")).toBe("tab-btn-alpha");
    });

    it("auto-activates the first tab when none is active, with roving tabindex", () => {
      const changes = collectChanges(document.body);
      const { wrapper } = mountHost(html, useTabs);
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");

      expect(links[0]!.classList.contains("is-active")).toBe(true);
      expect(links[0]!.getAttribute("aria-selected")).toBe("true");
      expect(links[0]!.getAttribute("tabindex")).toBe("0");
      expect(links[1]!.getAttribute("aria-selected")).toBe("false");
      expect(links[1]!.getAttribute("tabindex")).toBe("-1");
      expect(links[2]!.getAttribute("tabindex")).toBe("-1");
      expect(
        wrapper.get("#alpha").element.classList.contains("is-active"),
      ).toBe(true);
      expect(changes).toHaveLength(1);
      expect(changes[0]!.tabId).toBe("alpha");
    });

    it("keeps a pre-set active tab instead of auto-activating the first", () => {
      const changes = collectChanges(document.body);
      const { wrapper } = mountHost(
        html.replace(
          'class="vd-tab-link" data-tab-target="beta"',
          'class="vd-tab-link is-active" data-tab-target="beta"',
        ),
        useTabs,
      );
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");

      expect(changes).toHaveLength(0); // no tab:change fired at mount
      expect(links[0]!.getAttribute("tabindex")).toBe("-1");
      expect(links[1]!.classList.contains("is-active")).toBe(true);
      expect(links[1]!.getAttribute("aria-selected")).toBe("true");
      expect(links[1]!.getAttribute("tabindex")).toBe("0");
    });
  });

  describe("click activation", () => {
    it("activates the clicked tab: classes, ARIA, pane, tab:change detail", () => {
      const { wrapper } = mountHost(html, useTabs);
      const container = wrapper.get("#t1").element;
      const changes = collectChanges(container);
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");

      const ev = click(links[2]!);

      expect(ev.defaultPrevented).toBe(true);
      expect(links[0]!.classList.contains("is-active")).toBe(false);
      expect(links[2]!.classList.contains("is-active")).toBe(true);
      expect(links[2]!.getAttribute("aria-selected")).toBe("true");
      expect(links[2]!.getAttribute("tabindex")).toBe("0");
      expect(
        wrapper.get("#alpha").element.classList.contains("is-active"),
      ).toBe(false);
      expect(
        wrapper.get("#gamma").element.classList.contains("is-active"),
      ).toBe(true);

      expect(changes).toHaveLength(1);
      expect(changes[0]!.tab).toBe(links[2]);
      expect(changes[0]!.pane).toBe(wrapper.get("#gamma").element);
      expect(changes[0]!.tabId).toBe("gamma");
    });

    it("ignores clicks on disabled tabs", () => {
      const { wrapper } = mountHost(
        html.replace(
          'class="vd-tab-link" data-tab-target="beta"',
          'class="vd-tab-link disabled" data-tab-target="beta"',
        ),
        useTabs,
      );
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");

      click(links[1]!);

      expect(links[1]!.classList.contains("is-active")).toBe(false);
      expect(links[0]!.classList.contains("is-active")).toBe(true);
    });

    it("toggles is-active on .vd-tab-item parents and resolves href tab ids", () => {
      const { wrapper } = mountHost(
        `<div class="vd-tabs">
           <ul class="vd-tab-list">
             <li class="vd-tab-item"><a href="#pa" class="vd-tab-link">A</a></li>
             <li class="vd-tab-item"><a href="#pb" class="vd-tab-link">B</a></li>
           </ul>
           <div class="vd-tab-pane" id="pa">A</div>
           <div class="vd-tab-pane" id="pb">B</div>
         </div>`,
        useTabs,
      );
      const items = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-item");
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");

      expect(items[0]!.classList.contains("is-active")).toBe(true);

      click(links[1]!);
      expect(items[0]!.classList.contains("is-active")).toBe(false);
      expect(items[1]!.classList.contains("is-active")).toBe(true);
      expect(wrapper.get("#pb").element.classList.contains("is-active")).toBe(
        true,
      );
    });
  });

  describe("pane resolution", () => {
    it("resolves panes by data-tab-pane attribute before id", () => {
      const { wrapper } = mountHost(
        `<div class="vd-tabs">
           <div class="vd-tab-list">
             <button class="vd-tab-link" data-tab-target="x">X</button>
             <button class="vd-tab-link" data-tab-target="y">Y</button>
           </div>
           <div class="vd-tab-pane" data-tab-pane="x">X pane</div>
           <div class="vd-tab-pane" data-tab-pane="y">Y pane</div>
         </div>`,
        useTabs,
      );
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");
      const panes = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-pane");

      click(links[1]!);
      expect(panes[0]!.classList.contains("is-active")).toBe(false);
      expect(panes[1]!.classList.contains("is-active")).toBe(true);
      // Generated ids follow the tab id.
      expect(panes[1]!.id).toBe("tab-pane-y");
      expect(links[1]!.getAttribute("aria-controls")).toBe("tab-pane-y");
    });

    it("falls back to index pairing when no attribute or id matches", () => {
      const { wrapper } = mountHost(
        `<div class="vd-tabs">
           <div class="vd-tab-list">
             <button class="vd-tab-link">One</button>
             <button class="vd-tab-link">Two</button>
           </div>
           <div class="vd-tab-pane">P1</div>
           <div class="vd-tab-pane">P2</div>
         </div>`,
        useTabs,
      );
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");
      const panes = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-pane");

      click(links[1]!);
      expect(panes[1]!.classList.contains("is-active")).toBe(true);
      expect(panes[0]!.classList.contains("is-active")).toBe(false);
    });
  });

  describe("keyboard navigation", () => {
    it("ArrowRight moves focus and activation, wrapping from the last tab", () => {
      const { wrapper } = mountHost(html, useTabs);
      const container = wrapper.get("#t1").element;
      const changes = collectChanges(container);
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");

      const ev = key(links[0]!, "ArrowRight");
      expect(ev.defaultPrevented).toBe(true);
      expect(links[1]!.classList.contains("is-active")).toBe(true);
      expect(document.activeElement).toBe(links[1]);

      key(links[1]!, "ArrowRight");
      key(links[2]!, "ArrowRight"); // wraps to the first tab
      expect(links[0]!.classList.contains("is-active")).toBe(true);
      expect(document.activeElement).toBe(links[0]);
      expect(changes.map((c) => c.tabId)).toEqual(["beta", "gamma", "alpha"]);
    });

    it("ArrowLeft wraps backwards from the first tab", () => {
      const { wrapper } = mountHost(html, useTabs);
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");

      key(links[0]!, "ArrowLeft");
      expect(links[2]!.classList.contains("is-active")).toBe(true);
      expect(document.activeElement).toBe(links[2]);
    });

    it("Home and End jump to the first and last enabled tab", () => {
      const { wrapper } = mountHost(html, useTabs);
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");

      key(links[0]!, "End");
      expect(links[2]!.classList.contains("is-active")).toBe(true);

      key(links[2]!, "Home");
      expect(links[0]!.classList.contains("is-active")).toBe(true);
    });

    it("Enter and Space activate the focused tab", () => {
      const { wrapper } = mountHost(html, useTabs);
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");

      const enter = key(links[1]!, "Enter");
      expect(enter.defaultPrevented).toBe(true);
      expect(links[1]!.classList.contains("is-active")).toBe(true);

      key(links[2]!, " ");
      expect(links[2]!.classList.contains("is-active")).toBe(true);
    });

    it("skips disabled tabs during arrow navigation", () => {
      const { wrapper } = mountHost(
        html.replace(
          'class="vd-tab-link" data-tab-target="beta"',
          'class="vd-tab-link disabled" data-tab-target="beta"',
        ),
        useTabs,
      );
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");

      key(links[0]!, "ArrowRight"); // skips disabled beta, lands on gamma
      expect(links[1]!.classList.contains("is-active")).toBe(false);
      expect(links[2]!.classList.contains("is-active")).toBe(true);
      expect(document.activeElement).toBe(links[2]);

      key(links[2]!, "ArrowLeft"); // skips it backwards too
      expect(links[0]!.classList.contains("is-active")).toBe(true);
    });

    it("uses ArrowUp/ArrowDown instead of left/right on .vd-tabs-vertical", () => {
      const { wrapper } = mountHost(
        html.replace('class="vd-tabs"', 'class="vd-tabs vd-tabs-vertical"'),
        useTabs,
      );
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");

      const right = key(links[0]!, "ArrowRight"); // ignored when vertical
      expect(right.defaultPrevented).toBe(false);
      expect(links[0]!.classList.contains("is-active")).toBe(true);

      key(links[0]!, "ArrowDown");
      expect(links[1]!.classList.contains("is-active")).toBe(true);

      key(links[1]!, "ArrowUp");
      expect(links[0]!.classList.contains("is-active")).toBe(true);

      key(links[0]!, "ArrowUp"); // wraps to the last tab
      expect(links[2]!.classList.contains("is-active")).toBe(true);
    });

    it("leaves unrelated keys alone", () => {
      const { wrapper } = mountHost(html, useTabs);
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");

      const ev = key(links[0]!, "a");
      expect(ev.defaultPrevented).toBe(false);
      expect(links[0]!.classList.contains("is-active")).toBe(true);
    });
  });

  describe("controller (vd3 extension)", () => {
    it("show(index) and show(element) activate programmatically", () => {
      const { wrapper, api } = mountHost<UseTabsController>(html, useTabs);
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");

      api.show(2);
      expect(links[2]!.classList.contains("is-active")).toBe(true);

      api.show(links[1]!);
      expect(links[1]!.classList.contains("is-active")).toBe(true);
      expect(links[2]!.classList.contains("is-active")).toBe(false);
    });

    it("survives link re-renders via delegation and wires new containers on refresh()", () => {
      const { wrapper, api } = mountHost<UseTabsController>(html, useTabs);
      const list = wrapper.get(".vd-tab-list").element;

      // Simulate a v-for re-render: replace all links with fresh nodes.
      list.innerHTML = `
        <button type="button" class="vd-tab-link" data-tab-target="beta">B2</button>
        <button type="button" class="vd-tab-link" data-tab-target="gamma">C2</button>`;
      const fresh = list.querySelectorAll<HTMLElement>(".vd-tab-link");

      click(fresh[1]!); // no refresh needed — listener is delegated
      expect(fresh[1]!.classList.contains("is-active")).toBe(true);
      expect(
        wrapper.get("#gamma").element.classList.contains("is-active"),
      ).toBe(true);

      // refresh() re-applies ARIA to the fresh links…
      api.refresh();
      expect(fresh[0]!.getAttribute("role")).toBe("tab");
      expect(fresh[0]!.getAttribute("tabindex")).toBe("-1");
      expect(fresh[1]!.getAttribute("tabindex")).toBe("0");

      // …and wires containers added after mount.
      wrapper.element.insertAdjacentHTML(
        "beforeend",
        `<div class="vd-tabs" id="t2">
           <div class="vd-tab-list">
             <button class="vd-tab-link" data-tab-target="n1">N1</button>
             <button class="vd-tab-link" data-tab-target="n2">N2</button>
           </div>
           <div class="vd-tab-pane" id="n1">N1</div>
           <div class="vd-tab-pane" id="n2">N2</div>
         </div>`,
      );
      api.refresh();
      const late = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>("#t2 .vd-tab-link");
      expect(late[0]!.classList.contains("is-active")).toBe(true); // auto-activated
      click(late[1]!);
      expect(late[1]!.classList.contains("is-active")).toBe(true);
    });
  });

  describe("teardown", () => {
    it("removes its listeners on unmount", () => {
      const { wrapper } = mountHost(html, useTabs);
      const links = (
        wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");

      wrapper.unmount();

      click(links[1]!);
      key(links[0]!, "ArrowRight");
      expect(links[1]!.classList.contains("is-active")).toBe(false);
      expect(links[0]!.classList.contains("is-active")).toBe(true);
    });

    it("does not affect a sibling instance's wiring", () => {
      const a = mountHost(html, useTabs);
      const b = mountHost(html.replace('id="t1"', 'id="t1b"'), useTabs);

      a.wrapper.unmount();

      const links = (
        b.wrapper.element as HTMLElement
      ).querySelectorAll<HTMLElement>(".vd-tab-link");
      click(links[2]!);
      expect(links[2]!.classList.contains("is-active")).toBe(true);
    });
  });
});
