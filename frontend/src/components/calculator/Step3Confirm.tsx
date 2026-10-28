import React, { useState } from 'react';
import { LeadFormData, LeadSubmissionResult } from '../../types';
import { ApiService, ApiServiceError } from '../../services/api';
import {
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface Step3ConfirmProps {
  formData: LeadFormData;
  onBack: () => void;
  onReset: () => void;
}

export const Step3Confirm: React.FC<Step3ConfirmProps> = ({
  formData,
  onBack,
  onReset,
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<LeadSubmissionResult | null>(null);
  const [conflictError, setConflictError] = useState<{ message: string; applicationId?: string } | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Mask mobile helper
  const maskedMobile = formData.mobileNumber.length === 10
    ? `${formData.mobileNumber.slice(0, 4)}XXXX${formData.mobileNumber.slice(-2)}`
    : formData.mobileNumber;

  const handleSubmit = async () => {
    setSubmitting(true);
    setConflictError(null);
    setGeneralError(null);

    try {
      const payload = {
        customerName: formData.customerName.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        grossWeightGrams: parseFloat(formData.grossWeightGrams),
        netWeightGrams: parseFloat(formData.netWeightGrams),
        karat: formData.karat,
        planId: formData.selectedPlanId,
      };

      const result = await ApiService.submitLead(payload);
      setSubmissionResult(result);
    } catch (err: any) {
      if (err instanceof ApiServiceError) {
        if (err.statusCode === 409) {
          // Friendly 409 message
          setConflictError({
            message: err.message,
            applicationId: err.applicationId,
          });
        } else {
          setGeneralError(err.message || 'Submission failed. Please check the fields and try again.');
        }
      } else {
        setGeneralError('Network error occurred. Please check your connection and retry.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Success Screen
  if (submissionResult) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-3xl border border-ivory-200 p-8 shadow-elevated text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-forest-50 border-2 border-forest-600/30 text-forest-800 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-forest-800" />
        </div>

        <div className="space-y-1">
          <span className="text-xs uppercase font-semibold tracking-wider text-forest-700 bg-forest-50 px-3 py-1 rounded-full border border-forest-100">
            Intake Received · Status: {submissionResult.status}
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-900 pt-2">
            Application Submitted
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-600">
            Your preliminary gold loan application has been registered in the lending intake system.
          </p>
        </div>

        {/* Application ID Card */}
        <div className="bg-gradient-to-r from-forest-900 to-forest-800 text-white p-5 rounded-2xl shadow-refined space-y-2">
          <span className="text-xs text-forest-100/70 uppercase tracking-widest block font-medium">
            Official Application Reference
          </span>
          <div className="font-mono text-3xl font-bold text-gold-300 tracking-wider">
            {submissionResult.applicationId}
          </div>
          <p className="text-xs text-forest-100/80">
            Please save this reference number for branch appraisal.
          </p>
        </div>

        {/* Summary Details */}
        <div className="bg-ivory-50/70 rounded-xl p-4 text-xs text-charcoal-700 space-y-2 border border-ivory-200/60 text-left">
          <div className="flex justify-between py-1 border-b border-ivory-200/40">
            <span className="text-charcoal-500">Applicant:</span>
            <span className="font-semibold text-charcoal-900">{submissionResult.customerName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-ivory-200/40">
            <span className="text-charcoal-500">Registered Mobile:</span>
            <span className="font-mono font-medium text-charcoal-900">{submissionResult.maskedMobile}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-ivory-200/40">
            <span className="text-charcoal-500">Net Gold / Karat:</span>
            <span className="font-semibold text-charcoal-900">{submissionResult.netWeightGrams}g ({submissionResult.karat}K)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-ivory-200/40">
            <span className="text-charcoal-500">Pure Gold Content:</span>
            <span className="font-mono font-semibold text-charcoal-900">{submissionResult.pureGoldGrams}g</span>
          </div>
          <div className="flex justify-between py-1 border-b border-ivory-200/40">
            <span className="text-charcoal-500">Market Gold Valuation:</span>
            <span className="font-mono font-semibold text-charcoal-900">{formatRupees(submissionResult.goldValueRupees)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-ivory-200/40">
            <span className="text-charcoal-500">Selected Scheme:</span>
            <span className="font-semibold text-forest-800">{submissionResult.planName}</span>
          </div>
          <div className="flex justify-between py-1 text-sm pt-2 text-forest-900">
            <span className="font-semibold">Eligible Loan Amount:</span>
            <span className="font-mono font-bold text-forest-900">{formatRupees(submissionResult.eligibleLoanRupees)}</span>
          </div>
        </div>

        <div className="text-[11px] text-charcoal-500 leading-relaxed">
          Next step: Visit your nearest TGlobal branch with your gold jewellery for fast physical verification and immediate disbursement.
        </div>

        <button
          id="btn-apply-another"
          type="button"
          onClick={onReset}
          className="w-full py-3 px-4 rounded-xl bg-forest-800 hover:bg-forest-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Submit Another Application</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-900">
          Confirm Your Application
        </h2>
        <p className="text-sm text-charcoal-600">
          Please review the final calculation summary before submitting your request.
        </p>
      </div>

      {/* Friendly 409 Duplicate Alert */}
      {conflictError && (
        <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-5 space-y-2 text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 text-sm">
                Active Application Found
              </h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {conflictError.message}
              </p>
              <div className="mt-3 text-[11px] text-amber-700 bg-white/70 p-2.5 rounded-lg border border-amber-200">
                To protect borrowers from overlapping commitments, only one application is permitted per mobile number within 7 days.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* General Error Alert */}
      {generalError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-700">
          {generalError}
        </div>
      )}

      {/* Application Summary Card */}
      <div className="bg-white rounded-2xl border border-ivory-200 p-6 sm:p-7 shadow-refined space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-ivory-200">
          <FileText className="w-4 h-4 text-forest-800" />
          <h3 className="font-semibold text-sm uppercase tracking-wider text-forest-900">
            Intake Summary
          </h3>
        </div>

        <div className="space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between py-1">
            <span className="text-charcoal-500">Applicant Full Name</span>
            <span className="font-semibold text-charcoal-900">{formData.customerName}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-charcoal-500">Registered Mobile</span>
            <span className="font-mono font-medium text-charcoal-900">{maskedMobile}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-charcoal-500">Jewellery Weight</span>
            <span className="font-mono text-charcoal-900">
              {formData.netWeightGrams}g Net / {formData.grossWeightGrams}g Gross
            </span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-charcoal-500">Purity Rating</span>
            <span className="font-semibold text-charcoal-900">{formData.karat} Karat</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-charcoal-500">Selected Plan</span>
            <span className="font-semibold text-forest-800">
              {formData.selectedPlanId === 'PLAN_EMI_01' ? 'Monthly EMI Plan (10.5% p.a.)' : 'Bullet Repayment (12% p.a.)'}
            </span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-charcoal-500">Tenure</span>
            <span className="text-charcoal-800">12 Months</span>
          </div>
        </div>

        {/* Disclaimer / Regulatory Note */}
        <div className="bg-ivory-50 p-4 rounded-xl border border-ivory-200 text-xs text-charcoal-600 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-forest-900">
            <ShieldCheck className="w-4 h-4 text-forest-700" />
            <span>Server-Verified Calculation Guarantee</span>
          </div>
          <p className="text-[11px] leading-relaxed text-charcoal-500">
            Financial amounts are re-computed on the server using verified 24K gold rates. Final disbursement is subject to physical jewellery assay and standard KYC verification.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-3 gap-3">
          <button
            id="btn-step3-back"
            type="button"
            disabled={submitting}
            onClick={onBack}
            className="px-5 py-3 rounded-xl border border-ivory-300 text-charcoal-700 hover:bg-ivory-100 font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Modify</span>
          </button>

          <button
            id="btn-step3-submit"
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex-1 py-3.5 px-6 rounded-xl bg-forest-800 hover:bg-forest-700 text-white font-semibold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:bg-forest-900/50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recording Application...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Submit Official Application</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
