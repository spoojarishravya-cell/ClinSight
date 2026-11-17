import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { ScreenId } from '../types/clinical';

interface ClinicalHeaderProps {
  activeScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  onOpenOrderEntry: () => void;
  onOpenSidebar: () => void;
}

const TOP_NAV_ITEMS: { id: ScreenId; label: string }[] = [
  { id: 'workbench', label: 'Workbench' },
  { id: 'patients', label: 'Patients' },
  { id: 'documents', label: 'Documents' },
  { id: 'assessments', label: 'Assessments' },
];

export const ClinicalHeader: React.FC<ClinicalHeaderProps> = ({
  activeScreen,
  onSelectScreen,
  onOpenOrderEntry,
  onOpenSidebar,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0]">
      <div className="px-4 lg:px-6 h-14 flex items-center justify-between gap-6">
        {/* Zone 1: Sidebar Mobile Trigger + Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            aria-label="Open clinical sidebar navigation"
            onClick={onOpenSidebar}
            className="lg:hidden p-1.5 text-[#071D35] border border-[#E2E8F0] rounded hover:bg-[#F4F7FB]"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectScreen('workbench')}
            className="flex items-center gap-2.5 text-[#071D35] font-display font-bold text-lg tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19B6B2] rounded"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect width="24" height="24" rx="4" fill="#071D35" />
              <path
                d="M5 12.5H8.5L10.5 7.5L13.5 16.5L15.5 12.5H19"
                stroke="#55DDE0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>ClinSight</span>
          </button>
        </div>

        {/* Zone 2: 4 Single-line Quick Links */}
        <nav
          aria-label="Quick Clinical Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {TOP_NAV_ITEMS.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectScreen(item.id)}
                className={`relative py-4 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#19B6B2] ${
                  isActive
                    ? 'text-[#071D35] font-semibold'
                    : 'text-[#44474D] hover:text-[#071D35]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#19B6B2]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenOrderEntry}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#071D35] hover:bg-[#0B2A4A] rounded transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55DDE0]"
          >
            <Plus className="w-3.5 h-3.5 text-[#55DDE0]" aria-hidden="true" />
            <span>Order Entry</span>
          </button>
        </div>
      </div>
    </header>
  );
};
