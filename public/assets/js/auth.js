(function () {
  const body = document.body;
  if (!body || !body.dataset || !body.dataset.authPage) {
    return;
  }

  const pageType = body.dataset.authPage;
  const form = document.querySelector('[data-auth-form]');
  const toast = document.querySelector('[data-auth-toast]');
  const googleBtnContainer = document.querySelector('[data-google-btn]');
  const redirectDelay = 1600;
  const webAppUrl = typeof APPS_SCRIPT_WEBAPP_URL !== 'undefined'
    ? APPS_SCRIPT_WEBAPP_URL
    : (window.APPS_SCRIPT_WEBAPP_URL || 'PASTE_YOUR_URL_HERE');
  const googleClientId = typeof GOOGLE_CLIENT_ID !== 'undefined'
    ? GOOGLE_CLIENT_ID
    : (window.GOOGLE_CLIENT_ID || 'PASTE_YOUR_GOOGLE_CLIENT_ID');

  if (webAppUrl.includes('PASTE')) {
    console.warn('APPS_SCRIPT_WEBAPP_URL is still a placeholder. Update it with your Apps Script deployment URL.');
  }
  if (googleClientId.includes('PASTE')) {
    console.warn('GOOGLE_CLIENT_ID is still a placeholder. Update it with your OAuth Client ID.');
  }

  function showToast(type, message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('error');
    if (type === 'error') {
      toast.classList.add('error');
    }
    toast.classList.add('is-visible');
    setTimeout(() => toast.classList.remove('is-visible'), 4000);
  }

  async function postToSheets(payload) {
    if (!webAppUrl || webAppUrl.includes('PASTE')) {
      throw new Error('Apps Script URL missing');
    }
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({ ok: false }));
    if (!response.ok || !result.ok) {
      throw new Error('Apps Script error');
    }
    return result;
  }

  function basePayload() {
    return {
      SourcePage: pageType,
      FullName: '',
      Email: '',
      Phone: '',
      Country: '',
      Referral: '',
      GoogleID: '',
      GoogleName: '',
      GoogleEmail: '',
      GoogleAvatar: '',
      UserAgent: navigator.userAgent,
      IP: '',
      RawJSON: ''
    };
  }

  function buildRawSnapshot(extra) {
    try {
      return JSON.stringify({
        pagePath: window.location.pathname,
        timestamp: new Date().toISOString(),
        ...extra
      });
    } catch (error) {
      console.warn('Unable to build JSON snapshot', error);
      return '';
    }
  }

  function handleSuccess() {
    showToast('success', 'Request received! Redirecting…');
    setTimeout(() => {
      window.location.href = '/';
    }, redirectDelay);
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    if (!form) return;
    const formData = new FormData(form);
    const payload = basePayload();
    payload.SourcePage = `${pageType}-form`;
    if (pageType === 'signup') {
      payload.FullName = (formData.get('fullName') || '').trim();
      payload.Email = (formData.get('email') || '').trim();
      payload.Phone = (formData.get('phone') || '').trim();
      payload.Country = (formData.get('country') || '').trim();
      payload.Referral = (formData.get('referral') || '').trim();
      const preview = {
        fullName: payload.FullName,
        email: payload.Email,
        phone: payload.Phone,
        country: payload.Country,
        referral: payload.Referral
      };
      payload.RawJSON = buildRawSnapshot({ source: 'form', preview });
    } else {
      const identifier = (formData.get('identifier') || '').trim();
      payload.Email = identifier;
      payload.RawJSON = buildRawSnapshot({ source: 'form', identifier });
    }
    postToSheets(payload)
      .then(handleSuccess)
      .catch((error) => {
        console.error(error);
        showToast('error', 'Unable to send right now. Please try again.');
      });
  }

  function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }

  function handleGoogleCredentialResponse(response) {
    try {
      const profile = parseJwt(response.credential);
      const payload = basePayload();
      payload.SourcePage = `${pageType}-google`;
      payload.GoogleID = profile.sub || '';
      payload.GoogleName = profile.name || '';
      payload.GoogleEmail = profile.email || '';
      payload.GoogleAvatar = profile.picture || '';
      payload.FullName = profile.name || '';
      payload.Email = profile.email || '';
      payload.RawJSON = buildRawSnapshot({ source: 'google', profile });
      postToSheets(payload)
        .then(handleSuccess)
        .catch((error) => {
          console.error(error);
          showToast('error', 'Google sign-in failed. Please try again.');
        });
    } catch (error) {
      console.error(error);
      showToast('error', 'Unable to read Google profile.');
    }
  }

  function initGoogleButton() {
    if (!googleBtnContainer) return;
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      setTimeout(initGoogleButton, 120);
      return;
    }
    if (!googleClientId || googleClientId.includes('PASTE')) {
      googleBtnContainer.innerHTML = '<p class="auth-note">Add your Google Client ID to enable this button.</p>';
      return;
    }
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredentialResponse,
      ux_mode: 'popup'
    });
    window.google.accounts.id.renderButton(googleBtnContainer, {
      theme: 'outline',
      size: 'large',
      width: 320
    });
  }

  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  window.addEventListener('load', initGoogleButton);
})();
