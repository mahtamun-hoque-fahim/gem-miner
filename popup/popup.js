/**
 * Gem Miner — Popup Script
 *
 * Flow:
 *   1. Check active tab is gemini.google.com
 *   2. (Re-)inject content.js then request chat data
 *   3. Update summary UI
 *   4. On Export: build HTML → store in session storage → open preview tab
 */

'use strict';

const _api = typeof browser !== 'undefined' ? browser : chrome;

let chatData     = null;
let activeTabId  = null;
let selectedTheme = 'light';

/* ── Boot ────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  setupThemePicker();
  document.getElementById('btn-export').addEventListener('click', doExport);
  boot();
});

async function boot() {
  show('state-scanning');

  const [tab] = await _api.tabs.query({ active: true, currentWindow: true });
  activeTabId  = tab?.id;

  if (!tab?.url?.startsWith('https://gemini.google.com')) {
    show('state-not-gemini');
    return;
  }

  try {
    // Inject content script (safe to call even if already injected — guard inside)
    await _api.scripting.executeScript({
      target: { tabId: activeTabId },
      files:  ['content/content.js'],
    }).catch(() => {}); // tolerate "already injected" error

    const resp = await msgTab(activeTabId, { action: 'extractChat' });

    if (!resp?.success) throw new Error(resp?.error || 'No response from page');

    chatData = resp.data;

    if (!chatData.messages?.length) {
      show('state-empty');
      return;
    }

    // Populate UI
    document.getElementById('msg-count').textContent  = chatData.messages.length;
    document.getElementById('chat-title').textContent = chatData.title || 'Gemini Chat';
    document.getElementById('input-title').value      = chatData.title || 'Gemini Chat';

    document.getElementById('btn-export').disabled = false;
    show('panel-export');
    setStatus(`${chatData.messages.length} messages ready`);

  } catch (err) {
    show('state-not-gemini');
    console.error('[GemMiner]', err);
  }
}

/* ── Export ──────────────────────────────────────────────── */

async function doExport() {
  if (!chatData) return;

  const title      = document.getElementById('input-title').value.trim() || 'Gemini Chat Export';
  const includeMeta = document.getElementById('chk-meta').checked;
  const autoPrint  = document.getElementById('chk-autoprint').checked;

  setStatus('Building export…');
  document.getElementById('btn-export').disabled = true;

  try {
    const html = buildHTML(chatData, { title, includeMeta, autoPrint, theme: selectedTheme });

    // Store in session storage so the preview page can retrieve it
    await _api.storage.session.set({ gemMinerExport: html });

    // Open preview tab (extension page — no cross-origin issues)
    await _api.tabs.create({ url: _api.runtime.getURL('preview/preview.html') });

    setStatus('Export opened — save as PDF via print dialog.', 'ok');
  } catch (err) {
    setStatus('Export failed: ' + err.message, 'err');
    console.error('[GemMiner]', err);
  }

  document.getElementById('btn-export').disabled = false;
}

/* ── HTML builder ────────────────────────────────────────── */

