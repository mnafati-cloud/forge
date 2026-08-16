/* Forge — couche application.
 *
 * SEUL fichier qui lit et écrit le localStorage "forge-state-v1"
 * (exception : le boot de thème en lecture seule dans index.html).
 * Toute la logique calculatoire vit dans engine.js, testée sous Node.
 */
(function () {
  'use strict';

  var E = window.FORGE_ENGINE;
  var CAT = window.FORGE_EX;
  var KEY = 'forge-state-v1';

  /* ================================================================== */
  /* Petits utilitaires                                                  */
  /* ================================================================== */

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }


  /* ================================================================== */
  /* Jeu d'icônes — SVG en ligne, grille 24, trait 1.7, currentColor.    */
  /* Aucun emoji dans l'interface : leur rendu dépend de la police       */
  /* système du téléphone et casse l'alignement optique.                 */
  /* ================================================================== */

  var ICONS = {
    dumbbell: '<path d="M3 10.25v3.5M6.75 7.25v9.5M17.25 7.25v9.5M21 10.25v3.5M6.75 12h10.5"/>',
    log: '<path d="M9.5 6.5h10.5M9.5 12h10.5M9.5 17.5h7M4 6.5h1.75M4 12h1.75M4 17.5h1.75"/>',
    trend: '<path d="M3.5 17.5l5.5-5.5 3.5 3.5 8-8"/><path d="M14.5 7.5h6v6"/>',
    sliders: '<path d="M5 21v-6.5M5 10.5V3M12 21v-8.5M12 8.5V3M19 21v-4.5M19 12.5V3M2.5 14.5h5M9.5 10.5h5M16.5 16.5h5"/>',
    plus: '<path d="M12 5.5v13M5.5 12h13"/>',
    minus: '<path d="M5.5 12h13"/>',
    check: '<path d="M4.75 12.75l4.75 4.75L19.25 6.5"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    repeat: '<path d="M3.75 12a8.25 8.25 0 0 1 14.1-5.83L20.25 8.5"/><path d="M20.25 3.75V8.5h-4.75"/>'
      + '<path d="M20.25 12a8.25 8.25 0 0 1-14.1 5.83L3.75 15.5"/><path d="M3.75 20.25V15.5H8.5"/>',
    flame: '<path d="M12 3.25c3.6 3.3 5.5 6.15 5.5 8.9a5.5 5.5 0 1 1-11 0c0-1.55.6-2.98 1.8-4.28.3 1.25.92 2.05 1.85 2.4C10.35 8.1 10.95 5.55 12 3.25z"/>',
    trophy: '<path d="M7 4h10v4.75a5 5 0 0 1-10 0z"/><path d="M7 5.75H4.5v1.4a3.5 3.5 0 0 0 3.4 3.5"/>'
      + '<path d="M17 5.75h2.5v1.4a3.5 3.5 0 0 1-3.4 3.5"/><path d="M12 13.75V17.5M8.25 20.25h7.5"/>',
    timer: '<circle cx="12" cy="13.75" r="7.25"/><path d="M12 10v3.75l2.5 1.75M9.5 2.75h5"/>',
    alert: '<path d="M12 4.25L2.75 20h18.5z"/><path d="M12 10.25v4.25"/>'
      + '<circle cx="12" cy="17.4" r=".95" fill="currentColor" stroke="none"/>',
    bulb: '<path d="M12 3.25a5.75 5.75 0 0 0-3.4 10.4c.55.4.9 1.05.9 1.72v.38h5v-.38c0-.67.35-1.32.9-1.72A5.75 5.75 0 0 0 12 3.25z"/><path d="M10 18.5h4M10.75 21h2.5"/>',
    download: '<path d="M12 3.75v11.5M7.25 10.75L12 15.5l4.75-4.75M4 20.25h16"/>',
    upload: '<path d="M12 15.5V4M7.25 8.75L12 4l4.75 4.75M4 20.25h16"/>',
    chevronDown: '<path d="M6.5 9.75l5.5 5.5 5.5-5.5"/>',
    chevronRight: '<path d="M9.75 6.5l5.5 5.5-5.5 5.5"/>',
    trash: '<path d="M4.25 6.5h15.5M9.75 6.5V3.75h4.5V6.5M6.5 6.5l.9 13.75h9.2l.9-13.75M10 10.5v6M14 10.5v6"/>',
    scale: '<path d="M4 20.25h16L17.4 9.5H6.6z"/><circle cx="12" cy="5.75" r="2.5"/>',
    note: '<path d="M5.5 3.75h9L18.5 8v12.25h-13z"/><path d="M14.25 3.75V8h4.25M8.75 12.5h6.5M8.75 16h4.5"/>'
  };

  /** Icône en ligne. `cls` permet de la colorer via une classe existante. */
  function ico(name, size, cls) {
    if (!ICONS[name]) return '';
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" width="' + (size || 20) + '" height="' + (size || 20) +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  function todayStr(ts) {
    var d = ts ? new Date(ts) : new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  function longDate(ds) {
    var p = ds.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return DAYS[d.getDay()] + ' ' + (+p[2]) + ' ' + MONTHS[+p[1] - 1];
  }

  /** "aujourd'hui", "hier", "il y a 3 jours", puis la date longue. */
  function relDate(ds) {
    var n = E.daysBetween(ds, todayStr());
    if (n === 0) return "aujourd'hui";
    if (n === 1) return 'hier';
    if (n < 7) return 'il y a ' + n + ' jours';
    if (n < 14) return 'la semaine dernière';
    return longDate(ds);
  }

  /** Nombre lisible à l'écran : 42.5 -> "42,5", 40 -> "40". */
  function num(v) {
    var x = Math.round((Number(v) || 0) * 100) / 100;
    return String(x).replace('.', ',');
  }

  /** Nombre pour un <input type="number"> : point décimal OBLIGATOIRE,
   *  sinon le champ est considéré invalide et s'affiche vide. */
  function dec(v) {
    return String(Math.round((Number(v) || 0) * 100) / 100);
  }

  /* ================================================================== */
  /* État                                                                */
  /* ================================================================== */

  var ST = null;

  function defState() {
    return { v: 1, set: JSON.parse(JSON.stringify(E.DEF_SET)), ses: [], cur: null, ex: {}, bw: [], rest: null };
  }

  function loadState() {
    var s;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') s = defState();

    // Migration douce : on complète, on ne retire JAMAIS.
    var d = defState();
    if (!s.set || typeof s.set !== 'object') s.set = {};
    for (var k in d.set) if (!(k in s.set)) s.set[k] = d.set[k];
    if (!Array.isArray(s.ses)) s.ses = [];
    if (!Array.isArray(s.bw)) s.bw = [];
    if (!s.ex || typeof s.ex !== 'object') s.ex = {};
    if (s.cur && !Array.isArray(s.cur.s)) s.cur = null;
    if (s.cur && !Array.isArray(s.cur.p)) s.cur.p = [];
    if (!s.rest || typeof s.rest.end !== 'number') s.rest = null;
    s.v = 1;
    return s;
  }

  var saveT = null;
  function save(now) {
    clearTimeout(saveT);
    var doIt = function () {
      try { localStorage.setItem(KEY, JSON.stringify(ST)); }
      catch (e) { toast('Sauvegarde impossible — stockage plein ?', 'alert'); }
    };
    if (now) doIt(); else saveT = setTimeout(doIt, 250);
  }

  /* Catalogue = exercices livrés + exercices persos de l'utilisateur. */
  function allExercises() {
    var list = CAT.EXERCISES.slice();
    for (var id in ST.ex) list.push(ST.ex[id]);
    return list;
  }
  var IX = {};
  function reindex() { IX = E.indexExercises(allExercises()); }

  function exName(id) { return (IX[id] && IX[id].n) || id; }
  function exOf(id) { return IX[id] || { id: id, n: id, g: 'full', eq: 'bw' }; }
  function gColor(g) { return (CAT.GROUPS[g] && CAT.GROUPS[g].c) || 'var(--fg3)'; }
  function gName(g) { return (CAT.GROUPS[g] && CAT.GROUPS[g].n) || g; }

  function bwNow(dateStr) { return E.bodyweightAt(ST.bw, dateStr || todayStr(), ST.set.bw); }

  /* ================================================================== */
  /* Retours (son, vibration, toast)                                     */
  /* ================================================================== */

  var actx = null;
  function beep(freq, dur) {
    if (!ST.set.sound) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.22, actx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + dur + 0.02);
    } catch (e) { /* audio indisponible : on continue sans */ }
  }
  function buzz(pattern) {
    if (ST.set.vibrate && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { } }
  }

  var tT = null, undoFn = null;
  var TOAST_ICO = { pr: 'trophy', alert: 'alert', timer: 'timer', ok: 'check' };

  /**
   * kind : '' | 'ok' | 'alert' | 'timer' | 'pr'.
   * `undo` : callback facultatif ; affiche « Annuler » et laisse 6 s pour revenir.
   */
  function toast(msg, kind, undo) {
    var box = $('toast');
    var name = TOAST_ICO[kind];
    undoFn = undo || null;
    box.innerHTML = '<div class="toast' + (kind ? ' ' + kind : '') + '" role="status">' +
      (name ? ico(name, 19) : '') + '<span>' + esc(msg) + '</span>' +
      (undo ? '<button class="undo" data-act="undo">Annuler</button>' : '') + '</div>';
    clearTimeout(tT);
    tT = setTimeout(function () { box.innerHTML = ''; undoFn = null; },
      undo ? 6000 : kind === 'pr' ? 3400 : 2200);
  }

  function hideToast() { clearTimeout(tT); $('toast').innerHTML = ''; undoFn = null; }

  /* Écran allumé pendant la séance (best effort, ignoré si non supporté). */
  var wl = null;
  function wakeLock(on) {
    try {
      if (on && !wl && navigator.wakeLock) {
        navigator.wakeLock.request('screen').then(function (s) {
          wl = s;
          s.addEventListener('release', function () { wl = null; });
        }).catch(function () { });
      } else if (!on && wl) { wl.release(); wl = null; }
    } catch (e) { /* sans effet */ }
  }

  /* ================================================================== */
  /* Chrono de repos                                                     */
  /* ================================================================== */

  var rest = { end: 0, total: 0, iv: null };

  /**
   * Le chrono est mémorisé dans l'état : Chrome décharge volontiers un onglet
   * en arrière-plan, et un repos qui disparaît pendant qu'on soulève ne sert à rien.
   * On repart de l'heure de fin absolue, jamais d'un compteur en mémoire.
   */
  function restStart(sec, gardeFin) {
    rest.total = sec;
    rest.end = gardeFin || (Date.now() + sec * 1000);
    ST.rest = { end: rest.end, total: rest.total };
    save(true);
    clearInterval(rest.iv);
    rest.iv = setInterval(restTick, 250);
    document.body.classList.add('resting');
    restTick();
  }
  function restStop() {
    clearInterval(rest.iv);
    rest.iv = null; rest.end = 0;
    ST.rest = null;
    save();
    document.body.classList.remove('resting');
    $('rest').innerHTML = '';
  }
  /** Reprend un repos en cours après un rechargement de la page. */
  function restResume() {
    if (!ST.rest) return;
    var reste = (ST.rest.end - Date.now()) / 1000;
    if (reste <= 0.5) { ST.rest = null; save(); return; }
    restStart(ST.rest.total || Math.ceil(reste), ST.rest.end);
  }
  function restTick() {
    var left = (rest.end - Date.now()) / 1000;
    if (left <= 0) {
      restStop();
      beep(880, 0.16);
      setTimeout(function () { beep(1320, 0.22); }, 190);
      buzz([120, 80, 200]);
      toast('Repos terminé', 'timer');
      return;
    }
    var pct = Math.max(0, Math.min(100, (left / rest.total) * 100));
    $('rest').innerHTML =
      '<div class="rest">' +
      '<div class="bar" style="width:' + pct.toFixed(1) + '%"></div>' +
      '<div class="t">' + E.fmtClock(left) + '</div>' +
      '<div class="grow lb">Repos</div>' +
      '<button class="btn sm" data-act="rest-add">+30 s</button>' +
      '<button class="btn sm" data-act="rest-skip">Passer</button>' +
      '</div>';
  }

  /* ================================================================== */
  /* Séance : création, séries, clôture                                  */
  /* ================================================================== */

  var UI = { tab: 'ses', act: null, w: 20, r: 8, e: 0, wu: 0, edit: -1, proEx: null };

  function newSession(planIds, name) {
    var now = Date.now();
    ST.cur = {
      id: 's' + now,
      d: todayStr(now),
      t0: now,
      t1: 0,
      n: name || defaultName(planIds),
      s: [],
      p: (planIds || []).slice(),
      note: ''
    };
    UI.act = ST.cur.p[0] || null;
    UI.edit = -1;
    if (UI.act) prefill(UI.act);
    wakeLock(true);
    save(true);
  }

  /** Nom proposé : le groupe musculaire dominant du plan, sinon la date. */
  function defaultName(planIds) {
    var cnt = {}, i, g, best = null;
    for (i = 0; i < (planIds || []).length; i++) {
      g = exOf(planIds[i]).g;
      cnt[g] = (cnt[g] || 0) + 1;
      if (!best || cnt[g] > cnt[best]) best = g;
    }
    return best ? 'Séance ' + gName(best).toLowerCase() : 'Séance';
  }

  /** Exercices affichés dans la séance : le plan + tout exercice ayant des séries. */
  function sessionExercises(ses) {
    var out = (ses.p || []).slice(), i;
    for (i = 0; i < ses.s.length; i++) if (out.indexOf(ses.s[i].x) < 0) out.push(ses.s[i].x);
    return out;
  }

  function setsOf(ses, exId) {
    var out = [], i;
    for (i = 0; i < ses.s.length; i++) if (ses.s[i].x === exId) out.push({ ix: i, s: ses.s[i] });
    return out;
  }

  /** Pré-remplit le pavé : dernière série de la séance, sinon dernier passage. */
  function prefill(exId) {
    var ex = exOf(exId);
    var mine = ST.cur ? setsOf(ST.cur, exId) : [];
    if (mine.length) {
      var last = mine[mine.length - 1].s;
      UI.w = last.w; UI.r = last.r; UI.e = 0; UI.wu = 0;
      return;
    }
    var lp = E.lastPerf(ST.ses, exId, ST.cur && ST.cur.id);
    if (lp && lp.sets.length) {
      UI.w = lp.sets[0].w; UI.r = lp.sets[0].r; UI.e = 0; UI.wu = 0;
      return;
    }
    UI.w = ex.bw ? 0 : (ex.bar ? ST.set.bar : 10);
    UI.r = 8; UI.e = 0; UI.wu = 0;
  }

  function addSet() {
    if (!ST.cur || !UI.act) return;
    var ex = exOf(UI.act);
    var s = {
      x: UI.act,
      w: E.r2(Number(UI.w) || 0),
      r: Math.max(0, Math.round(Number(UI.r) || 0)),
      e: ST.set.rpe ? (Number(UI.e) || 0) : 0,
      u: UI.wu ? 1 : 0,
      t: Date.now()
    };
    if (s.r <= 0) { toast('Indique au moins une répétition'); return; }

    if (UI.edit >= 0 && ST.cur.s[UI.edit]) {
      s.t = ST.cur.s[UI.edit].t;
      ST.cur.s[UI.edit] = s;
      UI.edit = -1;
      save(true); render();
      toast('Série modifiée');
      return;
    }

    // Record ? On compare au meilleur AVANT cette série.
    var prev = E.bestSets(ST.ses.concat([ST.cur]), IX, bwNow())[UI.act];
    ST.cur.s.push(s);
    if (ST.cur.p.indexOf(UI.act) < 0) ST.cur.p.push(UI.act);
    save(true);

    var pr = s.u ? { pr: false } : E.prCheck(prev, s, ex, bwNow());
    render();

    keepPadVisible();

    if (pr.pr) {
      var lbl = pr.kind === 'load' ? 'charge' : pr.kind === 'reps' ? 'répétitions' : '1RM estimé';
      toast('Record — ' + lbl, 'pr');
      beep(1046, 0.12);
      setTimeout(function () { beep(1568, 0.2); }, 130);
      buzz([40, 60, 40, 60, 120]);
    } else {
      beep(660, 0.07);
      buzz(25);
    }
    if (ST.set.restAuto && !s.u) restStart(ST.set.rest);
    // Une série d'échauffement ne vaut que pour elle-même : sans ce désarmement,
    // toutes les séries de travail suivantes étaient marquées u:1 en silence.
    if (s.u) { UI.wu = 0; render(); }
  }

  function delSet(ix) {
    if (!ST.cur || !ST.cur.s[ix]) return;
    var retiree = ST.cur.s[ix];
    ST.cur.s.splice(ix, 1);
    UI.edit = -1;   // les index bougent : on annule toute modification en cours
    save(true); render();
    toast(setLabelPlain(retiree, exOf(retiree.x)) + ' supprimée', null, function () {
      if (!ST.cur) return;
      ST.cur.s.splice(Math.min(ix, ST.cur.s.length), 0, retiree);
      if (ST.cur.p.indexOf(retiree.x) < 0) ST.cur.p.push(retiree.x);
      save(true); render();
      toast('Série rétablie', 'ok');
    });
  }

  /** Libellé de série en texte brut, pour un message. */
  function setLabelPlain(st, ex) {
    if (ex.bw && !st.w) return st.r + ' reps';
    if (ex.bw) return '+' + num(st.w) + ' kg x ' + st.r;
    return num(st.w) + ' kg x ' + st.r;
  }

  function finishSession() {
    if (!ST.cur) return;
    if (!ST.cur.s.length) {
      askDialog({
        title: 'Abandonner la séance ?',
        text: 'Aucune série n’a été enregistrée. Rien ne sera conservé.',
        ok: 'Abandonner', danger: true
      }, function () {
        ST.cur = null; UI.act = null;
        restStop(); wakeLock(false); save(true); render();
      });
      return;
    }
    var st = E.sessionStats(Object.assign({}, ST.cur, { t1: Date.now() }), IX, bwNow());
    askDialog({
      title: 'Terminer la séance ?',
      text: st.sets + ' séries · ' + E.fmtVol(st.vol) + ' · ' + E.fmtDur(Date.now() - ST.cur.t0),
      ok: 'Terminer'
    }, function () {
      if (!ST.cur) return;
      ST.cur.t1 = Date.now();
      ST.ses.push(ST.cur);
      ST.ses.sort(function (a, b) { return (a.t0 || 0) - (b.t0 || 0); });
      ST.cur = null;
      UI.act = null;
      restStop(); wakeLock(false);
      save(true); render();
      toast('Séance enregistrée', 'ok');
    });
  }

  /* ================================================================== */
  /* Rendu — aiguillage                                                  */
  /* ================================================================== */

  function render() {
    reindex();
    var st = E.weekStreak(ST.ses, todayStr());
    $('streak').innerHTML = st > 0 ? ico('flame', 14) + '<span>' + st + ' sem.</span>' : '';
    $('streak').style.display = st > 0 ? '' : 'none';
    $('streak').title = st > 0 ? st + ' semaine' + (st > 1 ? 's' : '') + ' d\u2019affil\u00e9e avec au moins une s\u00e9ance' : '';

    var nav = $('nav').children, i;
    for (i = 0; i < nav.length; i++) nav[i].className = nav[i].dataset.tab === UI.tab ? 'on' : '';

    var v = $('view');
    if (UI.tab === 'ses') v.innerHTML = viewSession();
    else if (UI.tab === 'his') v.innerHTML = viewHistory();
    else v.innerHTML = viewProgress();

    if (UI.tab === 'pro') drawCharts();
    if (UI.tab === 'ses' && ST.cur) tickSessionClock();
    syncAddState();
  }

  /* ================================================================== */
  /* Onglet SÉANCE                                                       */
  /* ================================================================== */

  function viewSession() {
    return ST.cur ? sessionActive() : sessionIdle();
  }

  function sessionIdle() {
    var h = '';
    var wk = E.weekSeries(ST.ses, IX, bwNow());
    var cur = wk.length && wk[wk.length - 1].k === E.weekKey(todayStr()) ? wk[wk.length - 1] : null;

    h += '<div class="card">' +
      '<h2>Cette semaine</h2>' +
      '<div class="kpis">' +
      kpi(cur ? cur.sessions : 0, 'séances') +
      kpi(cur ? cur.sets : 0, 'séries') +
      kpi(cur ? E.fmtVol(cur.vol) : '0 kg', 'tonnage') +
      '</div></div>';

    h += '<button class="btn pri big" data-act="new-empty">' + ico('plus', 22) + 'Nouvelle séance</button>';

    // Reprise rapide : les 3 dernières séances distinctes par composition.
    var seen = {}, quick = [], i, ses, key;
    for (i = ST.ses.length - 1; i >= 0 && quick.length < 3; i--) {
      ses = ST.ses[i];
      key = sessionExercises(ses).slice().sort().join('|');
      if (seen[key]) continue;
      seen[key] = 1;
      quick.push(ses);
    }
    if (quick.length) {
      h += '<div class="card" style="margin-top:var(--s3)"><h2>Refaire une séance</h2>';
      for (i = 0; i < quick.length; i++) {
        var exs = sessionExercises(quick[i]);
        h += '<button class="btn cardbtn" data-act="repeat" data-id="' + esc(quick[i].id) + '">' +
          '<span class="grow">' +
          '<span class="t1">' + esc(quick[i].n) + '</span>' +
          '<span class="t2 ellip">' + esc(relDate(quick[i].d)) + ' · ' +
          esc(exs.slice(0, 3).map(function (x) { return exName(x); }).join(', ') +
            (exs.length > 3 ? ' +' + (exs.length - 3) : '')) + '</span></span>' +
          '<span class="acc">' + ico('repeat', 20) + '</span></button>';
      }
      h += '</div>';
    } else {
      h += '<div class="empty"><div class="big">' + ico('dumbbell', 44) + '</div>' +
        'Première séance ? Lance-toi : ajoute un exercice, tape ta charge et tes reps, ' +
        'et Forge se souvient de tout pour la fois suivante.</div>';
    }
    return h;
  }

  function kpi(n, l, delta) {
    return '<div class="kpi"><div class="n">' + esc(n) + '</div><div class="l">' + esc(l) + '</div>' +
      (delta ? '<div class="d ' + (delta.up ? 'up' : 'dn') + '">' + esc(delta.txt) + '</div>' : '') + '</div>';
  }

  function sessionActive() {
    var ses = ST.cur;
    var st = E.sessionStats(Object.assign({}, ses, { t1: Date.now() }), IX, bwNow());
    var h = '';

    h += '<div class="sesbar">' +
      '<input class="nm grow" id="sesName" value="' + esc(ses.n) + '" aria-label="Nom de la séance">' +
      '<span class="t" id="sesClock">0:00</span>' +
      '<button class="btn sm pri" data-act="finish">Terminer</button>' +
      '</div>';

    h += '<div class="sesline">' +
      '<span>' + st.sets + ' série' + (st.sets > 1 ? 's' : '') + '</span><span>·</span>' +
      '<span>' + E.fmtVol(st.vol) + '</span><span>·</span>' +
      '<span>' + st.reps + ' reps</span></div>';

    var exs = sessionExercises(ses), i;
    for (i = 0; i < exs.length; i++) h += exBlock(ses, exs[i]);

    h += '<button class="btn big" data-act="pick">' + ico('plus', 22) + 'Ajouter un exercice</button>';
    h += '<div class="tail"></div>';
    return h;
  }

  function exBlock(ses, exId) {
    var ex = exOf(exId);
    var mine = setsOf(ses, exId);
    var active = UI.act === exId;
    var h = '<div class="exblk' + (active ? ' act' : '') + '">';

    h += '<button class="h" data-act="focus" data-id="' + esc(exId) + '">' +
      '<span class="gdot" style="background:' + gColor(ex.g) + '"></span>' +
      '<span class="grow"><span class="nm">' + esc(ex.n) + '</span><br>' +
      '<span class="sub">' + esc(gName(ex.g)) + ' · ' + esc(CAT.EQUIP[ex.eq] || '') +
      (mine.length ? ' · ' + mine.length + ' série' + (mine.length > 1 ? 's' : '') : '') +
      '</span></span>' +
      '<span class="chev">' + ico(active ? 'chevronDown' : 'chevronRight', 20) + '</span></button>';

    h += '<div class="body">';

    var i, s, n = 0;
    for (i = 0; i < mine.length; i++) {
      s = mine[i].s;
      if (!s.u) n++;
      h += '<div class="setrow' + (s.u ? ' wu' : '') + '">' +
        '<span class="i">' + (s.u ? ico('flame', 14) : n) + '</span>' +
        '<button class="grow" style="text-align:left" data-act="edit" data-ix="' + mine[i].ix + '">' +
        '<span class="v">' + setLabel(s, ex) + '</span>' +
        (s.e ? ' <span class="tiny muted">RPE ' + s.e + '</span>' : '') +
        '</button>' +
        '<button class="x" data-act="del" data-ix="' + mine[i].ix + '" aria-label="Supprimer la série">' + ico('trash', 18) + '</button>' +
        '</div>';
    }

    if (active) {
      var lp = E.lastPerf(ST.ses, exId, ses.id);
      if (lp) {
        h += '<div class="lastref">Dernière fois (' + esc(relDate(lp.d)) + ') : ' +
          lp.sets.map(function (x) { return num(x.w) + '×' + x.r; }).join(', ') + '</div>';
      }
      h += pad(ex);
      if (ST.set.cues && ex.c) h += '<div class="cue">' + ico('bulb', 16) + '<span>' + esc(ex.c) + '</span></div>';
    }

    h += '</div></div>';
    return h;
  }

  function setLabel(s, ex) {
    if (ex.bw && !s.w) return s.r + ' reps';
    if (ex.bw) return '+' + num(s.w) + ' kg × ' + s.r;
    return num(s.w) + ' kg × ' + s.r + (ex.uni ? ' <span class="tiny muted">/côté</span>' : '');
  }

  function pad(ex) {
    var h = '<div class="pad">';
    var step = ex.bar ? Math.max(ST.set.step, 2 * (minPlate() || 1.25)) : ST.set.step;

    h += '<div class="stepper">' +
      '<div class="lab">' + (ex.bw ? 'Lest' : 'Charge') + '</div>' +
      '<button class="mn" data-act="w-" data-step="' + step + '" aria-label="Diminuer la charge">' + ico('minus') + '</button>' +
      '<input class="val" id="padW" type="number" inputmode="decimal" step="0.25" enterkeyhint="done" ' +
      'aria-label="Charge en kilos" value="' + dec(UI.w) + '">' +
      '<button class="pl" data-act="w+" data-step="' + step + '" aria-label="Augmenter la charge">' + ico('plus') + '</button>' +
      '</div>';

    if (ex.bar) h += '<div class="plates" id="padPlates">' + platesLine(UI.w) + '</div>';
    else if (ex.uni) h += '<div class="plates">charge d’UN côté — enregistre une série par côté</div>';
    else if (ex.bw) h += '<div class="plates">0 = poids du corps seul' +
      ' (' + num(bwNow()) + ' kg pris en compte)</div>';

    h += '<div class="stepper">' +
      '<div class="lab">Reps</div>' +
      '<button class="mn" data-act="r-" aria-label="Une répétition de moins">' + ico('minus') + '</button>' +
      '<input class="val" id="padR" type="number" inputmode="numeric" step="1" enterkeyhint="done" ' +
      'aria-label="Nombre de répétitions" value="' + (UI.r | 0) + '">' +
      '<button class="pl" data-act="r+" aria-label="Une répétition de plus">' + ico('plus') + '</button>' +
      '</div>';

    if (ST.set.rpe) {
      h += '<div class="rpe">';
      [6, 7, 8, 9, 10].forEach(function (v) {
        h += '<button data-act="rpe" data-v="' + v + '"' + (UI.e === v ? ' class="on"' : '') + '>RPE ' + v + '</button>';
      });
      h += '</div>';
    }

    h += '<div class="row wrap" style="margin-bottom:var(--s3)">' +
      '<button class="chip' + (UI.wu ? ' on' : '') + '" data-act="wu" aria-pressed="' + (UI.wu ? 'true' : 'false') + '">' +
      ico('flame', 17) + 'Échauffement</button>' +
      '<button class="chip" data-act="rest-now">' + ico('timer', 17) + 'Repos</button>' +
      '<button class="chip" data-act="ex-del" data-id="' + esc(ex.id) + '">' + ico('trash', 17) + 'Retirer</button>' +
      (UI.edit >= 0 ? '<span class="grow"></span><button class="chip" data-act="cancel-edit">Annuler la modif</button>' : '') +
      '</div>';

    h += '<button class="btn pri big" data-act="add"' + ((UI.r | 0) > 0 ? '' : ' disabled') + '>' +
      ico('check', 22) + (UI.edit >= 0 ? 'Enregistrer la modification' : 'Valider la série') + '</button>';

    h += '</div>';
    return h;
  }

  /**
   * Le pavé de saisie descend d'une ligne à chaque série validée : au bout de
   * quatre séries le bouton passait sous le chrono de repos et la barre de
   * navigation. On le ramène dans la zone visible après chaque ajout.
   */
  function keepPadVisible() {
    var b = document.querySelector('[data-act="add"]');
    if (!b) return;
    var basse = (document.body.classList.contains('resting') ? 62 : 0) + 74;
    var r = b.getBoundingClientRect();
    var deborde = r.bottom - (window.innerHeight - basse);
    if (deborde > 0) window.scrollBy({ top: deborde + 12, behavior: 'smooth' });
  }

  function minPlate() {
    var m = Infinity, p = ST.set.plates || [], i;
    for (i = 0; i < p.length; i++) if (p[i].n > 0) m = Math.min(m, p[i].w);
    return m === Infinity ? 0 : m;
  }

  function platesLine(target) {
    var p = E.platePlan(target, ST.set.bar, ST.set.plates);
    if (Math.abs(target - ST.set.bar) < 0.001) return 'barre à vide (' + num(ST.set.bar) + ' kg)';
    if (!p.ok) {
      var near = E.nearestLoadable(target, ST.set.bar, ST.set.plates);
      return '<span class="warnc">' + ico('alert', 14) + ' non chargeable — le plus proche : <b>' + num(near) + ' kg</b></span>';
    }
    if (!p.side.length) return 'barre seule';
    return 'par côté : ' + p.side.map(function (s) {
      return '<b>' + (s.n > 1 ? s.n + '×' : '') + num(s.w) + '</b>';
    }).join(' + ') + ' kg';
  }

  var clockIv = null;
  function tickSessionClock() {
    clearInterval(clockIv);
    var el = $('sesClock');
    if (!el || !ST.cur) return;
    var upd = function () {
      var e2 = $('sesClock');
      if (!e2 || !ST.cur) { clearInterval(clockIv); return; }
      e2.textContent = E.fmtClock((Date.now() - ST.cur.t0) / 1000);
    };
    upd();
    clockIv = setInterval(upd, 1000);
  }

  /* ================================================================== */
  /* Onglet HISTORIQUE                                                   */
  /* ================================================================== */

  function viewHistory() {
    if (!ST.ses.length && !ST.cur) {
      return '<div class="empty"><div class="big">' + ico('log', 44) + '</div>Aucune séance enregistrée pour l’instant.</div>';
    }
    var h = '', i, ses, st, lastMonth = '';

    if (ST.cur) {
      h += '<div class="card" style="border-color:var(--acc)">' +
        '<div class="row"><span class="grow"><b>' + esc(ST.cur.n) + '</b><br>' +
        '<span class="small muted">séance en cours · ' + ST.cur.s.length + ' séries</span></span>' +
        '<button class="btn sm pri" data-act="go-ses">Reprendre</button></div></div>';
    }

    for (i = ST.ses.length - 1; i >= 0; i--) {
      ses = ST.ses[i];
      var m = ses.d.slice(0, 7);
      if (m !== lastMonth) {
        lastMonth = m;
        var p = m.split('-');
        h += '<h2 class="mhead">' + esc(MONTHS[+p[1] - 1] + ' ' + p[0]) + '</h2>';
      }
      st = E.sessionStats(ses, IX, bwNow(ses.d));
      h += '<button class="card seslink" data-act="sesdet" data-id="' + esc(ses.id) + '">' +
        '<div class="row"><span class="grow"><b>' + esc(ses.n) + '</b><br>' +
        '<span class="small muted">' + esc(relDate(ses.d)) + '</span></span>' +
        '<span style="color:var(--fg3)">›</span></div>' +
        '<div class="stat">' +
        '<span><b>' + st.sets + '</b> séries</span>' +
        '<span><b>' + E.fmtVol(st.vol) + '</b></span>' +
        '<span><b>' + st.exs + '</b> exos</span>' +
        (st.dur ? '<span><b>' + E.fmtDur(st.dur) + '</b></span>' : '') +
        '</div></button>';
    }
    return h;
  }

  function sessionDetail(id) {
    var ses = null, i;
    for (i = 0; i < ST.ses.length; i++) if (ST.ses[i].id === id) ses = ST.ses[i];
    if (!ses) return;
    var st = E.sessionStats(ses, IX, bwNow(ses.d));
    var exs = sessionExercises(ses);

    var h = '<div class="card"><div class="kpis">' +
      kpi(st.sets, 'séries') + kpi(E.fmtVol(st.vol), 'tonnage') +
      kpi(st.dur ? E.fmtDur(st.dur) : '—', 'durée') + '</div></div>';

    for (i = 0; i < exs.length; i++) {
      var ex = exOf(exs[i]);
      var mine = setsOf(ses, exs[i]);
      h += '<div class="card"><div class="row" style="margin-bottom:var(--s2)">' +
        '<span class="gdot" style="background:' + gColor(ex.g) + '"></span>' +
        '<b class="grow">' + esc(ex.n) + '</b></div>';
      var n = 0;
      mine.forEach(function (m) {
        if (!m.s.u) n++;
        h += '<div class="setrow' + (m.s.u ? ' wu' : '') + '">' +
          '<span class="i">' + (m.s.u ? ico('flame', 14) : n) + '</span>' +
          '<span class="grow v">' + setLabel(m.s, ex) + '</span>' +
          (m.s.e ? '<span class="tiny muted">RPE ' + m.s.e + '</span>' : '') +
          '</div>';
      });
      h += '</div>';
    }

    h += '<div class="card"><label class="small muted">Note de séance</label>' +
      '<textarea id="sesNote" rows="3" placeholder="Sensations, douleurs, remarques…">' + esc(ses.note || '') + '</textarea></div>';

    h += '<button class="btn big" data-act="repeat" data-id="' + esc(ses.id) + '">' + ico('repeat', 21) + 'Refaire cette séance</button>' +
      '<div class="sp-2"></div>' +
      '<button class="btn big danger" data-act="delses" data-id="' + esc(ses.id) + '">' + ico('trash', 20) + 'Supprimer cette séance</button>' +
      '<div class="tail"></div>';

    openSheet(esc(ses.n) + ' — ' + esc(longDate(ses.d)), h, function () {
      var t = $('sesNote');
      if (t) { ses.note = t.value; save(true); }
    });
  }

  /* ================================================================== */
  /* Onglet PROGRÈS                                                      */
  /* ================================================================== */

  function viewProgress() {
    if (!ST.ses.length) {
      return '<div class="empty"><div class="big">' + ico('trend', 44) + '</div>Les courbes apparaîtront après ta première séance terminée.</div>';
    }
    var h = '';
    var wk = E.weekSeries(ST.ses, IX, bwNow());
    var thisK = E.weekKey(todayStr()), prevK = E.weekKey(E.shiftDate(todayStr(), -7));
    var cw = null, pw = null, i;
    for (i = 0; i < wk.length; i++) {
      if (wk[i].k === thisK) cw = wk[i];
      if (wk[i].k === prevK) pw = wk[i];
    }
    var cv = cw ? cw.vol : 0, pv = pw ? pw.vol : 0;
    var dv = pv > 0 ? Math.round(((cv - pv) / pv) * 100) : null;

    h += '<div class="card"><h2>Cette semaine</h2><div class="kpis">' +
      kpi(cw ? cw.sessions : 0, 'séances') +
      kpi(cw ? cw.sets : 0, 'séries') +
      kpi(E.fmtVol(cv), 'tonnage', dv === null ? null : { up: dv >= 0, txt: (dv >= 0 ? '+' : '') + dv + '%' }) +
      '</div>' +
      '<div class="small muted" style="margin-top:var(--s3)">Semaine précédente : ' + E.fmtVol(pv) + '</div>' +
      '</div>';

    h += '<div class="card"><h2>Tonnage par semaine</h2><div id="chWeek"></div></div>';

    // Progression d'un exercice
    var best = E.bestSets(ST.ses, IX, bwNow());
    var ids = Object.keys(best);
    ids.sort(function (a, b) { return exName(a).localeCompare(exName(b), 'fr'); });
    if (!UI.proEx || ids.indexOf(UI.proEx) < 0) UI.proEx = mostUsedExercise(ids);

    h += '<div class="card"><h2>Progression</h2>' +
      '<select id="proSel" style="margin-bottom:var(--s3)">' +
      ids.map(function (id) {
        return '<option value="' + esc(id) + '"' + (id === UI.proEx ? ' selected' : '') + '>' + esc(exName(id)) + '</option>';
      }).join('') + '</select>' +
      '<div id="chEx"></div>' +
      '<div id="exNote" class="small muted" style="margin-top:var(--s2)"></div>' +
      '</div>';

    // Répartition par groupe (4 semaines)
    var since = E.shiftDate(todayStr(), -28);
    var gv = E.groupVolume(ST.ses, IX, since, bwNow());
    var gk = Object.keys(gv).sort(function (a, b) { return gv[b] - gv[a]; });
    if (gk.length) {
      var max = gv[gk[0]] || 1;
      h += '<div class="card"><h2>4 dernières semaines — par groupe</h2>';
      gk.forEach(function (g) {
        h += '<div class="gbar"><span class="nm ellip">' + esc(gName(g)) + '</span>' +
          '<span class="tr"><span class="fl" style="width:' + Math.max(2, (gv[g] / max) * 100).toFixed(1) + '%;background:' + gColor(g) + '"></span></span>' +
          '<span class="vl">' + E.fmtVol(gv[g]) + '</span></div>';
      });
      h += '<div class="tiny muted" style="margin-top:var(--s2)">Le groupe principal compte pour 1, les groupes secondaires pour 0,5.</div></div>';
    }

    // Records
    h += '<div class="card"><h2>Records</h2>';
    var byDate = ids.slice().sort(function (a, b) { return best[b].d < best[a].d ? -1 : 1; });
    byDate.forEach(function (id) {
      var b = best[id];
      h += '<div class="rec">' +
        '<span class="gdot" style="background:' + gColor(exOf(id).g) + '"></span>' +
        '<span class="grow ellip">' + esc(exName(id)) + '</span>' +
        '<span class="w">' + num(b.w) + ' × ' + b.r + '</span>' +
        '<span class="e">1RM ' + num(b.e1rm) + '</span>' +
        '</div>';
    });
    h += '</div>';

    // Poids de corps
    h += '<div class="card"><h2>Poids de corps</h2>' +
      '<div class="row"><input id="bwIn" type="number" inputmode="decimal" step="0.1" placeholder="' + num(bwNow()) + '" class="grow">' +
      '<button class="btn" data-act="bwadd">Noter</button></div>';
    if (ST.bw.length) {
      var sorted = ST.bw.slice().sort(function (a, b) { return a.d < b.d ? 1 : -1; });
      h += '<div class="small muted" style="margin-top:var(--s3)">' +
        sorted.slice(0, 5).map(function (b) { return esc(relDate(b.d)) + ' : <b>' + num(b.w) + ' kg</b>'; }).join(' · ') +
        '</div>';
    } else {
      h += '<div class="tiny muted" style="margin-top:var(--s2)">Sert à compter les tractions et les pompes dans le tonnage.</div>';
    }
    h += '</div>';

    h += '<div class="tail"></div>';
    return h;
  }

  function mostUsedExercise(ids) {
    var cnt = {}, i, j;
    for (i = 0; i < ST.ses.length; i++) {
      for (j = 0; j < ST.ses[i].s.length; j++) cnt[ST.ses[i].s[j].x] = (cnt[ST.ses[i].s[j].x] || 0) + 1;
    }
    var best = ids[0], k;
    for (k = 0; k < ids.length; k++) if ((cnt[ids[k]] || 0) > (cnt[best] || 0)) best = ids[k];
    return best;
  }

  /* --------------------------- Graphiques SVG ----------------------- */

  /** "2026-08-10" -> "10/08" : une date se situe, un numéro de semaine ISO non. */
  function dayMonth(ds) { return ds.slice(8) + '/' + ds.slice(5, 7); }

  function drawCharts() {
    var wk = E.weekSeries(ST.ses, IX, bwNow()).slice(-12);
    var box = $('chWeek');
    if (box) box.innerHTML = barChart(wk.map(function (w) {
      return { v: w.vol, l: dayMonth(E.weekStart(w.k)) };
    }), E.weekKey(todayStr()) === (wk.length ? wk[wk.length - 1].k : ''));

    var ex = $('chEx');
    if (ex && UI.proEx) {
      var pts = E.exerciseSeries(ST.ses, UI.proEx, IX, bwNow());
      ex.innerHTML = lineChart(pts.map(function (p) { return { v: p.e1rm, l: p.d.slice(8) + '/' + p.d.slice(5, 7) }; }));
      var note = $('exNote');
      if (note && pts.length) {
        var f = pts[0], l = pts[pts.length - 1];
        var d = l.e1rm - f.e1rm;
        note.innerHTML = 'Meilleure série : <b>' + num(l.top.w) + ' kg × ' + l.top.r + '</b> ' + esc(relDate(l.d)) +
          ' · 1RM estimé ' + (d >= 0 ? '+' : '') + num(d) + ' kg depuis le début' +
          ' · ' + pts.length + ' séance' + (pts.length > 1 ? 's' : '');
      } else if (note) {
        note.textContent = '';
      }
    }
  }

  /**
   * Histogramme du tonnage hebdomadaire.
   * L'échelle haute est une valeur ronde RÉELLE (E.niceMax), imprimée sur le
   * graphique : une barre sans repère chiffré ne dit rien.
   */
  function barChart(data, lastIsCurrent) {
    if (!data.length) return '<div class="tiny muted">Pas encore de données.</div>';
    var W = 320, H = 138, pb = 20, pt = 14, pl = 2;
    var reel = Math.max.apply(null, data.map(function (d) { return d.v; })) || 0;
    var haut = E.niceMax(reel);
    var slot = (W - pl * 2) / data.length;
    var bw = Math.min(slot * 0.68, 34);   // sans plafond, une seule semaine remplit tout le cadre
    var ih = H - pb - pt;
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="Tonnage par semaine, maximum ' + esc(E.fmtVol(haut)) + '">';
    s += '<line class="grid" x1="0" y1="' + pt + '" x2="' + W + '" y2="' + pt + '" stroke-dasharray="3 3"/>';
    s += '<line class="grid" x1="0" y1="' + (H - pb) + '" x2="' + W + '" y2="' + (H - pb) + '"/>';
    s += '<text class="val" x="2" y="' + (pt - 4) + '">' + esc(E.fmtVol(haut)) + '</text>';
    data.forEach(function (d, i) {
      var hgt = Math.max(1, (ih * d.v) / haut);
      var x = pl + i * slot + (slot - bw) / 2;
      s += '<rect class="bar' + (lastIsCurrent && i === data.length - 1 ? ' dim' : '') + '" x="' + x.toFixed(1) +
        '" y="' + (H - pb - hgt).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hgt.toFixed(1) + '" rx="2"/>';
      if (data.length <= 7 || i % 2 === data.length % 2) {
        s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(d.l) + '</text>';
      }
    });
    s += '</svg>';
    return s;
  }

  /**
   * Courbe du 1RM estimé.
   * Les deux graduations affichées sont les BORNES RÉELLES de l'axe, calées sur
   * une grille ronde. L'ancienne version imprimait un maximum gonflé de 18 %
   * pour aérer le tracé : le chiffre lu ne correspondait à aucune séance.
   */
  function lineChart(data) {
    if (data.length < 2) {
      return '<div class="tiny muted">Au moins deux séances sont nécessaires pour tracer une courbe.</div>';
    }
    var W = 320, H = 154, pb = 20, pt = 14, pl = 6, pr = 6;
    var vals = data.map(function (d) { return d.v; });
    var vmax = Math.max.apply(null, vals), vmin = Math.min.apply(null, vals);

    var haut = E.niceMax(vmax);
    var pas = haut / 8;
    var bas = Math.max(0, Math.floor(vmin / pas) * pas);
    if (haut - bas < pas) bas = Math.max(0, haut - pas);   // série plate : garder de la hauteur

    var iw = W - pl - pr, ih = H - pb - pt;
    var X = function (i) { return pl + (iw * i) / (data.length - 1); };
    var Y = function (v) { return pt + ih - (ih * (v - bas)) / (haut - bas); };

    var d = data.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1); }).join(' ');
    var area = d + ' L' + X(data.length - 1).toFixed(1) + ' ' + (pt + ih) + ' L' + X(0).toFixed(1) + ' ' + (pt + ih) + ' Z';

    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="1RM estimé, de ' + num(E.r1(bas)) + ' à ' + num(E.r1(haut)) + ' kilos">';
    s += '<line class="grid" x1="0" y1="' + pt + '" x2="' + W + '" y2="' + pt + '" stroke-dasharray="3 3"/>';
    s += '<line class="grid" x1="0" y1="' + (pt + ih) + '" x2="' + W + '" y2="' + (pt + ih) + '"/>';
    s += '<path class="ar" d="' + area + '"/><path class="ln" d="' + d + '"/>';
    data.forEach(function (p, i) {
      if (data.length <= 14 || i === 0 || i === data.length - 1) {
        s += '<circle class="pt" cx="' + X(i).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="3"/>';
      }
    });
    s += '<text class="val" x="2" y="' + (pt - 4) + '">' + num(E.r1(haut)) + ' kg</text>';
    s += '<text class="val" x="2" y="' + (pt + ih - 4) + '">' + num(E.r1(bas)) + ' kg</text>';
    s += '<text x="' + pl + '" y="' + (H - 5) + '">' + esc(data[0].l) + '</text>';
    s += '<text x="' + (W - pr) + '" y="' + (H - 5) + '" text-anchor="end">' + esc(data[data.length - 1].l) + '</text>';
    s += '</svg>';
    return s;
  }

  /* ================================================================== */
  /* Feuilles (plein écran)                                              */
  /* ================================================================== */


  /* ================================================================== */
  /* Boîtes de dialogue de l'application                                 */
  /*                                                                     */
  /* Remplacent confirm()/prompt()/alert(). Sur Android, les dialogues    */
  /* natifs affichent l'origine du site en en-tête et sortent l'app       */
  /* installée de son plein écran — en plus d'être impossibles à styler.  */
  /* ================================================================== */

  var dlgOk = null, dlgFocusBack = null;

  /**
   * o = { title, text, ok, cancel, danger, input:{label, value, placeholder, type, confirmWord} }
   * onOk reçoit la valeur du champ si `input` est fourni.
   */
  function askDialog(o, onOk) {
    if (!$('dlg').innerHTML) pushLayer();
    dlgOk = onOk || null;
    dlgFocusBack = document.activeElement;
    var h = '<div class="ovl" data-act="dlg-back">' +
      '<div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlgTitle">' +
      '<h3 id="dlgTitle">' + esc(o.title) + '</h3>' +
      (o.text ? '<p>' + esc(o.text) + '</p>' : '');
    if (o.input) {
      h += '<label class="dlab" for="dlgIn">' + esc(o.input.label || '') + '</label>' +
        '<input id="dlgIn" type="' + (o.input.type || 'text') + '" ' +
        'value="' + esc(o.input.value || '') + '" ' +
        'placeholder="' + esc(o.input.placeholder || '') + '" ' +
        'autocomplete="off" enterkeyhint="done">';
    }
    h += '<div class="dacts">' +
      '<button class="btn" data-act="dlg-no">' + esc(o.cancel || 'Annuler') + '</button>' +
      '<button class="btn ' + (o.danger ? 'dgr' : 'pri') + '" data-act="dlg-yes">' + esc(o.ok || 'Confirmer') + '</button>' +
      '</div></div></div>';
    $('dlg').innerHTML = h;
    dlgWord = o.input && o.input.confirmWord ? o.input.confirmWord : null;
    var f = $('dlgIn');
    if (f) { f.focus(); f.select(); } else {
      var b = $('dlg').querySelector('[data-act="dlg-yes"]');
      if (b) b.focus();
    }
  }

  var dlgWord = null;

  function closeDialog(run) {
    var cb = dlgOk, f = $('dlgIn'), val = f ? f.value : null;
    dlgOk = null;
    $('dlg').innerHTML = '';
    if (dlgFocusBack && dlgFocusBack.focus) { try { dlgFocusBack.focus(); } catch (e) { } }
    dlgFocusBack = null;
    var word = dlgWord; dlgWord = null;
    if (run && cb) {
      if (word && String(val).trim().toUpperCase() !== word) { toast('Confirmation incorrecte', 'alert'); return; }
      cb(val);
    }
  }

  var sheetClose = null;

  function openSheet(title, html, onClose) {
    if (!$('sheet').innerHTML) pushLayer();
    sheetClose = onClose || null;
    $('sheet').innerHTML =
      '<div class="sheet"><div class="shd">' +
      '<button class="icobtn" data-act="closesheet" aria-label="Fermer">' + ico('close', 20) + '</button>' +
      '<h2 class="ellip">' + title + '</h2></div>' +
      '<div class="sbody">' + html + '</div></div>';
  }

  function closeSheet() {
    if (sheetClose) { try { sheetClose(); } catch (e) { } }
    sheetClose = null;
    $('sheet').innerHTML = '';
    render();
  }

  /* --------------------------- Choix d'un exercice ------------------ */

  var pickQ = '', pickG = '';

  function openPicker() {
    pickQ = ''; pickG = '';
    renderPicker();
  }

  function renderPicker() {
    var groups = Object.keys(CAT.GROUPS);
    var h = '<input id="pickIn" placeholder="Rechercher un exercice…" autocomplete="off" value="' + esc(pickQ) + '">';
    h += '<div class="row wrap" style="margin:var(--s3) 0">' +
      '<button class="chip' + (pickG ? '' : ' on') + '" data-act="pg" data-g="">Tous</button>' +
      groups.map(function (g) {
        return '<button class="chip' + (pickG === g ? ' on' : '') + '" data-act="pg" data-g="' + esc(g) + '">' +
          '<span class="gdot" style="background:' + gColor(g) + '"></span>' + esc(gName(g)) + '</button>';
      }).join('') + '</div>';

    var q = pickQ.trim().toLowerCase();
    var list = allExercises().filter(function (ex) {
      if (ex.off) return false;
      if (pickG && ex.g !== pickG && (ex.g2 || []).indexOf(pickG) < 0) return false;
      if (q && ex.n.toLowerCase().indexOf(q) < 0 && (CAT.EQUIP[ex.eq] || '').toLowerCase().indexOf(q) < 0) return false;
      return true;
    });

    // Les exercices récemment utilisés remontent en tête.
    var recent = {}, i, j, rank = 0;
    for (i = ST.ses.length - 1; i >= 0 && rank < 40; i--) {
      for (j = 0; j < ST.ses[i].s.length; j++) {
        if (!(ST.ses[i].s[j].x in recent)) recent[ST.ses[i].s[j].x] = rank++;
      }
    }
    list.sort(function (a, b) {
      var ra = a.id in recent ? recent[a.id] : 999;
      var rb = b.id in recent ? recent[b.id] : 999;
      if (ra !== rb) return ra - rb;
      return a.n.localeCompare(b.n, 'fr');
    });

    h += '<div class="exlist">';
    if (!list.length) h += '<div class="empty">Aucun exercice ne correspond.</div>';
    var wasRecent = null;
    list.forEach(function (ex) {
      var isR = ex.id in recent;
      if (wasRecent === null && isR) { h += '<div class="sect">Récents</div>'; wasRecent = true; }
      if (wasRecent && !isR) { h += '<div class="sect">Tous les exercices</div>'; wasRecent = false; }
      if (wasRecent === null && !isR) { h += '<div class="sect">Tous les exercices</div>'; wasRecent = false; }

      h += '<button data-act="pick-ex" data-id="' + esc(ex.id) + '">' +
        '<span class="gdot" style="background:' + gColor(ex.g) + '"></span>' +
        '<span class="grow"><span class="nm">' + esc(ex.n) + '</span><br>' +
        '<span class="sub">' + esc(gName(ex.g)) + ' · ' + esc(CAT.EQUIP[ex.eq] || '') + '</span></span>' +
        '</button>';
    });
    h += '</div>';

    h += '<div style="height:var(--s4)"></div>' +
      '<button class="btn big" data-act="newex">' + ico('plus', 20) + 'Créer un exercice perso</button>' +
      '<div class="sp-6"></div>';

    openSheet('Ajouter un exercice', h);
    var inp = $('pickIn');
    if (inp) {
      inp.value = pickQ;
      inp.oninput = function () { pickQ = inp.value; var p = inp.selectionStart; renderPicker(); var n = $('pickIn'); if (n) { n.focus(); n.setSelectionRange(p, p); } };
    }
  }

  function addExerciseToSession(exId) {
    if (!ST.cur) { newSession([exId]); }
    else if (ST.cur.p.indexOf(exId) < 0) {
      var auto = ST.cur.n === defaultName(ST.cur.p);   // nom jamais édité à la main
      ST.cur.p.push(exId);
      if (auto) ST.cur.n = defaultName(ST.cur.p);
    }
    UI.act = exId;
    UI.edit = -1;
    prefill(exId);
    save(true);
    closeSheet();
    UI.tab = 'ses';
    render();
  }

  var NEWEX = { g: 'pec', eq: 'db', n: '' };

  /** Formulaire d'exercice personnel — remplace deux prompt() successifs. */
  function newCustomExercise() {
    var h = '<div class="field"><label for="nxName">Nom de l’exercice</label>' +
      '<input id="nxName" value="' + esc(NEWEX.n) + '" placeholder="Ex. Rowing menton" autocomplete="off" enterkeyhint="done"></div>' +
      '<div class="field"><label>Groupe musculaire</label><div class="row wrap">' +
      Object.keys(CAT.GROUPS).map(function (g) {
        return '<button class="chip' + (NEWEX.g === g ? ' on' : '') + '" data-act="nx-g" data-g="' + esc(g) + '">' +
          '<span class="gdot" style="background:' + gColor(g) + '"></span>' + esc(gName(g)) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="field"><label>Équipement</label><div class="row wrap">' +
      Object.keys(CAT.EQUIP).map(function (e2) {
        return '<button class="chip' + (NEWEX.eq === e2 ? ' on' : '') + '" data-act="nx-eq" data-e="' + esc(e2) + '">' +
          esc(CAT.EQUIP[e2]) + '</button>';
      }).join('') + '</div>' +
      '<div class="hint">« Barre » active le calcul des disques. « Poids du corps » compte ton poids dans le tonnage.</div></div>' +
      '<button class="btn pri big" data-act="nx-save">' + ico('check', 21) + 'Créer l’exercice</button>';
    openSheet('Nouvel exercice', h);
    var f = $('nxName'); if (f) f.focus();
  }

  function readNewEx() { var f = $('nxName'); if (f) NEWEX.n = f.value; }

  function saveCustomExercise() {
    readNewEx();
    var f = $('nxName');
    var nm = NEWEX.n.trim();
    if (!nm) { toast('Donne un nom à l’exercice', 'alert'); if (f) f.focus(); return; }
    var id = 'perso-' + Date.now().toString(36);
    ST.ex[id] = {
      id: id, n: nm, g: NEWEX.g, eq: NEWEX.eq, perso: 1,
      bar: NEWEX.eq === 'bb' ? 1 : 0,
      bw: NEWEX.eq === 'bw' ? 1 : 0
    };
    NEWEX.n = '';
    save(true);
    reindex();
    addExerciseToSession(id);
    toast('Exercice créé', 'ok');
  }

  /* ================================================================== */
  /* Réglages                                                            */
  /* ================================================================== */

  function openSettings() {
    var s = ST.set;
    var h = '';

    h += '<div class="card"><h2>Saisie</h2>' +
      '<div class="field"><label>Pas des boutons + / − (kg)</label>' +
      '<input id="stStep" type="number" step="0.25" value="' + dec(s.step) + '">' +
      '<div class="hint">Le pas passe automatiquement au plus petit incrément possible sur la barre pour les exercices à la barre.</div></div>' +
      toggle('stRpe', 'Noter le RPE', 'Une ligne de boutons 6→10 après chaque série (difficulté ressentie).', s.rpe) +
      toggle('stCues', 'Rappels techniques', 'Affiche le point clé de forme sous l’exercice actif.', s.cues) +
      '</div>';

    h += '<div class="card"><h2>Repos</h2>' +
      '<div class="field"><label>Durée par défaut (secondes)</label>' +
      '<input id="stRest" type="number" step="15" min="0" value="' + (s.rest | 0) + '"></div>' +
      toggle('stRestAuto', 'Démarrage automatique', 'Le chrono part tout seul après chaque série non-échauffement.', s.restAuto) +
      toggle('stSound', 'Bip de fin', '', s.sound) +
      toggle('stVib', 'Vibration', '', s.vibrate) +
      '</div>';

    h += '<div class="card"><h2>Barre et disques</h2>' +
      '<div class="field"><label>Poids de la barre (kg)</label>' +
      '<input id="stBar" type="number" step="0.5" value="' + dec(s.bar) + '"></div>' +
      '<div class="field"><label>Disques disponibles</label>' +
      '<div id="plateEd">' + plateEditor() + '</div>' +
      '<div class="hint">Nombre de PAIRES de chaque disque. Sert au calcul « par côté » pendant la séance.</div></div>' +
      '</div>';

    h += '<div class="card"><h2>Toi</h2>' +
      '<div class="field"><label>Poids de corps par défaut (kg)</label>' +
      '<input id="stBw" type="number" step="0.5" value="' + dec(s.bw) + '">' +
      '<div class="hint">Utilisé tant qu’aucune pesée n’a été notée dans l’onglet Progrès. Compte les pompes et tractions dans le tonnage.</div></div>' +
      '<div class="field"><label>Thème</label>' +
      '<select id="stTheme">' +
      ['auto', 'dark', 'light'].map(function (t) {
        var lab = t === 'auto' ? 'Automatique (système)' : t === 'dark' ? 'Sombre' : 'Clair';
        return '<option value="' + t + '"' + (s.theme === t ? ' selected' : '') + '>' + lab + '</option>';
      }).join('') + '</select></div>' +
      '</div>';

    h += '<div class="card"><h2>Données</h2>' +
      '<div class="small muted" style="margin-bottom:var(--s3)">Tout est stocké dans ce téléphone, et nulle part ailleurs. ' +
      '<b>Exporte régulièrement</b> : effacer les données du site effacerait toute la progression.</div>' +
      '<button class="btn big" data-act="export">' + ico('download', 21) + 'Exporter (fichier JSON)</button><div class="sp-2"></div>' +
      '<button class="btn big" data-act="import">' + ico('upload', 21) + 'Importer une sauvegarde</button>' +
      '<input type="file" id="impFile" accept="application/json,.json" class="hide">' +
      '<div class="hint">' + ST.ses.length + ' séance' + (ST.ses.length > 1 ? 's' : '') +
      ' enregistrée' + (ST.ses.length > 1 ? 's' : '') +
      (Object.keys(ST.ex).length ? ' · ' + Object.keys(ST.ex).length + ' exercice' +
        (Object.keys(ST.ex).length > 1 ? 's' : '') + ' perso' : '') + '</div>' +
      '</div>';

    h += '<div class="card"><h2>Zone rouge</h2>' +
      '<button class="btn big danger" data-act="wipe">Tout effacer</button>' +
      '<div class="hint" style="margin-top:var(--s2)">Irréversible. Exporte d’abord.</div></div>';

    h += '<div class="tiny muted center" style="padding:var(--s4) 0 var(--s6)">Forge · PWA hors-ligne · données locales</div>';

    openSheet('Réglages', h, applySettings);
  }

  function toggle(id, label, hint, on) {
    return '<div class="toggle"><span><span class="tl">' + esc(label) + '</span>' +
      (hint ? '<br><span class="th">' + esc(hint) + '</span>' : '') + '</span>' +
      '<button class="sw' + (on ? ' on' : '') + '" id="' + id + '" data-act="sw" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + esc(label) + '"></button></div>';
  }

  function plateEditor() {
    return (ST.set.plates || []).map(function (p, i) {
      return '<div class="row" style="margin-bottom:var(--s2)">' +
        '<span class="plw">' + num(p.w) + ' kg</span>' +
        '<button class="btn sm" data-act="pl-" data-i="' + i + '">−</button>' +
        '<span class="pln">' + p.n + ' paire' + (p.n > 1 ? 's' : '') + '</span>' +
        '<button class="btn sm" data-act="pl+" data-i="' + i + '">+</button>' +
        '</div>';
    }).join('');
  }

  function applySettings() {
    var g = function (id) { var e2 = $(id); return e2 ? e2.value : null; };
    var v;
    v = parseFloat(g('stStep')); if (v > 0) ST.set.step = v;
    v = parseInt(g('stRest'), 10); if (v >= 0) ST.set.rest = v;
    v = parseFloat(g('stBar')); if (v >= 0) ST.set.bar = v;
    v = parseFloat(g('stBw')); if (v > 0) ST.set.bw = v;
    v = g('stTheme'); if (v) ST.set.theme = v;
    applyTheme();
    save(true);
  }

  function applyTheme() {
    var t = ST.set.theme;
    if (t !== 'dark' && t !== 'light') {
      t = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name=theme-color]');
    if (m) m.setAttribute('content', t === 'light' ? '#faf7f4' : '#14110f');
  }

  /* ================================================================== */
  /* Export / import                                                     */
  /* ================================================================== */

  function doExport() {
    var payload = JSON.stringify({ app: 'forge', v: 1, at: new Date().toISOString(), state: ST }, null, 1);
    var blob = new Blob([payload], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'forge-export-' + todayStr() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
    toast('Export généré');
  }

  function doImport(file) {
    var fr = new FileReader();
    fr.onload = function () {
      var data;
      try { data = JSON.parse(fr.result); } catch (e) { toast('Fichier illisible', 'alert'); return; }
      var st = data && data.state ? data.state : data;
      if (!st || !Array.isArray(st.ses)) { toast('Ce n’est pas une sauvegarde Forge', 'alert'); return; }
      askDialog({
        title: 'Restaurer cette sauvegarde ?',
        text: 'Le fichier contient ' + st.ses.length + ' séance' + (st.ses.length > 1 ? 's' : '') +
          '. Tes ' + ST.ses.length + ' séance' + (ST.ses.length > 1 ? 's' : '') +
          ' actuelle' + (ST.ses.length > 1 ? 's' : '') + ' seront remplacées.',
        ok: 'Restaurer', danger: true
      }, function () {
        localStorage.setItem(KEY, JSON.stringify(st));
        ST = loadState();
        reindex(); applyTheme();
        sheetClose = null;
        closeSheet();
        toast('Sauvegarde restaurée', 'ok');
      });
    };
    fr.readAsText(file);
  }

  /* ================================================================== */
  /* Événements                                                          */
  /* ================================================================== */

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act]');
    if (!t) return;
    var a = t.dataset.act;

    /* --- chrono de repos --- */
    if (a === 'undo') { var uf = undoFn; hideToast(); if (uf) uf(); return; }
    if (a === 'rest-now') { restStart(ST.set.rest); return; }
    if (a === 'ex-del') {
      var xid = t.dataset.id;
      if (!ST.cur) return;
      var memoP = ST.cur.p.slice(), memoS = ST.cur.s.slice(), memoAct = UI.act;
      ST.cur.p = ST.cur.p.filter(function (x) { return x !== xid; });
      ST.cur.s = ST.cur.s.filter(function (x) { return x.x !== xid; });
      UI.act = ST.cur.p.length ? ST.cur.p[ST.cur.p.length - 1] : null;
      UI.edit = -1;
      if (UI.act) prefill(UI.act);
      save(true); render();
      toast(exName(xid) + ' retiré', null, function () {
        if (!ST.cur) return;
        ST.cur.p = memoP; ST.cur.s = memoS; UI.act = memoAct;
        save(true); render();
        toast('Exercice rétabli', 'ok');
      });
      return;
    }
    if (a === 'rest-add') {
      rest.end += 30000; rest.total += 30;
      ST.rest = { end: rest.end, total: rest.total }; save();
      restTick(); return;
    }
    if (a === 'rest-skip') { restStop(); return; }

    /* --- navigation --- */
    if (a === 'go-ses') { UI.tab = 'ses'; render(); return; }
    if (a === 'closesheet') { closeSheet(); return; }

    /* --- séance --- */
    if (a === 'new-empty') { newSession([]); render(); openPicker(); return; }
    if (a === 'repeat') {
      var src = null, i;
      for (i = 0; i < ST.ses.length; i++) if (ST.ses[i].id === t.dataset.id) src = ST.ses[i];
      if (!src) return;
      var go = function () {
        newSession(sessionExercises(src), src.n);
        sheetClose = null; closeSheet();
        UI.tab = 'ses';
        render();
      };
      if (ST.cur && ST.cur.s.length) {
        askDialog({
          title: 'Une séance est déjà en cours',
          text: 'Elle contient ' + ST.cur.s.length + ' série' + (ST.cur.s.length > 1 ? 's' : '') +
            ' qui seront perdues si tu la remplaces.',
          ok: 'Remplacer', danger: true
        }, go);
      } else go();
      return;
    }
    if (a === 'pick') { openPicker(); return; }
    if (a === 'pick-ex') { addExerciseToSession(t.dataset.id); return; }
    if (a === 'newex') { newCustomExercise(); return; }
    if (a === 'nx-g') { readNewEx(); NEWEX.g = t.dataset.g; newCustomExercise(); return; }
    if (a === 'nx-eq') { readNewEx(); NEWEX.eq = t.dataset.e; newCustomExercise(); return; }
    if (a === 'nx-save') { saveCustomExercise(); return; }
    if (a === 'dlg-yes') { closeDialog(true); return; }
    if (a === 'dlg-no') { closeDialog(false); return; }
    if (a === 'dlg-back') { if (ev.target === t) closeDialog(false); return; }
    if (a === 'pg') { pickG = t.dataset.g; renderPicker(); return; }
    if (a === 'focus') {
      var id = t.dataset.id;
      UI.act = UI.act === id ? null : id;
      UI.edit = -1;
      if (UI.act) prefill(UI.act);
      render();
      return;
    }
    if (a === 'finish') { syncName(); finishSession(); return; }

    /* --- pavé de saisie --- */
    if (a === 'w-' || a === 'w+') {
      readPad();
      var stp = parseFloat(t.dataset.step) || ST.set.step;
      UI.w = Math.max(0, E.r2(UI.w + (a === 'w+' ? stp : -stp)));
      syncPad();
      return;
    }
    if (a === 'r-' || a === 'r+') {
      readPad();
      UI.r = Math.max(1, (UI.r | 0) + (a === 'r+' ? 1 : -1));
      syncPad();
      return;
    }
    if (a === 'rpe') {
      readPad();
      UI.e = UI.e === +t.dataset.v ? 0 : +t.dataset.v;
      var rb = document.querySelectorAll('[data-act="rpe"]'), ri;
      for (ri = 0; ri < rb.length; ri++) rb[ri].className = (+rb[ri].dataset.v === UI.e) ? 'on' : '';
      return;
    }
    if (a === 'wu') {
      readPad();
      UI.wu = UI.wu ? 0 : 1;
      t.className = 'chip' + (UI.wu ? ' on' : '');
      t.setAttribute('aria-pressed', UI.wu ? 'true' : 'false');
      return;
    }
    if (a === 'add') { readPad(); addSet(); return; }
    if (a === 'cancel-edit') { UI.edit = -1; prefill(UI.act); render(); return; }
    if (a === 'edit') {
      var ix = +t.dataset.ix, s = ST.cur && ST.cur.s[ix];
      if (!s) return;
      UI.act = s.x; UI.edit = ix; UI.w = s.w; UI.r = s.r; UI.e = s.e || 0; UI.wu = s.u || 0;
      render();
      return;
    }
    if (a === 'del') { delSet(+t.dataset.ix); return; }

    /* --- historique --- */
    if (a === 'sesdet') { sessionDetail(t.dataset.id); return; }
    if (a === 'delses') {
      var delId = t.dataset.id;
      askDialog({
        title: 'Supprimer cette séance ?',
        text: 'Ses séries et sa contribution aux records disparaîtront définitivement.',
        ok: 'Supprimer', danger: true
      }, function () {
        ST.ses = ST.ses.filter(function (x) { return x.id !== delId; });
        sheetClose = null;
        save(true); closeSheet();
        toast('Séance supprimée', 'ok');
      });
      return;
    }

    /* --- progrès --- */
    if (a === 'bwadd') {
      var el = $('bwIn'), w = parseFloat(el && el.value);
      if (!(w > 0)) { toast('Indique un poids'); return; }
      var d = todayStr();
      ST.bw = ST.bw.filter(function (b) { return b.d !== d; });
      ST.bw.push({ d: d, w: E.r1(w) });
      save(true); render();
      toast('Poids noté : ' + num(w) + ' kg');
      return;
    }

    /* --- réglages --- */
    if (a === 'sw') {
      var map = { stRpe: 'rpe', stCues: 'cues', stRestAuto: 'restAuto', stSound: 'sound', stVib: 'vibrate' };
      var k = map[t.id];
      if (!k) return;
      ST.set[k] = !ST.set[k];
      t.classList.toggle('on', ST.set[k]);
      t.setAttribute('aria-checked', ST.set[k] ? 'true' : 'false');
      save();
      return;
    }
    if (a === 'pl-' || a === 'pl+') {
      var pi = +t.dataset.i, p = ST.set.plates[pi];
      if (!p) return;
      p.n = Math.max(0, Math.min(10, p.n + (a === 'pl+' ? 1 : -1)));
      save();
      var ed = $('plateEd');
      if (ed) ed.innerHTML = plateEditor();
      return;
    }
    if (a === 'export') { doExport(); return; }
    if (a === 'import') { var f = $('impFile'); if (f) f.click(); return; }
    if (a === 'wipe') {
      askDialog({
        title: 'Tout effacer ?',
        text: ST.ses.length + ' séance' + (ST.ses.length > 1 ? 's' : '') +
          ', les records et les réglages seront détruits. Il n’existe aucune autre copie que celle de ce téléphone.',
        ok: 'Tout effacer', danger: true,
        input: { label: 'Tape EFFACER pour confirmer', placeholder: 'EFFACER', confirmWord: 'EFFACER' }
      }, function () {
        localStorage.removeItem(KEY);
        ST = loadState();
        reindex(); applyTheme();
        sheetClose = null;
        closeSheet();
        toast('Données effacées', 'ok');
      });
      return;
    }
  });

  document.addEventListener('change', function (ev) {
    if (ev.target.id === 'impFile' && ev.target.files && ev.target.files[0]) doImport(ev.target.files[0]);
    if (ev.target.id === 'proSel') { UI.proEx = ev.target.value; render(); }
  });

  /* Un champ numérique pré-rempli doit être remplaçable d'une frappe : sans
     sélection à la prise de focus, il faut effacer « 42.5 » chiffre par chiffre. */
  document.addEventListener('focusin', function (ev) {
    var id = ev.target && ev.target.id;
    if (id === 'padW' || id === 'padR') { try { ev.target.select(); } catch (e) { } }
  });

  document.addEventListener('input', function (ev) {
    if (ev.target.id === 'padW' || ev.target.id === 'padR') {
      readPad();
      var pl = $('padPlates');
      if (pl) pl.innerHTML = platesLine(UI.w);
      syncAddState();
    }
  });

  /** Lit les champs du pavé sans redessiner (évite de voler le focus). */
  function readPad() {
    var w = $('padW'), r = $('padR');
    // Un champ vidé vaut 0, jamais « l'ancienne valeur » : sinon on enregistre
    // en silence un chiffre différent de celui affiché.
    if (w) UI.w = Math.max(0, parseFloat(String(w.value).replace(',', '.')) || 0);
    if (r) UI.r = Math.max(0, parseInt(r.value, 10) || 0);
  }

  /** Le bouton Valider est désactivé tant que la saisie n'a pas de sens. */
  function syncAddState() {
    var b = document.querySelector('[data-act="add"]');
    if (b) b.disabled = !((UI.r | 0) > 0);
  }

  /** Réécrit les champs du pavé sans redessiner toute la vue. */
  function syncPad() {
    var w = $('padW'), r = $('padR'), pl = $('padPlates');
    if (w) w.value = dec(UI.w);
    if (r) r.value = UI.r | 0;
    if (pl) pl.innerHTML = platesLine(UI.w);
  }

  function syncName() {
    var n = $('sesName');
    if (n && ST.cur) { ST.cur.n = n.value.trim() || 'Séance'; save(); }
  }

  document.addEventListener('blur', function (ev) {
    if (ev.target && ev.target.id === 'sesName') syncName();
  }, true);

  $('nav').addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-tab]');
    if (!b) return;
    syncName();
    UI.tab = b.dataset.tab;
    render();
    window.scrollTo(0, 0);
  });

  $('btnSet').addEventListener('click', openSettings);

  /* Échap ferme la couche la plus haute ; Entrée valide un dialogue à champ. */
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      if ($('dlg').innerHTML) { closeDialog(false); ev.preventDefault(); return; }
      if ($('sheet').innerHTML) { closeSheet(); ev.preventDefault(); }
      return;
    }
    if (ev.key === 'Enter' && ev.target && ev.target.id === 'dlgIn') {
      closeDialog(true); ev.preventDefault();
    }
    if (ev.key === 'Enter' && ev.target && ev.target.id === 'nxName') {
      saveCustomExercise(); ev.preventDefault();
    }
    /* Le clavier numérique masque le bouton Valider : sa touche « OK » doit suffire. */
    if (ev.key === 'Enter' && ev.target && (ev.target.id === 'padW' || ev.target.id === 'padR')) {
      ev.target.blur(); readPad(); addSet(); ev.preventDefault();
    }
  });

  /* Bouton retour d'Android : referme la couche ouverte au lieu de quitter l'app. */
  window.addEventListener('popstate', function () {
    if ($('dlg').innerHTML) { closeDialog(false); pushLayer(); return; }
    if ($('sheet').innerHTML) { closeSheet(); pushLayer(); }
  });

  function pushLayer() {
    try { history.pushState({ forge: 1 }, ''); } catch (e) { /* sans effet */ }
  }

  window.addEventListener('beforeunload', function () { save(true); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) save(true);
    else if (ST && ST.cur) wakeLock(true);
  });

  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var onScheme = function () { if (ST && ST.set.theme === 'auto') applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onScheme);
  }

  /* ================================================================== */
  /* Démarrage                                                           */
  /* ================================================================== */

  ST = loadState();
  reindex();
  applyTheme();
  if (ST.cur) {
    var last = ST.cur.s.length ? ST.cur.s[ST.cur.s.length - 1].x : (ST.cur.p[0] || null);
    UI.act = last;
    if (UI.act) prefill(UI.act);
    wakeLock(true);
  }
  restResume();
  render();
})();
