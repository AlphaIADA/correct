(function () {
  const body = document.body;
  if (!body || !body.dataset || !body.dataset.authPage) {
    return;
  }

  const pageType = body.dataset.authPage;
  const form = document.querySelector('[data-auth-form]');
  const toast = document.querySelector('[data-auth-toast]');
  const googleBtnContainer = document.querySelector('[data-google-btn]');
  const redirectDelayMs = 1800;
  const webAppUrl = (typeof APPS_SCRIPT_WEBAPP_URL !== 'undefined' && APPS_SCRIPT_WEBAPP_URL) ? APPS_SCRIPT_WEBAPP_URL : '';
  const googleClientId = (typeof GOOGLE_CLIENT_ID !== 'undefined' && GOOGLE_CLIENT_ID) ? GOOGLE_CLIENT_ID : '';
  const KNOWN_GOOGLE_ERRORS = {
    idpiframe_initialization_failed: 'Google Sign-In cannot load inside this browser (third-party cookies or extensions are blocking it).',
    popup_closed_by_user: 'Google popup closed before finishing. Please try again.',
    unauthorized_client: 'Google client ID is not authorized for this domain. Check OAuth settings.',
    access_denied: 'Google Sign-In was denied. Please allow access and try again.'
  };

  function logInfo(message, data) {
    if (data !== undefined) {
      console.info(`[auth] ${message}`, data);
    } else {
      console.info(`[auth] ${message}`);
    }
  }

  function logError(message, data) {
    if (data !== undefined) {
      console.error(`[auth] ${message}`, data);
    } else {
      console.error(`[auth] ${message}`);
    }
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

  function gatherFormValues() {
    const defaults = { name: '', email: '', phone: '', country: '', referral: '' };
    if (!form) return defaults;
    const data = new FormData(form);
    if (pageType === 'signup') {
      defaults.name = (data.get('fullName') || '').trim();
      defaults.email = (data.get('email') || '').trim();
      defaults.phone = (data.get('phone') || '').trim();
      defaults.country = (data.get('country') || '').trim();
      defaults.referral = (data.get('referral') || '').trim();
    } else {
      const identifier = (data.get('identifier') || '').trim();
      defaults.email = identifier;
    }
    return defaults;
  }

  function buildPayload(sourceTag, overrides = {}, meta = {}) {
    const formValues = gatherFormValues();
    const payload = {
      Source: sourceTag,
      Name: overrides.name || formValues.name || '',
      Email: overrides.email || formValues.email || '',
      Phone: overrides.phone || formValues.phone || '',
      Country: overrides.country || formValues.country || '',
      Meta: {
        referral: formValues.referral || overrides.referral || '',
        pagePath: window.location.pathname,
        pageType,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
    return payload;
  }

  async function postToSheets(payload) {
    if (!webAppUrl) {
      throw new Error('Apps Script Web App URL is missing.');
    }
    logInfo('Posting to Apps Script', payload);
    let response;
    try {
      response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (networkError) {
      throw new Error(`Network error contacting Apps Script: ${networkError.message}`);
    }

    const responseText = await response.text();
    let json;
    try {
      json = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Apps Script returned non-JSON response (status ${response.status}): ${responseText}`);
    }

    if (!response.ok || !json.ok) {
      const detail = json && json.message ? json.message : `HTTP ${response.status}`;
      throw new Error(`Apps Script error: ${detail}`);
    }
    logInfo('Apps Script accepted payload');
    return json;
  }

  function handleSuccess() {
    showToast('success', 'Request received! Redirecting…');
    setTimeout(() => {
      window.location.href = '/';
    }, redirectDelayMs);
  }

  function handlePostError(error) {
    logError('Submission failed', error);
    showToast('error', error && error.message ? error.message : 'Unable to submit right now. Please try again.');
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    if (!form) return;
    const formValues = gatherFormValues();
    if (pageType === 'login' && !formValues.email) {
      showToast('error', 'Enter your email or phone number before submitting.');
      return;
    }
    if (pageType === 'signup') {
      if (!formValues.name || !formValues.email || !formValues.phone || !formValues.country) {
        showToast('error', 'Please complete all required fields.');
        return;
      }
    }
    const payload = buildPayload(`${pageType}-form`);
    payload.Meta.method = 'form';
    postToSheets(payload).then(handleSuccess).catch(handlePostError);
  }

  function parseJwt(token) {
    try {
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
    } catch (error) {
      throw new Error('Unable to decode Google credential');
    }
  }

  function handleKnownGoogleError(code) {
    const message = KNOWN_GOOGLE_ERRORS[code] || `Google Sign-In error: ${code}`;
    logError(message);
    showToast('error', message);
  }

  function handleGoogleCredentialResponse(response) {
    if (!response) {
      handleKnownGoogleError('unknown_response');
      return;
    }
    if (response.error) {
      handleKnownGoogleError(response.error);
      return;
    }
    if (!response.credential) {
      handleKnownGoogleError('missing_credential');
      return;
    }
    let profile;
    try {
      profile = parseJwt(response.credential);
    } catch (error) {
      handlePostError(error);
      return;
    }
    const overrides = {
      name: profile.name || '',
      email: profile.email || '',
      phone: '',
      country: ''
    };
    const meta = {
      method: 'google',
      googleId: profile.sub || '',
      googleAvatar: profile.picture || ''
    };
    const payload = buildPayload(`${pageType}-google`, overrides, meta);
    postToSheets(payload)
      .then(handleSuccess)
      .catch(handlePostError);
  }

  function initGoogleButton() {
    if (!googleBtnContainer) return;
    if (!googleClientId) {
      googleBtnContainer.innerHTML = '<p class="auth-note">Add a valid Google Client ID to enable this button.</p>';
      logError('Google Client ID missing or empty.');
      return;
    }
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      logInfo('Waiting for GIS library...');
      setTimeout(initGoogleButton, 150);
      return;
    }
    try {
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
      logInfo('Google Sign-In button initialized');
    } catch (error) {
      logError('Failed to initialize Google Identity Services', error);
      handleKnownGoogleError('idpiframe_initialization_failed');
    }
  }

  function setupGlobalErrorListener() {
    window.addEventListener('error', (event) => {
      if (typeof event.message === 'string' && event.message.includes('idpiframe_initialization_failed')) {
        handleKnownGoogleError('idpiframe_initialization_failed');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  setupGlobalErrorListener();
  window.addEventListener('load', () => {
    if (!webAppUrl) {
      logError('Apps Script Web App URL is missing.');
      showToast('error', 'Apps Script URL missing. Update login/signup constants.');
    }
    initGoogleButton();
  });
})();
