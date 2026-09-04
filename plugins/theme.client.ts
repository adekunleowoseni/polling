import { initThemeFromStorage, type ThemeMode } from "~/composables/useTheme";

export default defineNuxtPlugin(() => {
  initThemeFromStorage();
  const theme = useState<ThemeMode>("theme");
  useHead({
    htmlAttrs: {
      class: computed(() => (theme.value === "dark" ? "dark" : "")),
    },
  });
});
