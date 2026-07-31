/* =============================================================
   Wreck It Room — landing page behaviour
   ============================================================= */
(function () {
  'use strict';

  /* -----------------------------------------------------------
     CONFIG
     ----------------------------------------------------------- */

  // ---- BOOKEO -------------------------------------------------
  // Bookeo account ID — the `a=` value from
  // Bookeo → Settings → Online bookings → "Add booking to your website".
  // Also visible in the gift voucher link: bookeo.com/go/<ACCOUNT>/buyvoucher
  // If this is ever blanked, the page falls back to the hosted booking page.
  var BOOKEO_ACCOUNT = '3151NKCMNE1982E9206A4';

  // First-party booking-source tag. Bookeo records it against the booking, which
  // gives us a source record that survives ad blockers and cookie loss — the
  // independent cross-check on what this landing page actually produced.
  // Keep it identical to the `?source=` on the hosted fallback links in the HTML.
  var BOOKEO_SOURCE = 'lp';

  // Product type IDs, verified 2026-07-31 against the live Bookeo catalogue.
  // NOTE: Bookeo exposes exactly these four. "Beast Mode" (3151AP69RL1988739EB1E)
  // and "Breaking Point" (3151NFWPWF198A04158EB) still appear on wreckitroomvb.com
  // but are DISABLED in Bookeo and return an error page — do not link them.
  var PRODUCTS = {
    'rage':        { id: '31514FY9UP198380B9710',  label: 'Rage Room' },
    'paint':       { id: '3151RXWNT3198A3B2C785',  label: 'Radiant Wreck' },
    'rage-group':  { id: '3151JM9XLE198BE032A26',  label: 'Rage Room · Group Session' },
    'paint-group': { id: '3151C7PCF9198BDF6EF82',  label: 'Radiant Wreck · Group Session' }
  };

  /* -----------------------------------------------------------
     HELPERS
     ----------------------------------------------------------- */
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  window.dataLayer = window.dataLayer || [];
  function track(event, params) {
    var payload = { event: event };
    if (params) for (var k in params) payload[k] = params[k];
    window.dataLayer.push(payload);
  }

  /* -----------------------------------------------------------
     1. BOOKEO WIDGET

     Bookeo supports only ONE widget instance per page, so we keep a
     single shared mount (#bookeo_position) and swap the product on
     demand — tearing the previous instance down before remounting.
     ----------------------------------------------------------- */
  var mount       = $('#bookeo_position');
  var loadingEl   = $('#bookingLoading');
  var unconfigEl  = $('#bookingUnconfigured');
  var bookSect    = $('#book');
  var tabs        = $$('.tabs [data-tab]');
  var currentKey  = null;

  // Force the widget to remeasure after it is revealed or swapped.
  function nudge() {
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
  }

  function showState(el) {
    [loadingEl, unconfigEl].forEach(function (n) { if (n) n.hidden = (n !== el); });
  }

  function loadWidget(src) {
    // Tear down any existing Bookeo instance before mounting a new one.
    try {
      if (window.axiomct_socket && window.axiomct_socket.destroy) window.axiomct_socket.destroy();
    } catch (e) {}
    try {
      window.axiomct_project = null; window.axiomct_socket = null; window.axiomct_iframe = null;
      window.axiomct_loadStarted = null; window.axiomct_spinner = null; window.axiomct_div = null;
    } catch (e) {}
    if (mount) mount.innerHTML = '';

    showState(loadingEl);

    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = src;

    s.onload = function () {
      // A script injected after page load never receives Bookeo's own
      // load/DOMContentLoaded auto-start, so we start it ourselves. The
      // once-guard stops Bookeo's easyXDM retries from double-mounting
      // and firing the "Multiple copies of the widget" alert.
      try {
        if (typeof window.bookeo_start === 'function') {
          var orig = window.bookeo_start, done = false;
          window.bookeo_start = function () {
            if (done || window.axiomct_project) return;
            done = true;
            return orig.apply(this, arguments);
          };
          window.bookeo_start();
        }
      } catch (e) {}
      showState(null);
      setTimeout(nudge, 400);
    };

    s.onerror = function () {
      showState(unconfigEl);
      track('booking_widget_error');
    };

    document.body.appendChild(s);
  }

  function loadProduct(key, opts) {
    var product = PRODUCTS[key];
    if (!product) return;

    tabs.forEach(function (t) {
      var on = t.dataset.tab === key;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;      // roving tabindex: one stop for the whole tablist
    });

    if (!BOOKEO_ACCOUNT) {
      // Not configured yet — keep the hosted-page fallback visible.
      showState(unconfigEl);
    } else if (currentKey !== key) {
      loadWidget('https://bookeo.com/widget.js?a=' + BOOKEO_ACCOUNT +
                 '&type=' + product.id +
                 (BOOKEO_SOURCE ? '&source=' + encodeURIComponent(BOOKEO_SOURCE) : ''));
      currentKey = key;
      track('booking_widget_change', { product: key, product_name: product.label });
    }

    if (opts && opts.scroll && bookSect) {
      requestAnimationFrame(function () {
        bookSect.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(nudge, 350);
      });
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { loadProduct(tab.dataset.tab); });
  });

  // Arrow-key navigation across the tablist.
  var tablist = $('.tabs');
  if (tablist) {
    tablist.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var i = tabs.indexOf(document.activeElement);
      if (i === -1) return;
      e.preventDefault();
      var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      loadProduct(next.dataset.tab);
    });
  }

  /* -----------------------------------------------------------
     2. Any CTA carrying data-book preselects that product
     ----------------------------------------------------------- */
  $$('[data-book]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      loadProduct(el.dataset.book, { scroll: true });
    });
  });

  /* -----------------------------------------------------------
     3. PRICING TOGGLE — rage vs paint

     Both single sessions are $40 first person / +$20 each additional /
     20 minutes (verified against the live Bookeo catalogue 2026-07-31),
     so only the kit contents and the group session differ between them.
     ----------------------------------------------------------- */
  var PRICING = {
    rage: {
      kit: 'One crate of breakables',
      party: '$350',
      party_unit: 'Up to 10 people · 1 full hour',
      party_inc: [
        'Your own private double room',
        'Two crates of breakables',
        '20 beer bottles',
        '10 liquor / wine / champagne bottles',
        'Small, medium &amp; large electronics'
      ]
    },
    paint: {
      kit: 'Paint, brushes &amp; blasters',
      party: '$400',
      party_unit: 'Up to 10 people',
      party_inc: [
        'Your own private double room',
        '10 canvases included',
        '20 filled paint blasters',
        'Full colour range &amp; brushes',
        'Coveralls, booties &amp; eyewear'
      ]
    }
  };

  var panel = $('#panel-price');
  var pricingTabs = $$('[data-pricing-tab]');
  pricingTabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.dataset.pricingTab;
      var set = PRICING[key];
      if (!set || !panel) return;

      panel.dataset.pricing = key;
      panel.setAttribute('aria-labelledby', btn.id);

      pricingTabs.forEach(function (b) {
        var on = b === btn;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
      });

      var party = $('[data-amt-party]', panel);
      if (party) party.textContent = set.party;

      // The paint group session duration is not published anywhere we can verify,
      // so that tier shows capacity only until the owner confirms a time.
      var punit = $('[data-unit-party]', panel);
      if (punit) punit.textContent = set.party_unit;

      $$('[data-kit]', panel).forEach(function (n) { n.innerHTML = set.kit; });

      var inc = $('[data-inc-party]', panel);
      if (inc) {
        inc.innerHTML = set.party_inc.map(function (i) { return '<li>' + i + '</li>'; }).join('');
      }

      // Repoint the tier CTAs at the matching Bookeo product.
      var single = (key === 'paint') ? 'paint' : 'rage';
      var group  = (key === 'paint') ? 'paint-group' : 'rage-group';
      $$('.tier [data-book]', panel).forEach(function (a, i) {
        a.dataset.book = (i === 3) ? group : single;
      });

      track('pricing_toggle', { experience: key });
    });
  });

  // Arrow-key navigation across the pricing tablist.
  var priceList = $('.toggle');
  if (priceList) {
    priceList.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var i = pricingTabs.indexOf(document.activeElement);
      if (i === -1) return;
      e.preventDefault();
      var next = pricingTabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + pricingTabs.length) % pricingTabs.length];
      next.focus();
      next.click();
    });
  }

  /* -----------------------------------------------------------
     4. STICKY CTA — show once the hero is out of view,
        hide again over the booking widget so it never covers it.
     ----------------------------------------------------------- */
  var sticky = $('#sticky');
  var hero   = $('.hero');

  if (sticky && hero && 'IntersectionObserver' in window) {
    var pastHero = false;
    var onBooking = false;
    var apply = function () {
      sticky.classList.toggle('show', pastHero && !onBooking);
    };

    new IntersectionObserver(function (entries) {
      pastHero = !entries[0].isIntersecting;
      apply();
    }, { rootMargin: '-70px 0px 0px 0px' }).observe(hero);

    if (bookSect) {
      new IntersectionObserver(function (entries) {
        onBooking = entries[0].isIntersecting;
        apply();
      }, { threshold: 0.12 }).observe(bookSect);
    }
  }

  /* -----------------------------------------------------------
     5. ANALYTICS — CTA clicks, scroll depth, booking engagement

     Events pushed for GTM to pick up:
       cta_click · phone_click · pricing_toggle · scroll_depth
       view_booking_widget · booking_widget_change · booking_widget_error
       begin_checkout (soft signal only — see note below)

     ⚠️ Do NOT import any of these into Google Ads as a PRIMARY conversion.
     The real conversion is Bookeo's own `purchase` (with value + transaction_id)
     via its native GA4 / Ads integration. Importing a click here as primary
     would double-count and corrupt bidding.
     ----------------------------------------------------------- */
  $$('[data-track]').forEach(function (el) {
    el.addEventListener('click', function () {
      var id = el.dataset.track;
      var isPhone = (el.getAttribute('href') || '').indexOf('tel:') === 0;
      track(isPhone ? 'phone_click' : 'cta_click', {
        cta_id: id,
        cta_text: (el.textContent || '').trim().slice(0, 60)
      });
    });
  });

  // Scroll depth.
  var marks = [25, 50, 75, 90];
  var fired = {};
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      var h = document.documentElement;
      var pct = (h.scrollTop + window.innerHeight) / h.scrollHeight * 100;
      marks.forEach(function (m) {
        if (pct >= m && !fired[m]) {
          fired[m] = true;
          track('scroll_depth', { percent: m });
        }
      });
    });
  }, { passive: true });

  // Proxy for "started booking": focus moved into the Bookeo widget iframe.
  // Soft signal — it misses anyone who interacts without the iframe taking
  // focus, so treat it as engagement, never as a conversion.
  var bookingStarted = false;
  window.addEventListener('blur', function () {
    if (bookingStarted || !mount) return;
    var el = document.activeElement;
    if (el && el.tagName === 'IFRAME' && mount.contains(el)) {
      bookingStarted = true;
      track('begin_checkout', { method: 'bookeo_widget', product: currentKey });
    }
  });

  // First view of the booking section.
  if (bookSect && 'IntersectionObserver' in window) {
    var seen = false;
    new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting && !seen) {
        seen = true;
        track('view_booking_widget');
        obs.disconnect();
      }
    }, { threshold: 0.3 }).observe(bookSect);
  }

  /* -----------------------------------------------------------
     6. MISC
     ----------------------------------------------------------- */
  var yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* -----------------------------------------------------------
     7. BOOT THE WIDGET

     Deferred until the booking section is near the viewport — the
     Bookeo script is heavy and this is an ad landing page, so it must
     not compete with the hero for load time. Any CTA click loads it
     immediately regardless, via loadProduct().
     ----------------------------------------------------------- */
  var params    = new URLSearchParams(window.location.search);
  var preselect = params.get('book');           // e.g. /?book=paint
  var initial   = (preselect && PRODUCTS[preselect]) ? preselect : 'rage';

  if (preselect && PRODUCTS[preselect]) {
    loadProduct(initial, { scroll: true });
  } else if (bookSect && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries, obs) {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      loadProduct(initial);
    }, { rootMargin: '600px 0px' }).observe(bookSect);
  } else {
    loadProduct(initial);
  }
})();
