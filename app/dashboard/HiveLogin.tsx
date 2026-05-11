'use client';
import Image from 'next/image';
import { useState } from 'react';
import SplashCursor from './SplashCursor';
import { hiveServerLoginWithPassword } from '../../lib/hive/server-functions';

interface HiveKeychainWindow extends Window {
  hive_keychain?: {
    requestSignBuffer: (
      username: string,
      message: string,
      keyType: string,
      callback: (res: { success: boolean }) => void,
    ) => void;
  };
}

export default function HiveLogin({
  onLogin,
}: {
  onLogin: (username: string, keyType: 'keychain' | 'private', key?: string) => void;
}) {
  const [username, setUsername] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [keychainLoading, setKeychainLoading] = useState(false);
  const [privateKeyLoading, setPrivateKeyLoading] = useState(false);

  const clearError = () => { if (error) setError(''); };

  const handleKeychainLogin = async () => {
    setError('');
    setKeychainLoading(true);
    const win = window as HiveKeychainWindow;
    if (win.hive_keychain) {
      win.hive_keychain.requestSignBuffer(username, 'login-wilbor.art', 'Posting', (res) => {
        setKeychainLoading(false);
        if (res.success) {
          onLogin(username, 'keychain');
        } else {
          setError('Falha ao autenticar com Hive Keychain.');
        }
      });
    } else {
      setKeychainLoading(false);
      setError('Hive Keychain não está instalado.');
    }
  };

  const handlePrivateKeyLogin = async () => {
    setError('');
    if (!privateKey) { setError('Informe a chave privada.'); return; }
    setPrivateKeyLoading(true);
    try {
      const result = await hiveServerLoginWithPassword(username, privateKey);
      if (result.validation.success && result.key) {
        onLogin(username, 'private', result.key);
      } else {
        setError(result.validation.message || 'Falha na autenticação.');
      }
    } catch {
      setError('Erro ao conectar com o servidor.');
    } finally {
      setPrivateKeyLoading(false);
    }
  };

  const anyLoading = keychainLoading || privateKeyLoading;

  return (
    <>
      <style>{`
        @keyframes border-sweep {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .border-sweep { animation: border-sweep 3.5s linear infinite; }
        @keyframes card-glow {
          0%, 100% { box-shadow: 0 0 35px -8px rgba(255,255,255,0.05), 0 25px 50px -12px rgba(0,0,0,0.9); }
          50%       { box-shadow: 0 0 55px -8px rgba(255,255,255,0.12), 0 25px 50px -12px rgba(0,0,0,0.9); }
        }
        .card-glow { animation: card-glow 3.5s ease-in-out infinite; }
      `}</style>

      {/* Fluid simulation — sits at z-50, pointer-events: none */}
      <SplashCursor
        DENSITY_DISSIPATION={4}
        VELOCITY_DISSIPATION={2.5}
        SPLAT_RADIUS={0.18}
        CURL={4}
        RAINBOW_MODE={true}
        TRANSPARENT={true}
        BACK_COLOR={{ r: 0, g: 0, b: 0 }}
      />

      {/* Overlay + card — z-[51] sits above the canvas */}
      <div className="fixed inset-0 z-[51] flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-fade-in">

        {/* Card container */}
        <div className="relative w-full max-w-sm mx-4">

          {/* Rotating sweep border */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ padding: '1px', background: 'rgba(255,255,255,0.07)' }}
          >
            {/* Comet-tail sweep — clipped by overflow-hidden on parent */}
            <div
              className="border-sweep absolute"
              style={{
                width: '700px',
                height: '700px',
                top: '50%',
                left: '50%',
                background: [
                  'conic-gradient(from 0deg,',
                  '  transparent 0%,',
                  '  transparent 56%,',
                  '  rgba(255,255,255,0.03) 62%,',
                  '  rgba(220,220,235,0.40) 68%,',
                  '  rgba(245,245,255,0.88) 72%,',
                  '  rgba(255,255,255,1.00) 73%,',
                  '  rgba(245,245,255,0.88) 74%,',
                  '  rgba(220,220,235,0.40) 77%,',
                  '  rgba(255,255,255,0.03) 81%,',
                  '  transparent 84%,',
                  '  transparent 100%)',
                ].join(''),
              }}
            />

            {/* Card */}
            <div className="card-glow relative bg-zinc-950 rounded-[15px] overflow-hidden">

              {/* Header */}
              <div className="flex flex-col items-center gap-3 px-8 pt-8 pb-6 border-b border-zinc-800/50">
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-2xl blur-md"
                    style={{ background: 'rgba(161,161,170,0.12)' }}
                  />
                  <Image
                    src="/favicons/FAVCOM_WILBOR.png"
                    alt="Wilbor"
                    width={48}
                    height={48}
                    className="relative rounded-xl"
                  />
                </div>
                <div className="text-center">
                  <h2 className="text-base font-semibold text-white font-mono tracking-tight">
                    wilbor.dashboard
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Autentique com sua conta Hive
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-col gap-4 px-8 py-6">

                {/* Username */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300 font-mono uppercase tracking-wider">
                    Usuário Hive
                  </label>
                  <input
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-mono
                               border border-zinc-800 placeholder:text-zinc-500
                               focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600
                               transition disabled:opacity-40"
                    placeholder="seu-usuario"
                    value={username}
                    onChange={e => { setUsername(e.target.value); clearError(); }}
                    disabled={anyLoading}
                    autoComplete="username"
                  />
                </div>

                {/* Keychain */}
                <button
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg
                             bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600
                             text-sm font-medium text-zinc-200 font-mono transition
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handleKeychainLogin}
                  disabled={anyLoading || !username.trim()}
                >
                  {keychainLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
                    </svg>
                  )}
                  Login com Hive Keychain
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-xs text-zinc-500 font-mono">ou</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>

                {/* Private key */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300 font-mono uppercase tracking-wider">
                    Chave privada (posting)
                  </label>
                  <input
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-mono
                               border border-zinc-800 placeholder:text-zinc-500
                               focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600
                               transition disabled:opacity-40"
                    type="password"
                    placeholder="5K…"
                    value={privateKey}
                    onChange={e => { setPrivateKey(e.target.value); clearError(); }}
                    disabled={anyLoading}
                    autoComplete="current-password"
                  />
                </div>

                <button
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg
                             bg-white hover:bg-zinc-100 text-zinc-950
                             text-sm font-semibold font-mono transition
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handlePrivateKeyLogin}
                  disabled={anyLoading || !username.trim() || !privateKey}
                >
                  {privateKeyLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  )}
                  Entrar com chave privada
                </button>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-950/40 border border-red-900/50 animate-fade-in-from-bottom">
                    <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    <p className="text-xs text-red-400 font-mono">{error}</p>
                  </div>
                )}

                {/* Dev bypass */}
                {process.env.NODE_ENV === 'development' && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-zinc-800" />
                      <span className="text-xs text-zinc-600 font-mono">dev only</span>
                      <div className="flex-1 h-px bg-zinc-800" />
                    </div>
                    <button
                      className="w-full px-4 py-2 rounded-lg border border-dashed border-yellow-900/60
                                 text-xs font-mono text-yellow-700 hover:text-yellow-500 hover:border-yellow-700
                                 transition"
                      onClick={() => {
                        if (process.env.NODE_ENV !== 'development') return;
                        onLogin(username || 'dev-user', 'keychain');
                      }}
                    >
                      Dev Bypass
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
