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

  return { loadDistributions, createDistribution };
}
