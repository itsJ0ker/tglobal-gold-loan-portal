import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Header } from './components/layout/Header';
import { Step1Details } from './components/calculator/Step1Details';
import { Step2Quote } from './components/calculator/Step2Quote';
import { Step3Confirm } from './components/calculator/Step3Confirm';
import { AiLoanAssistant } from './components/chat/AiLoanAssistant';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LeadFormData, KaratValue } from './types';
import {
  ShieldCheck,
  Sparkles,
  Lock,
  Building2,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'portal' | 'admin'>('portal');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Customer Application Form State
  const [formData, setFormData] = useState<LeadFormData>({
    customerName: '',
    mobileNumber: '',
    grossWeightGrams: '',
    netWeightGrams: '',
    karat: 22 as KaratValue,
    selectedPlanId: 'PLAN_EMI_01',
  });

  // Hero animation ref
  const heroRef = useRef<HTMLDivElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // Hero headline & badges entrance
      gsap.from('.gsap-hero-item', {
        y: 24,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
      });

      // Subtle float animation on gold indicator pill
      gsap.to('.gsap-float', {
        y: -4,
        duration: 2.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const handleReset = () => {
    setFormData({
      customerName: '',
      mobileNumber: '',
      grossWeightGrams: '',
      netWeightGrams: '',
      karat: 22,
      selectedPlanId: 'PLAN_EMI_01',
    });
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-ivory-50 text-charcoal-900 flex flex-col font-sans selection:bg-gold-100 selection:text-forest-900 bg-subtle-pattern">
      {/* Brand Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenChat={() => setIsChatOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'admin' ? (
          <AdminDashboard />
        ) : (
          <div className="space-y-12 pb-20">
            {/* Hero Section */}
            <section
              ref={heroRef}
              className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 text-center space-y-5"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forest-800 text-gold-300 text-xs font-semibold uppercase tracking-wider gsap-hero-item shadow-sm">
                <ShieldCheck className="w-4 h-4 text-gold-400" />
                <span>Verified Lending Protocol · Zero Calculation Guesswork</span>
              </div>

              <h1 className="gsap-hero-item font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-forest-900 tracking-tight leading-[1.15]">
                Exact Gold Valuation. <br className="hidden sm:block" />
                <span className="text-forest-700 italic font-normal">Immediate Lending Eligibility.</span>
              </h1>

              <p className="gsap-hero-item max-w-2xl mx-auto text-sm sm:text-base text-charcoal-600 leading-relaxed">
                Whether applying via our structured intake or conversing with our tool-calling AI Assistant, all calculations strictly enforce institutional LTV caps and server-side precision.
              </p>

              {/* 3 Step Progress Bar */}
              <div className="gsap-hero-item max-w-md mx-auto pt-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { step: 1, label: '01 Details' },
                    { step: 2, label: '02 Live Quote' },
                    { step: 3, label: '03 Confirm' },
                  ].map((s) => {
                    const isActive = currentStep === s.step;
                    const isCompleted = currentStep > s.step;
                    return (
                      <div
                        key={s.step}
                        className={`text-center py-2 px-1 rounded-xl border transition-all ${
                          isActive
                            ? 'bg-forest-800 text-white border-forest-800 font-semibold shadow-sm'
                            : isCompleted
                            ? 'bg-forest-50 text-forest-800 border-forest-200 font-medium'
                            : 'bg-white/60 text-charcoal-400 border-ivory-200'
                        }`}
                      >
                        <div className="text-xs sm:text-sm">{s.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Application Flow Container */}
            <section ref={formCardRef} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              {currentStep === 1 && (
                <Step1Details
                  formData={formData}
                  setFormData={setFormData}
                  onNext={() => setCurrentStep(2)}
                />
              )}

              {currentStep === 2 && (
                <Step2Quote
                  formData={formData}
                  setFormData={setFormData}
                  onNext={() => setCurrentStep(3)}
                  onBack={() => setCurrentStep(1)}
                />
              )}

              {currentStep === 3 && (
                <Step3Confirm
                  formData={formData}
                  onBack={() => setCurrentStep(2)}
                  onReset={handleReset}
                />
              )}
            </section>

            {/* Trust & Policy Section */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-ivory-200 p-6 shadow-refined space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-base text-forest-900">
                    Regulatory 75% LTV Cap
                  </h3>
                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    Under Reserve Bank guidelines, eligible gold loans are capped strictly at 75% of prevailing 24K valuation, calculated down to the whole Rupee.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-ivory-200 p-6 shadow-refined space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-base text-forest-900">
                    Dual Anti-Duplicate Defense
                  </h3>
                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    Atomic transaction locks and a 7-day mobile de-duplication window prevent accidental repeat filings or concurrent request collisions.
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-ivory-200 p-6 shadow-refined space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-base text-forest-900">
                    AI Assistant with Zero Math
                  </h3>
                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    Our AI Loan Assistant never invents interest rates or figures. Every single number is derived directly through validated backend function calls.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Floating AI Assistant Trigger Pill */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          id="btn-floating-ai-trigger"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="group px-4 py-3 bg-gradient-to-r from-forest-900 to-forest-800 hover:from-forest-800 hover:to-forest-700 text-white rounded-full shadow-elevated flex items-center gap-2.5 transition-all transform hover:scale-105 cursor-pointer border border-gold-400/30"
          aria-label="Open AI Loan Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-gold-300 animate-spin-slow" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gold-400 rounded-full animate-ping" />
          </div>
          <span className="font-semibold text-xs sm:text-sm">
            {isChatOpen ? 'Close AI Assistant' : 'Chat with AI Loan Assistant'}
          </span>
        </button>
      </div>

      {/* AI Assistant Chat Drawer */}
      <AiLoanAssistant
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-ivory-200 bg-white/70 py-6 text-center text-xs text-charcoal-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © 2026 TGlobal Gold Loans Ltd. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-[11px] text-charcoal-400">
            <span>Deterministic Math Engine</span>
            <span>·</span>
            <span>Prisma + PostgreSQL</span>
            <span>·</span>
            <span>Zod Validation</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
