import {
  Path_Contact,
  Path_Exhibitions,
  PATH_FEED_INFERRED,
  Path_Partners,
} from '@/app/paths';

export type SwitcherSelection = 
  'projects' | 'about' | 'exhibitions' | 'partners' | 'contact'; 

export default function ViewSwitcher({
  currentSelection,
  showAdmin: _showAdmin,
  drawerTagsProps: _drawerTagsProps,
  tags: _tags,
}: {
  currentSelection?: SwitcherSelection
  tags?: any
  showAdmin?: boolean
  drawerTagsProps?: {
    tags: string[];
    selectedTag: string | null;
    setSelectedTag?: (tag: string | null) => void;
  }
}) {
  
  const menuItems = [
    {
      text: 'dashboard',
      mobileText: 'dashboard',
      href: '/dashboard',
      active: currentSelection === 'projects',
    },
    {
      text: 'sobre',
      mobileText: 'sobre',
      href: PATH_FEED_INFERRED,
      active: currentSelection === 'about',
    },
    {
      text: 'exposições/exibições',
      mobileText: 'expo',
      href: Path_Exhibitions,
      active: currentSelection === 'exhibitions',
    },
    {
      text: 'parceiros',
      mobileText: 'parceiros',
      href: Path_Partners,
      active: currentSelection === 'partners',
    },
    {
      text: 'contato',
      mobileText: 'contato',
      href: Path_Contact,
      active: currentSelection === 'contact',
    },
  ];

  return (
    <>
      {/* Mobile Version - Visible only on small screens */}
      <div className="block sm:hidden w-full mb-4 px-2"> 
        <div className="flex items-center justify-center gap-2 py-2 
          overflow-x-auto">
          {menuItems.map((item, index) => (
            <a
              key={index}
              href={item.href}
              className={`flex-shrink-0 px-3 py-2 text-center text-sm 
                transition-colors rounded-md hover:bg-gray-100 
                dark:hover:bg-gray-800 font-sans 
                ${item.active 
              ? 'text-red-500 bg-red-50 dark:bg-red-900/20' 
              : 'text-gray-600 dark:text-gray-400'
            }`}
            >
              {item.mobileText}
            </a>
          ))}
        </div>
      </div>

      {/* Desktop Version - Visible only on medium screens and up */}
      <div className="hidden sm:flex items-center gap-4 w-full mt-4 mb-4 
        px-4 lg:px-14">
        <div className="flex flex-row gap-6 flex-1 items-center">
          {menuItems.map((item, index) => (
            <a
              key={index}
              href={item.href}
              className={`px-3 py-2 text-center text-base whitespace-nowrap 
                transition-colors rounded-md hover:bg-gray-100 
                dark:hover:bg-gray-800 font-sans 
                ${item.active 
              ? 'text-red-500 bg-red-50 dark:bg-red-900/20' 
              : 'text-gray-600 dark:text-gray-400'
            }`}
            >
              {item.text}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
