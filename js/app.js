(function () {
  const realmEl = document.getElementById('realm');
  const passwordEl = document.getElementById('password');
  const togglePasswordEl = document.getElementById('togglePassword');
  const generateHashEl = document.getElementById('generateHash');
  const copyHashEl = document.getElementById('copyHash');
  const hashOutputEl = document.getElementById('hashOutput');

  let lastHash = '';

  function setOutput(text) {
    hashOutputEl.textContent = text;
  }

  function normalizeRealm(raw) {
    return (raw || '').trim();
  }

  function computeHash() {
    const realm = normalizeRealm(realmEl.value);
    const password = passwordEl.value || '';

    if (!realm) {
      lastHash = '';
      copyHashEl.disabled = true;
      setOutput('Enter a site / realm.');
      return;
    }

    if (!password) {
      lastHash = '';
      copyHashEl.disabled = true;
      setOutput('Enter a password.');
      return;
    }

    if (typeof SPH_HashedPassword !== 'function') {
      lastHash = '';
      copyHashEl.disabled = true;
      setOutput('Hash function not loaded. (SPH_HashedPassword missing)');
      return;
    }

    try {
      const hp = new SPH_HashedPassword(password, realm);
      const out = String(hp);
      lastHash = out;
      copyHashEl.disabled = !out;
      setOutput(out);
    } catch (e) {
      lastHash = '';
      copyHashEl.disabled = true;
      setOutput(`Error: ${e && e.message ? e.message : String(e)}`);
    }
  }

  async function copyHash() {
    if (!lastHash) return;

    try {
      await navigator.clipboard.writeText(lastHash);
      copyHashEl.textContent = 'Copied';
      setTimeout(() => (copyHashEl.textContent = 'Copy Hash'), 900);
    } catch (_) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = lastHash;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      copyHashEl.textContent = 'Copied';
      setTimeout(() => (copyHashEl.textContent = 'Copy Hash'), 900);
    }
  }

  function togglePassword() {
    const isHidden = passwordEl.type === 'password';
    passwordEl.type = isHidden ? 'text' : 'password';
    togglePasswordEl.textContent = isHidden ? '🙈' : '👁️';
  }

  // Events
  togglePasswordEl.addEventListener('click', (e) => {
    e.preventDefault();
    togglePassword();
  });

  generateHashEl.addEventListener('click', (e) => {
    e.preventDefault();
    computeHash();
  });

  copyHashEl.addEventListener('click', (e) => {
    e.preventDefault();
    copyHash();
  });

  realmEl.addEventListener('input', () => {
    copyHashEl.disabled = true;
    setOutput('Hash will appear here...');
  });

  passwordEl.addEventListener('input', () => {
    copyHashEl.disabled = true;
    setOutput('Hash will appear here...');
  });

  // PWA registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
