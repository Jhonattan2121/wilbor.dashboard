import 'highlight.js/styles/github-dark.css';
import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

const markdownComponents: Components = {
  h1: ({ ...props }) => (
    <h1
      className="text-4xl font-extrabold mt-0 mb-2 border-b border-gray-300 dark:border-gray-700 pb-2 block w-full"
      {...props}
    />
  ),
  h2: ({ ...props }) => (
    <h2
      className="text-3xl font-bold mt-8 mb-2 border-b border-gray-200 dark:border-gray-700 pb-1 block w-full"
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
      className="flex items-center gap-2 text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  ul: ({ ...props }) => <ul className="list-none ml-0 mb-4" {...props} />, 
  ol: ({ ...props }) => <ol className="list-none ml-0 mb-4" {...props} />, 
  li: ({ checked, ...props }: any) => (
    <li
      className={`mb-1 ${typeof checked === 'boolean' ? 'list-none flex items-center' : 'list-none'}`}
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
    <strong className="font-bold text-primary-700 dark:text-primary-300" {...props} />
  ),
  em: ({ ...props }) => (
    <em className="italic text-primary-500 dark:text-primary-200" {...props} />
  ),
  blockquote: ({ ...props }) => (
    <blockquote className="border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-900/30 pl-4 pr-2 py-2 my-4 italic text-gray-700 dark:text-gray-200" {...props} />
  ),
  code: ({ className, ...props }) => (
    <code className={`rounded bg-gray-100 dark:bg-gray-800 px-1 py-0.5 font-mono text-sm ${className || ''}`} {...props} />
  ),
  pre: ({ ...props }) => (
    <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 overflow-x-auto my-4" {...props} />
  ),
  table: ({ ...props }) => (
    <table className="table-auto border-collapse w-full my-4" {...props} />
  ),
  th: ({ ...props }) => (
    <th className="border px-4 py-2 bg-gray-100 dark:bg-gray-700" {...props} />
  ),
  td: ({ ...props }) => (
    <td className="border px-4 py-2" {...props} />
  ),
  img: ({ ...props }) => (
    <img className="rounded-lg max-w-full h-auto my-4 border border-gray-200 dark:border-gray-700" {...props} />
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
  return (
    <div className={`prose dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
