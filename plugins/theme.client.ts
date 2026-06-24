import { initThemeFromStorage } from "~/composables/useTheme";

export default defineNuxtPlugin(() => {
  initThemeFromStorage();
});
