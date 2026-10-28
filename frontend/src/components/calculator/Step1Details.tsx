import React, { useMemo } from 'react';
import { LeadFormData, KaratValue } from '../../types';
import { User, Phone, Scale, Award, ArrowRight, AlertCircle } from 'lucide-react';

interface Step1DetailsProps {
  formData: LeadFormData;
  setFormData: React.Dispatch<React.SetStateAction<LeadFormData>>;
  onNext: () => void;
  apiFieldErrors?: Record<string, string>;
}

export const Step1Details: React.FC<Step1DetailsProps> = ({
  formData,
  setFormData,
  onNext,
  apiFieldErrors = {},
}) => {
  // Inline validation calculations
  const errors = useMemo(() => {
    const errs: Record<string, string> = { ...apiFieldErrors };

    // Name validation
    if (formData.customerName.trim().length > 0) {
      if (formData.customerName.trim().length < 2) {
        errs.customerName = 'Name must be at least 2 characters';
      } else if (formData.customerName.length > 60) {
        errs.customerName = 'Name cannot exceed 60 characters';
      } else if (!/^[a-zA-Z\s]+$/.test(formData.customerName)) {
        errs.customerName = 'Name must contain letters and spaces only';
      }
    }

    // Mobile validation
    if (formData.mobileNumber.length > 0) {
      if (!/^[6-9]\d{0,9}$/.test(formData.mobileNumber)) {
        errs.mobileNumber = 'Must be an Indian mobile number starting with 6-9';
      } else if (formData.mobileNumber.length !== 10) {
        errs.mobileNumber = 'Must be exactly 10 digits';
      }
    }

    // Weight validation
    const gross = parseFloat(formData.grossWeightGrams);
    const net = parseFloat(formData.netWeightGrams);

    if (formData.grossWeightGrams) {
      if (isNaN(gross) || gross <= 0) {
        errs.grossWeightGrams = 'Gross weight must be greater than 0g';
      } else if (gross > 1000) {
        errs.grossWeightGrams = 'Gross weight cannot exceed 1000g';
      }
    }

    if (formData.netWeightGrams) {
      if (isNaN(net) || net <= 0) {
        errs.netWeightGrams = 'Net weight must be greater than 0g';
      } else if (net > 1000) {
        errs.netWeightGrams = 'Net weight cannot exceed 1000g';
      } else if (!isNaN(gross) && net > gross) {
        errs.netWeightGrams = 'Net weight cannot exceed gross weight';
      }
    }

    return errs;
  }, [formData, apiFieldErrors]);

  const isValid = useMemo(() => {
    const gross = parseFloat(formData.grossWeightGrams);
    const net = parseFloat(formData.netWeightGrams);

    return (
      formData.customerName.trim().length >= 2 &&
      formData.customerName.length <= 60 &&
      /^[a-zA-Z\s]+$/.test(formData.customerName) &&
      /^[6-9]\d{9}$/.test(formData.mobileNumber) &&
      !isNaN(gross) &&
      gross > 0 &&
      gross <= 1000 &&
      !isNaN(net) &&
      net > 0 &&
      net <= gross &&
      !errors.customerName &&
      !errors.mobileNumber &&
      !errors.grossWeightGrams &&
      !errors.netWeightGrams
    );
  }, [formData, errors]);

  const karatOptions: Array<{ value: KaratValue; label: string; purity: string }> = [
    { value: 18, label: '18 Karat', purity: '75.0% pure' },
    { value: 22, label: '22 Karat', purity: '91.7% standard' },
    { value: 24, label: '24 Karat', purity: '99.9% sovereign' },
  ];

  return (
    <div className="space-y-8 max-w-xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-900">
          Borrower & Gold Details
        </h2>
        <p className="text-sm text-charcoal-600">
          Enter borrower details and weighed jewellery specifications for an instant, certified quote.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-ivory-200 p-6 sm:p-8 shadow-refined space-y-6">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label htmlFor="customerName" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700">
            Full Name (as per Aadhaar / PAN)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal-400">
              <User className="w-5 h-5" />
            </div>
            <input
              id="customerName"
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="e.g. Ramesh Chandra Verma"
              className={`w-full pl-11 pr-4 py-3 bg-ivory-50/50 border rounded-xl text-charcoal-900 text-sm focus:bg-white transition-all ${
                errors.customerName ? 'border-red-500 focus:ring-red-200' : 'border-ivory-200 focus:border-forest-700'
              }`}
            />
          </div>
          {errors.customerName && (
            <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.customerName}</span>
            </p>
          )}
        </div>

        {/* Mobile Number */}
        <div className="space-y-1.5">
          <label htmlFor="mobileNumber" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700">
            Mobile Number (10-Digit Indian)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal-400">
              <Phone className="w-5 h-5" />
            </div>
            <input
              id="mobileNumber"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={formData.mobileNumber}
              onChange={(e) => {
                const numericOnly = e.target.value.replace(/\D/g, '');
                setFormData({ ...formData, mobileNumber: numericOnly });
              }}
              placeholder="9876543210"
              className={`w-full pl-11 pr-4 py-3 bg-ivory-50/50 border rounded-xl text-charcoal-900 text-sm font-mono focus:bg-white transition-all ${
                errors.mobileNumber ? 'border-red-500 focus:ring-red-200' : 'border-ivory-200 focus:border-forest-700'
              }`}
            />
          </div>
          {errors.mobileNumber && (
            <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.mobileNumber}</span>
            </p>
          )}
        </div>

        {/* Weights: Gross and Net */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gross Weight */}
          <div className="space-y-1.5">
            <label htmlFor="grossWeightGrams" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700">
              Gross Weight (Grams)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal-400">
                <Scale className="w-5 h-5" />
              </div>
              <input
                id="grossWeightGrams"
                type="number"
                step="0.01"
                min="0.1"
                max="1000"
                inputMode="decimal"
                value={formData.grossWeightGrams}
                onChange={(e) => setFormData({ ...formData, grossWeightGrams: e.target.value })}
                placeholder="e.g. 45.00"
                className={`w-full pl-11 pr-4 py-3 bg-ivory-50/50 border rounded-xl text-charcoal-900 text-sm font-mono focus:bg-white transition-all ${
                  errors.grossWeightGrams ? 'border-red-500' : 'border-ivory-200 focus:border-forest-700'
                }`}
              />
            </div>
            {errors.grossWeightGrams && (
              <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.grossWeightGrams}</span>
              </p>
            )}
          </div>

          {/* Net Weight */}
          <div className="space-y-1.5">
            <label htmlFor="netWeightGrams" className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700">
              Net Weight (Grams)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal-400">
                <Scale className="w-5 h-5" />
              </div>
              <input
                id="netWeightGrams"
                type="number"
                step="0.01"
                min="0.1"
                max="1000"
                inputMode="decimal"
                value={formData.netWeightGrams}
                onChange={(e) => setFormData({ ...formData, netWeightGrams: e.target.value })}
                placeholder="e.g. 45.00"
                className={`w-full pl-11 pr-4 py-3 bg-ivory-50/50 border rounded-xl text-charcoal-900 text-sm font-mono focus:bg-white transition-all ${
                  errors.netWeightGrams ? 'border-red-500' : 'border-ivory-200 focus:border-forest-700'
                }`}
              />
            </div>
            {errors.netWeightGrams && (
              <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.netWeightGrams}</span>
              </p>
            )}
          </div>
        </div>

        {/* Karat Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700">
            Gold Purity (Karat)
          </label>
          <div className="grid grid-cols-3 gap-3">
            {karatOptions.map((opt) => {
              const selected = formData.karat === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  id={`karat-select-${opt.value}`}
                  onClick={() => setFormData({ ...formData, karat: opt.value })}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selected
                      ? 'border-forest-800 bg-forest-50 text-forest-900 ring-2 ring-forest-800/10'
                      : 'border-ivory-200 bg-ivory-50/30 text-charcoal-700 hover:border-ivory-300 hover:bg-ivory-50'
                  }`}
                >
                  <div className="font-semibold text-sm sm:text-base flex items-center justify-center gap-1">
                    <Award className={`w-4 h-4 ${selected ? 'text-forest-800' : 'text-charcoal-400'}`} />
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-charcoal-500 mt-0.5">{opt.purity}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Continue Button */}
        <button
          id="btn-step1-continue"
          type="button"
          disabled={!isValid}
          onClick={onNext}
          className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            isValid
              ? 'bg-forest-800 hover:bg-forest-700 text-white shadow-md hover:shadow-lg cursor-pointer'
              : 'bg-ivory-200 text-charcoal-400 cursor-not-allowed'
          }`}
        >
          <span>Calculate Live Quote</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
