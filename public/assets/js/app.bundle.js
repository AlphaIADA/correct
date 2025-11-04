const docReady = (fn) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
};

const resize = (fn) => window.addEventListener('resize', fn);

const camelize = (str) =>
  str.replace(/[-_\s.]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).
    replace(/^(.)/, (match) => match.toLowerCase());

const getData = (el, key) => {
  if (!el) return null;
  const value = el.dataset[camelize(key)];
  if (value === undefined) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const hexToRgb = (hexValue) => {
  if (!hexValue) return [255, 255, 255];
  const hex = hexValue.replace('#', '');
  const value = hex.length === 3
    ? hex.split('').map((char) => char + char).join('')
    : hex;
  const intValue = parseInt(value, 16);
  return [
    (intValue >> 16) & 255,
    (intValue >> 8) & 255,
    intValue & 255,
  ];
};

const palette = {
  white: '#ffffff',
  light: '#f9fafd',
  dark: '#000000',
  primary: '#2c7be5',
  warning: '#f5803e',
};

const hasClass = (el, className) => !!el && el.classList.contains(className);

const addClass = (el, className) => el && el.classList.add(className);

const getOffset = (el) => {
  if (!el) return { top: 0, left: 0 };
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.pageYOffset,
    left: rect.left + window.pageXOffset,
  };
};

const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1540,
};

const getBreakpoint = (el) => {
  const classes = el && el.className ? el.className.split(' ') : [];
  const expand = classes.find((cls) => cls.startsWith('navbar-expand-'));
  return expand ? breakpoints[expand.split('-').pop()] : breakpoints.lg;
};

const initNavbar = () => {
  const navbar = document.querySelector('[data-navbar-on-scroll]');
  if (!navbar) return;

  const html = document.documentElement;
  const navbarCollapse = navbar.querySelector('.navbar-collapse');
  const toggler = navbar.querySelector('.navbar-toggler');
  const windowHeight = window.innerHeight;
  const backgroundImage = window.getComputedStyle(navbar).backgroundImage;
  const transition = 'background-color 0.35s ease';
  const shadowName = 'shadow-transition';

  const configuredName = getData(navbar, 'navbar-light-on-scroll');
  const colorName = palette[configuredName] ? configuredName : 'white';
  const colorRgb = hexToRgb(palette[colorName]);
  const bgClassName = `bg-${colorName}`;

  navbar.style.backgroundImage = 'none';

  if (toggler && navbarCollapse) {
    navbar.addEventListener('click', (event) => {
      if (
        event.target.classList.contains('nav-link') &&
        window.innerWidth < getBreakpoint(navbar)
      ) {
        toggler.click();
      }
    });
  }

  window.addEventListener('scroll', () => {
    const scrollTop = html.scrollTop;
    let alpha = (scrollTop / windowHeight) * 0.15;
    navbar.classList.toggle('backdrop', alpha > 0);
    if (alpha > 1) alpha = 1;
    navbar.style.backgroundColor = `rgba(${colorRgb.join(', ')}, ${alpha})`;
    const showCollapse = hasClass(navbarCollapse, 'show');
    const shouldShowImage = alpha > 0 || showCollapse;
    navbar.style.backgroundImage = shouldShowImage ? backgroundImage : 'none';
    navbar.classList.toggle(shadowName, shouldShowImage);
  });

  resize(() => {
    const breakpoint = getBreakpoint(navbar);
    if (window.innerWidth > breakpoint) {
      navbar.style.backgroundImage = html.scrollTop ? backgroundImage : 'none';
      navbar.style.transition = 'none';
    } else if (toggler && !hasClass(toggler, 'collapsed')) {
      navbar.classList.add(bgClassName, shadowName);
      navbar.style.backgroundImage = backgroundImage;
    }

    if (window.innerWidth <= breakpoint) {
      navbar.style.transition =
        hasClass(navbarCollapse, 'show') ? transition : 'none';
    }
  });

  if (!navbarCollapse) return;

  navbarCollapse.addEventListener('show.bs.collapse', () => {
    navbar.classList.add(bgClassName, shadowName);
    navbar.style.backgroundImage = backgroundImage;
    navbar.style.transition = transition;
  });

  navbarCollapse.addEventListener('hide.bs.collapse', () => {
    navbar.classList.remove(bgClassName, shadowName);
    if (!html.scrollTop) {
      navbar.style.backgroundImage = 'none';
    }
  });

  navbarCollapse.addEventListener('hidden.bs.collapse', () => {
    navbar.style.transition = 'none';
  });
};

const initDetector = () => {
  const { is } = window;
  if (!is) return;
  const html = document.documentElement;
  const checks = [
    [() => is.opera(), 'opera'],
    [() => is.mobile(), 'mobile'],
    [() => is.firefox(), 'firefox'],
    [() => is.safari(), 'safari'],
    [() => is.ios(), 'ios'],
    [() => is.iphone(), 'iphone'],
    [() => is.ipad(), 'ipad'],
    [() => is.ie(), 'ie'],
    [() => is.edge(), 'edge'],
    [() => is.chrome(), 'chrome'],
    [() => is.mac(), 'osx'],
    [() => is.windows(), 'windows'],
    [() => /CriOS/i.test(navigator.userAgent), 'chrome'],
  ];

  checks.forEach(([test, className]) => {
    try {
      if (test()) addClass(html, className);
    } catch (error) {
      /* ignore */
    }
  });
};

const initScrollToTop = () => {
  const anchors = document.querySelectorAll('[data-anchor] > a, [data-scroll-to]');
  anchors.forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const el = event.currentTarget;
      const targetId = getData(el, 'scroll-to') || el.getAttribute('href');
      if (!targetId || !targetId.startsWith('#')) return;
      const target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      const offsetTop = getData(el, 'offset-top');
      const top = typeof offsetTop === 'number' ? offsetTop : getOffset(target).top - 100;
      window.scroll({ top, left: 0, behavior: 'smooth' });
      if (history.replaceState) {
        history.replaceState(null, '', targetId);
      } else {
        window.location.hash = targetId;
      }
    });
  });
};

docReady(() => {
  initNavbar();
  initDetector();
  initScrollToTop();
});
