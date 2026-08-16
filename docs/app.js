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
    return { v: 1, set: JSON.parse(JSON.stringify(E.DEF_SET)), ses: [], cur: null, ex: {}, bw: [] };
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
    s.v = 1;
    return s;
  }

  var saveT = null;
  function save(now) {
    clearTimeout(saveT);
    var doIt = function () {
      try { localStorage.setItem(KEY, JSON.stringify(ST)); }
      catch (e) { toast('⚠️ Sauvegarde impossible (stockage plein ?)'); }
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

  var tT = null;
  function toast(msg, kind) {
    var box = $('toast');
    box.innerHTML = '<div class="toast' + (kind ? ' ' + kind : '') + '">' + esc(msg) + '</div>';
    clearTimeout(tT);
    tT = setTimeout(function () { box.innerHTML = ''; }, kind === 'pr' ? 3400 : 2200);
  }

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

  function restStart(sec) {
    rest.total = sec;
    rest.end = Date.now() + sec * 1000;
    clearInterval(rest.iv);
    rest.iv = setInterval(restTick, 250);
    document.body.classList.add('resting');
    restTick();
  }
  function restStop() {
    clearInterval(rest.iv);
    rest.iv = null; rest.end = 0;
    document.body.classList.remove('resting');
    $('rest').innerHTML = '';
  }
  function restTick() {
    var left = (rest.end - Date.now()) / 1000;
    if (left <= 0) {
      restStop();
      beep(880, 0.16);
      setTimeout(function () { beep(1320, 0.22); }, 190);
      buzz([120, 80, 200]);
      toast('⏱️ Repos terminé — à toi');
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

    if (pr.pr) {
      var lbl = pr.kind === 'load' ? 'charge' : pr.kind === 'reps' ? 'répétitions' : '1RM estimé';
      toast('🏆 Record — ' + lbl + ' !', 'pr');
      beep(1046, 0.12);
      setTimeout(function () { beep(1568, 0.2); }, 130);
      buzz([40, 60, 40, 60, 120]);
    } else {
      beep(660, 0.07);
      buzz(25);
    }
    if (ST.set.restAuto && !s.u) restStart(ST.set.rest);
  }

  function delSet(ix) {
    if (!ST.cur || !ST.cur.s[ix]) return;
    ST.cur.s.splice(ix, 1);
    UI.edit = -1;   // les index bougent : on annule toute modification en cours
    save(true); render();
  }

  function finishSession() {
    if (!ST.cur) return;
    if (!ST.cur.s.length) {
      if (!confirm('Aucune série enregistrée. Abandonner cette séance ?')) return;
      ST.cur = null; restStop(); wakeLock(false); save(true); render();
      return;
    }
    var st = E.sessionStats(Object.assign({}, ST.cur, { t1: Date.now() }), IX, bwNow());
    if (!confirm('Terminer la séance ?\n\n' + st.sets + ' séries · ' + E.fmtVol(st.vol) +
      ' · ' + E.fmtDur(Date.now() - ST.cur.t0))) return;
    ST.cur.t1 = Date.now();
    ST.ses.push(ST.cur);
    ST.ses.sort(function (a, b) { return (a.t0 || 0) - (b.t0 || 0); });
    ST.cur = null;
    UI.act = null;
    restStop(); wakeLock(false);
    save(true); render();
    toast('💪 Séance enregistrée');
  }

  /* ================================================================== */
  /* Rendu — aiguillage                                                  */
  /* ================================================================== */

  function render() {
    reindex();
    var st = E.weekStreak(ST.ses, todayStr());
    $('streak').textContent = st > 0 ? '🔥 ' + st + ' sem.' : '';
    $('streak').style.display = st > 0 ? '' : 'none';

    var nav = $('nav').children, i;
    for (i = 0; i < nav.length; i++) nav[i].className = nav[i].dataset.tab === UI.tab ? 'on' : '';

    var v = $('view');
    if (UI.tab === 'ses') v.innerHTML = viewSession();
    else if (UI.tab === 'his') v.innerHTML = viewHistory();
    else v.innerHTML = viewProgress();

    if (UI.tab === 'pro') drawCharts();
    if (UI.tab === 'ses' && ST.cur) tickSessionClock();
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

    h += '<button class="btn pri big" data-act="new-empty">➕ Nouvelle séance</button>';

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
      h += '<div class="card" style="margin-top:12px"><h2>Refaire une séance</h2>';
      for (i = 0; i < quick.length; i++) {
        var exs = sessionExercises(quick[i]);
        h += '<button class="btn" style="width:100%;justify-content:flex-start;margin-bottom:8px;height:auto;padding:12px 14px;text-align:left" data-act="repeat" data-id="' + esc(quick[i].id) + '">' +
          '<span class="grow" style="text-align:left">' +
          '<span style="font-weight:700">' + esc(quick[i].n) + '</span><br>' +
          '<span class="tiny muted ellip" style="display:block">' + esc(relDate(quick[i].d)) + ' · ' +
          exs.slice(0, 3).map(function (x) { return exName(x); }).join(', ') +
          (exs.length > 3 ? ' +' + (exs.length - 3) : '') + '</span></span>' +
          '<span style="color:var(--acc);font-size:20px">↻</span></button>';
      }
      h += '</div>';
    } else {
      h += '<div class="empty"><div class="big">🏋️</div>' +
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

    h += '<div class="row small muted" style="margin:-4px 2px 12px">' +
      '<span>' + st.sets + ' séries</span><span>·</span>' +
      '<span>' + E.fmtVol(st.vol) + '</span><span>·</span>' +
      '<span>' + st.reps + ' reps</span></div>';

    var exs = sessionExercises(ses), i;
    for (i = 0; i < exs.length; i++) h += exBlock(ses, exs[i]);

    h += '<button class="btn big" data-act="pick">➕ Ajouter un exercice</button>';
    h += '<div style="height:80px"></div>';
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
      '<span style="color:var(--fg3);font-size:18px">' + (active ? '▾' : '▸') + '</span></button>';

    h += '<div class="body">';

    var i, s, n = 0;
    for (i = 0; i < mine.length; i++) {
      s = mine[i].s;
      if (!s.u) n++;
      h += '<div class="setrow' + (s.u ? ' wu' : '') + '">' +
        '<span class="i">' + (s.u ? '↑' : n) + '</span>' +
        '<button class="grow" style="text-align:left" data-act="edit" data-ix="' + mine[i].ix + '">' +
        '<span class="v">' + setLabel(s, ex) + '</span>' +
        (s.e ? ' <span class="tiny muted">RPE ' + s.e + '</span>' : '') +
        '</button>' +
        '<button class="x" data-act="del" data-ix="' + mine[i].ix + '" aria-label="Supprimer">✕</button>' +
        '</div>';
    }

    if (active) {
      var lp = E.lastPerf(ST.ses, exId, ses.id);
      if (lp) {
        h += '<div class="lastref">Dernière fois (' + esc(relDate(lp.d)) + ') : ' +
          lp.sets.map(function (x) { return num(x.w) + '×' + x.r; }).join(', ') + '</div>';
      }
      h += pad(ex);
      if (ST.set.cues && ex.c) h += '<div class="cue">💡 ' + esc(ex.c) + '</div>';
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
      '<button class="mn" data-act="w-" data-step="' + step + '">−</button>' +
      '<input class="val" id="padW" type="number" inputmode="decimal" step="0.25" value="' + dec(UI.w) + '">' +
      '<button class="pl" data-act="w+" data-step="' + step + '">+</button>' +
      '</div>';

    if (ex.bar) h += '<div class="plates" id="padPlates">' + platesLine(UI.w) + '</div>';
    else if (ex.uni) h += '<div class="plates">charge d’UN côté — enregistre une série par côté</div>';
    else if (ex.bw) h += '<div class="plates">0 = poids du corps seul' +
      ' (' + num(bwNow()) + ' kg pris en compte)</div>';

    h += '<div class="stepper">' +
      '<div class="lab">Reps</div>' +
      '<button class="mn" data-act="r-">−</button>' +
      '<input class="val" id="padR" type="number" inputmode="numeric" step="1" value="' + (UI.r | 0) + '">' +
      '<button class="pl" data-act="r+">+</button>' +
      '</div>';

    if (ST.set.rpe) {
      h += '<div class="rpe">';
      [6, 7, 8, 9, 10].forEach(function (v) {
        h += '<button data-act="rpe" data-v="' + v + '"' + (UI.e === v ? ' class="on"' : '') + '>RPE ' + v + '</button>';
      });
      h += '</div>';
    }

    h += '<div class="row" style="margin-bottom:10px">' +
      '<button class="chip' + (UI.wu ? ' on' : '') + '" data-act="wu">🔥 Échauffement</button>' +
      (UI.edit >= 0 ? '<span class="grow"></span><button class="chip" data-act="cancel-edit">Annuler la modif</button>' : '') +
      '</div>';

    h += '<button class="btn pri big" data-act="add">' +
      (UI.edit >= 0 ? '✓ Enregistrer la modification' : '✓ Valider la série') + '</button>';

    h += '</div>';
    return h;
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
      return '<span class="warnc">⚠ non chargeable — le plus proche : <b>' + num(near) + ' kg</b></span>';
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
      return '<div class="empty"><div class="big">📓</div>Aucune séance enregistrée pour l’instant.</div>';
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
        h += '<h2 class="muted small" style="margin:18px 2px 8px;text-transform:uppercase;letter-spacing:.06em">' +
          esc(MONTHS[+p[1] - 1] + ' ' + p[0]) + '</h2>';
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
      h += '<div class="card"><div class="row" style="margin-bottom:6px">' +
        '<span class="gdot" style="background:' + gColor(ex.g) + '"></span>' +
        '<b class="grow">' + esc(ex.n) + '</b></div>';
      var n = 0;
      mine.forEach(function (m) {
        if (!m.s.u) n++;
        h += '<div class="setrow' + (m.s.u ? ' wu' : '') + '">' +
          '<span class="i">' + (m.s.u ? '↑' : n) + '</span>' +
          '<span class="grow v">' + setLabel(m.s, ex) + '</span>' +
          (m.s.e ? '<span class="tiny muted">RPE ' + m.s.e + '</span>' : '') +
          '</div>';
      });
      h += '</div>';
    }

    h += '<div class="card"><label class="small muted">Note de séance</label>' +
      '<textarea id="sesNote" rows="3" placeholder="Sensations, douleurs, remarques…">' + esc(ses.note || '') + '</textarea></div>';

    h += '<button class="btn big" data-act="repeat" data-id="' + esc(ses.id) + '">↻ Refaire cette séance</button>' +
      '<div style="height:10px"></div>' +
      '<button class="btn big danger" data-act="delses" data-id="' + esc(ses.id) + '">Supprimer cette séance</button>';

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
      return '<div class="empty"><div class="big">📈</div>Les courbes apparaîtront après ta première séance terminée.</div>';
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
      '<div class="small muted" style="margin-top:10px">Semaine précédente : ' + E.fmtVol(pv) + '</div>' +
      '</div>';

    h += '<div class="card"><h2>Tonnage par semaine</h2><div id="chWeek"></div></div>';

    // Progression d'un exercice
    var best = E.bestSets(ST.ses, IX, bwNow());
    var ids = Object.keys(best);
    ids.sort(function (a, b) { return exName(a).localeCompare(exName(b), 'fr'); });
    if (!UI.proEx || ids.indexOf(UI.proEx) < 0) UI.proEx = mostUsedExercise(ids);

    h += '<div class="card"><h2>Progression</h2>' +
      '<select id="proSel" style="margin-bottom:12px">' +
      ids.map(function (id) {
        return '<option value="' + esc(id) + '"' + (id === UI.proEx ? ' selected' : '') + '>' + esc(exName(id)) + '</option>';
      }).join('') + '</select>' +
      '<div id="chEx"></div>' +
      '<div id="exNote" class="small muted" style="margin-top:8px"></div>' +
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
      h += '<div class="tiny muted" style="margin-top:8px">Le groupe principal compte pour 1, les groupes secondaires pour 0,5.</div></div>';
    }

    // Records
    h += '<div class="card"><h2>Records</h2>';
    var byDate = ids.slice().sort(function (a, b) { return best[b].d < best[a].d ? -1 : 1; });
    byDate.forEach(function (id) {
      var b = best[id];
      h += '<div class="row" style="padding:9px 0;border-top:1px solid var(--line)">' +
        '<span class="gdot" style="background:' + gColor(exOf(id).g) + '"></span>' +
        '<span class="grow ellip">' + esc(exName(id)) + '</span>' +
        '<span style="font-weight:700;font-variant-numeric:tabular-nums">' + num(b.w) + '×' + b.r + '</span>' +
        '<span class="tiny muted" style="width:62px;text-align:right">1RM ' + num(b.e1rm) + '</span>' +
        '</div>';
    });
    h += '</div>';

    // Poids de corps
    h += '<div class="card"><h2>Poids de corps</h2>' +
      '<div class="row"><input id="bwIn" type="number" inputmode="decimal" step="0.1" placeholder="' + num(bwNow()) + '" class="grow">' +
      '<button class="btn" data-act="bwadd">Noter</button></div>';
    if (ST.bw.length) {
      var sorted = ST.bw.slice().sort(function (a, b) { return a.d < b.d ? 1 : -1; });
      h += '<div class="small muted" style="margin-top:10px">' +
        sorted.slice(0, 5).map(function (b) { return esc(relDate(b.d)) + ' : <b>' + num(b.w) + ' kg</b>'; }).join(' · ') +
        '</div>';
    } else {
      h += '<div class="tiny muted" style="margin-top:8px">Sert à compter les tractions et les pompes dans le tonnage.</div>';
    }
    h += '</div>';

    h += '<div style="height:20px"></div>';
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

  function drawCharts() {
    var wk = E.weekSeries(ST.ses, IX, bwNow()).slice(-12);
    var box = $('chWeek');
    if (box) box.innerHTML = barChart(wk.map(function (w) {
      return { v: w.vol, l: 'S' + w.k.slice(-2) };
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

  function barChart(data, lastIsCurrent) {
    if (!data.length) return '<div class="tiny muted">Pas encore de données.</div>';
    var W = 320, H = 130, pb = 18, pl = 2;
    var max = Math.max.apply(null, data.map(function (d) { return d.v; })) || 1;
    var slot = (W - pl * 2) / data.length;
    var bw = Math.min(slot * 0.68, 34);   // sans plafond, une seule semaine remplit tout le cadre
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Tonnage par semaine">';
    s += '<line class="grid" x1="0" y1="' + (H - pb) + '" x2="' + W + '" y2="' + (H - pb) + '"/>';
    data.forEach(function (d, i) {
      var hgt = Math.max(1, ((H - pb - 8) * d.v) / max);
      var x = pl + i * slot + (slot - bw) / 2, w = bw;
      s += '<rect class="bar' + (lastIsCurrent && i === data.length - 1 ? ' dim' : '') + '" x="' + x.toFixed(1) +
        '" y="' + (H - pb - hgt).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + hgt.toFixed(1) + '" rx="2"/>';
      if (data.length <= 8 || i % 2 === 0) {
        s += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(d.l) + '</text>';
      }
    });
    s += '</svg>';
    return s;
  }

  function lineChart(data) {
    if (data.length < 2) {
      return '<div class="tiny muted">Au moins deux séances sont nécessaires pour tracer une courbe.</div>';
    }
    var W = 320, H = 150, pb = 18, pt = 10, pl = 6, pr = 6;
    var vals = data.map(function (d) { return d.v; });
    var mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals);
    var span = (mx - mn) || 1;
    mn = Math.max(0, mn - span * 0.18); mx = mx + span * 0.18;
    var iw = W - pl - pr, ih = H - pb - pt;
    var X = function (i) { return pl + (iw * i) / (data.length - 1); };
    var Y = function (v) { return pt + ih - (ih * (v - mn)) / (mx - mn); };

    var d = data.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1); }).join(' ');
    var area = d + ' L' + X(data.length - 1).toFixed(1) + ' ' + (pt + ih) + ' L' + X(0).toFixed(1) + ' ' + (pt + ih) + ' Z';

    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Progression du 1RM estimé">';
    s += '<line class="grid" x1="0" y1="' + (pt + ih) + '" x2="' + W + '" y2="' + (pt + ih) + '"/>';
    s += '<path class="ar" d="' + area + '"/><path class="ln" d="' + d + '"/>';
    data.forEach(function (p, i) {
      if (data.length <= 14 || i === 0 || i === data.length - 1) {
        s += '<circle class="pt" cx="' + X(i).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="3"/>';
      }
    });
    s += '<text x="' + pl + '" y="' + (H - 5) + '">' + esc(data[0].l) + '</text>';
    s += '<text x="' + (W - pr) + '" y="' + (H - 5) + '" text-anchor="end">' + esc(data[data.length - 1].l) + '</text>';
    s += '<text x="' + pl + '" y="' + (pt + 2) + '">' + num(Math.round(mx)) + ' kg</text>';
    s += '</svg>';
    return s;
  }

  /* ================================================================== */
  /* Feuilles (plein écran)                                              */
  /* ================================================================== */

  var sheetClose = null;

  function openSheet(title, html, onClose) {
    sheetClose = onClose || null;
    $('sheet').innerHTML =
      '<div class="sheet"><div class="shd">' +
      '<button class="icobtn" data-act="closesheet" aria-label="Fermer">✕</button>' +
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
    h += '<div class="row wrap" style="margin:12px 0">' +
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

    h += '<div style="height:14px"></div>' +
      '<button class="btn" data-act="newex" style="width:100%">➕ Créer un exercice perso</button>' +
      '<div style="height:30px"></div>';

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

  function newCustomExercise() {
    var n = prompt('Nom de l’exercice');
    if (!n || !n.trim()) return;
    var gk = Object.keys(CAT.GROUPS);
    var g = prompt('Groupe musculaire ?\n' + gk.map(function (k, i) { return (i + 1) + '. ' + CAT.GROUPS[k].n; }).join('\n'), '1');
    var gi = parseInt(g, 10) - 1;
    var grp = gk[gi >= 0 && gi < gk.length ? gi : 0];
    var id = 'perso-' + Date.now().toString(36);
    ST.ex[id] = { id: id, n: n.trim(), g: grp, eq: 'db', perso: 1 };
    save(true);
    reindex();
    addExerciseToSession(id);
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
      '<div class="small muted" style="margin-bottom:12px">Tout est stocké dans ce téléphone, et nulle part ailleurs. ' +
      '<b>Exporte régulièrement</b> : effacer les données du site effacerait toute la progression.</div>' +
      '<button class="btn big" data-act="export">⬇️ Exporter (fichier JSON)</button><div style="height:8px"></div>' +
      '<button class="btn big" data-act="import">⬆️ Importer une sauvegarde</button>' +
      '<input type="file" id="impFile" accept="application/json,.json" class="hide">' +
      '<div class="hint" style="margin-top:10px">' + ST.ses.length + ' séance' + (ST.ses.length > 1 ? 's' : '') +
      ' · ' + Object.keys(ST.ex).length + ' exercice(s) perso · dernière sauvegarde : ce téléphone</div>' +
      '</div>';

    h += '<div class="card"><h2>Zone rouge</h2>' +
      '<button class="btn big danger" data-act="wipe">Tout effacer</button>' +
      '<div class="hint" style="margin-top:8px">Irréversible. Exporte d’abord.</div></div>';

    h += '<div class="tiny muted center" style="padding:16px 0 30px">Forge · PWA hors-ligne · données locales</div>';

    openSheet('Réglages', h, applySettings);
  }

  function toggle(id, label, hint, on) {
    return '<div class="toggle"><span><span class="tl">' + esc(label) + '</span>' +
      (hint ? '<br><span class="th">' + esc(hint) + '</span>' : '') + '</span>' +
      '<button class="sw' + (on ? ' on' : '') + '" id="' + id + '" data-act="sw" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + esc(label) + '"></button></div>';
  }

  function plateEditor() {
    return (ST.set.plates || []).map(function (p, i) {
      return '<div class="row" style="margin-bottom:6px">' +
        '<span style="width:74px;font-variant-numeric:tabular-nums">' + num(p.w) + ' kg</span>' +
        '<button class="btn sm" data-act="pl-" data-i="' + i + '">−</button>' +
        '<span style="width:74px;text-align:center">' + p.n + ' paire' + (p.n > 1 ? 's' : '') + '</span>' +
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
      try { data = JSON.parse(fr.result); } catch (e) { toast('⚠️ Fichier illisible'); return; }
      var st = data && data.state ? data.state : data;
      if (!st || !Array.isArray(st.ses)) { toast('⚠️ Ce n’est pas une sauvegarde Forge'); return; }
      if (!confirm('Remplacer les données actuelles par cette sauvegarde ?\n\n' +
        st.ses.length + ' séances dans le fichier, ' + ST.ses.length + ' actuellement.')) return;
      localStorage.setItem(KEY, JSON.stringify(st));
      ST = loadState();
      reindex(); applyTheme();
      closeSheet();
      toast('Sauvegarde restaurée');
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
    if (a === 'rest-add') { rest.end += 30000; rest.total += 30; restTick(); return; }
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
      if (ST.cur && ST.cur.s.length && !confirm('Une séance est déjà en cours. La remplacer ?')) return;
      newSession(sessionExercises(src), src.n);
      closeSheet();
      UI.tab = 'ses';
      render();
      return;
    }
    if (a === 'pick') { openPicker(); return; }
    if (a === 'pick-ex') { addExerciseToSession(t.dataset.id); return; }
    if (a === 'newex') { newCustomExercise(); return; }
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
      UI.r = Math.max(0, (UI.r | 0) + (a === 'r+' ? 1 : -1));
      syncPad();
      return;
    }
    if (a === 'rpe') { readPad(); UI.e = UI.e === +t.dataset.v ? 0 : +t.dataset.v; render(); return; }
    if (a === 'wu') { readPad(); UI.wu = UI.wu ? 0 : 1; render(); return; }
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
      if (!confirm('Supprimer définitivement cette séance ?')) return;
      ST.ses = ST.ses.filter(function (x) { return x.id !== t.dataset.id; });
      sheetClose = null;
      save(true); closeSheet();
      toast('Séance supprimée');
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
      if (!confirm('Effacer TOUTES les données de Forge ?\n\nSéances, records, réglages. Cette action est irréversible.')) return;
      if (!confirm('Vraiment sûr ? As-tu exporté une sauvegarde ?')) return;
      localStorage.removeItem(KEY);
      ST = loadState();
      reindex(); applyTheme();
      sheetClose = null;
      closeSheet();
      toast('Données effacées');
      return;
    }
  });

  document.addEventListener('change', function (ev) {
    if (ev.target.id === 'impFile' && ev.target.files && ev.target.files[0]) doImport(ev.target.files[0]);
    if (ev.target.id === 'proSel') { UI.proEx = ev.target.value; render(); }
  });

  document.addEventListener('input', function (ev) {
    if (ev.target.id === 'padW' || ev.target.id === 'padR') {
      readPad();
      var pl = $('padPlates');
      if (pl) pl.innerHTML = platesLine(UI.w);
    }
  });

  /** Lit les champs du pavé sans redessiner (évite de voler le focus). */
  function readPad() {
    var w = $('padW'), r = $('padR');
    if (w && w.value !== '') UI.w = Math.max(0, parseFloat(String(w.value).replace(',', '.')) || 0);
    if (r && r.value !== '') UI.r = Math.max(0, parseInt(r.value, 10) || 0);
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
  render();
})();
