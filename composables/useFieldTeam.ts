/** Field team hierarchy: LGA Coordinator → Ward Coordinator → Field agent → assigned voters. */

export type FieldTeamCounts = {
  voters: number;
  contacts: number;
  ward_coordinators: number;
  field_agents: number;
};

export type FieldTeamNode = {
  /** null for the "not yet assigned" buckets */
  id: string | null;
  name: string;
  rank: string;
  rank_label: string;
  lga: string | null;
  ward: string | null;
  phone: string | null;
  email: string | null;
  polling_unit_code: string | null;
  reports_to_id: string | null;
  reports_to_name: string | null;
  direct_voters: number;
  direct_contacts: number;
  totals: FieldTeamCounts;
  children: FieldTeamNode[];
};

export type FieldTeamTree = {
  roots: FieldTeamNode[];
  totals: FieldTeamCounts;
  lga_coordinators: number;
  voters_total: number;
  voters_assigned: number;
  voters_unassigned: number;
};

export type FieldTeamWorkspace = {
  agent: FieldTeamNode;
  supervisor: FieldTeamNode | null;
  reports: FieldTeamNode[];
  supervisor_rank_label: string | null;
  report_rank_label: string | null;
  supervisor_options: FieldTeamNode[];
  report_options: FieldTeamNode[];
  can_hold_voters: boolean;
};

export type FieldTeamVoterFilter = {
  q?: string;
  lga?: string;
  ward?: string;
  polling_unit?: string;
  phone?: string;
};

export type FieldTeamVoter = {
  id: string;
  name: string;
  vin: string | null;
  phone: string | null;
  gender: string | null;
  polling_unit: string | null;
  ward: string | null;
  lga: string | null;
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
};

export type FieldTeamVoters = {
  total: number;
  page: number;
  page_size: number;
  /** Whose branch these voters belong to */
  scope_name: string;
  agents_in_scope: number;
  rows: FieldTeamVoter[];
};

export type FieldTeamAssignResult = { matched: number; changed: number; agent_voters: number };

export function fieldTeamPath(agentId: string) {
  return `/admin/field-team/${encodeURIComponent(agentId)}`;
}

export function useFieldTeam() {
  const { apiBase, authHeaders } = useAdminAuth();
  const { orgQuery } = useAdminOrgContext();
  // Shared so the sidebar, hierarchy tab and agent pages show the same numbers.
  const tree = useState<FieldTeamTree | null>("fieldTeamTree", () => null);
  const treeLoading = useState("fieldTeamTreeLoading", () => false);

  async function loadTree() {
    treeLoading.value = true;
    try {
      tree.value = await $fetch<FieldTeamTree>(`${apiBase}/admin/field-team/tree`, {
        headers: authHeaders(),
        query: orgQuery.value,
        timeout: 30000,
      });
      return tree.value;
    } finally {
      treeLoading.value = false;
    }
  }

  function loadAgent(agentId: string) {
    return $fetch<FieldTeamWorkspace>(`${apiBase}/admin/field-team/agents/${agentId}`, { headers: authHeaders() });
  }

  function setSupervisor(agentId: string, supervisorId: string | null) {
    return $fetch<FieldTeamWorkspace>(`${apiBase}/admin/field-team/agents/${agentId}/supervisor`, {
      method: "PUT",
      headers: authHeaders(),
      body: { supervisor_id: supervisorId },
    });
  }

  function setReports(agentId: string, change: { add?: string[]; remove?: string[] }) {
    return $fetch<FieldTeamWorkspace>(`${apiBase}/admin/field-team/agents/${agentId}/reports`, {
      method: "PUT",
      headers: authHeaders(),
      body: { add: change.add ?? [], remove: change.remove ?? [] },
    });
  }

  function assignVoters(
    agentId: string,
    body: {
      action?: "assign" | "unassign";
      voter_ids?: string[];
      filter?: FieldTeamVoterFilter;
      include_assigned_elsewhere?: boolean;
    },
  ) {
    return $fetch<FieldTeamAssignResult>(`${apiBase}/admin/field-team/agents/${agentId}/voters`, {
      method: "POST",
      headers: authHeaders(),
      body: { action: "assign", ...body },
      timeout: 120000,
    });
  }

  /** The actual voters behind a node's count: the person and everyone under them. */
  function loadTeamVoters(agentId: string, params: { member_id?: string; q?: string; page?: number; page_size?: number } = {}) {
    const query: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") query[k] = v;
    return $fetch<FieldTeamVoters>(`${apiBase}/admin/field-team/agents/${agentId}/team-voters`, {
      headers: authHeaders(),
      query,
    });
  }

  return { tree, treeLoading, loadTree, loadAgent, setSupervisor, setReports, assignVoters, loadTeamVoters };
}
