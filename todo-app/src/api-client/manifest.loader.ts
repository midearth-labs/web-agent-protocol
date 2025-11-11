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

export async function loadManifest(filePath: string = "src/public/wap.json"): Promise<WAPManifest> {
  // Loads the WAP manifest from the local filesystem (Node.js environment)
  const fs = await import("fs/promises");
  const data = await fs.readFile(filePath, "utf8");
  const json = JSON.parse(data);
  validateWAPManifest(json);
  return json;
}

if (import.meta.main) {
  // If this file is executed directly, load the manifest and print it to the console.
  loadManifest()
    .then(manifest => {
      // Pretty-print the manifest
      console.log(JSON.stringify(manifest, null, 2));
    })
    .catch(error => {
      console.error("Error loading manifest:", error);
      process.exit(1);
    });
}