function buildHTML(data, { title, includeMeta, autoPrint, theme }) {
  const light = theme === 'light';

  const C = light ? {
    bg:        '#ffffff',
    surface:   '#f7f8f7',
    border:    '#e2e5e2',
    text:      '#111411',
    textDim:   '#6b7a6b',
    userBg:    '#f2f4f2',
    modelBg:   '#ffffff',
    userLabel: '#555',
    modelLabel:'#1a7a4a',
    accent:    '#1a7a4a',
    codeBg:    '#f4f5f4',
    codeText:  '#1a1a1a',
    accentLine:'#3DF49A',
  } : {
    bg:        '#070807',
    surface:   '#111311',
    border:    '#252825',
    text:      '#e2e8e2',
    textDim:   '#6b7a6b',
    userBg:    '#131513',
    modelBg:   '#0e100e',
    userLabel: '#888',
    modelLabel:'#3DF49A',
    accent:    '#3DF49A',
    codeBg:    '#181a18',
    codeText:  '#d4e8d4',
    accentLine:'#3DF49A',
  };

  const ts = new Date(data.exportedAt).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const msgs = data.messages.map(m => {
    const isUser = m.role === 'user';
    const roleIcon = isUser ? iconUser(C.userLabel) : iconGemini(C.modelLabel);
    const roleLabel = isUser ? 'You' : 'Gemini';
    const content = m.html || esc(m.text);
    return `<div class="msg ${isUser ? 'user' : 'model'}">
      <div class="msg-role">${roleIcon}<span>${roleLabel}</span></div>
      <div class="msg-body">${content}</div>
    </div>`;
  }).join('\n');

  const metaBlock = includeMeta ? `
  <footer class="meta">
    <span>Exported by Gem Miner</span>
    <span>${ts}</span>
    <span class="meta-url">${esc(data.url)}</span>
  </footer>` : '';

  const printScript = autoPrint
    ? `<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},900);});<\/script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

@page{margin:18mm 22mm;size:A4}

body{
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  font-size:10.5pt;
  line-height:1.75;
  color:${C.text};
  background:${C.bg};
  padding:28pt 34pt 32pt;
  max-width:820px;
  margin:0 auto;
}

/* Header */
.doc-header{
  display:flex;
  justify-content:space-between;
  align-items:flex-end;
  padding-bottom:13pt;
  border-bottom:2.5pt solid ${C.accentLine};
  margin-bottom:28pt;
}
.doc-title{font-size:17pt;font-weight:700;letter-spacing:-0.02em;color:${C.text};margin-bottom:3pt}
.doc-sub{font-size:8.5pt;color:${C.textDim}}
.doc-brand{font-size:8.5pt;color:${C.textDim};text-align:right}
.doc-brand strong{color:${C.accent};display:block;font-weight:700;font-size:9pt}

/* Messages */
.msg{margin-bottom:20pt;page-break-inside:avoid}
.msg-role{
  display:flex;align-items:center;gap:5pt;
  font-size:8pt;font-weight:700;
  letter-spacing:0.07em;text-transform:uppercase;
  margin-bottom:7pt;
}
.msg.user  .msg-role{color:${C.userLabel}}
.msg.model .msg-role{color:${C.modelLabel}}
.msg-body{
  padding:11pt 13pt;
  border-radius:7pt;
  font-size:10pt;
  line-height:1.78;
  border:1pt solid ${C.border};
}
.msg.user  .msg-body{background:${C.userBg}}
.msg.model .msg-body{background:${C.modelBg}}

/* Typography inside messages */
.msg-body p{margin-bottom:7pt}
.msg-body p:last-child{margin-bottom:0}
.msg-body h1,.msg-body h2,.msg-body h3,.msg-body h4{
  margin-top:11pt;margin-bottom:5pt;font-weight:700;line-height:1.3;color:${C.text}
}
.msg-body h1{font-size:14pt}
.msg-body h2{font-size:13pt}
.msg-body h3{font-size:11.5pt}
.msg-body h4{font-size:10.5pt}
.msg-body ul,.msg-body ol{padding-left:17pt;margin-bottom:7pt}
.msg-body li{margin-bottom:3pt}
.msg-body strong,.msg-body b{font-weight:700;color:${C.text}}
.msg-body em,.msg-body i{font-style:italic}
.msg-body a{color:${C.accent};text-decoration:underline}
.msg-body hr{border:none;border-top:1pt solid ${C.border};margin:10pt 0}
.msg-body blockquote{
  border-left:3pt solid ${C.accent};
  padding-left:11pt;margin:7pt 0;color:${C.textDim}
}

/* Code */
.msg-body pre{
  background:${C.codeBg};
  border:1pt solid ${C.border};
  border-radius:5pt;
  padding:9pt 11pt;
  font-family:'JetBrains Mono','Courier New',monospace;
  font-size:8.5pt;
  line-height:1.65;
  margin:7pt 0;
  color:${C.codeText};
  white-space:pre-wrap;
  word-break:break-all;
}
.msg-body code{
  font-family:'JetBrains Mono','Courier New',monospace;
  font-size:8.5pt;
  background:${C.codeBg};
  color:${C.codeText};
  padding:1pt 4pt;
  border-radius:3pt;
}
.msg-body pre code{background:none;padding:0;border-radius:0;font-size:8.5pt}

/* Tables */
.msg-body table{width:100%;border-collapse:collapse;margin:7pt 0;font-size:9pt}
.msg-body th,.msg-body td{border:1pt solid ${C.border};padding:5pt 8pt;text-align:left}
.msg-body th{background:${C.surface};font-weight:700}

/* Footer meta */
.meta{
  margin-top:24pt;
  padding-top:11pt;
  border-top:1pt solid ${C.border};
  font-size:7.5pt;
  color:${C.textDim};
  display:flex;
  justify-content:space-between;
  flex-wrap:wrap;
  gap:4pt;
}
.meta-url{font-size:6.5pt;word-break:break-all}

/* Floating print button (screen only) */
.fab{
  position:fixed;bottom:20px;right:20px;
  background:${C.accentLine};color:#040604;
  border:none;border-radius:8px;
  padding:10px 20px;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  font-size:13px;font-weight:700;
  cursor:pointer;
  box-shadow:0 4px 18px rgba(61,244,154,0.28);
  display:flex;align-items:center;gap:7px;
  transition:background 0.15s;
}
.fab:hover{background:#5bfaad}

@media print{
  body{padding:0;background:${C.bg}}
  .fab{display:none!important}
  .msg{page-break-inside:avoid}
  .msg-body pre{white-space:pre-wrap}
}
</style>
</head>
<body>

<div class="doc-header">
  <div>
    <div class="doc-title">${esc(title)}</div>
    <div class="doc-sub">${ts} &middot; ${data.messages.length} messages</div>
  </div>
  <div class="doc-brand">
    <strong>Gem Miner</strong>
    gemini.google.com
  </div>
</div>

<div class="messages">
${msgs}
</div>

${metaBlock}

<button class="fab" onclick="window.print()">
  ${printIconSVG()}
  Save as PDF
</button>

${printScript}
</body>
</html>`;
}

/* ── SVG icons (inline, no emoji) ────────────────────────── */

function iconUser(color) {
  return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" stroke="${color}" stroke-width="2"/>
    <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

function iconGemini(color) {
  return `<svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M12 3L4.5 8.5L12 14L19.5 8.5L12 3Z" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M7 11.5L12 21L17 11.5" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/>
  </svg>`;
}

function printIconSVG() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <polyline points="6 9 6 2 18 2 18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="6" y="14" width="12" height="8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  </svg>`;
}

/* ── Utilities ───────────────────────────────────────────── */

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function msgTab(tabId, message) {
  return new Promise((resolve, reject) => {
    _api.tabs.sendMessage(tabId, message, resp => {
      if (_api.runtime.lastError) reject(new Error(_api.runtime.lastError.message));
      else resolve(resp);
    });
  });
}

function setStatus(text, cls = '') {
  const el = document.getElementById('status');
  el.textContent = text;
  el.className   = 'status ' + cls;
}

function show(id) {
  const ids = ['state-not-gemini','state-scanning','state-empty','panel-export'];
  ids.forEach(i => {
    const el = document.getElementById(i);
    if (el) el.classList.toggle('hidden', i !== id);
  });
}

function setupThemePicker() {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTheme = btn.dataset.theme;
    });
  });
}
