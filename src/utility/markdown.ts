const HEADING_WITH_SPACING_REGEX = /^( {0,3}#{1,6})\s*(.*?)\s*$/;
const FULL_LINE_BOLD_REGEX = /^(\s*)\*\*(.+?)\s+\*\*(\s*)$/;
const HORIZONTAL_RULE_REGEX = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;

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
  const withParagraphBreaks = normalizedNewLines.replace(
    /(?:[ \t]*<br\s*\/?>[ \t]*\n?){2,}/gi,
    '\n\n',
  );
  const withBrAsNewline = withParagraphBreaks.replace(/<br\s*\/?>/gi, '\n');
  const trimmedLineEndings = withBrAsNewline.replace(/[ \t]+\n/g, '\n');
  const normalizedLines = trimmedLineEndings
    .split('\n')
    .map(normalizeMarkdownLine)
    .join('\n');

  const hrSpacedLines = normalizedLines
    .split('\n')
    .reduce<string[]>((acc, line, index, lines) => {
      if (!HORIZONTAL_RULE_REGEX.test(line)) {
        acc.push(line);
        return acc;
      }

      const prevLine = acc.length > 0 ? acc[acc.length - 1] : '';
      if (prevLine.trim() !== '') {
        acc.push('');
      }

      acc.push('---');

      const nextLine = lines[index + 1] || '';
      if (nextLine.trim() !== '') {
        acc.push('');
      }

      return acc;
    }, [])
    .join('\n');

  return hrSpacedLines.replace(/\n{3,}/g, '\n\n');
};
