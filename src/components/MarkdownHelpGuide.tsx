'use client';

import React, { useState } from 'react';

interface MarkdownHelpGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const MarkdownHelpGuide: React.FC<MarkdownHelpGuideProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = async (markdown: string, index: number) => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const examples = [
    { markdown: '**negrito**', result: 'negrito', shortcut: 'Ctrl+B' },
    { markdown: '*itálico*', result: 'itálico', shortcut: 'Ctrl+I' },
    { markdown: '~~riscado~~', result: 'riscado' },
    { markdown: '# Título', result: 'Título' },
    { markdown: '## Subtítulo', result: 'Subtítulo' },
    { markdown: '> citação', result: 'citação' },
    { markdown: '`código`', result: 'código', shortcut: 'Ctrl+`' },
    { markdown: '[link](url)', result: 'link', shortcut: 'Ctrl+K' },
    { markdown: '![img](url)', result: 'Imagem' },
    { markdown: '- item', result: '• item' },
    { markdown: '1. item', result: '1. item' },
    { markdown: '---', result: 'Linha' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative z-10 bg-[#18181b] rounded-xl shadow-2xl border border-gray-800 w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Guia Markdown</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {examples.map((example, index) => (
              <div
                key={index}
                className="group relative bg-gray-800/40 border border-gray-700/40 rounded-lg p-3 hover:border-blue-500/60 hover:bg-gray-800/60 transition-all cursor-pointer"
                onClick={() => handleCopy(example.markdown, index)}
              >
                {copiedIndex === index && (
                  <div className="absolute inset-0 bg-blue-500/10 border border-blue-500/50 rounded-lg flex items-center justify-center z-10">
                    <span className="text-blue-400 text-xs font-medium">Copiado!</span>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    {example.shortcut && (
                      <span className="text-[10px] text-gray-600 font-mono">{example.shortcut}</span>
                    )}
                  </div>
                  <div className="bg-gray-900/60 rounded px-2 py-1.5 font-mono text-xs text-blue-400/90 border border-gray-700/40">
                    {example.markdown}
                  </div>
                  <div className="text-xs text-gray-400">
                    {example.result}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 px-5 py-3">
          <p className="text-xs text-gray-500 text-center">
            Clique para copiar • Use os botões da toolbar
          </p>
        </div>
      </div>
    </div>
  );
};

export default MarkdownHelpGuide;
