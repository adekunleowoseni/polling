export type ChapterConfig = {
  state: string;
  frozen: boolean;
  tranche_target: number;
  autonomy_threshold: number;
  sms_quota_cap: number;
  envelope_field_pct: number;
  envelope_media_pct: number;
  envelope_stipend_pct: number;
  envelope_hardware_pct: number;
  envelope_contingency_pct: number;
  voter_export_restricted: boolean;
};

export type ChapterConfigUpdate = Partial<
  Omit<ChapterConfig, "state">
>;

export function useChapterConfig() {
  const config = useRuntimeConfig();
  const { authHeaders } = useAdminAuth();
  const apiBase = config.public.apiBase as string;

  async function loadChapterConfig() {
    return await $fetch<ChapterConfig>(`${apiBase}/admin/chapters/config`, {
      headers: authHeaders(),
    });
  }

  async function saveChapterConfig(body: ChapterConfigUpdate) {
    return await $fetch<ChapterConfig>(`${apiBase}/admin/chapters/config`, {
      method: "PATCH",
      headers: authHeaders(),
      body,
    });
  }

  return { loadChapterConfig, saveChapterConfig };
}
