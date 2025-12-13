'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface AdvancedMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  className?: string;
}

interface ToolbarButton {
  icon: React.ReactNode;
  title: string;
  action: () => void;
  shortcut?: string;
}

const AdvancedMarkdownEditor: React.FC<AdvancedMarkdownEditorProps> = ({
  value,
  onChange,
  height = 500,
  className = '',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);

  // Prevenir abertura automática no mount
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Calcular estatísticas do texto
  useEffect(() => {
    const words = value.trim().split(/\s+/).filter(word => word.length > 0).length;
    const chars = value.length;
    const reading = Math.ceil(words / 200); // 200 palavras por minuto

    setWordCount(words);
    setCharCount(chars);
    setReadingTime(reading);
  }, [value]);

  // Fechar dropdown de templates ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (templatesRef.current && !templatesRef.current.contains(event.target as Node)) {
        setShowTemplates(false);
      }
    };

    if (showTemplates) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTemplates]);

  // Função auxiliar para inserir texto na posição do cursor
  const insertAtCursor = useCallback((before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newValue = 
      value.substring(0, start) + 
      before + textToInsert + after + 
      value.substring(end);
    
    onChange(newValue);

    // Reposicionar cursor
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start, start + before.length + textToInsert.length + after.length);
      } else {
        textarea.setSelectionRange(start + before.length, start + before.length + placeholder.length);
      }
    }, 0);
  }, [value, onChange]);

  // Função para inserir no início da linha
  const insertAtLineStart = useCallback((prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    
    const newValue = 
      value.substring(0, lineStart) + 
      prefix + 
      value.substring(lineStart);
    
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  }, [value, onChange]);

  // Ações da toolbar
  const actions = {
    bold: () => insertAtCursor('**', '**', 'texto em negrito'),
    italic: () => insertAtCursor('*', '*', 'texto em itálico'),
    strikethrough: () => insertAtCursor('~~', '~~', 'texto riscado'),
    h1: () => insertAtLineStart('# '),
    h2: () => insertAtLineStart('## '),
    h3: () => insertAtLineStart('### '),
    quote: () => insertAtLineStart('> '),
    code: () => insertAtCursor('`', '`', 'código'),
    codeBlock: () => insertAtCursor('\n```\n', '\n```\n', 'seu código aqui'),
    link: () => insertAtCursor('[', '](https://)', 'texto do link'),
    image: () => insertAtCursor('![', '](https://)', 'descrição da imagem'),
    unorderedList: () => insertAtLineStart('- '),
    orderedList: () => insertAtLineStart('1. '),
    table: () => {
      const tableTemplate = '\n| Coluna 1 | Coluna 2 | Coluna 3 |\n|----------|----------|----------|\n| Item 1   | Item 2   | Item 3   |\n';
      insertAtCursor(tableTemplate, '', '');
    },
    hr: () => insertAtCursor('\n---\n', '', ''),
    video: () => insertAtCursor('\n<video width="100%" controls src="', '"></video>\n', 'https://url-do-video'),
  };

  // Atalhos de teclado
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          actions.bold();
          break;
        case 'i':
          e.preventDefault();
          actions.italic();
          break;
        case 'k':
          e.preventDefault();
          actions.link();
          break;
        case '`':
          e.preventDefault();
          actions.code();
          break;
      }
    }

    // Tab para indentação
    if (e.key === 'Tab') {
      e.preventDefault();
      insertAtCursor('  ', '', '');
    }
  }, [actions, insertAtCursor]);

  // Templates prontos
  const insertTemplate = (template: string) => {
    const templates = {
      intro: '## Introdução\n\nEscreva aqui a introdução do seu post...\n\n## Desenvolvimento\n\nDesenvolvimento do conteúdo...\n\n## Conclusão\n\nConclusão final...\n',
      review: '# Review: [Nome do Item]\n\n## Prós\n\n- Item 1\n- Item 2\n- Item 3\n\n## Contras\n\n- Item 1\n- Item 2\n\n## Conclusão\n\nMinha opinião final...\n',
      tutorial: '# Tutorial: [Título]\n\n## O que você vai aprender\n\n- Tópico 1\n- Tópico 2\n- Tópico 3\n\n## Passo 1\n\nDescrição do primeiro passo...\n\n## Passo 2\n\nDescrição do segundo passo...\n\n## Conclusão\n\nResumo do que foi aprendido...\n',
    };
    onChange(value + templates[template as keyof typeof templates]);
    setShowTemplates(false); // Fecha o dropdown após inserir
  };

  const toolbarButtons: ToolbarButton[] = [
    { icon: <BoldIcon />, title: 'Negrito (Ctrl+B)', action: actions.bold, shortcut: 'Ctrl+B' },
    { icon: <ItalicIcon />, title: 'Itálico (Ctrl+I)', action: actions.italic, shortcut: 'Ctrl+I' },
    { icon: <StrikethroughIcon />, title: 'Tachado', action: actions.strikethrough },
    { icon: <H1Icon />, title: 'Título 1', action: actions.h1 },
    { icon: <H2Icon />, title: 'Título 2', action: actions.h2 },
    { icon: <H3Icon />, title: 'Título 3', action: actions.h3 },
    { icon: <QuoteIcon />, title: 'Citação', action: actions.quote },
    { icon: <CodeIcon />, title: 'Código inline (Ctrl+`)', action: actions.code, shortcut: 'Ctrl+`' },
    { icon: <CodeBlockIcon />, title: 'Bloco de código', action: actions.codeBlock },
    { icon: <LinkIcon />, title: 'Link (Ctrl+K)', action: actions.link, shortcut: 'Ctrl+K' },
    { icon: <ImageIcon />, title: 'Imagem', action: actions.image },
    { icon: <VideoIcon />, title: 'Vídeo', action: actions.video },
    { icon: <UListIcon />, title: 'Lista não ordenada', action: actions.unorderedList },
    { icon: <OListIcon />, title: 'Lista ordenada', action: actions.orderedList },
    { icon: <TableIcon />, title: 'Tabela', action: actions.table },
    { icon: <HRIcon />, title: 'Linha horizontal', action: actions.hr },
  ];

  return (
    <div className={`advanced-markdown-editor ${className}`}>
      {/* Barra de ferramentas */}
      <div className="bg-gray-800 border border-gray-700 rounded-t-lg p-2 flex flex-wrap gap-1">
        <div className="flex gap-1 flex-wrap">
          {toolbarButtons.map((btn, idx) => (
            <button
              key={idx}
              type="button"
              onClick={btn.action}
              title={btn.title}
              className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-300 hover:text-white"
            >
              {btn.icon}
            </button>
          ))}
        </div>
        
        <div className="ml-auto flex gap-2 items-center">
          {/* Dropdown de templates */}
          <div className="relative" ref={templatesRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isReady) {
                  setShowTemplates(!showTemplates);
                }
              }}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-1"
            >
              📝 Templates
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showTemplates ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {showTemplates && (
              <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[200px]">
                <button
                  type="button"
                  onClick={() => insertTemplate('intro')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-t-lg"
                >
                  📄 Estrutura Básica
                </button>
                <button
                  type="button"
                  onClick={() => insertTemplate('review')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  ⭐ Review/Análise
                </button>
                <button
                  type="button"
                  onClick={() => insertTemplate('tutorial')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-b-lg"
                >
                  📚 Tutorial
                </button>
              </div>
            )}
          </div>

          {/* Toggle Preview */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isReady) {
                setShowPreview(!showPreview);
              }
            }}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              showPreview 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
            }`}
          >
            👁️ {showPreview ? 'Ocultar' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Área de edição e preview */}
      <div className="flex flex-col lg:flex-row gap-2">
        {/* Editor */}
        <div className={`flex-1 ${showPreview ? 'lg:w-1/2' : 'w-full'}`}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-4 bg-gray-900 text-gray-100 border border-gray-700 rounded-b-lg lg:rounded-bl-lg lg:rounded-tr-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed resize-none"
            style={{ height: `${height}px` }}
            placeholder="Escreva seu conteúdo aqui... Use Markdown para formatação.

Dicas:
- Ctrl+B para negrito
- Ctrl+I para itálico  
- Ctrl+K para adicionar link
- Use os botões da toolbar acima para mais opções"
          />
        </div>

        {/* Preview */}
        {showPreview && (
          <div className={`flex-1 lg:w-1/2 border border-gray-700 rounded-b-lg lg:rounded-br-lg lg:rounded-tl-none p-4 bg-gray-900 overflow-y-auto`} style={{ height: `${height}px` }}>
            <MarkdownRenderer>{value || '*Preview aparecerá aqui...*'}</MarkdownRenderer>
          </div>
        )}
      </div>

      {/* Estatísticas */}
      <div className="flex gap-4 text-xs text-gray-400 mt-2 px-2">
        <span>📝 {wordCount} palavras</span>
        <span>🔤 {charCount} caracteres</span>
        <span>⏱️ ~{readingTime} min de leitura</span>
      </div>
    </div>
  );
};

// Ícones SVG para a toolbar
const BoldIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M12.5 4.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5H7V4.5h5.5zM7 11h6c1.38 0 2.5 1.12 2.5 2.5S14.38 16 13 16H7v-5z"/>
  </svg>
);

const ItalicIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>
  </svg>
);

const StrikethroughIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 4v2h4v2h-8V6h4V4H2v2h2v2H2v2h16v-2h-2V6h2V4h-8zm-1 8v4h2v-4H9z"/>
  </svg>
);

const H1Icon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <text x="2" y="15" fontSize="12" fontWeight="bold">H1</text>
  </svg>
);

const H2Icon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <text x="2" y="15" fontSize="12" fontWeight="bold">H2</text>
  </svg>
);

const H3Icon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <text x="2" y="15" fontSize="12" fontWeight="bold">H3</text>
  </svg>
);

const QuoteIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M6 10.5L4 8.5v4l2-2zM8 6v8H4V6h4zm6 4.5L12 8.5v4l2-2zM16 6v8h-4V6h4z"/>
  </svg>
);

const CodeIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M13 7l3 3-3 3M7 7l-3 3 3 3"/>
  </svg>
);

const CodeBlockIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M4 4h12v2H4V4zm0 4h12v2H4V8zm0 4h12v2H4v-2z"/>
  </svg>
);

const LinkIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"/>
  </svg>
);

const ImageIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
  </svg>
);

const VideoIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
  </svg>
);

const UListIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M3 4h2v2H3V4zm4 0h10v2H7V4zM3 9h2v2H3V9zm4 0h10v2H7V9zm-4 5h2v2H3v-2zm4 0h10v2H7v-2z"/>
  </svg>
);

const OListIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M3 4h2v4H3V4zm4 0h10v2H7V4zm-4 6h2v4H3v-4zm4 1h10v2H7v-2z"/>
  </svg>
);

const TableIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M3 3h14v14H3V3zm2 2v3h4V5H5zm6 0v3h4V5h-4zM5 10v3h4v-3H5zm6 0v3h4v-3h-4z"/>
  </svg>
);

const HRIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2 10h16v2H2v-2z"/>
  </svg>
);

export default AdvancedMarkdownEditor;
