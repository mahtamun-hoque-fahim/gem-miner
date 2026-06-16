/**
 * Gem Miner — Preview Script
 *
 * Reads the generated export HTML from chrome.storage.session
 * (written by popup.js) and renders it in this tab.
 * The rendered page has a floating "Save as PDF" button and
 * optionally auto-triggers the print dialog.
 */

'use strict';

(function () {
  const _api = typeof browser !== 'undefined' ? browser : chrome;

  _api.storage.session.get(['gemMinerExport'], function (result) {
    if (_api.runtime.lastError) {
      showError('Storage error: ' + _api.runtime.lastError.message);
      return;
    }

    const html = result && result.gemMinerExport;

    if (!html) {
      showError(
        'No export data found.<br>Please go back to Gemini and try again via the Gem Miner popup.'
      );
      return;
    }

    // Clean up storage immediately
    _api.storage.session.remove(['gemMinerExport']);

    // Replace the entire document with the generated export
    document.open('text/html', 'replace');
    document.write(html);
    document.close();
  });

  function showError(msg) {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.innerHTML =
        '<p class="err">' + msg + '<br><br>' +
        '<a onclick="window.close()">Close this tab</a></p>';
    }
  }
})();
