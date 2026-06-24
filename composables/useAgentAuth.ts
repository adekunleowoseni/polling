export type Agent = {
  id: string;
  name: string;
  email: string;
  lga: string | null;
  ward: string | null;
  created_at: string;
};
const TOKEN_KEY = "lado_agent_token";
const AGENT_KEY = "lado_agent";

export function useAgentAuth() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;

  const token = useState<string | null>("agentToken", () => null);
  const agent = useState<Agent | null>("agent", () => null);
  const ready = ref(false);

  function persist(session: { api_token: string; agent: Agent }) {
    token.value = session.api_token;
    agent.value = session.agent;
    if (import.meta.client) {
      localStorage.setItem(TOKEN_KEY, session.api_token);
      localStorage.setItem(AGENT_KEY, JSON.stringify(session.agent));
    }
  }

  function clear() {
    token.value = null;
    agent.value = null;
    if (import.meta.client) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(AGENT_KEY);
    }
  }

  function loadFromStorage() {
    if (!import.meta.client) return;
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedAgent = localStorage.getItem(AGENT_KEY);
    if (storedToken) token.value = storedToken;
    if (storedAgent) {
      try {
        agent.value = JSON.parse(storedAgent) as Agent;
      } catch {
        clear();
      }
    }
    ready.value = true;
  }

  function authHeaders(): Record<string, string> {
    if (!token.value) return {};
    return { "X-Agent-Token": token.value };
  }

  async function login(email: string, password: string) {
    const session = await $fetch<{ api_token: string; agent: Agent }>(`${apiBase}/agents/login`, {
      method: "POST",
      body: { email, password },
    });
    persist(session);
    return session;
  }

  async function register(
    name: string,
    email: string,
    password: string,
    lga: string,
    ward: string,
  ) {
    const session = await $fetch<{ api_token: string; agent: Agent }>(`${apiBase}/agents/register`, {
      method: "POST",
      body: { name, email, password, lga, ward },
    });
    persist(session);
    return session;
  }

  async function fetchMe() {
    if (!token.value) return null;
    try {
      const me = await $fetch<Agent>(`${apiBase}/agents/me`, { headers: authHeaders() });
      agent.value = me;
      return me;
    } catch {
      clear();
      return null;
    }
  }

  function requireAgent() {
    if (!ready.value) loadFromStorage();
    if (!token.value) {
      navigateTo("/agent/login");
      return false;
    }
    return true;
  }

  onMounted(() => {
    loadFromStorage();
  });

  return {
    token,
    agent,
    ready,
    authHeaders,
    login,
    register,
    fetchMe,
    clear,
    requireAgent,
    isLoggedIn: computed(() => !!token.value),
  };
}
