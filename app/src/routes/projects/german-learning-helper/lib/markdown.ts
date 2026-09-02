import showdown from 'showdown';

const mdConverter = new showdown.Converter({
  simplifiedAutoLink: true,
  strikethrough: true,
  tables: true,
  tasklists: true,
  openLinksInNewWindow: true,
  simpleLineBreaks: true,
  emoji: true
});

/**
 * Converts markdown text into sanitized HTML suitable for rendering feedback and reformulations.
 */
export function renderMarkdown(md: string | undefined | null): string {
  if (!md || !md.trim()) return '';
  return mdConverter.makeHtml(md.trim());
}
