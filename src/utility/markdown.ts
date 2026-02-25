const HEADING_WITH_SPACING_REGEX = /^( {0,3}#{1,6})\s*(.*?)\s*$/;
const FULL_LINE_BOLD_REGEX = /^(\s*)\*\*(.+?)\s+\*\*(\s*)$/;

const normalizeMarkdownLine = (line: string) => {
  const headingMatch = line.match(HEADING_WITH_SPACING_REGEX);
  if (headingMatch && headingMatch[2].trim() !== '') {
    return `${headingMatch[1].trimStart()} ${headingMatch[2].trim()}`;
  }

  const boldMatch = line.match(FULL_LINE_BOLD_REGEX);
  if (boldMatch) {
    return `${boldMatch[1]}**${boldMatch[2].trim()}**${boldMatch[3]}`;
  }

  return line;
};

export const normalizeMarkdownForDisplay = (input = '') => {
  if (!input) return input;

  const normalizedNewLines = input.replace(/\r\n?/g, '\n');
  const withSectionBreaks = normalizedNewLines.replace(
    /(?:[ \t]*<br\s*\/?>[ \t]*\n?){2,}/gi,
    '\n\n---\n\n',
  );
  const withBrAsNewline = withSectionBreaks.replace(/<br\s*\/?>/gi, '\n');
  const trimmedLineEndings = withBrAsNewline.replace(/[ \t]+\n/g, '\n');
  const normalizedLines = trimmedLineEndings
    .split('\n')
    .map(normalizeMarkdownLine)
    .join('\n');

  return normalizedLines.replace(/\n{3,}/g, '\n\n');
};
