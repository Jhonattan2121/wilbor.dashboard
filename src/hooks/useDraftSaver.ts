'use client';

import { useEffect, useRef, useState } from 'react';

interface DraftData {
  title: string;
  content: string;
  tags: string[];
  timestamp: number;
}

interface UseDraftSaverOptions {
  title: string;
  content: string;
  tags: string[];
  draftKey: string;
  autoSaveInterval?: number; // em milissegundos
}

export const useDraftSaver = ({
  title,
  content,
  tags,
  draftKey,
  autoSaveInterval = 30000, // 30 segundos por padrão
}: UseDraftSaverOptions) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Verificar se existe um rascunho salvo ao montar o componente
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedDraft = localStorage.getItem(draftKey);
    setHasDraft(!!savedDraft);
  }, [draftKey]);

  // Auto-save
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Só salva se tiver conteúdo
    if (!title && !content && tags.length === 0) {
      return;
    }

    // Configurar novo timeout
    timeoutRef.current = setTimeout(() => {
      saveDraft();
    }, autoSaveInterval);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [title, content, tags, autoSaveInterval, draftKey]);

  // Salvar rascunho
  const saveDraft = () => {
    if (typeof window === 'undefined') return;

    const draft: DraftData = {
      title,
      content,
      tags,
      timestamp: Date.now(),
    };

    localStorage.setItem(draftKey, JSON.stringify(draft));
    setLastSaved(new Date());
    setHasDraft(true);
  };

  // Carregar rascunho
  const loadDraft = (): DraftData | null => {
    if (typeof window === 'undefined') return null;

    const savedDraft = localStorage.getItem(draftKey);
    if (!savedDraft) return null;

    try {
      return JSON.parse(savedDraft) as DraftData;
    } catch (error) {
      console.error('Erro ao carregar rascunho:', error);
      return null;
    }
  };

  // Deletar rascunho
  const deleteDraft = () => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(draftKey);
    setHasDraft(false);
    setLastSaved(null);
  };

  // Salvar manualmente
  const saveNow = () => {
    saveDraft();
  };

  return {
    saveDraft: saveNow,
    loadDraft,
    deleteDraft,
    hasDraft,
    lastSaved,
  };
};



