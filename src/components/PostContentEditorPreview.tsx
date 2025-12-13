import React from 'react';
import AdvancedMarkdownEditor from './AdvancedMarkdownEditor';

interface PostContentEditorPreviewProps {
  content: string;
  onChange: (value: string) => void;
}

const PostContentEditorPreview: React.FC<PostContentEditorPreviewProps> = ({
  content,
  onChange,
}) => {
  return (
    <div className="flex flex-col">
      <AdvancedMarkdownEditor
        value={content}
        onChange={onChange}
        height={600}
        className="w-full mt-2"
      />
    </div>
  );
};

export default PostContentEditorPreview;
