export type PackageDistribution = {
  id: string;
  title: string;
  state: string;
  lga: string;
  ward: string;
  polling_unit_code: string | null;
  polling_unit_name: string | null;
  audience: string;
  package_count: number;
  packages_claimed: number;
  eligible_count: number;
  status: string;
  agent_id: string | null;
  agent_name: string | null;
  created_at: string;
  accepted_at: string | null;
};

export type PackageDistributionCreate = {
  title: string;
  state: string;
  lga: string;
  ward: string;
  polling_unit_code?: string;
  polling_unit_name?: string;
  audience?: "voter" | "member" | "both";
  package_count?: number;
  auto_count?: boolean;
};

export type PackageKit = {
  id: string;
  title: string;
  detail: string;
  form_title: string;
  stock_label: string;
  default_audience: string;
  created_at: string;
};

export type PackageKitCreate = {
  title: string;
  detail?: string;
  form_title?: string;
  stock_label?: string;
  default_audience?: "voter" | "member" | "both";
};

export function usePackages() {
  const config = useRuntimeConfig();
  const { authHeaders } = useAdminAuth();

  async function loadDistributions(): Promise<PackageDistribution[]> {
    return await $fetch<PackageDistribution[]>(`${config.public.apiBase}/admin/packages`, {
      headers: authHeaders(),
    });
  }

  async function createDistribution(body: PackageDistributionCreate): Promise<PackageDistribution> {
    return await $fetch<PackageDistribution>(`${config.public.apiBase}/admin/packages`, {
      method: "POST",
      headers: authHeaders(),
      body,
    });
  }

  async function loadKits(): Promise<PackageKit[]> {
    return await $fetch<PackageKit[]>(`${config.public.apiBase}/admin/packages/kits`, {
      headers: authHeaders(),
    });
  }

  async function createKit(body: PackageKitCreate): Promise<PackageKit> {
    return await $fetch<PackageKit>(`${config.public.apiBase}/admin/packages/kits`, {
      method: "POST",
      headers: authHeaders(),
      body,
    });
  }

  async function deleteKit(kitId: string): Promise<void> {
    await $fetch(`${config.public.apiBase}/admin/packages/kits/${kitId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  }

  return { loadDistributions, createDistribution, loadKits, createKit, deleteKit };
}
