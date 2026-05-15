'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

  const saveDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    const draft: DraftData = { title, content, tags, timestamp: Date.now() };
    localStorage.setItem(draftKey, JSON.stringify(draft));
    setLastSaved(new Date());
    setHasDraft(true);
  }, [title, content, tags, draftKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!title && !content && tags.length === 0) return;
    timeoutRef.current = setTimeout(saveDraft, autoSaveInterval);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [title, content, tags, autoSaveInterval, saveDraft]);

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

  return {
    saveDraft,
    loadDraft,
    deleteDraft,
    hasDraft,
    lastSaved,
  };
};



