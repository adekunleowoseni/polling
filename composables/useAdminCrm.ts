export type AdminCrmRow = {
  id: string;
  source: string;
  contact_type: string;
  name: string;
  email: string | null;
  phone: string | null;
  state: string | null;
  lga: string | null;
  ward: string | null;
  address: string | null;
  polling_unit: string | null;
  tags: string[];
  sms_ok: boolean;
  support_label: string;
  support_score: number;
  recent_activity: string;
  recent_when: string | null;
  last_touch_at: string | null;
  kyc_status: string | null;
  account_type: string | null;
  created_at: string | null;
};

export type AdminCrmDirectory = {
  total: number;
  identified: number;
  persuadable: number;
  donors: number;
  volunteers: number;
  follow_up: number;
  high_turnout: number;
  rows: AdminCrmRow[];
  org_id?: string | null;
  org_name?: string | null;
};

export type AdminVoterImportOut = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  org_id?: string | null;
  org_name?: string | null;
};

export type AdminCrmContactCreate = {
  name: string;
  phone?: string | null;
  email?: string | null;
  contact_type: "voter" | "member" | "donor";
  lga?: string | null;
  ward?: string | null;
  address?: string | null;
  tags?: string[];
};

export type AdminCrmSmsBroadcastIn = {
  contact_ids: string[];
  scope: "selected" | "filter";
  body: string;
  channel: "shortcode" | "longcode" | "alphanumeric";
  template: string;
  timing: "now" | "schedule";
  schedule_at?: string | null;
  send_test?: boolean;
};

export type AdminCrmSmsBroadcastOut = {
  id: string;
  queued: number;
  skipped_dnc: number;
  skipped_no_phone: number;
  inbox_delivered: number;
  credits: number;
  timing: string;
  schedule_at: string | null;
  send_test: boolean;
};

export type AdminCrmCanvassAction = {
  id: string;
  agent_id: string;
  agent_name: string;
  action_type: string;
  title: string;
  description: string | null;
  status: string;
  ward: string | null;
  lga: string | null;
  meeting_point: string | null;
  created_at: string;
  joined_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type AdminCrmCanvassAssignIn = {
  title: string;
  description?: string | null;
  ward?: string | null;
  lga?: string | null;
  meeting_point?: string | null;
  agent_ids: string[];
};

export type AdminCrmCanvassAssignOut = {
  created: number;
  skipped: number;
  actions: AdminCrmCanvassAction[];
};

export type AdminCrmSmsCarrierStat = {
  name: string;
  messages: number;
  latency_s: number;
  success_pct: number;
};

export type AdminCrmSmsIntentStat = {
  label: string;
  count: number;
  share_pct: number;
};

export type AdminCrmSmsAuditRow = {
  contact_id: string;
  name: string;
  phone: string | null;
  ward: string | null;
  lga: string | null;
  precinct_label: string;
  message_preview: string;
  delivery_status: string;
  carrier: string;
  inbound_reply: string | null;
  intent: string | null;
  needs_action: boolean;
};

export type AdminCrmSmsAnalytics = {
  id: string;
  title: string;
  subtitle: string;
  status_label: string;
  template: string;
  channel: string;
  channel_label: string;
  body: string;
  scope: string;
  queued: number;
  delivered: number;
  delivery_pct: number;
  carrier_filtered: number;
  unreachable: number;
  credits: number;
  cost_ngn: number;
  ctr_clicks: number;
  ctr_pct: number;
  replies: number;
  reply_pct: number;
  positive_pct: number;
  inquiry_pct: number;
  opt_out_pct: number;
  peak_throughput: number;
  avg_latency_s: number;
  dispatch_started_at: string | null;
  dispatch_ended_at: string | null;
  duration_label: string;
  wards_label: string;
  carriers: AdminCrmSmsCarrierStat[];
  intents: AdminCrmSmsIntentStat[];
  opportunity_count: number;
  opportunity_text: string | null;
  opportunity_ward: string | null;
  audit_rows: AdminCrmSmsAuditRow[];
  send_test: boolean;
};

function crmError(e: unknown, fallback: string) {
  if (e && typeof e === "object") {
    const err = e as { data?: { detail?: unknown }; message?: string; name?: string };
    const detail = err.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
    if (typeof err.message === "string" && /timeout/i.test(err.message)) {
      return "Directory timed out. Check the API connection and try again.";
    }
  }
  return e instanceof Error ? e.message : fallback;
}

export function useAdminCrm() {
  const { apiBase, authHeaders } = useAdminAuth();
  const { orgQuery } = useAdminOrgContext();

  async function loadDirectory() {
    return $fetch<AdminCrmDirectory>(`${apiBase}/admin/crm/directory`, {
      headers: authHeaders(),
      query: orgQuery.value,
      timeout: 15000,
    });
  }

  async function importVoters(file: File) {
    const body = new FormData();
    body.append("file", file);
    if (orgQuery.value.org_id) body.append("org_id", orgQuery.value.org_id);
    return $fetch<AdminVoterImportOut>(`${apiBase}/admin/crm/voters/import`, {
      method: "POST",
      headers: authHeaders(),
      body,
      timeout: 120000,
    });
  }

  async function createContact(payload: AdminCrmContactCreate) {
    return $fetch<AdminCrmRow>(`${apiBase}/admin/crm/contacts`, {
      method: "POST",
      headers: authHeaders(),
      body: payload,
    });
  }

  async function dispatchSms(payload: AdminCrmSmsBroadcastIn) {
    return $fetch<AdminCrmSmsBroadcastOut>(`${apiBase}/admin/crm/sms-broadcast`, {
      method: "POST",
      headers: authHeaders(),
      body: payload,
      timeout: 20000,
    });
  }

  async function listSmsDispatches() {
    return $fetch<AdminCrmSmsDispatchSummary[]>(`${apiBase}/admin/crm/sms-dispatches`, {
      headers: authHeaders(),
      timeout: 15000,
    });
  }

  async function loadSmsAnalytics(dispatchId: string) {
    return $fetch<AdminCrmSmsAnalytics>(`${apiBase}/admin/crm/sms-dispatches/${dispatchId}/analytics`, {
      headers: authHeaders(),
      timeout: 20000,
    });
  }

  async function listCanvassActions() {
    return $fetch<AdminCrmCanvassAction[]>(`${apiBase}/admin/crm/actions`, {
      headers: authHeaders(),
      query: { action_type: "canvass" },
      timeout: 15000,
    });
  }

  async function assignCanvassActions(payload: AdminCrmCanvassAssignIn) {
    return $fetch<AdminCrmCanvassAssignOut>(`${apiBase}/admin/crm/actions`, {
      method: "POST",
      headers: authHeaders(),
      body: payload,
      timeout: 20000,
    });
  }

  return {
    loadDirectory,
    importVoters,
    createContact,
    dispatchSms,
    listSmsDispatches,
    loadSmsAnalytics,
    listCanvassActions,
    assignCanvassActions,
    crmError,
  };
}
