/**
 * Minimal, dependency-free syntax highlighter for docs / VdCodeSnippet.
 * Emits escaped HTML with `vd-tk-*` spans (same classes as code-snippet.css).
 * Language keys match DocCodeSnippet tabs: html | css | js | shell | vue | json.
 * Unknown languages → HTML-escaped plaintext. No extra trailing newline.
 */

export type HighlightLanguage =
  "html" | "css" | "js" | "shell" | "vue" | "json";

type TokenType =
  | "keyword"
  | "string"
  | "comment"
  | "number"
  | "tag"
  | "attribute"
  | "punctuation"
  | "operator"
  | "property"
  | "boolean"
  | "null"
  | "function"
  | "builtin"
  | "variable"
  | "regex"
  | "meta"
  | "plain";

interface Token {
  type: TokenType;
  value: string;
}

interface Rule {
  type: TokenType;
  re: RegExp;
}

const ESCAPE_RE = /[&<>"']/g;
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(str: string): string {
  return str.replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch]!);
}

/** Plaintext escape for unknown languages (snippet-safe; matches docs contract). */
function escapePlain(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wordRegex(words: string[]): RegExp {
  return new RegExp(`\\b(?:${words.join("|")})\\b`, "y");
}

function scan(source: string, rules: Rule[]): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = source.length;
  while (i < len) {
    let matched = false;
    for (const rule of rules) {
      rule.re.lastIndex = i;
      const m = rule.re.exec(source);
      if (m && m.index === i) {
        tokens.push({ type: rule.type, value: m[0] });
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      let j = i + 1;
      while (j < len) {
        let hit = false;
        for (const rule of rules) {
          rule.re.lastIndex = j;
          const m = rule.re.exec(source);
          if (m && m.index === j) {
            hit = true;
            break;
          }
        }
        if (hit) break;
        j++;
      }
      tokens.push({ type: "plain", value: source.slice(i, j) });
      i = j;
    }
  }
  return tokens;
}

function render(tokens: Token[]): string {
  let html = "";
  for (const t of tokens) {
    if (t.type === "plain") html += escapeHtml(t.value);
    else
      html +=
        `<span class="vd-tk-${t.type}">` + escapeHtml(t.value) + "</span>";
  }
  return html;
}

// ── Keyword / builtin lists ──────────────────────────────────

const JS_KEYWORDS = [
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "of",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "type",
  "namespace",
  "declare",
  "readonly",
  "as",
  "satisfies",
  "keyof",
  "infer",
  "never",
  "unknown",
  "any",
  "string",
  "number",
  "boolean",
  "symbol",
  "bigint",
];

const JS_BUILTINS = [
  "console",
  "window",
  "document",
  "Array",
  "Object",
  "String",
  "Number",
  "Boolean",
  "Map",
  "Set",
  "Promise",
  "JSON",
  "Math",
  "Date",
  "Error",
  "RegExp",
  "parseInt",
  "parseFloat",
  "isNaN",
  "Infinity",
  "NaN",
];

const CSS_KEYWORDS = [
  "important",
  "inherit",
  "initial",
  "unset",
  "revert",
  "auto",
  "none",
  "solid",
  "flex",
  "grid",
  "block",
  "inline",
  "absolute",
  "relative",
  "fixed",
  "sticky",
];

const SHELL_KEYWORDS = [
  "if",
  "then",
  "elif",
  "else",
  "fi",
  "for",
  "while",
  "until",
  "do",
  "done",
  "case",
  "esac",
  "function",
  "in",
  "select",
  "return",
  "break",
  "continue",
  "local",
  "export",
  "readonly",
  "declare",
  "set",
  "unset",
  "shift",
  "exit",
  "source",
  "alias",
];

const SHELL_BUILTINS = [
  "echo",
  "printf",
  "read",
  "cd",
  "pwd",
  "ls",
  "cat",
  "grep",
  "sed",
  "awk",
  "curl",
  "wget",
  "git",
  "npm",
  "pnpm",
  "yarn",
  "node",
  "python",
  "docker",
  "make",
  "chmod",
  "mkdir",
  "rm",
  "cp",
  "mv",
  "touch",
  "sudo",
  "env",
  "which",
  "kill",
  "ps",
  "tar",
  "ssh",
];

const JS_RULES: Rule[] = [
  { type: "comment", re: /\/\/[^\n]*/y },
  { type: "comment", re: /\/\*[\s\S]*?\*\//y },
  { type: "string", re: /"(?:[^"\\]|\\.)*"/y },
  { type: "string", re: /'(?:[^'\\]|\\.)*'/y },
  { type: "string", re: /`(?:[^`\\]|\\.)*`/y },
  { type: "regex", re: /\/(?![*/])(?:[^/\n\\]|\\.)+\/[gimsuy]*/y },
  {
    type: "number",
    re: /\b0x[\da-fA-F]+\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y,
  },
  { type: "boolean", re: /\b(?:true|false)\b/y },
  { type: "null", re: /\b(?:null|undefined)\b/y },
  { type: "keyword", re: wordRegex(JS_KEYWORDS) },
  { type: "builtin", re: wordRegex(JS_BUILTINS) },
  { type: "function", re: /\b[A-Za-z_$][\w$]*(?=\s*\()/y },
  {
    type: "operator",
    re: /=>|===|!==|==|!=|<=|>=|\+\+|--|\|\||&&|[+\-*/%=<>!?~^|&]/y,
  },
  { type: "punctuation", re: /[{}[\]();,.:]/y },
];

const CSS_RULES: Rule[] = [
  { type: "comment", re: /\/\*[\s\S]*?\*\//y },
  { type: "string", re: /"(?:[^"\\]|\\.)*"/y },
  { type: "string", re: /'(?:[^'\\]|\\.)*'/y },
  { type: "meta", re: /@[a-zA-Z-]+/y },
  {
    type: "number",
    re: /#(?:[\da-fA-F]{3,8})\b|\b\d+(?:\.\d+)?(?:%|px|em|rem|vh|vw|deg|s|ms)?\b/y,
  },
  { type: "property", re: /[a-zA-Z-]+(?=\s*:)/y },
  { type: "keyword", re: wordRegex(CSS_KEYWORDS) },
  { type: "attribute", re: /[.#][a-zA-Z_][\w-]*/y },
  { type: "operator", re: /[>~+*]/y },
  { type: "punctuation", re: /[{}[\]();,:]/y },
];

const JSON_RULES: Rule[] = [
  { type: "property", re: /"(?:[^"\\]|\\.)*"(?=\s*:)/y },
  { type: "string", re: /"(?:[^"\\]|\\.)*"/y },
  { type: "number", re: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y },
  { type: "boolean", re: /\b(?:true|false)\b/y },
  { type: "null", re: /\bnull\b/y },
  { type: "punctuation", re: /[{}[\]:,]/y },
];

const SHELL_RULES: Rule[] = [
  { type: "comment", re: /#[^\n]*/y },
  { type: "string", re: /"(?:[^"\\]|\\.)*"/y },
  { type: "string", re: /'[^']*'/y },
  { type: "variable", re: /\$\{[^}\n]*\}|\$[A-Za-z_]\w*|\$[@*#?$!0-9-]/y },
  { type: "keyword", re: wordRegex(SHELL_KEYWORDS) },
  { type: "builtin", re: wordRegex(SHELL_BUILTINS) },
  { type: "attribute", re: /--?[A-Za-z][\w-]*/y },
  { type: "number", re: /\b\d+\b/y },
  { type: "operator", re: /\|\||&&|[|&;<>]+/y },
  { type: "punctuation", re: /[(){}[\]]/y },
];

function tokenizeHtml(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = source.length;

  while (i < len) {
    if (source.startsWith("<!--", i)) {
      const end = source.indexOf("-->", i + 4);
      const j = end === -1 ? len : end + 3;
      tokens.push({ type: "comment", value: source.slice(i, j) });
      i = j;
      continue;
    }

    if (source[i] === "<") {
      const close = source[i + 1] === "/";
      let j = i + (close ? 2 : 1);

      if (source[j] === "!" || source[j] === "?") {
        const gt = source.indexOf(">", j);
        const end = gt === -1 ? len : gt + 1;
        tokens.push({ type: "meta", value: source.slice(i, end) });
        i = end;
        continue;
      }

      tokens.push({ type: "punctuation", value: close ? "</" : "<" });
      const tagStart = j;
      while (j < len && /[\w:-]/.test(source[j]!)) j++;
      if (j > tagStart) {
        tokens.push({ type: "tag", value: source.slice(tagStart, j) });
      }

      while (j < len && source[j] !== ">") {
        if (/\s/.test(source[j]!)) {
          const wsStart = j;
          while (j < len && /\s/.test(source[j]!)) j++;
          tokens.push({ type: "plain", value: source.slice(wsStart, j) });
          continue;
        }
        if (source[j] === "/" && source[j + 1] === ">") break;
        if (source[j] === "=") {
          tokens.push({ type: "operator", value: "=" });
          j++;
          continue;
        }
        if (source[j] === '"' || source[j] === "'") {
          const q = source[j]!;
          let k = j + 1;
          while (k < len && source[k] !== q) {
            if (source[k] === "\\") k++;
            k++;
          }
          if (k < len) k++;
          tokens.push({ type: "string", value: source.slice(j, k) });
          j = k;
          continue;
        }
        const aStart = j;
        while (j < len && /[^\s=>/]/.test(source[j]!)) j++;
        tokens.push({ type: "attribute", value: source.slice(aStart, j) });
      }

      if (j < len && source[j] === "/" && source[j + 1] === ">") {
        tokens.push({ type: "punctuation", value: "/>" });
        j += 2;
      } else if (j < len && source[j] === ">") {
        tokens.push({ type: "punctuation", value: ">" });
        j++;
      }
      i = j;
      continue;
    }

    const next = source.indexOf("<", i);
    const end = next === -1 ? len : next;
    tokens.push({ type: "plain", value: source.slice(i, end) });
    i = end;
  }
  return tokens;
}

function tokenizeCss(source: string): Token[] {
  return scan(source, CSS_RULES);
}

function tokenizeJs(source: string): Token[] {
  return scan(source, JS_RULES);
}

function tokenizeJson(source: string): Token[] {
  return scan(source, JSON_RULES);
}

function tokenizeShell(source: string): Token[] {
  return scan(source, SHELL_RULES);
}

/** Vue SFC: script/style bodies use js/css; everything else is HTML. */
function tokenizeVue(source: string): Token[] {
  const tokens: Token[] = [];
  const blockRe =
    /<(script|style)(\s[^>]*)?>([\s\S]*?)<\/\1\s*>|<(template)(\s[^>]*)?>([\s\S]*?)<\/template\s*>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(source))) {
    if (m.index > last) {
      tokens.push(...tokenizeHtml(source.slice(last, m.index)));
    }
    const full = m[0];
    const tag = (m[1] || m[4] || "").toLowerCase();
    if (tag === "script") {
      const openEnd = full.indexOf(">") + 1;
      const closeStart = full.lastIndexOf("</");
      tokens.push(...tokenizeHtml(full.slice(0, openEnd)));
      tokens.push(...tokenizeJs(full.slice(openEnd, closeStart)));
      tokens.push(...tokenizeHtml(full.slice(closeStart)));
    } else if (tag === "style") {
      const openEnd = full.indexOf(">") + 1;
      const closeStart = full.lastIndexOf("</");
      tokens.push(...tokenizeHtml(full.slice(0, openEnd)));
      tokens.push(...tokenizeCss(full.slice(openEnd, closeStart)));
      tokens.push(...tokenizeHtml(full.slice(closeStart)));
    } else {
      tokens.push(...tokenizeHtml(full));
    }
    last = m.index + full.length;
  }
  if (last < source.length) {
    tokens.push(...tokenizeHtml(source.slice(last)));
  }
  return tokens;
}

const LANG: Record<string, (src: string) => Token[]> = {
  html: tokenizeHtml,
  css: tokenizeCss,
  js: tokenizeJs,
  shell: tokenizeShell,
  vue: tokenizeVue,
  json: tokenizeJson,
};

/**
 * Highlight `code` for a DocCodeSnippet / VdCodeSnippet language key.
 * Returns escaped HTML with `vd-tk-*` spans. Unknown keys → escaped plaintext.
 */
export function highlightCode(code: string, language: string): string {
  const fn = LANG[language];
  if (!fn) return escapePlain(code);
  return render(fn(code));
}

/** Alias of {@link highlightCode}. */
export const highlight = highlightCode;
