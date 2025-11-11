import { type WAPManifest, validateWAPManifest } from "./manifest.type.js";

export async function fetchManifest(url: string = "/wap.json"): Promise<WAPManifest> {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Failed to fetch manifest: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  validateWAPManifest(json);
  return json;
}
