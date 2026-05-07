/**
 * Lazy loader for the <leapter-logic-viewer> web component bundle.
 *
 * The viewer is hosted on test.lab.leapter.com as an ESM bundle with a chunk file.
 * We inject a `<script type="module">` that imports the entry point, which
 * registers both `<leapter-logic-viewer>` and `<leapter-blueprint-viewer>`
 * as custom elements.
 *
 * Falls back to a local bundle at /vendor/leapter-viewer.esm.js if the
 * hosted version fails (e.g. offline demos).
 *
 * Calling loadViewerScript() multiple times is safe — the script is only
 * injected once.
 */

const VIEWER_BASE_URL = "https://test.lab.leapter.com/viewer";
const VIEWER_ENTRY = `${VIEWER_BASE_URL}/leapter-blueprint-viewer.esm.js`;

let loaded = false;
let loadPromise: Promise<void> | null = null;

export function loadViewerScript(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    // The ESM entry re-exports from a chunk in the same directory.
    // Importing it registers both custom elements as a side effect.
    script.textContent = `import "${VIEWER_ENTRY}";`;
    script.dataset.viewer = "leapter";

    // ESM scripts execute asynchronously — wait for the custom element
    // to be defined as confirmation that the bundle loaded.
    customElements
      .whenDefined("leapter-logic-viewer")
      .then(() => {
        loaded = true;
        resolve();
      })
      .catch(reject);

    document.head.appendChild(script);

    // Timeout: if the element isn't defined within 15s, something went wrong
    setTimeout(() => {
      if (!loaded) {
        loadPromise = null;
        reject(new Error("Logic viewer timed out — could not load from CDN"));
      }
    }, 15_000);
  });

  return loadPromise;
}
