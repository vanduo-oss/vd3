import { onMounted, onUnmounted, type Ref } from "vue";

/**
 * Ports framework/js/components/suggest.js — scans `root` for
 * `[data-vd-suggest]` / `[data-vd-autocomplete]` inputs and attaches a
 * type-ahead suggestion dropdown. Supports an inline JSON array or a remote
 * JSON endpoint (`data-vd-suggest-url`, same-origin / allowlisted), a minimum
 * character threshold, debounced search, match highlighting, full keyboard
 * navigation, and ARIA combobox wiring. Fires `suggest:select` with
 * `{ value, item, index }`.
 *
 * The list is appended to the input's `.vd-suggest-wrapper`; the page renders
 * that wrapper so no Vue-managed node is moved (the Vanilla JS created the
 * wrapper itself by relocating the input).
 */
type SuggestItem = string | { label?: string; text?: string; value?: string };

function isSafeUrl(url: string, allowlist: string[]): boolean {
  try {
    const resolved = new URL(url, window.location.href);
    if (resolved.origin === window.location.origin) return true;
    return allowlist.includes(resolved.origin);
  } catch {
    return false;
  }
}

const itemText = (item: SuggestItem): string =>
  typeof item === "object"
    ? item.label || item.text || String(item)
    : String(item);

