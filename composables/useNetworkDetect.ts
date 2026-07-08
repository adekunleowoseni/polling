export type DetectedNetwork = "mtn" | "airtel" | "glo" | "9mobile";

// Best-effort mapping of Nigerian mobile prefixes to networks.
// Number portability means this can occasionally be wrong, but it is a
// good default that agents can rely on for the vast majority of numbers.
const NETWORK_PREFIXES: Record<DetectedNetwork, string[]> = {
  mtn: [
    "0703", "0704", "0706", "0803", "0806", "0810", "0813", "0814", "0816",
    "0903", "0906", "0913", "0916",
  ],
  glo: ["0705", "0805", "0807", "0811", "0815", "0905", "0915"],
  airtel: [
    "0701", "0708", "0802", "0808", "0812", "0901", "0902", "0904", "0907",
    "0911", "0912",
  ],
  "9mobile": ["0809", "0817", "0818", "0908", "0909"],
};

const NETWORK_LABELS: Record<DetectedNetwork, string> = {
  mtn: "MTN",
  airtel: "Airtel",
  glo: "Glo",
  "9mobile": "9mobile",
};

export function useNetworkDetect() {
  function normalizePhone(phone: string): string {
    let digits = (phone || "").replace(/\D/g, "");
    if (digits.startsWith("234") && digits.length === 13) {
      digits = "0" + digits.slice(3);
    }
    return digits;
  }

  function detectNetwork(phone: string): DetectedNetwork | null {
    const digits = normalizePhone(phone);
    if (digits.length < 4 || !digits.startsWith("0")) return null;
    const prefix = digits.slice(0, 4);
    for (const net of Object.keys(NETWORK_PREFIXES) as DetectedNetwork[]) {
      if (NETWORK_PREFIXES[net].includes(prefix)) return net;
    }
    return null;
  }

  function networkLabel(net: string | null | undefined): string {
    if (!net) return "";
    return NETWORK_LABELS[net as DetectedNetwork] ?? net;
  }

  function networkIcon(net: string | null | undefined): string | null {
    return net ? `/networks/${net}.svg` : null;
  }

  return { detectNetwork, networkLabel, networkIcon, normalizePhone };
}
