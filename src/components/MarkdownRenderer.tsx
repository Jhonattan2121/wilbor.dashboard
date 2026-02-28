import 'highlight.js/styles/github-dark.css';
import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { normalizeMarkdownForDisplay } from '@/utility/markdown';

const markdownComponents: Components = {
  h1: ({ ...props }) => (
    <h1
      className="mb-4 mt-0 w-full border-b border-gray-300 pb-2 text-3xl font-extrabold text-gray-900 dark:border-gray-700 dark:text-gray-100"
      {...props}
    />
  ),
  h2: ({ ...props }) => (
    <h2
      className="mb-3 mt-8 w-full border-b border-gray-200 pb-1 text-2xl font-bold text-gray-900 dark:border-gray-700 dark:text-gray-100"
      {...props}
    />
  ),
  h3: ({ ...props }) => (
    <h3
      className="mb-2 mt-6 w-full text-xl font-semibold text-gray-900 dark:text-gray-100"
      {...props}
    />
  ),
  p: ({ ...props }) => (
    <p
      className="mb-4 whitespace-pre-line leading-relaxed text-gray-800 dark:text-gray-300"
      {...props}
    />
  ),
  a: ({ ...props }) => (
    <a
      className="break-words text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  ul: ({ ...props }) => (
    <ul className="mb-4 list-disc pl-6 text-gray-800 dark:text-gray-300" {...props} />
  ),
  ol: ({ ...props }) => (
    <ol className="mb-4 list-decimal pl-6 text-gray-800 dark:text-gray-300" {...props} />
  ),
  li: ({ checked, ...props }: any) => (
    <li
      className={`mb-1 text-gray-800 dark:text-gray-300 ${typeof checked === 'boolean' ? 'list-none flex items-start gap-2' : ''}`}
      {...props}
    >
      {typeof checked === 'boolean' && (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="mr-2 accent-blue-500"
        />
      )}
      {props.children}
    </li>
  ),
  strong: ({ ...props }) => (
    <strong className="font-bold text-gray-900 dark:text-gray-100" {...props} />
  ),
  em: ({ ...props }) => (
    <em className="italic text-gray-800 dark:text-gray-200" {...props} />
  ),
  blockquote: ({ ...props }) => (
    <blockquote className="border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-900/30 pl-4 pr-2 py-2 my-4 italic text-gray-700 dark:text-gray-200" {...props} />
  ),
  code: ({ className, ...props }) => (
    <code className={`rounded bg-gray-200 px-1 py-0.5 font-mono text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100 ${className || ''}`} {...props} />
  ),
  pre: ({ ...props }) => (
    <pre className="rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 overflow-x-auto my-4" {...props} />
  ),
  hr: ({ ...props }) => (
    <hr className="my-6 h-px border-0 bg-gray-400/70 dark:bg-gray-600" {...props} />
  ),
  table: ({ ...props }) => (
    <table className="table-auto border-collapse w-full my-4 text-gray-800 dark:text-gray-300" {...props} />
  ),
  th: ({ ...props }) => (
    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100" {...props} />
  ),
  td: ({ ...props }) => (
    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-800 dark:text-gray-300" {...props} />
  ),
  img: ({ ...props }) => (
    <img className="rounded-lg max-w-full h-auto my-4 border border-gray-200 dark:border-gray-700" {...props} />
  ),
  iframe: ({ ...props }) => (
    <div className="my-4 w-full overflow-hidden rounded-lg bg-black">
      <div className="relative w-full pb-[56.25%]">
        <iframe className="absolute inset-0 h-full w-full border-0" {...props} />
      </div>
    </div>
  ),
  video: ({ ...props }) => (
    <video
      className="my-4 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
      controls
      {...props}
    />
  ),
};

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  children,
  className = '',
}) => {
  const normalizedContent = normalizeMarkdownForDisplay(children);

  return (
    <div className={`max-w-none ${className}`}>
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