export function useSuggest(root: Ref<HTMLElement | null>): void {
  const cleanups: Array<() => void> = [];

  onMounted(() => {
    if (typeof window === "undefined") return;
    const host = root.value;
    if (!host) return;

    host
      .querySelectorAll<HTMLInputElement>(
        "[data-vd-suggest], [data-vd-autocomplete]",
      )
      .forEach((input) => {
        const minChars = parseInt(
          input.getAttribute("data-vd-suggest-min-chars") || "1",
          10,
        );
        const url = input.getAttribute("data-vd-suggest-url") || "";
        const allowlist = (
          input.getAttribute("data-vd-suggest-allowlist") || ""
        )
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        const staticData =
          input.getAttribute("data-vd-suggest") ||
          input.getAttribute("data-vd-autocomplete") ||
          "";

        let items: SuggestItem[] = [];
        try {
          items = JSON.parse(staticData);
        } catch {
          items = staticData
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }

        let wrapper = input.closest(
          ".vd-suggest-wrapper, .vd-autocomplete-wrapper",
        ) as HTMLElement | null;
        if (!wrapper) {
          wrapper = document.createElement("div");
          wrapper.className = "vd-suggest-wrapper";
          input.parentNode?.insertBefore(wrapper, input);
          wrapper.appendChild(input);
        }

        const list = document.createElement("ul");
        list.className = "vd-suggest-list";
        list.setAttribute("role", "listbox");
        const listId = "vd-suggest-" + Math.random().toString(36).slice(2, 9);
        list.id = listId;
        wrapper.appendChild(list);

        input.setAttribute("role", "combobox");
        input.setAttribute("aria-autocomplete", "list");
        input.setAttribute("aria-expanded", "false");
        input.setAttribute("aria-controls", listId);
        input.setAttribute("autocomplete", "off");

        let highlighted = -1;
        let currentItems: SuggestItem[] = [];
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const renderItems = (filtered: SuggestItem[], query: string): void => {
          list.innerHTML = "";
          currentItems = filtered;
          highlighted = -1;

          if (filtered.length === 0) {
            const empty = document.createElement("li");
            empty.className = "vd-suggest-empty";
            empty.textContent = "No results";
            list.appendChild(empty);
            return;
          }

          filtered.forEach((item, i) => {
            const li = document.createElement("li");
            li.className = "vd-suggest-item";
            li.setAttribute("role", "option");
            li.id = listId + "-item-" + i;

            const text = itemText(item);
            if (query) {
              const lowerText = text.toLowerCase();
              const lowerQuery = query.toLowerCase();
              let start = 0;
              let matchIndex = lowerText.indexOf(lowerQuery, start);
              while (matchIndex !== -1) {
                if (matchIndex > start) {
                  li.appendChild(
                    document.createTextNode(text.slice(start, matchIndex)),
                  );
                }
                const matchSpan = document.createElement("span");
                matchSpan.className = "vd-suggest-match";
                matchSpan.textContent = text.slice(
                  matchIndex,
                  matchIndex + query.length,
                );
                li.appendChild(matchSpan);
                start = matchIndex + query.length;
                matchIndex = lowerText.indexOf(lowerQuery, start);
              }
              if (start < text.length) {
                li.appendChild(document.createTextNode(text.slice(start)));
              }
            } else {
              li.textContent = text;
            }

            li.addEventListener("click", () => selectItem(i));
            list.appendChild(li);
          });
        };

        const open = (): void => {
          list.classList.add("is-open");
          input.setAttribute("aria-expanded", "true");
        };

        const close = (): void => {
          list.classList.remove("is-open");
          input.setAttribute("aria-expanded", "false");
          highlighted = -1;
          input.removeAttribute("aria-activedescendant");
        };

        const selectItem = (index: number): void => {
          const item = currentItems[index];
          const value =
            typeof item === "object"
              ? item.value || item.label || String(item)
              : String(item);
          input.value = value;
          close();
          input.dispatchEvent(
            new CustomEvent("suggest:select", {
              bubbles: true,
              detail: { value, item, index },
            }),
          );
        };

        const highlight = (index: number): void => {
          const listItems =
            list.querySelectorAll<HTMLElement>(".vd-suggest-item");
          listItems.forEach((li) => li.classList.remove("is-highlighted"));
          if (index >= 0 && index < listItems.length) {
            highlighted = index;
            listItems[index].classList.add("is-highlighted");
            input.setAttribute("aria-activedescendant", listItems[index].id);
            listItems[index].scrollIntoView({ block: "nearest" });
          }
        };

        const doSearch = async (query: string): Promise<void> => {
          if (query.length < minChars) {
            close();
            return;
          }
          let filtered: SuggestItem[];
          if (url) {
            try {
              if (!isSafeUrl(url, allowlist)) {
                filtered = [];
              } else {
                const sep = url.includes("?") ? "&" : "?";
                const res = await window.fetch(
                  url + sep + "q=" + encodeURIComponent(query),
                );
                filtered = await res.json();
              }
            } catch {
              filtered = [];
            }
          } else {
            const lower = query.toLowerCase();
            filtered = items.filter((item) =>
              itemText(item).toLowerCase().includes(lower),
            );
          }
          renderItems(filtered, query);
          open();
        };

        const inputHandler = (): void => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => void doSearch(input.value), 200);
        };

        const keyHandler = (e: KeyboardEvent): void => {
          if (!list.classList.contains("is-open")) {
            if (e.key === "ArrowDown") {
              void doSearch(input.value);
              e.preventDefault();
            }
            return;
          }
          const total = currentItems.length;
          switch (e.key) {
            case "ArrowDown":
              e.preventDefault();
              highlight(highlighted < total - 1 ? highlighted + 1 : 0);
              break;
            case "ArrowUp":
              e.preventDefault();
              highlight(highlighted > 0 ? highlighted - 1 : total - 1);
              break;
            case "Enter":
              e.preventDefault();
              if (highlighted >= 0) selectItem(highlighted);
              break;
            case "Escape":
              close();
              break;
          }
        };

        const blurHandler = (): void => {
          setTimeout(close, 200);
        };
        const focusHandler = (): void => {
          if (input.value.length >= minChars) void doSearch(input.value);
        };

        input.addEventListener("input", inputHandler);
        input.addEventListener("keydown", keyHandler);
        input.addEventListener("blur", blurHandler);
        input.addEventListener("focus", focusHandler);

        cleanups.push(
          () => input.removeEventListener("input", inputHandler),
          () => input.removeEventListener("keydown", keyHandler),
          () => input.removeEventListener("blur", blurHandler),
          () => input.removeEventListener("focus", focusHandler),
          () => {
            if (debounceTimer) clearTimeout(debounceTimer);
          },
          () => {
            if (list.parentNode) list.parentNode.removeChild(list);
          },
        );
      });
  });

  onUnmounted(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  });
}
