<template>
  <div ref="rootEl" class="relative">
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-lg border border-ui-border/60 px-3 py-2 text-sm text-ui-text hover:bg-ui-muted/10"
      @click="open = !open"
    >
      <span class="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/20 text-xs font-semibold text-violet-600 dark:text-violet-300">
        {{ initials }}
      </span>
      <span class="hidden sm:inline">{{ admin?.name ?? "Admin" }}</span>
      <svg class="h-4 w-4 text-ui-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-ui-border/60 bg-ui-surface shadow-xl"
    >
      <div class="border-b border-ui-border/40 px-4 py-3">
        <p class="text-sm font-medium text-ui-text">{{ admin?.name }}</p>
        <p class="text-xs text-ui-muted">{{ admin?.email }}</p>
        <p class="mt-1 text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400">
          {{ admin?.role }}
        </p>
      </div>

      <button
        type="button"
        class="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-ui-text hover:bg-ui-muted/10"
        @click="showPasswordForm = !showPasswordForm"
      >
        <svg class="h-4 w-4 text-ui-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Change password
      </button>

      <form v-if="showPasswordForm" class="space-y-3 border-t border-ui-border/40 px-4 py-3" @submit.prevent="onChangePassword">
        <input v-model="currentPassword" type="password" required placeholder="Current password" class="ui-input text-sm" />
        <input v-model="newPassword" type="password" required minlength="8" placeholder="New password" class="ui-input text-sm" />
        <p v-if="passwordError" class="text-xs text-red-500">{{ passwordError }}</p>
        <p v-if="passwordSuccess" class="text-xs text-emerald-600 dark:text-emerald-400">{{ passwordSuccess }}</p>
        <button
          type="submit"
          class="w-full rounded-lg bg-violet-600 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          :disabled="savingPassword"
        >
          {{ savingPassword ? "Updating…" : "Update password" }}
        </button>
      </form>

      <button
        type="button"
        class="w-full border-t border-ui-border/40 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-500/10 dark:text-red-400"
        @click="emit('logout')"
      >
        Sign out
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Admin } from "~/composables/useAdminAuth";

const props = defineProps<{
  admin: Admin | null;
}>();

const emit = defineEmits<{ logout: [] }>();

const { authHeaders, apiBase } = useAdminAuth();

const open = ref(false);
const showPasswordForm = ref(false);
const currentPassword = ref("");
const newPassword = ref("");
const savingPassword = ref(false);
const passwordError = ref("");
const passwordSuccess = ref("");
const rootEl = ref<HTMLElement | null>(null);

const initials = computed(() => {
  const name = props.admin?.name ?? "A";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
});

function onDocumentClick(e: MouseEvent) {
  if (!open.value || !rootEl.value) return;
  if (!rootEl.value.contains(e.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener("click", onDocumentClick));
onUnmounted(() => document.removeEventListener("click", onDocumentClick));

async function onChangePassword() {
  savingPassword.value = true;
  passwordError.value = "";
  passwordSuccess.value = "";
  try {
    await $fetch(`${apiBase}/admin/me/password`, {
      method: "PATCH",
      headers: authHeaders(),
      body: {
        current_password: currentPassword.value,
        new_password: newPassword.value,
      },
    });
    passwordSuccess.value = "Password updated.";
    currentPassword.value = "";
    newPassword.value = "";
    showPasswordForm.value = false;
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    passwordError.value = typeof detail === "string" ? detail : "Failed to update password.";
  } finally {
    savingPassword.value = false;
  }
}
</script>
