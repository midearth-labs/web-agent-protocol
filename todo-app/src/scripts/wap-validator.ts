import { validateWAPManifest } from "../api-client/manifest.type.js";
import type { WAPManifest } from "../api-client/manifest.type.js";
import { manifestToGemini } from "../api-client/manifest.transform.js";
 

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
        // Transform the manifest to Gemini format
        const geminiManifest = manifestToGemini(manifest);
        // Pretty-print the Gemini manifest
        console.log(JSON.stringify(geminiManifest, null, 2));
      })
      .catch(error => {
        console.error("Error loading manifest:", error);
        process.exit(1);
      });
  }
  