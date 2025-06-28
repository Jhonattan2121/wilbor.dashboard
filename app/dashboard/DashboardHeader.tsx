import React from 'react';

interface DashboardHeaderProps {
  username: string | null;
  onLogout?: () => void;
  showCreatePostButton?: boolean;
  CreatePostButtonComponent?: React.ReactNode;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  username,
  onLogout,
  showCreatePostButton = false,
  CreatePostButtonComponent,
}) => {
  if (!username) return null;
  return (
    <div className="flex flex-row items-center justify-between p-4 gap-2 md:gap-8 md:px-8 md:py-6">
      <div className="flex flex-row items-center gap-2 md:gap-4">
        {showCreatePostButton && CreatePostButtonComponent}
      </div>
      <div className="flex flex-row items-center gap-2 md:gap-4 md:bg-zinc-900 md:rounded-lg md:px-4 md:py-2 md:shadow-lg">
        <span className="text-sm text-gray-400 whitespace-nowrap md:text-base md:text-gray-200">
          Logado como <b className="font-mono md:font-bold">{username}</b>
        </span>
        {onLogout && (
          <button
            className="text-xs text-red-400 border border-red-400 rounded px-2 py-1 hover:bg-red-400 hover:text-white transition md:text-sm md:px-3 md:py-1.5 md:border-2 md:rounded-md"
            onClick={onLogout}
            title="Sair"
          >
            Sair
          </button>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;
