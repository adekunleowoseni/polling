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

  return { tree, treeLoading, loadTree, loadAgent, setSupervisor, setReports, assignVoters };
}
