export type InboxBroadcast = {
  id: string;
  item_type: string;
  title: string;
  body: string;
  attachment_url: string | null;
  state: string;
  lga: string;
  ward: string;
  polling_unit_code: string | null;
  audience: string;
  recipient_count: number;
  sender_name: string;
  created_at: string;
};

export type InboxPostCreate = {
  item_type: "invite" | "message" | "material";
  title: string;
  body: string;
  attachment_url?: string;
  state: string;
  lga: string;
  ward: string;
  polling_unit_code?: string;
  audience?: "voter" | "member" | "both";
};

export function useInbox() {
  const config = useRuntimeConfig();
  const { authHeaders } = useAdminAuth();

  async function loadBroadcasts(): Promise<InboxBroadcast[]> {
    return await $fetch<InboxBroadcast[]>(`${config.public.apiBase}/admin/inbox`, {
      headers: authHeaders(),
    });
  }

  async function createBroadcast(body: InboxPostCreate): Promise<InboxBroadcast> {
    return await $fetch<InboxBroadcast>(`${config.public.apiBase}/admin/inbox`, {
      method: "POST",
      headers: authHeaders(),
      body,
    });
  }

  async function saveAgentInboxPermissions(
    agentId: string,
    body: { can_message_voters?: boolean; can_post_invites?: boolean; can_post_materials?: boolean },
  ) {
    return await $fetch(`${config.public.apiBase}/admin/agents/${agentId}/inbox-permissions`, {
      method: "PATCH",
      headers: authHeaders(),
      body,
    });
  }

  return { loadBroadcasts, createBroadcast, saveAgentInboxPermissions };
}
