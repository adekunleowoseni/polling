export type BudgetCampaign = {
  id: string;
  org_id: string;
  org_name: string | null;
  title: string;
  description: string | null;
  goal_amount: number;
  threshold_amount: number;
  raised_amount: number;
  donor_count: number;
  progress_pct: number;
  threshold_reached: boolean;
  status: "draft" | "active" | "paused" | "closed" | string;
  currency: string;
  created_at: string;
  updated_at: string | null;
};

export type BudgetDonation = {
  id: string;
  campaign_id: string;
  org_id: string;
  amount: number;
  donor_kind: string;
  donor_name: string;
  donor_email: string | null;
  status: string;
  note: string | null;
  created_at: string;
};

export type BudgetCampaignCreate = {
  title: string;
  description?: string;
  goal_amount: number;
  threshold_amount: number;
  status?: "draft" | "active" | "paused" | "stopped" | "closed";
};

export type BudgetCampaignUpdate = Partial<BudgetCampaignCreate>;

export function useBudget() {
  const { authHeaders, apiBase } = useAdminAuth();
  const { orgQuery } = useAdminOrgContext();

  function headers() {
    return authHeaders();
  }

  function withOrgQuery(path: string) {
    const q = new URLSearchParams();
    const orgId = (orgQuery.value as { org_id?: string }).org_id;
    if (orgId) q.set("org_id", orgId);
    const qs = q.toString();
    return `${apiBase}${path}${qs ? `?${qs}` : ""}`;
  }

  const listCampaigns = (status?: string) => {
    const q = new URLSearchParams();
    const orgId = (orgQuery.value as { org_id?: string }).org_id;
    if (orgId) q.set("org_id", orgId);
    if (status) q.set("status", status);
    const qs = q.toString();
    return $fetch<BudgetCampaign[]>(`${apiBase}/admin/budget/campaigns${qs ? `?${qs}` : ""}`, {
      headers: headers(),
    });
  };

  const createCampaign = (body: BudgetCampaignCreate) =>
    $fetch<BudgetCampaign>(withOrgQuery("/admin/budget/campaigns"), {
      method: "POST",
      headers: headers(),
      body,
    });

  const updateCampaign = (id: string, body: BudgetCampaignUpdate) =>
    $fetch<BudgetCampaign>(withOrgQuery(`/admin/budget/campaigns/${id}`), {
      method: "PATCH",
      headers: headers(),
      body,
    });

  const setCampaignStatus = (id: string, status: "active" | "paused" | "stopped" | "draft") => {
    const q = new URLSearchParams();
    const orgId = (orgQuery.value as { org_id?: string }).org_id;
    if (orgId) q.set("org_id", orgId);
    q.set("status", status);
    return $fetch<BudgetCampaign>(`${apiBase}/admin/budget/campaigns/${id}/status?${q.toString()}`, {
      method: "POST",
      headers: headers(),
    });
  };

  const listDonations = (campaignId: string) =>
    $fetch<BudgetDonation[]>(withOrgQuery(`/admin/budget/campaigns/${campaignId}/donations`), {
      headers: headers(),
    });

  return { listCampaigns, createCampaign, updateCampaign, setCampaignStatus, listDonations };
}

export function formatBudgetNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}
