import React from 'react';
import { Sparkles, UserCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: 'portal' | 'admin';
  setActiveTab: (tab: 'portal' | 'admin') => void;
  onOpenChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenChat }) => {
  return (
    <header className="sticky top-0 z-40 bg-ivory-50/90 backdrop-blur-md border-b border-ivory-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-forest-800 flex items-center justify-center text-gold-400 font-serif font-bold text-xl shadow-sm">
              T
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-xl text-forest-900 tracking-tight">
                  TGlobal
                </span>
                <span className="text-xs uppercase tracking-widest font-semibold px-2 py-0.5 rounded bg-gold-100 text-gold-600 border border-gold-400/30">
                  Gold Loans
                </span>
              </div>
              <p className="text-xs text-charcoal-600 hidden sm:block">
                Institutional Gold Lending · Exact Valuations
              </p>
            </div>
          </div>

          {/* Gold Rate Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-50 border border-forest-100 text-forest-800 text-xs font-medium">
            <div className="w-2 h-2 rounded-full bg-forest-600 animate-pulse" />
            <span>24K Benchmark:</span>
            <span className="font-semibold font-mono text-forest-900">₹7,000 / gram</span>
            <span className="text-[10px] text-charcoal-400 border-l border-forest-200 pl-2">Live Assay</span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="header-nav-portal"
              onClick={() => setActiveTab('portal')}
              className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'portal'
                  ? 'bg-forest-800 text-white shadow-sm'
                  : 'text-charcoal-700 hover:bg-ivory-100'
              }`}
            >
              Loan Portal
            </button>

            <button
              id="header-nav-admin"
              onClick={() => setActiveTab('admin')}
              className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-forest-800 text-white shadow-sm'
                  : 'text-charcoal-700 hover:bg-ivory-100'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Admin Leads</span>
            </button>

            <button
              id="header-open-ai-chat"
              onClick={onOpenChat}
              className="px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg bg-gold-500 hover:bg-gold-600 text-white shadow-sm transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Loan</span> Assistant
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
