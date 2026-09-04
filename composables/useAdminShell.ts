export type AdminNavItem = {
  id: string;
  label: string;
  icon: string;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: readonly AdminNavItem[];
};

export const ADMIN_NAV_GROUPS = [
  {
    id: "command",
    label: "Command Center",
    items: [
      { id: "overview", label: "Overview", icon: "space_dashboard" },
      { id: "feeds", label: "Live Operations & Maps", icon: "map" },
      { id: "snaps", label: "Pictures", icon: "photo_library" },
    ],
  },
  {
    id: "crm",
    label: "Supporter CRM",
    items: [
      { id: "agents", label: "Voter Directory", icon: "groups" },
      { id: "sms-analytics", label: "SMS Delivery Analytics", icon: "cell_tower" },
      { id: "inbox", label: "Inbox", icon: "inbox" },
    ],
  },
  {
    id: "field",
    label: "Field Operations",
    items: [
      { id: "recordings", label: "Field Canvassing", icon: "how_to_reg" },
      { id: "votes", label: "Vote Results", icon: "how_to_vote" },
      { id: "parties", label: "Parties & Candidates", icon: "flag" },
    ],
  },
  {
    id: "fundraising",
    label: "Fundraising",
    items: [
      { id: "disbursements", label: "Fundraising & Donors", icon: "volunteer_activism" },
      { id: "chapters", label: "Ogun Chapter Budget", icon: "account_balance" },
      { id: "packages", label: "Package Distribution", icon: "inventory_2" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { id: "audit", label: "Telemetry & Security", icon: "verified_user" },
      { id: "payment-gateways", label: "Payment Gateways", icon: "payments" },
      { id: "data", label: "Data Plans", icon: "sim_card" },
      { id: "airtime", label: "Airtime", icon: "phone_iphone" },
    ],
  },
] as const satisfies readonly AdminNavGroup[];

export const ADMIN_NAV = ADMIN_NAV_GROUPS.flatMap((group) => [...group.items]);

export type AdminTabId = (typeof ADMIN_NAV)[number]["id"];

export function useAdminShell() {
  const activeTab = useState<AdminTabId>("adminActiveTab", () => "overview");
  const searchQuery = useState("adminSearchQuery", () => "");
  const sidebarOpen = useState("adminSidebarOpen", () => false);
  const openNavGroups = useState<string[]>("adminOpenNavGroups", () => [
    "command",
    "crm",
    "field",
    "fundraising",
    "system",
  ]);
  const smsAnalyticsDispatchId = useState<string | null>("adminSmsAnalyticsDispatchId", () => null);

  function setTab(id: AdminTabId) {
    activeTab.value = id;
    sidebarOpen.value = false;
    const group = ADMIN_NAV_GROUPS.find((g) => g.items.some((item) => item.id === id));
    if (group && !openNavGroups.value.includes(group.id)) {
      openNavGroups.value = [...openNavGroups.value, group.id];
    }
  }

  function toggleNavGroup(groupId: string) {
    if (openNavGroups.value.includes(groupId)) {
      openNavGroups.value = openNavGroups.value.filter((id) => id !== groupId);
    } else {
      openNavGroups.value = [...openNavGroups.value, groupId];
    }
  }

  function openSmsAnalytics(dispatchId?: string | null) {
    if (dispatchId) smsAnalyticsDispatchId.value = dispatchId;
    setTab("sms-analytics");
  }

  return {
    activeTab,
    searchQuery,
    sidebarOpen,
    openNavGroups,
    smsAnalyticsDispatchId,
    setTab,
    toggleNavGroup,
    openSmsAnalytics,
  };
}
