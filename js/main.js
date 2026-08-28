import { supabase } from './supabase-client.js';

// ============================================================
// MOBILE NAV
// ============================================================
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobile-nav');
const mobileNavClose = document.getElementById('mobile-nav-close');

function openMobileNav() {
  mobileNav.classList.add('is-open');
  hamburger.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeMobileNav() {
  mobileNav.classList.remove('is-open');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

hamburger?.addEventListener('click', () => {
  mobileNav.classList.contains('is-open') ? closeMobileNav() : openMobileNav();
});
mobileNavClose?.addEventListener('click', closeMobileNav);
mobileNav?.querySelectorAll('[data-close-nav], .mobile-nav__links a').forEach((el) => {
  el.addEventListener('click', closeMobileNav);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMobileNav();
});

// ============================================================
// SEARCH DROPDOWN
// ============================================================
const searchToggle = document.getElementById('search-toggle');
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const searchForm = document.getElementById('search-form');

searchToggle?.addEventListener('click', () => {
  const isHidden = searchBar.hasAttribute('hidden');
  if (isHidden) {
    searchBar.removeAttribute('hidden');
    searchToggle.setAttribute('aria-expanded', 'true');
    searchInput?.focus();
  } else {
    searchBar.setAttribute('hidden', '');
    searchToggle.setAttribute('aria-expanded', 'false');
  }
});

searchForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  window.location.href = 'inventory.html' + (q ? `?q=${encodeURIComponent(q)}` : '');
});

// ============================================================
// HEADER SCROLL SHADOW
// ============================================================
const header = document.getElementById('header');
function onScroll() {
  if (!header) return;
  header.classList.toggle('header--scrolled', window.scrollY > 8);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ============================================================
// SITE SETTINGS — applied to header, mobile drawer, and footer
// ============================================================
async function applySiteSettings() {
  const { data: settings, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single();

  const brandTitle = settings?.site_name || 'valorthecarplug';
  document.querySelectorAll('#brand-name, #footer-brand').forEach((el) => {
    el.textContent = brandTitle;
  });
  document.title = document.title.replace(/Roadway Auto|valorthecarplug/g, brandTitle);

  const mark = document.getElementById('brand-mark');
  if (mark) {
    mark.innerHTML = `<img src="${settings?.logo_url || 'logo.jpg'}" alt="valorthecarplug" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
  }

  if (settings) {
    if (settings.phone) {
      const headerPhone = document.getElementById('header-phone');
      const headerPhoneText = document.getElementById('header-phone-text');
      if (headerPhone && headerPhoneText) {
        headerPhone.href = `tel:${settings.phone.replace(/[^\d+]/g, '')}`;
        headerPhoneText.textContent = settings.phone;
        headerPhone.hidden = false;
      }
      const footerPhone = document.getElementById('footer-phone');
      if (footerPhone) footerPhone.textContent = settings.phone;
      const mobilePhone = document.getElementById('mobile-phone');
      if (mobilePhone) mobilePhone.textContent = settings.phone;
    }

    if (settings.address) {
      const footerAddress = document.getElementById('footer-address');
      if (footerAddress) footerAddress.textContent = settings.address;
      const mobileAddress = document.getElementById('mobile-address');
      if (mobileAddress) mobileAddress.textContent = settings.address;
    }

    if (settings.facebook_url) {
      const fb = document.getElementById('footer-facebook');
      if (fb) {
        const a = document.createElement('a');
        a.href = settings.facebook_url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Message us on Facebook';
        fb.innerHTML = '';
        fb.appendChild(a);
        fb.hidden = false;
      }
    }

    if (settings.dealer_license) {
      const lic = document.getElementById('footer-license');
      if (lic) {
        lic.textContent = `Dealer License #${settings.dealer_license}`;
        lic.hidden = false;
      }
    }

    if (settings.whatsapp_number) {
      const digits = settings.whatsapp_number.replace(/[^\d]/g, '');
      const waFloat = document.getElementById('whatsapp-float');
      if (waFloat) {
        waFloat.href = `https://wa.me/${digits}`;
        waFloat.hidden = false;
      }
      const waFooter = document.getElementById('footer-whatsapp');
      if (waFooter) {
        const a = document.createElement('a');
        a.href = `https://wa.me/${digits}`;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'WhatsApp us';
        waFooter.innerHTML = '';
        waFooter.appendChild(a);
        waFooter.hidden = false;
      }
    }
  }
}

const copyrightEl = document.getElementById('footer-copyright');
if (copyrightEl) {
  copyrightEl.textContent = copyrightEl.textContent.replace(/\d{4}/, String(new Date().getFullYear()));
}

applySiteSettings();