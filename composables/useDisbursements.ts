export type CentralDisbursementDashboard = {
  cluster_capacity: number;
  total_clusters: number;
  total_beneficiaries: number;
  verified_beneficiaries: number;
  clusters_completed: number;
  clusters_pending: number;
  total_approved_assistance: number;
  total_disbursed: number;
  pending_transactions: number;
  failed_transactions: number;
  successful_transactions: number;
  processing_transactions: number;
  providers: Record<string, boolean>;
  cluster_reports: ClusterReport[];
  recent_payments: DisbursementPayment[];
  recent_audit: DisbursementAudit[];
  alerts: DisbursementAlert[];
  updated_at: string;
};

export type ClusterReport = {
  cluster_id: string;
  cluster_name: string;
  cluster_code: string;
  state: string | null;
  total_beneficiaries: number;
  verified_beneficiaries: number;
  approved_amount: number;
  disbursed_amount: number;
  pending_amount: number;
  completed: boolean;
  locked_beneficiaries: number;
};

export type Beneficiary = {
  id: string;
  cluster_id: string;
  cluster_name: string | null;
  name: string;
  account_number: string;
  bank_name: string;
  bank_code: string | null;
  account_name: string | null;
  branch: string | null;
  approved_amount: number;
  scheduled_disbursement_date: string;
  payment_status: string;
  verification_status: string;
  schedule_status: string;
  is_locked: boolean;
  reference_code: string;
  verified_at: string | null;
  approved_at: string | null;
  locked_at: string | null;
  created_at: string;
};

export type DisbursementPayment = {
  id: string;
  beneficiary_id: string;
  beneficiary_name: string;
  cluster_id: string;
  cluster_name: string | null;
  agent_id: string;
  agent_name: string;
  amount: number;
  status: string;
  transaction_ref: string;
  provider: string | null;
  provider_reference: string | null;
  failure_reason: string | null;
  bank_name: string;
  account_number: string;
  authorized_at: string | null;
  paid_at: string | null;
  created_at: string;
  confirmation_note: string | null;
};

export type DisbursementAudit = {
  id: string;
  action: string;
  actor_type: string;
  actor_name: string;
  cluster_id: string | null;
  beneficiary_id: string | null;
  payment_id: string | null;
  amount: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type DisbursementAlert = {
  id: string;
  severity: string;
  message: string;
  cluster_id: string | null;
  payment_id: string | null;
  created_at: string;
};

export type Cluster = {
  id: string;
  name: string;
  code: string;
  state: string | null;
  created_at: string;
};

export type PaymentProviders = {
  paystack_configured: boolean;
  paystack_secret_masked: string | null;
  paystack_webhook_configured: boolean;
  paystack_preferred: boolean;
  alat_configured: boolean;
  alat_api_key_masked: string | null;
  alat_api_secret_configured: boolean;
  alat_base_url: string | null;
  alat_preferred: boolean;
  active_provider: string;
  config_source: string;
};

export type PaymentProvidersUpdate = {
  paystack_secret_key?: string;
  paystack_webhook_secret?: string;
  paystack_preferred?: boolean;
  alat_api_key?: string;
  alat_api_secret?: string;
  alat_base_url?: string;
  alat_preferred?: boolean;
};

export function useDisbursements() {
  const { authHeaders, apiBase } = useAdminAuth();

  function headers() {
    return authHeaders();
  }

  const loadCentral = () =>
    $fetch<CentralDisbursementDashboard>(`${apiBase}/admin/disbursements/central`, { headers: headers() });

  const loadBeneficiaries = (params?: { cluster_id?: string; verification_status?: string }) => {
    const q = new URLSearchParams();
    if (params?.cluster_id) q.set("cluster_id", params.cluster_id);
    if (params?.verification_status) q.set("verification_status", params.verification_status);
    const qs = q.toString();
    return $fetch<Beneficiary[]>(`${apiBase}/admin/disbursements/beneficiaries${qs ? `?${qs}` : ""}`, {
      headers: headers(),
    });
  };

  const loadPayments = (params?: { cluster_id?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.cluster_id) q.set("cluster_id", params.cluster_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return $fetch<DisbursementPayment[]>(`${apiBase}/admin/disbursements/payments${qs ? `?${qs}` : ""}`, {
      headers: headers(),
    });
  };

  const loadClusters = () =>
    $fetch<Cluster[]>(`${apiBase}/admin/disbursements/clusters`, { headers: headers() });

  const verifyBeneficiary = (id: string) =>
    $fetch<Beneficiary>(`${apiBase}/admin/disbursements/beneficiaries/${id}/verify`, {
      method: "POST",
      headers: headers(),
    });

  const approveSchedule = (id: string, body?: { scheduled_disbursement_date?: string; notes?: string }) =>
    $fetch<Beneficiary>(`${apiBase}/admin/disbursements/beneficiaries/${id}/approve-schedule`, {
      method: "POST",
      headers: headers(),
      body: body ?? {},
    });

  const lockBeneficiary = (id: string) =>
    $fetch<Beneficiary>(`${apiBase}/admin/disbursements/beneficiaries/${id}/lock`, {
      method: "POST",
      headers: headers(),
    });

  const assignAgentCluster = (agentId: string, clusterId: string) =>
    $fetch(`${apiBase}/admin/disbursements/agents/${agentId}/cluster`, {
      method: "PATCH",
      headers: headers(),
      body: { cluster_id: clusterId },
    });

  const loadPaymentProviders = () =>
    $fetch<PaymentProviders>(`${apiBase}/admin/disbursements/payment-providers`, { headers: headers() });

  const savePaymentProviders = (body: PaymentProvidersUpdate) =>
    $fetch<PaymentProviders>(`${apiBase}/admin/disbursements/payment-providers`, {
      method: "PATCH",
      headers: headers(),
      body,
    });

  return {
    loadCentral,
    loadBeneficiaries,
    loadPayments,
    loadClusters,
    verifyBeneficiary,
    approveSchedule,
    lockBeneficiary,
    assignAgentCluster,
    loadPaymentProviders,
    savePaymentProviders,
  };
}

export function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}
