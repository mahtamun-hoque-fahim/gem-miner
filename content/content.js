/**
 * Gem Miner — Content Script
 * Extracts Gemini conversation turns from the live DOM.
 *
 * Gemini uses Angular + Web Components. The main elements are:
 *   user-query          → wraps the user's turn
 *   model-response      → wraps the model's turn
 *   message-content     → inner container for model text
 *   .markdown           → rendered markdown root
 */

(function () {
  'use strict';

  // Guard: only install once per page load
  if (window.__gemMinerLoaded) return;
  window.__gemMinerLoaded = true;

  const _api = typeof browser !== 'undefined' ? browser : chrome;

  _api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action !== 'extractChat') return;
    try {
      const data = extractConversation();
      sendResponse({ success: true, data });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true; // keep the channel open for async sendResponse
  });

  /* ── main extractor ─────────────────────────────────────── */

  function extractConversation() {
    const messages = [];

    // Strategy 1 — Web Components (current Gemini DOM)
    const turns = document.querySelectorAll('user-query, model-response');
    if (turns.length) {
      turns.forEach(el => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'user-query') {
          const c = extractUser(el);
          if (c) messages.push({ role: 'user', ...c });
        } else if (tag === 'model-response') {
          const c = extractModel(el);
          if (c) messages.push({ role: 'model', ...c });
        }
      });
    }

    // Strategy 2 — data-message-author-role attribute (fallback)
    if (!messages.length) {
      document.querySelectorAll('[data-message-author-role]').forEach(el => {
        const role = el.getAttribute('data-message-author-role');
        const text = el.textContent.trim();
        if (!text) return;
        messages.push({
          role: role === 'user' ? 'user' : 'model',
          html: sanitize(el.innerHTML),
          text,
        });
      });
    }

    // Strategy 3 — last resort: grab any large text blocks in conversation area
    if (!messages.length) {
      const container =
        document.querySelector('conversation-container') ||
        document.querySelector('infinite-scroller') ||
        document.querySelector('[class*="conversation"]');

      if (container) {
        container.querySelectorAll('p, .markdown').forEach((el, i) => {
          const text = el.textContent.trim();
          if (text.length < 10) return;
          messages.push({
            role: i % 2 === 0 ? 'user' : 'model',
            html: sanitize(el.innerHTML),
            text,
          });
        });
      }
    }

    return {
      title:      getTitle(),
      url:        location.href,
      exportedAt: new Date().toISOString(),
      messages,
    };
  }

  /* ── per-role extractors ────────────────────────────────── */

  function extractUser(el) {
    const selectors = [
      '.query-text',
      '.query-content',
      '[class*="query-text"]',
      '[class*="query_text"]',
    ];
    let found = null;
    for (const s of selectors) {
      found = el.querySelector(s);
      if (found && found.textContent.trim()) break;
    }
    if (!found) found = el;

    const clone = found.cloneNode(true);
    purge(clone);
    const text = found.textContent.trim();
    if (!text) return null;
    return { html: clone.innerHTML.trim(), text };
  }

  function extractModel(el) {
    // Remove thinking blocks first (Gemini 2.5 reasoning sections)
    const work = el.cloneNode(true);
    work.querySelectorAll(
      'thinking-block, [class*="thinking"], [class*="thoughts"], ' +
      '[class*="reasoning"], [aria-label*="hinking"]'
    ).forEach(n => n.remove());

    const selectors = [
      '.markdown.markdown-main-panel',
      '.markdown',
      'message-content .response-container-content',
      'message-content',
      '.response-container',
      '[class*="model-response-text"]',
    ];
    let found = null;
    for (const s of selectors) {
      found = work.querySelector(s);
      if (found && found.textContent.trim()) break;
    }
    if (!found) found = work;

    const clone = found.cloneNode(true);
    purge(clone);
    cleanCodeBlocks(clone);

    const text = found.textContent.trim();
    if (!text) return null;
    return { html: clone.innerHTML.trim(), text };
  }

  /* ── DOM helpers ────────────────────────────────────────── */

  /**
   * Remove interactive/decorative chrome elements (copy buttons,
   * thumbs, tooltips) and strip non-semantic attributes.
   */
  function purge(root) {
    const remove = [
      'button',
      '[role="button"]',
      '[class*="copy"]',
      '[class*="action-bar"]',
      '[class*="feedback"]',
      '[class*="thumbs"]',
      '[class*="tooltip"]',
      '[class*="vote"]',
      '[class*="regenerate"]',
      'mat-icon',
      '.tooltip',
    ];
    root.querySelectorAll(remove.join(',')).forEach(n => n.remove());

    // Strip everything except semantic attributes
    const keep = new Set(['href', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan']);
    root.querySelectorAll('*').forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (!keep.has(attr.name)) el.removeAttribute(attr.name);
      });
    });
  }

  /** Remove language-label overlays that Gemini puts above code blocks. */
  function cleanCodeBlocks(root) {
    root.querySelectorAll('pre').forEach(pre => {
      // Any sibling header divs above the <pre> (language label, copy button container)
      pre.querySelectorAll(
        '[class*="lang"], [class*="language-label"], [class*="header"]'
      ).forEach(n => n.remove());
    });
  }

  function sanitize(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    purge(tmp);
    return tmp.innerHTML;
  }

  function getTitle() {
    // Gemini puts the conversation title in <h1> or the page <title>
    const h1 = document.querySelector('h1');
    if (h1 && h1.textContent.trim() && h1.textContent.trim() !== 'Gemini') {
      return h1.textContent.trim();
    }
    return document.title.replace(/ ?[-|] ?Gemini/i, '').trim() || 'Gemini Chat';
  }
})();
