// gtag_handler.module.js
// ES module for Google Analytics (gtag) initialization and export

/**
 * Module-level cache of the initialization promise.
 * @type {Promise<Function>|null}
 */
let initPromise = null;

/**
 * Initializes the Google Analytics gtag script and exports the gtag function.
 * @param {string} [id] - GA Measurement ID.
 * @returns {Promise<Function>} Resolves to the global gtag function.
 */
export function initGtag(id) {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    console.log("initGtag initModule: " + id);
    if (typeof window.gtag === "function") {
      console.log("initGtag gtag already initialized");
      return window.gtag;
    }

    // Inject the GA script
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    script.async = true;
    document.head.appendChild(script);

    // Wait for the script to load
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load gtag script"));
    });

    console.log("initGtag gtag loaded");

    // Setup dataLayer and gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args) => window.dataLayer.push(args);

    // Initialize gtag
    console.log("initGtag gtag initializing..");
    window.gtag("js", new Date());
    window.gtag("config", id);

    console.log("initGtag gtag initialized");
    return window.gtag;
  })();

  return initPromise;
}

/**
 * Wrapper for the global gtag function.
 * Throws if gtag is not initialized.
 * @param {...any} args - Arguments to pass to gtag.
 */
export function gtag(...args) {
  if (typeof window.gtag !== "function") {
    throw new Error("gtag has not been initialized. Call initGtag() first.");
  }
  return window.gtag(...args);
}
