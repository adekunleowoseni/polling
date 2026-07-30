const STORAGE_KEY = "lado-device-id";
export const APP_VERSION = "lado-web/1.0.0";

export function useDeviceId(): string {
  if (!import.meta.client) return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
