'use client';
import { useState } from 'react';
import { hiveServerLoginWithPassword } from '../../lib/hive/server-functions';

export default function HiveLogin({
  onLogin,
}: {
  onLogin: (
    username: string,
    keyType: 'keychain' | 'private',
    key?: string,
  ) => void;
}) {
  const [username, setUsername] = useState('wilbor.art');
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleKeychainLogin = async () => {
    setError('');
    setLoading(true);
    if (typeof window !== 'undefined' && (window as any).hive_keychain) {
      (window as any).hive_keychain.requestSignBuffer(
        username,
        'login-wilbor.art',
        'Posting',
        (res: any) => {
          setLoading(false);
          if (res.success) {
            onLogin(username, 'keychain');
          } else {
            setError('Falha ao autenticar com Hive Keychain.');
          }
        },
      );
    } else {
      setLoading(false);
      setError('Hive Keychain não está instalado.');
    }
  };

  const handlePrivateKeyLogin = async () => {
    setError('');
    if (!privateKey) {
      setError('Informe a chave privada.');
      return;
    }

    setLoading(true);
    try {
      const result = await hiveServerLoginWithPassword(username, privateKey);
      
      if (result.validation.success && result.key) {
        onLogin(username, 'private', result.key);
      } else {
        setError(result.validation.message || 'Falha na autenticação.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center 
                    bg-black/70">
      <div className="relative z-10 bg-neutral-900 rounded-lg p-6 w-full 
                      max-w-xs flex flex-col gap-4 items-center">
        <h2 className="text-lg font-semibold text-white mb-2">
          Entrar no Dashboard
        </h2>
        <input
          className="px-3 py-2 rounded bg-neutral-800 text-white border 
                     border-neutral-700 w-full focus:outline-none 
                     focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Usuário Hive"
          value={username}
          onChange={e => setUsername(e.target.value)}
          disabled={loading}
        />
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 
                     rounded w-full font-medium transition disabled:opacity-60"
          onClick={handleKeychainLogin}
          disabled={loading}
        >
          Login com Hive Keychain
        </button>
        <div className="w-full flex items-center gap-2 my-2">
          <div className="flex-1 h-px bg-neutral-700" />
          <span className="text-xs text-neutral-400">ou</span>
          <div className="flex-1 h-px bg-neutral-700" />
        </div>
        <input
          className="px-3 py-2 rounded bg-neutral-800 text-white border 
                     border-neutral-700 w-full focus:outline-none 
                     focus:ring-2 focus:ring-green-500 transition"
          type="password"
          placeholder="Chave privada (posting)"
          value={privateKey}
          onChange={e => setPrivateKey(e.target.value)}
          disabled={loading}
        />
        <button
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 
                     rounded w-full font-medium transition disabled:opacity-60"
          onClick={handlePrivateKeyLogin}
          disabled={loading}
        >
          Login com chave privada
        </button>
        {error && (
          <div className="text-red-400 text-xs mt-2 w-full text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}