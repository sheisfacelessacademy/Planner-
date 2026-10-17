'use strict';

/* =========================================================
   Sincronização opcional entre dispositivos (Supabase).
   Guarda o estado completo da app numa linha por utilizadora,
   na tabela `planner_state`. Ganha sempre a versão mais recente.
   ========================================================= */

const Sync = (() => {
  const CFG_KEY = 'planner.sync';
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';

  let client = null;
  let user = null;
  let status = 'off'; // off | busy | ok | err
  let message = '';
  let pushTimer = null;
  let onRemote = () => {};
  const listeners = new Set();

  const readCfg = () => { try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch { return {}; } };
  const writeCfg = c => { try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch { /* sem armazenamento */ } };
  const set = (s, msg = '') => { status = s; message = msg; listeners.forEach(fn => fn()); };

  function loadLib() {
    if (window.supabase) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = LIB;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Não foi possível carregar o Supabase'));
      document.head.appendChild(s);
    });
  }

  async function pull() {
    if (!client || !user) return;
    set('busy', 'A sincronizar…');
    const { data, error } = await client.from('planner_state').select('data').eq('user_id', user.id).maybeSingle();
    if (error) return set('err', error.message);
    onRemote(data ? data.data : null);
    set('ok', 'Sincronizado');
  }

  async function connect() {
    const { url, key } = readCfg();
    if (!url || !key) return set('off');
    try {
      set('busy', 'A ligar…');
      await loadLib();
      client = window.supabase.createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true } });
      const { data } = await client.auth.getSession();
      user = data.session ? data.session.user : null;
      client.auth.onAuthStateChange((_event, session) => {
        const had = !!user;
        user = session ? session.user : null;
        if (user && !had) pull();
        else set(user ? status : 'off', user ? message : '');
      });
      if (user) await pull();
      else set('off', 'Falta entrar com o teu email');
    } catch (e) {
      client = null;
      set('err', e.message);
    }
  }

  return {
    init(handler) { onRemote = handler; return connect(); },
    onChange(fn) { listeners.add(fn); },
    get config() { return readCfg(); },
    get user() { return user; },
    get status() { return status; },
    get message() { return message; },
    get ready() { return !!client; },

    async configure(url, key) {
      writeCfg({ url: url.trim().replace(/\/$/, ''), key: key.trim() });
      await connect();
    },
    async disconnect() {
      if (client) await client.auth.signOut().catch(() => {});
      client = null; user = null;
      writeCfg({});
      set('off');
    },
    async signIn(email) {
      if (!client) throw new Error('Liga primeiro o Supabase');
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
    },
    async signOut() {
      if (client) await client.auth.signOut();
      user = null;
      set('off', 'Sessão terminada');
    },
    pull,
    push(state) {
      if (!client || !user) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(async () => {
        set('busy', 'A guardar na nuvem…');
        const { error } = await client.from('planner_state')
          .upsert({ user_id: user.id, data: state, updated_at: new Date().toISOString() });
        if (error) set('err', error.message); else set('ok', 'Sincronizado');
      }, 1200);
    },
  };
})();
