export type Admin = {
  id: string;
  name: string;
  email: string;
  role: string;
  state?: string | null;
  allowed_tabs?: string[];
  created_at: string;
};

export type AdminOverview = {
  live_feeds: number;
  registered_units: number;
  total_people_on_site: number;
  feed_snapshots: number;
  agents: number;
  form_registrations: number;
  total_votes: number;
  units_with_results: number;
  updated_at: string;
};

const TOKEN_KEY = "lado_admin_token";
const ADMIN_KEY = "lado_admin";

export function useAdminAuth() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;

  const token = useState<string | null>("adminToken", () => null);
  const admin = useState<Admin | null>("admin", () => null);
  const ready = ref(false);

  function persist(session: { api_token: string; admin: Admin }) {
    token.value = session.api_token;
    admin.value = session.admin;
    if (import.meta.client) {
      localStorage.setItem(TOKEN_KEY, session.api_token);
      localStorage.setItem(ADMIN_KEY, JSON.stringify(session.admin));
    }
  }

  function clear() {
    token.value = null;
    admin.value = null;
    if (import.meta.client) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ADMIN_KEY);
    }
  }

  function loadFromStorage() {
    if (!import.meta.client) return;
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedAdmin = localStorage.getItem(ADMIN_KEY);
    if (storedToken) token.value = storedToken;
    if (storedAdmin) {
      try {
        admin.value = JSON.parse(storedAdmin) as Admin;
      } catch {
        clear();
      }
    }
    ready.value = true;
  }

  function authHeaders(): Record<string, string> {
    if (!token.value) return {};
    return { "X-Admin-Token": token.value };
  }

  async function login(email: string, password: string) {
    const session = await $fetch<{ api_token: string; admin: Admin }>(`${apiBase}/admin/login`, {
      method: "POST",
      body: { email, password },
    });
    persist(session);
    return session;
  }

  async function refreshMe() {
    if (!token.value) return null;
    try {
      const me = await $fetch<Admin>(`${apiBase}/admin/me`, {
        headers: authHeaders(),
      });
      admin.value = me;
      if (import.meta.client) {
        localStorage.setItem(ADMIN_KEY, JSON.stringify(me));
      }
      return me;
    } catch {
      return null;
    }
  }

  function canAccessTab(tabId: string) {
    const allowed = admin.value?.allowed_tabs;
    if (!allowed || allowed.length === 0) {
      // Legacy sessions without allowed_tabs: super keeps all, state uses defaults
      if (admin.value?.role === "state_admin") {
        return ["overview", "feeds", "snaps", "agents", "votes"].includes(tabId);
      }
      return true;
    }
    return allowed.includes(tabId);
  }

  function requireAdmin() {
    if (!ready.value) loadFromStorage();
    if (!token.value) {
      navigateTo("/admin/login");
      return false;
    }
    return true;
  }

  onMounted(() => {
    loadFromStorage();
  });

  return {
    token,
    admin,
    ready,
    authHeaders,
    login,
    refreshMe,
    canAccessTab,
    clear,
    requireAdmin,
    isLoggedIn: computed(() => !!token.value),
    isSuperAdmin: computed(() => (admin.value?.role || "super_admin") === "super_admin"),
    apiBase,
  };
}
