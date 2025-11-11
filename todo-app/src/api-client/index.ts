/**
 * API Client exports
 */

export { ApiClient, type ApiClientConfig } from "./api-client.js";
export {
  manifestToGemini,
  toProviderTools,
  buildFewShots,
  type FewShotExample,
  type GeminiToolsBundle,
  type ProviderBundle
} from "./manifest.transform.js";
export { fetchManifest } from "./manifest.loader.js";

