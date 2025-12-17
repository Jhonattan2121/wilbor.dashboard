'use client';

import React, { useEffect, useState } from 'react';

interface TagSuggestionsProps {
  currentTags: string[];
  onTagSelect: (tag: string) => void;
  maxTags?: number;
}

// Tags populares do Hive organizadas por categoria
const POPULAR_HIVE_TAGS = {
  'Fotografia': [
    'photography', 'photo', 'photographer', 'photooftheday', 'portrait',
    'landscape', 'blackandwhite', 'streetphotography', 'naturephotography',
    'mobilephotography', 'digitalphotography', 'analogphotography'
  ],
  'Arte & Criatividade': [
    'art', 'artist', 'artwork', 'drawing', 'painting', 'digitalart',
    'sketch', 'illustration', 'creative', 'design', 'artgallery'
  ],
  'Tecnologia': [
    'technology', 'tech', 'programming', 'coding', 'developer', 'blockchain',
    'crypto', 'ai', 'web3', 'software', 'hardware', 'gaming'
  ],
  'Lifestyle': [
    'lifestyle', 'life', 'blog', 'travel', 'food', 'health', 'fitness',
    'nature', 'adventure', 'family', 'friends', 'daily', 'vlog'
  ],
  'Comunidade Hive': [
    'hive', 'leofinance', 'proofofbrain', 'neoxian', 'palnet', 'creativecoin',
    'archon', 'stem', 'sportstalk', 'ctp', 'vyb'
  ],
  'Conteúdo': [
    'blog', 'writing', 'story', 'poetry', 'tutorial', 'review', 'news',
    'opinion', 'education', 'learning', 'howto', 'guide'
  ],
  'Idiomas': [
    'portuguese', 'english', 'spanish', 'brazil', 'pt', 'en', 'es'
  ],
};

const TagSuggestions: React.FC<TagSuggestionsProps> = ({
  currentTags,
  onTagSelect,
  maxTags = 10,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filtrar tags baseado na busca
  useEffect(() => {
    if (!searchTerm) {
      setFilteredTags([]);
      return;
    }

    const allTags = Object.values(POPULAR_HIVE_TAGS).flat();
    const filtered = allTags.filter(tag => 
      tag.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !currentTags.includes(tag)
    ).slice(0, 10);

    setFilteredTags(filtered);
  }, [searchTerm, currentTags]);

  const canAddMoreTags = currentTags.length < maxTags;

  const handleTagClick = (tag: string) => {
    if (canAddMoreTags && !currentTags.includes(tag)) {
      onTagSelect(tag);
      setSearchTerm('');
    }
  };

  return (
    <div className="tag-suggestions">
      {/* Campo de busca de tags */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          🏷️ Sugestões de Tags Populares
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar tags populares..."
          disabled={!canAddMoreTags}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        
        {/* Resultados da busca */}
        {filteredTags.length > 0 && (
          <div className="mt-2 bg-gray-800 border border-gray-700 rounded-lg p-2 max-h-40 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {filteredTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Categorias de tags */}
      {!searchTerm && (
        <div className="space-y-2">
          <div className="text-xs text-gray-400 mb-2">
            Ou escolha de uma categoria:
          </div>
          
          {/* Seletor de categoria */}
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.keys(POPULAR_HIVE_TAGS).map(category => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Tags da categoria selecionada */}
          {selectedCategory && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <div className="flex flex-wrap gap-1">
                {POPULAR_HIVE_TAGS[selectedCategory as keyof typeof POPULAR_HIVE_TAGS]
                  .filter(tag => !currentTags.includes(tag))
                  .map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagClick(tag)}
                      disabled={!canAddMoreTags}
                      className="px-2 py-1 bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      + {tag}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Dica */}
          <div className="text-xs text-gray-500 mt-2">
            💡 Dica: Use tags relevantes e populares para aumentar o alcance do seu post
          </div>
        </div>
      )}

      {!canAddMoreTags && (
        <div className="text-xs text-yellow-500 mt-2">
          ⚠️ Você atingiu o limite máximo de {maxTags} tags
        </div>
      )}
    </div>
  );
};

export default TagSuggestions;



