function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function applyInline(text: string): string {
  let result = text;

  // Bold — must come before italic
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic (single asterisk, not part of bold)
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Links
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // Template variables
  result = result.replace(/\{\{var:(.+?)\}\}/g, '<span class="template-var">$1</span>');

  // Clause references
  result = result.replace(/\{\{clause:(.+?)\}\}/g, '<span class="clause-ref">$1</span>');

  return result;
}

export function markdownToHtml(md: string): string {
  if (!md) return '';

  // First escape HTML for XSS safety
  const html = escapeHtml(md);

  // Split into blocks by double newlines
  const blocks = html.split(/\n\n+/);

  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';

      // Headings (h1-h6)
      const headingMatch = /^(#{1,6})\s+(.+)$/m.exec(trimmed);
      if (headingMatch?.[1] != null && headingMatch[2] != null) {
        const level = headingMatch[1].length;
        return `<h${String(level)}>${applyInline(headingMatch[2])}</h${String(level)}>`;
      }

      // Horizontal rule
      if (/^---+$/.test(trimmed)) {
        return '<hr />';
      }

      // Unordered list
      if (trimmed.startsWith('- ')) {
        const items = trimmed
          .split('\n')
          .filter((l) => l.startsWith('- '))
          .map((l) => `<li>${applyInline(l.slice(2))}</li>`);
        return `<ul>${items.join('')}</ul>`;
      }

      // Ordered list
      if (/^\d+\. /.test(trimmed)) {
        const items = trimmed
          .split('\n')
          .filter((l) => /^\d+\. /.test(l))
          .map((l) => `<li>${applyInline(l.replace(/^\d+\. /, ''))}</li>`);
        return `<ol>${items.join('')}</ol>`;
      }

      // Paragraph
      return `<p>${applyInline(trimmed)}</p>`;
    })
    .filter((b) => b !== '')
    .join('\n');
}
