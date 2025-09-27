import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface PostContentEditorPreviewProps {
  content: string;
  onChange: (value: string) => void;
}

const PostContentEditorPreview: React.FC<PostContentEditorPreviewProps> = ({
  content,
  onChange,
}) => {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Textarea de conteúdo */}
      <div className="flex-1 flex flex-col min-h-[350px]">
        <div className="flex-1 flex flex-col">
          <textarea
            value={content}
            onChange={e => onChange(e.target.value)}
            className="w-full h-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white min-h-[250px] sm:min-h-[400px] resize-none text-base mt-2 flex-1"
            placeholder="Digite algum conteúdo para o seu post (suporta markdown)"
            style={{ minHeight: '350px', height: '100%' }}
          />
        </div>
      </div>
      {/* Preview do markdown */}
      <div className="flex-1 flex flex-col min-h-[350px]">
        <label className="block text-sm font-medium mb-1">Preview</label>
        <div className="flex-1 flex flex-col">
          <div className="bg-gray-900 border border-gray-700 rounded p-4 overflow-y-auto min-h-[250px] sm:min-h-[400px] max-h-[60vh] prose dark:prose-invert max-w-none flex-1"
            style={{ minHeight: '350px', height: '100%' }}
          >
            <MarkdownRenderer>{content}</MarkdownRenderer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostContentEditorPreview;
