// Storage `site:<hostname>` = 'on' | 'off'. local: remembered (applies while OS theme is dark).
// session: choice made this browser session (always applies).
const PREFIX = 'site:';
const SCRIPT_ID = 'darkit-on';

const keyOf = (url) => PREFIX + new URL(url).hostname;

let pending = Promise.resolve();
// Serialized: concurrent choices must not interleave unregister/register.
const syncRegistration = () => (pending = pending.then(register, register));

// on.js at document_start for remembered 'on' hosts: no white flash.
async function register() {
  const all = await chrome.storage.local.get(null);
  const matches = Object.entries(all)
    .filter(([k, v]) => k.startsWith(PREFIX) && v === 'on')
    .map(([k]) => `*://${k.slice(PREFIX.length)}/*`);
  await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] }).catch(() => {});
  if (matches.length) {
    await chrome.scripting.registerContentScripts([{ id: SCRIPT_ID, js: ['on.js'], matches, runAt: 'document_start' }]);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create(
    { id: 'forget', title: 'Forget choice for this site', contexts: ['action'] },
    () => chrome.runtime.lastError, // already exists: ignore
  );
  syncRegistration();
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!sender.tab || !sender.url) return;
  const k = keyOf(sender.url);
  if (msg.type === 'state') {
    Promise.all([chrome.storage.session.get(k), chrome.storage.local.get(k)]).then(([s, l]) =>
      reply({ session: s[k], local: l[k] }),
    );
    return true; // async reply
  }
  if (msg.type === 'choose') choose(k, msg.on, msg.remember);
});

async function choose(k, on, remember) {
  const value = on ? 'on' : 'off';
  if (!remember) return chrome.storage.session.set({ [k]: value });
  // Drop the session override so the OS-theme rule governs again.
  await chrome.storage.session.remove(k);
  await chrome.storage.local.set({ [k]: value });
  await syncRegistration();
}

// Icon click: toggle now, saved as session choice.
async function toggleTab(tab) {
  if (tab.id === undefined || !tab.url) return;
  try {
    // Tabs opened before install lack the content script.
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['dark.css'] });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        document.querySelector('darkit-prompt')?.remove();
        // Same isolated world as detect.js; pre-install tabs fall back to the filter.
        if (typeof setDark !== 'function') return document.documentElement.toggleAttribute('data-darkit');
        const on = !isDark();
        setDark(on);
        return on;
      },
    });
    await chrome.storage.session.set({ [keyOf(tab.url)]: result ? 'on' : 'off' });
  } catch {
    // chrome://, edge://, store pages block injection
  }
}
chrome.action.onClicked.addListener(toggleTab);

// Icon menu > Forget: site is asked again.
chrome.contextMenus.onClicked.addListener(async (_info, tab) => {
  if (!tab?.url) return;
  const k = keyOf(tab.url);
  await Promise.all([chrome.storage.local.remove(k), chrome.storage.session.remove(k)]);
  await syncRegistration();
});
