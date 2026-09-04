export type ToastKind = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
  createdAt: number;
};

const toasts = ref<ToastItem[]>([]);
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function dismiss(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

function push(kind: ToastKind, message: string, durationMs = 4500) {
  const text = String(message || "").trim();
  if (!text) return;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  toasts.value = [...toasts.value.slice(-4), { id, kind, message: text, createdAt: Date.now() }];
  if (durationMs > 0) {
    timers.set(
      id,
      setTimeout(() => dismiss(id), durationMs),
    );
  }
}

export function useToast() {
  return {
    toasts: computed(() => toasts.value),
    success: (message: string, durationMs?: number) => push("success", message, durationMs ?? 4500),
    error: (message: string, durationMs?: number) => push("error", message, durationMs ?? 6500),
    info: (message: string, durationMs?: number) => push("info", message, durationMs ?? 4500),
    dismiss,
    clear: () => {
      for (const id of [...timers.keys()]) dismiss(id);
      toasts.value = [];
    },
  };
}
