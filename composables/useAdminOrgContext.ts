export type AdminOrganization = {
  id: string;
  legal_name: string;
  name: string;
  slug: string;
  archetype: string;
  status: string;
  admin_count: number;
  created_at: string;
  jurisdiction: string;
  universe_size?: string;
  enclave_region?: string;
  dual_signatory?: boolean;
  is_election_workspace?: boolean;
};

const STORAGE_KEY = "lado_admin_selected_org_id";

export function useAdminOrgContext() {
  const { isSuperAdmin, authHeaders, apiBase, admin } = useAdminAuth();
  const organizations = useState<AdminOrganization[]>("adminOrganizations", () => []);
  const selectedOrgId = useState<string | null>("adminSelectedOrgId", () => null);
  const loadingOrgs = useState("adminOrgsLoading", () => false);

  const selectedOrg = computed(
    () => organizations.value.find((o) => o.id === selectedOrgId.value) || null,
  );

  const orgQuery = computed(() => {
    if (admin.value?.impersonating && admin.value.org_id) {
      return { org_id: admin.value.org_id };
    }
    if (isSuperAdmin.value) {
      return selectedOrgId.value ? { org_id: selectedOrgId.value } : {};
    }
    if (admin.value?.org_id) return { org_id: admin.value.org_id };
    return {};
  });

  function persistSelection(id: string | null) {
    selectedOrgId.value = id;
    if (!import.meta.client) return;
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }

  async function loadOrganizations() {
    if (!isSuperAdmin.value) {
      organizations.value = [];
      return;
    }
    loadingOrgs.value = true;
    try {
      const rows = await $fetch<AdminOrganization[]>(`${apiBase}/admin/organizations`, {
        headers: authHeaders(),
      });
      organizations.value = rows;
      if (!selectedOrgId.value && import.meta.client) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && rows.some((r) => r.id === saved)) {
          selectedOrgId.value = saved;
        } else if (rows.length) {
          // Prefer Ogun governorship workspace as default.
          const ogun =
            rows.find((r) => /ogun/i.test(r.slug) || /ogun/i.test(r.name) || /ogun/i.test(r.jurisdiction)) ||
            rows[rows.length - 1];
          persistSelection(ogun.id);
        }
      } else if (selectedOrgId.value && !rows.some((r) => r.id === selectedOrgId.value)) {
        persistSelection(rows[0]?.id ?? null);
      }
    } finally {
      loadingOrgs.value = false;
    }
  }

  function selectOrganization(id: string | null) {
    persistSelection(id);
  }

  return {
    organizations,
    selectedOrgId,
    selectedOrg,
    loadingOrgs,
    orgQuery,
    loadOrganizations,
    selectOrganization,
  };
}
