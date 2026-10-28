import React, { useState, useEffect } from 'react';
import { LeadItem } from '../../types';
import { ApiService, ApiServiceError } from '../../services/api';
import {
  KeyRound,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [adminKey, setAdminKey] = useState<string>(
    localStorage.getItem('tglobal_admin_key') || 'admin_gold_secret_key_2026'
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [planFilter, setPlanFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Status update modal
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState<string>('');
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiService.getLeads(
        {
          planId: planFilter || undefined,
          status: statusFilter || undefined,
          page,
          limit,
        },
        adminKey
      );
      setLeads(res.data);
      setPagination(res.pagination);
      setIsAuthenticated(true);
    } catch (err: any) {
      if (err instanceof ApiServiceError && err.statusCode === 401) {
        setIsAuthenticated(false);
        setError('Invalid admin credentials. Please provide the authorized admin key.');
      } else {
        setError(err.message || 'Failed to load leads from database.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [planFilter, statusFilter, page]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('tglobal_admin_key', adminKey);
    fetchLeads();
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingLeadId || !newStatus) return;

    setUpdateLoading(true);
    try {
      await ApiService.updateLeadStatus(
        updatingLeadId,
        newStatus,
        statusReason,
        adminKey
      );
      setUpdatingLeadId(null);
      setNewStatus('');
      setStatusReason('');
      fetchLeads();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdateLoading(false);
    }
  };

  const formatRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>SUBMITTED</span>
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            <span>UNDER REVIEW</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>APPROVED</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            <span>REJECTED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  // If not authenticated, prompt for admin key
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white rounded-3xl border border-ivory-200 p-8 shadow-elevated text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-forest-50 text-forest-800 flex items-center justify-center mx-auto border border-forest-200">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="font-serif font-bold text-2xl text-forest-900">
            Admin Authentication Required
          </h2>
          <p className="text-xs text-charcoal-600">
            Customer intake records and masked contact identities are restricted to authorized lending officers.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <KeyRound className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3.5" />
            <input
              id="admin-auth-input"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter Admin API Secret Key"
              className="w-full pl-10 pr-4 py-3 bg-ivory-50 border border-ivory-200 rounded-xl text-sm text-charcoal-900 focus:bg-white focus:border-forest-800"
            />
          </div>
          <button
            id="btn-admin-auth-submit"
            type="submit"
            className="w-full py-3 bg-forest-800 hover:bg-forest-700 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Authenticate & Access Ledger
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Ledger Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-ivory-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded bg-forest-100 text-forest-800">
              Lending Operations
            </span>
            <span className="text-xs text-charcoal-500 font-mono">
              Total Recorded: {pagination.total} leads
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-900 mt-1">
            Gold Loan Intake Ledger
          </h1>
          <p className="text-xs text-charcoal-600 mt-0.5">
            Real-time database records · Masked mobile privacy · Server-side recalculations
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLeads}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-ivory-300 text-charcoal-700 hover:bg-ivory-100 font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-ivory-200 p-4 shadow-refined flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-charcoal-600 font-medium">
            <Filter className="w-3.5 h-3.5 text-forest-800" />
            <span>Filter Schemes:</span>
          </div>

          <select
            id="admin-filter-plan"
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-ivory-50 border border-ivory-200 rounded-lg text-xs font-medium text-charcoal-800 focus:border-forest-800"
          >
            <option value="">All Loan Schemes</option>
            <option value="PLAN_EMI_01">Monthly EMI (PLAN_EMI_01)</option>
            <option value="PLAN_BULLET_01">Bullet Repayment (PLAN_BULLET_01)</option>
          </select>

          <select
            id="admin-filter-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-ivory-50 border border-ivory-200 rounded-lg text-xs font-medium text-charcoal-800 focus:border-forest-800"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div className="text-xs text-charcoal-500 font-medium">
          Showing page {pagination.page} of {Math.max(1, pagination.totalPages)}
        </div>
      </div>

      {/* Leads Table Card */}
      <div className="bg-white rounded-2xl border border-ivory-200 shadow-refined overflow-hidden">
        {loading && leads.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-forest-800 mx-auto" />
            <p className="text-xs text-charcoal-600">Retrieving applications from database...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-2 text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <FileText className="w-10 h-10 text-charcoal-300 mx-auto" />
            <h3 className="font-semibold text-charcoal-800 text-sm">No applications found</h3>
            <p className="text-xs text-charcoal-500">
              Try adjusting your filter settings or submit a new application from the customer portal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory-50/80 border-b border-ivory-200 text-charcoal-700 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Application ID</th>
                  <th className="py-3.5 px-4">Date / Time</th>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Masked Mobile</th>
                  <th className="py-3.5 px-4">Net Gold / Karat</th>
                  <th className="py-3.5 px-4">Selected Scheme</th>
                  <th className="py-3.5 px-4 text-right">Eligible Loan</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {leads.map((lead) => (
                  <tr
                    key={lead.applicationId}
                    className="hover:bg-ivory-50/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-forest-900">
                      {lead.applicationId}
                    </td>
                    <td className="py-3.5 px-4 text-charcoal-500 whitespace-nowrap">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-charcoal-900">
                      {lead.customerName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-charcoal-700 font-medium">
                      {lead.maskedMobile}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-charcoal-900">
                        {lead.netWeightGrams}g
                      </div>
                      <div className="text-[10px] text-charcoal-500">
                        {lead.karat}K ({lead.pureGoldGrams}g pure)
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-forest-800">
                        {lead.planName || lead.planId}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-forest-900">
                      {formatRupees(lead.eligibleLoanRupees)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(lead.status)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setUpdatingLeadId(lead.applicationId);
                          setNewStatus(lead.status);
                        }}
                        className="text-xs text-forest-800 hover:text-forest-600 font-semibold underline cursor-pointer"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 bg-ivory-50/60 border-t border-ivory-200 flex items-center justify-between">
          <span className="text-xs text-charcoal-500">
            Total {pagination.total} records recorded
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-2 rounded-lg border border-ivory-300 text-charcoal-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-charcoal-800 px-2">
              Page {pagination.page} / {Math.max(1, pagination.totalPages)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || loading}
              className="p-2 rounded-lg border border-ivory-300 text-charcoal-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {updatingLeadId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-ivory-200 space-y-4">
            <h3 className="font-serif font-bold text-lg text-forest-900">
              Update Status: {updatingLeadId}
            </h3>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-charcoal-700 mb-1">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2.5 bg-ivory-50 border border-ivory-200 rounded-lg text-xs"
                >
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-charcoal-700 mb-1">
                  Audit Reason (Optional)
                </label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Physical assay verified in branch"
                  rows={2}
                  className="w-full p-2 bg-ivory-50 border border-ivory-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUpdatingLeadId(null)}
                  className="px-3.5 py-2 border border-charcoal-300 rounded-lg text-charcoal-700 hover:bg-ivory-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateLoading}
                  className="px-4 py-2 bg-forest-800 text-white font-semibold rounded-lg hover:bg-forest-700 flex items-center gap-1.5"
                >
                  {updateLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
