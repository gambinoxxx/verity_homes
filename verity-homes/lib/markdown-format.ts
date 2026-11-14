// The post editor's Markdown toolbar (Unit 18): pure text edits on (value, selection), so the
// textarea stays a plain textarea. Returns the new value and where the selection goes.

export type MarkdownAction = "heading" | "bold" | "italic" | "link" | "bullets" | "quote";

export type Edit = { value: string; start: number; end: number };

function wrap(e: Edit, before: string, after: string, placeholder: string): Edit {
  const selected = e.value.slice(e.start, e.end) || placeholder;
  const value = e.value.slice(0, e.start) + before + selected + after + e.value.slice(e.end);
  const start = e.start + before.length;
  return { value, start, end: start + selected.length };
}

/** Adds `prefix` to the start of every line the selection touches (or removes it if all have it). */
function prefixLines(e: Edit, prefix: string, placeholder: string): Edit {
  const lineStart = e.value.lastIndexOf("\n", e.start - 1) + 1;
  // The line holding the selection's last character (or the cursor).
  const nl = e.value.indexOf("\n", e.end > e.start ? e.end - 1 : e.start);
  const lineEnd = nl === -1 ? e.value.length : nl;
  const block = e.value.slice(lineStart, lineEnd) || placeholder;
  const lines = block.split("\n");
  const all = lines.every((l) => l.startsWith(prefix));
  const next = lines.map((l) => (all ? l.slice(prefix.length) : prefix + l)).join("\n");
  const value = e.value.slice(0, lineStart) + next + e.value.slice(lineEnd);
  return { value, start: lineStart, end: lineStart + next.length };
}

export function applyMarkdown(action: MarkdownAction, e: Edit): Edit {
  switch (action) {
    case "bold":
      return wrap(e, "**", "**", "bold text");
    case "italic":
      return wrap(e, "_", "_", "italic text");
    case "link": {
      const text = e.value.slice(e.start, e.end) || "link text";
      const before = `[${text}](`;
      const url = "https://";
      const value = e.value.slice(0, e.start) + before + url + ")" + e.value.slice(e.end);
      const start = e.start + before.length;
      return { value, start, end: start + url.length }; // the URL is selected, ready to type
    }
    case "heading":
      return prefixLines(e, "## ", "Heading");
    case "bullets":
      return prefixLines(e, "- ", "List item");
    case "quote":
      return prefixLines(e, "> ", "Quote");
  }
}

/**
 * Inserts `text` at the cursor (replacing any selection) on its own paragraph, so an image
 * never ends up glued to the middle of a sentence. The cursor goes after it.
 */
export function insertBlock(e: Edit, text: string): Edit {
  const before = e.value.slice(0, e.start);
  const after = e.value.slice(e.end);
  const lead =
    before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail =
    after === "" || after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const value = before + lead + text + trail + after;
  const pos = before.length + lead.length + text.length;
  return { value, start: pos, end: pos };
}
