import React, { useEffect, useState } from 'react';
import { LeadFormData, QuoteCalculationResult, PlanQuote } from '../../types';
import { ApiService, ApiServiceError } from '../../services/api';
import { CheckCircle2, ArrowLeft, ArrowRight, Loader2, AlertCircle, Percent, Clock, Sparkles } from 'lucide-react';

interface Step2QuoteProps {
  formData: LeadFormData;
  setFormData: React.Dispatch<React.SetStateAction<LeadFormData>>;
  onNext: () => void;
  onBack: () => void;
}

export const Step2Quote: React.FC<Step2QuoteProps> = ({
  formData,
  setFormData,
  onNext,
  onBack,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteCalculationResult | null>(null);

  // Debounced API call to /api/v1/quotes (~300ms)
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      const net = parseFloat(formData.netWeightGrams);
      const gross = parseFloat(formData.grossWeightGrams);

      if (isNaN(net) || isNaN(gross) || net <= 0 || gross <= 0 || net > gross) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await ApiService.calculateQuote({
          netWeightGrams: net,
          grossWeightGrams: gross,
          karat: formData.karat,
        });

        if (isMounted) {
          setQuote(result);
          // Default selection to EMI plan if none selected
          if (!formData.selectedPlanId && result.plans.length > 0) {
            setFormData((prev) => ({
              ...prev,
              selectedPlanId: result.plans[0].planId,
            }));
          }
        }
      } catch (err: any) {
        if (isMounted) {
          if (err instanceof ApiServiceError) {
            setError(err.message);
          } else {
            setError('Unable to fetch live quote from server. Please check your network connection.');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData.netWeightGrams, formData.grossWeightGrams, formData.karat]);

  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-100 text-gold-700 text-xs font-semibold uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Institutional Gold Valuation</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-900">
          Your Verified Live Quote
        </h2>
        <p className="text-sm text-charcoal-600">
          Calculated based on standard benchmark gold rate (₹7,000/g) and regulatory LTV limits.
        </p>
      </div>

      {loading && !quote ? (
        <div className="bg-white rounded-2xl border border-ivory-200 p-12 text-center shadow-refined space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-forest-700 mx-auto" />
          <p className="text-sm text-charcoal-600 font-medium">
            Contacting valuation engine & calculating eligible credit limits...
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="font-semibold text-red-900">Valuation Error</h3>
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-white text-red-700 border border-red-300 rounded-lg text-xs font-semibold hover:bg-red-50"
          >
            Go Back & Adjust Details
          </button>
        </div>
      ) : quote ? (
        <div className="space-y-6">
          {/* Gold Value & Pure Gold Breakdown Card */}
          <div className="bg-gradient-to-br from-forest-900 to-forest-800 text-white rounded-2xl p-6 shadow-elevated relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-48 h-48 bg-gold-400/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-b border-forest-700/60 pb-5">
              <div>
                <span className="text-xs uppercase tracking-wider text-forest-100 font-medium block">
                  Net Gold Weight
                </span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-white mt-1 block">
                  {quote.netWeightGrams} g
                </span>
                <span className="text-[11px] text-forest-100/70">at {quote.karat} Karat</span>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-forest-100 font-medium block">
                  Pure Gold (24K)
                </span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-gold-300 mt-1 block">
                  {quote.pureGoldGrams} g
                </span>
                <span className="text-[11px] text-forest-100/70">
                  {((quote.karat / 24) * 100).toFixed(1)}% assay
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-xs uppercase tracking-wider text-forest-100 font-medium block">
                  Market Gold Value
                </span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-white mt-1 block">
                  {formatRupees(quote.goldValueRupees)}
                </span>
                <span className="text-[11px] text-forest-100/70">₹7,000 / g standard</span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between text-xs text-forest-100/80">
              <span>Reserve Bank of India LTV Cap: 75.0%</span>
              <span className="font-medium text-gold-300">Deterministic Pure Math</span>
            </div>
          </div>

          {/* Selectable Loan Scheme Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                Select Your Financing Structure
              </h3>
              <span className="text-xs text-charcoal-500">Tap card to select</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quote.plans.map((plan: PlanQuote) => {
                const isSelected = formData.selectedPlanId === plan.planId;
                return (
                  <div
                    key={plan.planId}
                    id={`plan-card-${plan.planId}`}
                    onClick={() => setFormData({ ...formData, selectedPlanId: plan.planId })}
                    className={`relative rounded-2xl p-5 border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-forest-800 bg-white shadow-elevated ring-2 ring-forest-800/10'
                        : 'border-ivory-200 bg-white/60 hover:bg-white hover:border-ivory-300'
                    }`}
                  >
                    {/* Selected Badge */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="inline-block text-[11px] uppercase font-semibold px-2 py-0.5 rounded bg-ivory-100 text-charcoal-700">
                          {plan.repaymentType === 'EMI' ? 'Monthly EMI Plan' : 'Bullet Maturity'}
                        </span>
                        <h4 className="font-serif font-bold text-lg text-forest-900">
                          {plan.planName}
                        </h4>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-forest-800 text-white' : 'border-2 border-ivory-300'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Eligible Loan Big Number */}
                    <div className="my-4 pt-2 border-t border-ivory-100">
                      <span className="text-xs text-charcoal-500 block">Eligible Loan Amount</span>
                      <span className="font-mono text-2xl font-bold text-forest-900 block tracking-tight">
                        {formatRupees(plan.eligibleLoanRupees)}
                      </span>
                      {plan.monthlyEmiRupees && (
                        <span className="text-xs text-forest-700 font-medium block mt-0.5">
                          Approx. {formatRupees(plan.monthlyEmiRupees)} / month
                        </span>
                      )}
                    </div>

                    {/* Rates & LTV Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-charcoal-600 bg-ivory-50/70 p-2.5 rounded-xl border border-ivory-100">
                      <div className="flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-forest-700" />
                        <span>{plan.annualInterestRate}% p.a.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-forest-700" />
                        <span>{plan.tenureMonths} Months</span>
                      </div>
                      <div className="col-span-2 text-[11px] text-charcoal-500 pt-1 border-t border-ivory-200/50">
                        Maximum LTV: {(plan.maxLtv * 100).toFixed(0)}% of market value
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <button
              id="btn-step2-back"
              type="button"
              onClick={onBack}
              className="px-5 py-3 rounded-xl border border-ivory-300 text-charcoal-700 hover:bg-ivory-100 font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              id="btn-step2-continue"
              type="button"
              disabled={!formData.selectedPlanId}
              onClick={onNext}
              className="px-6 py-3.5 rounded-xl bg-forest-800 hover:bg-forest-700 text-white font-semibold text-sm shadow-md hover:shadow-lg flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Review Application</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
