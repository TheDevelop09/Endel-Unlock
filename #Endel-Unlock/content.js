(() => {
  'use strict';

  const API = 'api-production.endel.io/v4/call';
  const origFetch = window.fetch;

  // 1. Reecrit la reponse d'auth pour forcer un abonnement ACTIVE
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const res = await origFetch.apply(this, arguments);

    if (!url.includes(API)) return res;

    try {
      const data = await res.clone().json();
      let hit = false;

      (function walk(o) {
        if (!o || typeof o !== 'object') return;
        if (o.subscription && typeof o.subscription === 'object') {
          o.subscription.type = 'ACTIVE';
          o.subscription.store = 'STRIPE';
          o.subscription.period = 'YEAR';
          o.subscription.valid_until = Date.now() + 3e10;
          hit = true;
        }
        for (const k in o) walk(o[k]);
      })(data);

      if (!hit) return res;

      console.log('[Endel Unlock] premium injecte');
      return new Response(JSON.stringify(data), {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers
      });
    } catch (e) {
      return res;
    }
  };

  // 2. Filet de securite : annule la redirection vers le funnel
  const fix = (u) => {
    if (typeof u !== 'string' || !u.includes('/funnel/unlock')) return u;
    try {
      const back = new URL(u, location.origin).searchParams.get('go-back');
      if (back) return back;
    } catch (e) {}
    return u;
  };

  for (const method of ['pushState', 'replaceState']) {
    const orig = history[method];
    history[method] = function (state, title, url) {
      return orig.call(this, state, title, fix(url));
    };
  }

  // 3. Trace les URL de stream pour recuperer les soundBankId des modes verrouilles
  window.addEventListener('load', () => {
    performance.getEntriesByType('resource')
      .filter((r) => r.name.includes('/api/pacific'))
      .forEach((r) => console.log('[Endel Unlock] stream:', r.name));
  });
})();