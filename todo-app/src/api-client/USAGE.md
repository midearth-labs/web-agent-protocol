## Runtime usage example

```ts
import { fetchManifest, toProviderTools } from "./index.js";

async function setupForGemini() {
  const manifest = await fetchManifest("/wap.json");
  const bundle = toProviderTools(manifest);
  // bundle.tools.functionDeclarations → Gemini tools
  // bundle.examples → Few-shot examples
  return bundle;
}

```


