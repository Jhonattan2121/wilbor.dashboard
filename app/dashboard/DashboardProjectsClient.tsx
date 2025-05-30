"use client";

import PhotoGridPage from '@/photo/PhotoGridPage';
import { useEffect, useState } from 'react';
import CreatePostButton from './CreatePostButton';
import HiveLogin from './HiveLogin';

export default function DashboardProjectsClient({ posts, photosCount, cameras, simulations }: any) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState<string | null>(null);
  const [postingKey, setPostingKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hiveLogin');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setLoggedIn(true);
          setLoginUser(parsed.username);
          if (parsed.keyType === 'private' && parsed.key) {
            setPostingKey(parsed.key);
          }
        } catch {}
      }
    }
  }, []);

  function handleLogin(username: string, keyType: 'keychain' | 'private', key?: string) {
    setLoggedIn(true);
    setLoginUser(username);
    if (key && keyType === 'private') {
      setPostingKey(key);
    }
    // Keychain não precisa armazenar chave, pois usa o plugin do navegador
  }

  function handleLogout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hiveLogin');
    }
    setLoggedIn(false);
    setLoginUser(null);
    setPostingKey(null);
  }


  if (!loggedIn) {
    return <HiveLogin onLogin={handleLogin} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center p-4">
        <div>
          {loginUser && (
            <CreatePostButton 
              username={loginUser} 
              postingKey={postingKey || undefined} 
            />
          )}
        </div>
        <span className="text-sm text-gray-400">
          Logado como <b>{loginUser}</b>
          <button onClick={handleLogout} className="ml-4 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs">Logout</button>
        </span>
      </div>
      <div className="flex items-center gap-2 px-4 pb-2">
        <span className="text-green-500 font-semibold text-base">
          Modo edição ativado: você pode editar os projetos!
        </span>
        <span className="text-xs text-gray-400">
          (clique em editar nos cards)
        </span>
      </div>

      <PhotoGridPage
        photos={posts}
        photosCount={photosCount}
        tags={[]}
        cameras={cameras}
        simulations={simulations}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
      />
    </div>
  );
}
