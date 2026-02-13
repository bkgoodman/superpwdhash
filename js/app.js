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

  // WebAuthn elements
  const webauthnEnabledEl = document.getElementById('webauthnEnabled');
  const webauthnControlsEl = document.getElementById('webauthnControls');
  const webauthnStatusEl = document.getElementById('webauthnStatus');
  const statusIndicatorEl = document.getElementById('statusIndicator');
  const statusTextEl = document.getElementById('statusText');
  const webauthnEnrollEl = document.getElementById('webauthnEnroll');
  const webauthnUnlockEl = document.getElementById('webauthnUnlock');
  const webauthnResetEl = document.getElementById('webauthnReset');

  const STORAGE_KEY = 'superpwdhash_hosts';
  const WEBAUTHN_KEY = 'superpwdhash_webauthn';
  let hosts = [];
  let currentHash = '';
  let webauthnData = null;

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

  function saveWebAuthnData(data) {
    localStorage.setItem(WEBAUTHN_KEY, JSON.stringify(data));
    webauthnData = data;
  }

  function loadWebAuthnData() {
    try {
      const data = localStorage.getItem(WEBAUTHN_KEY);
      webauthnData = data ? JSON.parse(data) : null;
    } catch (_) {
      webauthnData = null;
    }
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

  // --- WebAuthn Functions ---
  async function generateRandomSeed() {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  async function encryptPassword(password, key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return {
      encrypted: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv)
    };
  }

  async function decryptPassword(encryptedData, key) {
    const encrypted = new Uint8Array(encryptedData.encrypted);
    const iv = new Uint8Array(encryptedData.iv);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  async function deriveKeyFromPRF(credential, seed) {
    if (!credential.getClientExtensionResults || !credential.getClientExtensionResults().prf) {
      throw new Error('PRF not supported');
    }
    
    const prfResults = credential.getClientExtensionResults().prf;
    if (!prfResults.results || !prfResults.results.first) {
      throw new Error('PRF results not available');
    }
    
    const prfOutput = new Uint8Array(prfResults.results.first);
    return await crypto.subtle.importKey(
      'raw',
      prfOutput,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function enrollWebAuthn() {
    const password = passwordEl.value || '';
    if (!password) {
      alert('Please enter your master password first.');
      passwordEl.focus();
      return;
    }

    // Check WebAuthn support
    if (!window.navigator || !window.navigator.credentials || !window.navigator.credentials.create) {
      alert('WebAuthn is not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge that supports WebAuthn PRF.');
      return;
    }

    // Check PRF support
    if (!window.PublicKeyCredential || !window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      alert('Your browser does not support platform authenticators. Please ensure you have a device with biometric capabilities (fingerprint, face ID, etc.).');
      return;
    }

    try {
      const isSupported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isSupported) {
        alert('No platform authenticator (biometric) available on this device. This feature requires fingerprint, face ID, or similar biometric capabilities.');
        return;
      }

      // Check if PRF extension is supported
      const testCredential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'Test', id: window.location.hostname },
          user: { id: new Uint8Array(16), name: 'test', displayName: 'Test' },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
          extensions: { prf: { eval: { first: new Uint8Array(32) } } }
        }
      }).catch(() => null);

      const hasPRFSupport = testCredential && 
                           testCredential.getClientExtensionResults && 
                           testCredential.getClientExtensionResults().prf;

      if (!hasPRFSupport) {
        alert('WebAuthn PRF (Pseudo-Random Function) is not supported on this platform/browser. This feature is currently available on:\n\n• iOS Safari with Face ID/Touch ID\n• Android Chrome with fingerprint/face unlock\n• Some modern laptops with Windows Hello\n\nYou can continue using manual password entry, which works perfectly on all devices.');
        return;
      }
      const seed = await generateRandomSeed();
      
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      
      const credentialCreationOptions = {
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'SuperPWDHash',
            id: window.location.hostname
          },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: 'superpwdhash-user',
            displayName: 'SuperPWDHash User'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          extensions: {
            prf: {
              eval: {
                first: seed
              }
            }
          }
        }
      };

      const credential = await navigator.credentials.create(credentialCreationOptions);
      
      if (!credential) {
        throw new Error('Credential creation failed');
      }

      const key = await deriveKeyFromPRF(credential, seed);
      const encryptedPassword = await encryptPassword(password, key);

      const webauthnInfo = {
        credentialId: Array.from(new Uint8Array(credential.rawId)),
        encryptedPassword: encryptedPassword,
        prfSeed: Array.from(seed),
        enrolled: true
      };

      saveWebAuthnData(webauthnInfo);
      updateWebAuthnUI();
      
      alert('Biometric setup successful! Your master password is now stored securely.');
    } catch (error) {
      console.error('WebAuthn enrollment failed:', error);
      alert('Setup failed: ' + (error.message || 'Unknown error'));
    }
  }

  async function unlockWithWebAuthn() {
    if (!webauthnData || !webauthnData.enrolled) {
      alert('No biometric credentials found. Please set up biometrics first.');
      return;
    }

    // Check WebAuthn support
    if (!window.navigator || !window.navigator.credentials || !window.navigator.credentials.get) {
      alert('WebAuthn is not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge that supports WebAuthn PRF.');
      return;
    }

    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      
      const credentialRequestOptions = {
        publicKey: {
          challenge: challenge,
          allowCredentials: [{
            type: 'public-key',
            id: new Uint8Array(webauthnData.credentialId)
          }],
          userVerification: 'required',
          extensions: {
            prf: {
              eval: {
                first: new Uint8Array(webauthnData.prfSeed)
              }
            }
          }
        }
      };

      const credential = await navigator.credentials.get(credentialRequestOptions);
      
      if (!credential) {
        throw new Error('Authentication failed');
      }

      const key = await deriveKeyFromPRF(credential, webauthnData.prfSeed);
      const password = await decryptPassword(webauthnData.encryptedPassword, key);
      
      passwordEl.value = password;
      updateWebAuthnUI();
      
      // Brief visual feedback
      passwordEl.style.backgroundColor = '#e8f5e8';
      setTimeout(() => {
        passwordEl.style.backgroundColor = '';
      }, 1000);
      
    } catch (error) {
      console.error('WebAuthn unlock failed:', error);
      alert('Unlock failed: ' + (error.message || 'Authentication failed'));
    }
  }

  function resetWebAuthn() {
    if (confirm('Are you sure you want to reset biometric credentials? Your stored master password will be removed.')) {
      localStorage.removeItem(WEBAUTHN_KEY);
      webauthnData = null;
      updateWebAuthnUI();
      alert('Biometric credentials reset successfully.');
    }
  }

  function updateWebAuthnUI() {
    // Ensure elements exist before trying to use them
    if (!webauthnEnabledEl || !webauthnControlsEl) {
      console.log('WebAuthn elements not found');
      return;
    }

    // Check if WebAuthn is supported at all
    const hasNavigator = !!window.navigator;
    const hasCredentials = hasNavigator && !!window.navigator.credentials;
    const hasCreate = hasCredentials && !!window.navigator.credentials.create;
    const hasGet = hasCredentials && !!window.navigator.credentials.get;
    const hasPublicKeyCredential = !!window.PublicKeyCredential;
    
    const webAuthnSupported = hasNavigator && hasCredentials && hasCreate && hasGet && hasPublicKeyCredential;

    console.log('WebAuthn support detection:', {
      hasNavigator,
      hasCredentials,
      hasCreate,
      hasGet,
      hasPublicKeyCredential,
      webAuthnSupported
    });

    if (!webAuthnSupported) {
      // Hide the entire WebAuthn section if not supported
      webauthnControlsEl.style.display = 'none';
      webauthnEnabledEl.disabled = true;
      webauthnEnabledEl.checked = false;
      
      // Add helpful message about requirements
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isHttps = window.location.protocol === 'https:';
      const isFile = window.location.protocol === 'file:';
      
      let reason = '';
      if (isFile) {
        reason = 'WebAuthn requires HTTPS or localhost. Opening the file directly (file://) is not supported.';
      } else if (!isHttps && !isLocalhost) {
        reason = 'WebAuthn requires HTTPS or localhost. Current connection is not secure.';
      } else if (!hasPublicKeyCredential) {
        reason = 'WebAuthn is not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.';
      } else {
        reason = 'WebAuthn is not available in this environment.';
      }
      
      console.log('WebAuthn not supported:', reason);
      return;
    }

    console.log('WebAuthn supported, enabling toggle');
    webauthnEnabledEl.disabled = false;

    // If we have stored credentials, turn the toggle on by default
    if (webauthnData && webauthnData.enrolled) {
      webauthnEnabledEl.checked = true;
      statusIndicatorEl.className = 'status-indicator enrolled';
      statusTextEl.textContent = 'Enrolled';
      webauthnEnrollEl.style.display = 'none';
      webauthnUnlockEl.style.display = 'inline-block';
      webauthnResetEl.style.display = 'inline-block';
      webauthnControlsEl.style.display = 'block';
    } else {
      // If no stored credentials, keep toggle off by default
      webauthnEnabledEl.checked = false;
      webauthnControlsEl.style.display = 'none';
    }
  }

  // --- Toggle password visibility ---
  function togglePassword() {
    const isHidden = passwordEl.type === 'password';
    passwordEl.type = isHidden ? 'text' : 'password';
    togglePasswordEl.textContent = isHidden ? '🙈' : '👁️';
  }

  // --- Events ---
  webauthnEnabledEl.addEventListener('change', updateWebAuthnUI);

  webauthnEnrollEl.addEventListener('click', (e) => {
    e.preventDefault();
    enrollWebAuthn();
  });

  webauthnUnlockEl.addEventListener('click', (e) => {
    e.preventDefault();
    unlockWithWebAuthn();
  });

  webauthnResetEl.addEventListener('click', (e) => {
    e.preventDefault();
    resetWebAuthn();
  });

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
  loadWebAuthnData();
  renderHosts();
  
  // Debug: Check if elements exist immediately
  console.log('WebAuthn elements check:', {
    webauthnEnabled: !!webauthnEnabledEl,
    webauthnControls: !!webauthnControlsEl,
    statusIndicator: !!statusIndicatorEl,
    statusText: !!statusTextEl
  });
  
  // Delay WebAuthn UI update to ensure DOM is ready
  setTimeout(() => {
    console.log('Running delayed WebAuthn UI update');
    updateWebAuthnUI();
  }, 100);

  // PWA registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
