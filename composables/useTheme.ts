export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "lado-theme";

function applyTheme(mode: ThemeMode) {
  if (!import.meta.client) return;
  document.documentElement.classList.toggle("dark", mode === "dark");
  localStorage.setItem(STORAGE_KEY, mode);
}

function readStoredTheme(): ThemeMode {
  if (!import.meta.client) return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readDomTheme(): ThemeMode {
  if (!import.meta.client) return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function useTheme() {
  const theme = useState<ThemeMode>("theme", () => "light");

  if (getCurrentInstance()) {
    onMounted(() => {
      theme.value = readDomTheme();
    });
  }

  const isDark = computed(() => theme.value === "dark");

  function setTheme(mode: ThemeMode) {
    theme.value = mode;
    applyTheme(mode);
  }

  function toggleTheme() {
    setTheme(readDomTheme() === "dark" ? "light" : "dark");
  }

  return { theme, isDark, setTheme, toggleTheme };
}

export function initThemeFromStorage() {
  if (!import.meta.client) return;
  const mode = readStoredTheme();
  const theme = useState<ThemeMode>("theme", () => mode);
  theme.value = mode;
  applyTheme(mode);
}
