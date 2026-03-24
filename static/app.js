/* ──────────────────────────────────────────────
   Content Workflow Tool — Frontend Logic
────────────────────────────────────────────── */

/**
 * Collect form values, validate, POST to /generate, then render results.
 * Called by the "Generate Content" button's onclick handler.
 */
async function generateContent() {
  const fields = {
    product_name: document.getElementById("product_name").value.trim(),
    category:     document.getElementById("category").value.trim(),
    features:     document.getElementById("features").value.trim(),
    audience:     document.getElementById("audience").value.trim(),
    tone:         document.getElementById("tone").value.trim(),
    platform:     document.getElementById("platform").value,
  };

  // Client-side validation — all fields required
  const missing = Object.entries(fields)
    .filter(([, v]) => !v)
    .map(([k]) => k.replace("_", " "));

  if (missing.length) {
    showError(`Please fill in: ${missing.join(", ")}.`);
    return;
  }

  clearError();
  setLoading(true);

  try {
    const response = await fetch("/generate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(fields),
    });

    if (!response.ok) {
      // Try to surface the backend's error detail if available
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || `Server error ${response.status}`);
    }

    const data = await response.json();
    renderOutput(data);

  } catch (err) {
    // Collapse the output area if no real results are showing yet
    const cards = document.getElementById("output-cards");
    if (cards.classList.contains("hidden")) {
      document.getElementById("output-section").classList.add("hidden");
    }
    document.getElementById("output-skeleton").classList.add("hidden");
    showError(err.message);

  } finally {
    setLoading(false);
  }
}


/**
 * Populate each output card with the API response data.
 * Hides the skeleton and reveals the cards with a staggered animation.
 * @param {Object} data - The JSON response from /generate
 */
function renderOutput(data) {
  // ── Populate content ──────────────────────────────

  document.getElementById("out-description").textContent = data.description;

  // Headlines: numbered list items
  const headlinesList = document.getElementById("out-headlines");
  headlinesList.innerHTML = "";
  data.headlines.forEach((h) => {
    const li = document.createElement("li");
    li.textContent = h;
    headlinesList.appendChild(li);
  });

  // TikTok script: preserves newlines via <pre>
  document.getElementById("out-tiktok").textContent = data.tiktok_script;

  // CTA
  document.getElementById("out-cta").textContent = data.cta;

  // Hashtags: individual pill elements
  const hashtagEl = document.getElementById("out-hashtags");
  hashtagEl.innerHTML = "";
  data.hashtags.forEach((tag) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = tag;
    hashtagEl.appendChild(span);
  });

  // ── Switch skeleton → real cards ─────────────────

  document.getElementById("output-skeleton").classList.add("hidden");
  document.getElementById("results-header").classList.remove("hidden");

  const cardWrapper = document.getElementById("output-cards");
  cardWrapper.classList.remove("hidden");

  // Staggered reveal animation for each card
  Array.from(cardWrapper.querySelectorAll(".out-card")).forEach((card, i) => {
    card.classList.remove("reveal");
    void card.offsetWidth; // force reflow so the animation re-triggers
    card.style.animationDelay = `${i * 55}ms`;
    card.classList.add("reveal");
  });

  // Scroll to the output section
  document.getElementById("output-section")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}


/**
 * Toggle the loading state on the generate button and show/hide skeleton.
 * @param {boolean} isLoading
 */
function setLoading(isLoading) {
  const btn     = document.getElementById("generate-btn");
  const label   = document.getElementById("btn-label");
  const spinner = document.getElementById("btn-spinner");

  btn.disabled = isLoading;
  label.textContent = isLoading ? "Generating…" : "Generate Content";
  spinner.classList.toggle("hidden", !isLoading);

  if (isLoading) {
    // Immediately show output area with skeleton placeholders
    document.getElementById("output-section").classList.remove("hidden");
    document.getElementById("output-skeleton").classList.remove("hidden");
    document.getElementById("output-cards").classList.add("hidden");
    document.getElementById("results-header").classList.add("hidden");
  }
}


/**
 * Copy the content of a specific output element to the clipboard.
 * Passes the triggering button for visual feedback.
 * @param {string} elementId - ID of the element to copy text from
 * @param {HTMLElement} btn  - The button that was clicked
 */
function copyBlock(elementId, btn) {
  const el = document.getElementById(elementId);
  if (!el) return;

  let text;

  if (el.tagName === "OL") {
    // Extract ordered list as numbered plain text
    text = Array.from(el.querySelectorAll("li"))
      .map((li, i) => `${i + 1}. ${li.textContent}`)
      .join("\n");

  } else if (el.classList.contains("hashtag-body")) {
    // Extract hashtag pill text
    text = Array.from(el.querySelectorAll(".tag"))
      .map((t) => t.textContent)
      .join("  ");

  } else {
    text = el.textContent;
  }

  copyToClipboard(text, btn);
}


/**
 * Copy all generated content to the clipboard as a single formatted block.
 * @param {HTMLElement} btn - The "Copy All" button
 */
function copyAll(btn) {
  const description = document.getElementById("out-description").textContent;

  const headlines = Array.from(
    document.getElementById("out-headlines").querySelectorAll("li")
  ).map((li, i) => `${i + 1}. ${li.textContent}`).join("\n");

  const script   = document.getElementById("out-tiktok").textContent;
  const cta      = document.getElementById("out-cta").textContent;
  const hashtags = Array.from(
    document.getElementById("out-hashtags").querySelectorAll(".tag")
  ).map((t) => t.textContent).join("  ");

  const full = [
    "=== Product Description ===",
    description,
    "",
    "=== Ad Headlines ===",
    headlines,
    "",
    "=== TikTok Script ===",
    script,
    "",
    "=== Call to Action ===",
    cta,
    "",
    "=== Hashtags ===",
    hashtags,
  ].join("\n");

  copyToClipboard(full, btn);
}


/**
 * Write text to the clipboard, then briefly change the button label to confirm.
 * @param {string}      text - Text to copy
 * @param {HTMLElement} btn  - Button to flash
 */
function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove("copied");
    }, 1600);
  });
}


// ── Inline error helpers ────────────────────────────

function showError(msg) {
  const el = document.getElementById("error-msg");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function clearError() {
  const el = document.getElementById("error-msg");
  el.textContent = "";
  el.classList.add("hidden");
}
