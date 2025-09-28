import dynamic from 'next/dynamic';
import React from 'react';

// Importação dinâmica para evitar SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor'),
  { ssr: false }
);

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  height?: number;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, className, height = 300 }) => {
  const handleChange = (val?: string) => {
    onChange(val ?? '');
  };

  return (
    <div className={className} data-color-mode="dark">
      <MDEditor value={value} onChange={handleChange} height={height} />
    </div>
  );
};

export default MarkdownEditor;
