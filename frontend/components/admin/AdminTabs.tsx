"use client";

interface AdminTab {
  id: string;
  label: string;
}

interface AdminTabsProps {
  tabs: AdminTab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function AdminTabs({ tabs, activeTab, onChange }: AdminTabsProps) {
  return (
    <div className="border-b border-slate-700 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div
        className="flex gap-0.5 overflow-x-auto overscroll-x-contain scrollbar-hide"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`shrink-0 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
                isActive
                  ? "bg-green-600/20 text-green-400 border-b-2 border-green-500"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
