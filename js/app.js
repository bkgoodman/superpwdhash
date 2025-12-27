(function () {
  // DOM elements
  const passwordEl = document.getElementById('password');
  const togglePasswordEl = document.getElementById('togglePassword');
  const newHostEl = document.getElementById('newHost');
  const addHostEl = document.getElementById('addHost');
  const hostListEl = document.getElementById('hostList');
  const emptyMessageEl = document.getElementById('emptyMessage');
  const modalOverlayEl = document.getElementById('modalOverlay');
  const modalTitleEl = document.getElementById('modalTitle');
  const modalCloseEl = document.getElementById('modalClose');
  const hashOutputEl = document.getElementById('hashOutput');
  const copyHashEl = document.getElementById('copyHash');

  const STORAGE_KEY = 'superpwdhash_hosts';
  let hosts = [];
  let currentHash = '';

  // --- Storage ---
  function loadHosts() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      hosts = data ? JSON.parse(data) : [];
    } catch (_) {
      hosts = [];
    }
  }

  function saveHosts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hosts));
  }

  // --- Render host list ---
  function renderHosts() {
    // Clear existing items (except empty message)
    hostListEl.querySelectorAll('.host-item').forEach(el => el.remove());

    if (hosts.length === 0) {
      emptyMessageEl.style.display = 'block';
      return;
    }

    emptyMessageEl.style.display = 'none';

    hosts.forEach((host, index) => {
      const item = document.createElement('div');
      item.className = 'host-item';
      item.innerHTML = `
        <span class="host-name">${escapeHtml(host)}</span>
        <button class="delete-btn" data-index="${index}" title="Delete">🗑️</button>
      `;
      // Click on host name -> show hash
      item.querySelector('.host-name').addEventListener('click', () => showHashForHost(host));
      // Click delete
      item.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHost(index);
      });
      hostListEl.appendChild(item);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Add / Delete hosts ---
  function addHost() {
    const raw = (newHostEl.value || '').trim();
    if (!raw) return;

    // Normalize: extract hostname if URL pasted
    let host = raw;
    try {
      const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
      host = url.hostname;
    } catch (_) {
      host = raw;
    }

    // Avoid duplicates
    if (!hosts.includes(host)) {
      hosts.push(host);
      hosts.sort((a, b) => a.localeCompare(b));
      saveHosts();
      renderHosts();
    }

    newHostEl.value = '';
  }

  function deleteHost(index) {
    hosts.splice(index, 1);
    saveHosts();
    renderHosts();
  }

  // --- Modal ---
  function openModal() {
    modalOverlayEl.classList.add('active');
  }

  function closeModal() {
    modalOverlayEl.classList.remove('active');
    currentHash = '';
  }

  function showHashForHost(host) {
    const password = passwordEl.value || '';

    if (!password) {
      alert('Please enter your master password first.');
      passwordEl.focus();
      return;
    }

    if (typeof SPH_HashedPassword !== 'function') {
      alert('Hash function not loaded.');
      return;
    }

    try {
      const hp = new SPH_HashedPassword(password, host);
      currentHash = String(hp);
      modalTitleEl.textContent = host;
      hashOutputEl.textContent = currentHash;
      openModal();
    } catch (e) {
      alert('Error generating hash: ' + (e.message || e));
    }
  }

  // --- Copy ---
  async function copyHash() {
    if (!currentHash) return;

    try {
      await navigator.clipboard.writeText(currentHash);
      copyHashEl.textContent = 'Copied!';
      setTimeout(() => (copyHashEl.textContent = 'Copy'), 900);
    } catch (_) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = currentHash;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      copyHashEl.textContent = 'Copied!';
      setTimeout(() => (copyHashEl.textContent = 'Copy'), 900);
    }
  }

  // --- Toggle password visibility ---
  function togglePassword() {
    const isHidden = passwordEl.type === 'password';
    passwordEl.type = isHidden ? 'text' : 'password';
    togglePasswordEl.textContent = isHidden ? '🙈' : '👁️';
  }

  // --- Events ---
  togglePasswordEl.addEventListener('click', (e) => {
    e.preventDefault();
    togglePassword();
  });

  addHostEl.addEventListener('click', (e) => {
    e.preventDefault();
    addHost();
  });

  newHostEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addHost();
    }
  });

  copyHashEl.addEventListener('click', (e) => {
    e.preventDefault();
    copyHash();
  });

  modalCloseEl.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
  });

  modalOverlayEl.addEventListener('click', (e) => {
    if (e.target === modalOverlayEl) closeModal();
  });

  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlayEl.classList.contains('active')) {
      closeModal();
    }
  });

  // --- Init ---
  loadHosts();
  renderHosts();

  // PWA registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
