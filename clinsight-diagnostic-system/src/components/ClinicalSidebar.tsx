import React from 'react';
import {
  Activity,
  Calculator,
  ClipboardCheck,
  Database,
  FileText,
  FlaskConical,
  HeartPulse,
  Scan,
  Users,
  X,
} from 'lucide-react';
import { ScreenId } from '../types/clinical';

interface ClinicalSidebarProps {
  activeScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  awaitingReviewCount: number;
  patientCount: number;
  documentCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const SIDEBAR_GROUPS: {
  title: string;
  items: {
    id: ScreenId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeType?: 'review' | 'patients' | 'docs';
  }[];
}[] = [
  {
    title: 'Clinical Care',
    items: [
      { id: 'workbench', label: 'Diagnostic Workbench', icon: HeartPulse },
      { id: 'patients', label: 'Patient Management', icon: Users, badgeType: 'patients' },
      { id: 'census', label: 'Triage Census', icon: Activity },
      { id: 'assessments', label: 'Priority Assessments', icon: ClipboardCheck, badgeType: 'review' },
    ],
  },
  {
    title: 'Diagnostics & Intelligence',
    items: [
      { id: 'imaging', label: 'Image Analysis', icon: Scan },
      { id: 'documents', label: 'Medical Documents', icon: FileText, badgeType: 'docs' },
      { id: 'datasets', label: 'Clinical Datasets', icon: Database },
      { id: 'telemetry', label: 'Lab Telemetry', icon: FlaskConical },
      { id: 'protocols', label: 'Protocols & Dosing', icon: Calculator },
    ],
  },
];

export const ClinicalSidebar: React.FC<ClinicalSidebarProps> = ({
  activeScreen,
  onSelectScreen,
  awaitingReviewCount,
  patientCount,
  documentCount,
  mobileOpen,
  onCloseMobile,
}) => {
  const getCount = (badgeType?: 'review' | 'patients' | 'docs') => {
    if (badgeType === 'review' && awaitingReviewCount > 0) return awaitingReviewCount;
    if (badgeType === 'patients') return patientCount;
    if (badgeType === 'docs' && documentCount > 0) return documentCount;
    return null;
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E2E8F0]">
      <div className="p-4 space-y-5 flex-1 overflow-y-auto">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeScreen === item.id;
                const count = getCount(item.badgeType);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectScreen(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded text-xs font-medium transition-colors duration-150 ${
                      active
                        ? 'bg-[#071D35] text-white font-semibold'
                        : 'text-[#44474D] hover:bg-[#F4F7FB] hover:text-[#071D35]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-[#55DDE0]' : 'text-[#4D5F7B]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {count !== null && (
                      <span
                        className={`font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded ${
                          active
                            ? 'bg-white/15 text-[#55DDE0]'
                            : item.badgeType === 'review'
                            ? 'bg-[#F59E0B]/15 text-[#B45309]'
                            : 'bg-[#F4F7FB] text-[#64748B]'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3.5 border-t border-[#E2E8F0] bg-[#F4F7FB]/70 text-[11px] text-[#44474D] space-y-1">
        <p className="font-semibold text-[#071D35]">Clinical Decision Support</p>
        <p className="leading-snug text-[#64748B]">
          Assistive prototype only. Verify all AI outputs and extracted facts before clinical action.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)]">
        {navContent}
      </aside>

      {/* Mobile / Tablet Slide-over Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex bg-[#071D35]/40 backdrop-blur-xs">
          <div className="w-64 h-full bg-white shadow-2xl flex flex-col">
            <div className="h-14 px-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <span className="font-display font-bold text-[#071D35] text-base">ClinSight</span>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close sidebar"
                className="p-1.5 rounded border border-[#E2E8F0] text-[#44474D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{navContent}</div>
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
};
