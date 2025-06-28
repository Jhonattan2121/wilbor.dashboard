import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';

const markdownComponents: Components = {
  h1: ({ ...props }) => (
    <h1
      className="text-4xl font-extrabold mt-0 mb-2 border-b border-gray-300 \
      dark:border-gray-700 pb-2 block w-full"
      {...props}
    />
  ),
  h2: ({ ...props }) => (
    <h2
      className="text-3xl font-bold mt-8 mb-2 border-b border-gray-200 \
      dark:border-gray-700 pb-1 block w-full"
      {...props}
    />
  ),
  h3: ({ ...props }) => (
    <h3
      className="text-2xl font-semibold mt-6 mb-2 block w-full"
      {...props}
    />
  ),
  p: ({ ...props }) => <p className="leading-relaxed mb-4" {...props} />,
  a: ({ ...props }) => (
    <a
      className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  ul: ({ ...props }) => <ul className="list-disc ml-6 mb-4" {...props} />,
  ol: ({ ...props }) => <ol className="list-decimal ml-6 mb-4" {...props} />,
  li: ({ ...props }) => <li className="mb-1" {...props} />,
  strong: ({ ...props }) => (
    <strong
      className="font-bold text-primary-700 dark:text-primary-300"
      {...props}
    />
  ),
  em: ({ ...props }) => (
    <em className="italic text-primary-500 dark:text-primary-200" {...props} />
  ),
  // Adicione mais customizações conforme necessário
};

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

function extractTitleAndBody(markdown: string): { title: string; body: string } {
  // Se já começa com #, respeita o markdown original
  if (/^\s*#/.test(markdown)) {
    return { title: '', body: markdown };
  }
  // Divide pelo primeiro bloco em branco (dupla quebra de linha)
  const [first, ...rest] = markdown.split(/\n\s*\n/);
  const title = first.trim();
  const body = rest.join('\n\n').trim();
  return { title, body };
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  children,
  className = '',
}) => {
  const { title, body } = extractTitleAndBody(children);
  // Se não tem título, só renderiza o markdown
  const content = title
    ? `# ${title}\n\n${body}`
    : body;
  return (
    <div className={`prose dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
