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
    chevronLeft: '<path d="M14.25 6l-5.5 6 5.5 6"/>',
    chevronRight: '<path d="M9.75 6.5l5.5 5.5-5.5 5.5"/>',
    trash: '<path d="M4.25 6.5h15.5M9.75 6.5V3.75h4.5V6.5M6.5 6.5l.9 13.75h9.2l.9-13.75M10 10.5v6M14 10.5v6"/>',
    scale: '<path d="M4 20.25h16L17.4 9.5H6.6z"/><circle cx="12" cy="5.75" r="2.5"/>',
    note: '<path d="M5.5 3.75h9L18.5 8v12.25h-13z"/><path d="M14.25 3.75V8h4.25M8.75 12.5h6.5M8.75 16h4.5"/>',
    flag: '<path d="M5.5 21V3.5M5.5 4.5h11l-2 3.5 2 3.5h-11"/>',
    cloud: '<path d="M7 19.25a4.25 4.25 0 0 1-.3-8.49A5.5 5.5 0 0 1 17.4 10.4a3.9 3.9 0 0 1-.4 8.85z"/>',
    cloudUp: '<path d="M7 18.25a4.25 4.25 0 0 1-.3-8.49A5.5 5.5 0 0 1 17.4 9.4a3.9 3.9 0 0 1 .1 7.8"/><path d="M12 21v-8M9 15.5l3-3 3 3"/>',
    cloudDown: '<path d="M7 18.25a4.25 4.25 0 0 1-.3-8.49A5.5 5.5 0 0 1 17.4 9.4a3.9 3.9 0 0 1 .1 7.8"/><path d="M12 13v8M9 18.5l3 3 3-3"/>'
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
    return {
      v: 1, set: JSON.parse(JSON.stringify(E.DEF_SET)),
      ses: [], cur: null, ex: {}, bw: [], rest: null,
      reports: [], lastCloud: '', lastCloudTs: 0, mig: {}
    };
  }

  /** Une série exploitable, ou null. Une entrée douteuse est écartée, pas devinée. */
  function saineSerie(x) {
    if (!x || typeof x !== 'object' || typeof x.x !== 'string' || !x.x) return null;
    var r = Math.round(Number(x.r));
    if (!isFinite(r) || r < 0) return null;
    var w = Number(x.w);
    return {
      x: x.x,
      w: isFinite(w) && w >= 0 ? w : 0,
      r: r,
      e: Number(x.e) >= 0 && Number(x.e) <= 10 ? Math.round(Number(x.e)) : 0,
      u: x.u ? 1 : 0,
      t: isFinite(Number(x.t)) ? Number(x.t) : 0
    };
  }

  /** Une séance exploitable, ou null. */
  function saineSeance(z, encours) {
    if (!z || typeof z !== 'object') return null;
    if (typeof z.id !== 'string' || !z.id) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(z.d)) return null;
    if (!Array.isArray(z.s)) return null;
    var series = [], i, ok;
    for (i = 0; i < z.s.length; i++) { ok = saineSerie(z.s[i]); if (ok) series.push(ok); }
    if (!encours && !series.length) return null;   // une séance terminée vide n'a rien à dire
    return {
      id: z.id,
      d: z.d,
      t0: isFinite(Number(z.t0)) ? Number(z.t0) : 0,
      t1: isFinite(Number(z.t1)) ? Number(z.t1) : 0,
      // Un nom VIDE est une valeur légitime : la séance s'affiche alors par sa date.
      // Remettre « Séance » ici réinjectait le nom générique à chaque chargement
      // et annulait discrètement tout le travail sur le nommage.
      n: typeof z.n === 'string' ? z.n : '',
      s: series,
      p: Array.isArray(z.p) ? z.p.filter(function (x) { return typeof x === 'string'; }) : [],
      note: typeof z.note === 'string' ? z.note : ''
    };
  }

  /**
   * Charge et NETTOIE l'état.
   * Une validation limitée aux conteneurs de premier niveau ne protège de rien :
   * une seule séance malformée dans le tableau faisait planter le rendu, donc
   * un écran blanc à chaque lancement, sans aucun moyen de récupérer le reste.
   * Ici chaque séance et chaque série est vérifiée ; ce qui est irrécupérable
   * est écarté, et le reste survit.
   */
  function loadState() {
    var s;
    brutAvantNettoyage = null;
    try { brutAvantNettoyage = localStorage.getItem(KEY); } catch (e) { }
    try { s = JSON.parse(brutAvantNettoyage || 'null'); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') s = defState();

    // Migration douce : on complète, on ne retire JAMAIS une clé de réglage.
    var d = defState();
    if (!s.set || typeof s.set !== 'object') s.set = {};
    for (var k in d.set) if (!(k in s.set)) s.set[k] = d.set[k];

    var brutes = Array.isArray(s.ses) ? s.ses : [];
    var propres = [], i, z;
    for (i = 0; i < brutes.length; i++) { z = saineSeance(brutes[i], false); if (z) propres.push(z); }
    propres.sort(function (a, b) { return (a.t0 || 0) - (b.t0 || 0); });
    if (propres.length !== brutes.length) {
      ecartees = brutes.length - propres.length;   // signalé à l'utilisateur au démarrage
    }
    s.ses = propres;

    s.cur = saineSeance(s.cur, true);
    s.bw = (Array.isArray(s.bw) ? s.bw : []).filter(function (b) {
      return b && /^\d{4}-\d{2}-\d{2}$/.test(b.d) && Number(b.w) > 0;
    }).map(function (b) { return { d: b.d, w: Number(b.w) }; });

    if (!s.ex || typeof s.ex !== 'object') s.ex = {};
    for (var id in s.ex) {
      var e2 = s.ex[id];
      if (!e2 || typeof e2.n !== 'string' || !e2.n) { delete s.ex[id]; continue; }
      e2.id = id;
      if (!CAT.GROUPS[e2.g]) e2.g = 'full';
      if (!CAT.EQUIP[e2.eq]) e2.eq = 'db';
    }

    if (!s.rest || typeof s.rest.end !== 'number') s.rest = null;
    s.reports = (Array.isArray(s.reports) ? s.reports : []).filter(function (r) {
      return r && typeof r.txt === 'string' && r.txt;
    }).slice(-100);
    if (typeof s.lastCloud !== 'string') s.lastCloud = '';
    if (typeof s.lastCloudTs !== 'number') s.lastCloudTs = 0;

    /* MIGRATIONS PONCTUELLES — chacune s'exécute une fois et laisse sa trace dans
       s.mig, pour qu'aucune ne repasse jamais sur un réglage choisi à la main.
       C'est le seul endroit où l'app touche un réglage de l'utilisateur, et elle
       ne le fait qu'une fois, pour une raison écrite. */
    if (!s.mig || typeof s.mig !== 'object') s.mig = {};
    if (E.TRACK_MODES.indexOf(s.set.proMode) < 0) s.set.proMode = 'auto';
    if (s.set.lang !== 'en') s.set.lang = 'fr';
    if (!s.set.vestEx || typeof s.set.vestEx !== 'object') s.set.vestEx = {};
    if (!isFinite(Number(s.set.vest)) || Number(s.set.vest) < 0) s.set.vest = 0;
    if (!Array.isArray(s.set.bars) || !s.set.bars.length) s.set.bars = [Number(s.set.bar) || 20];
    s.set.bars = s.set.bars.map(Number).filter(function (b) { return b >= 0; });
    if (!s.set.bars.length) s.set.bars = [20];
    if (!s.mig.restAutoOff) {
      // Le chrono automatique donnait l'impression d'être mis sous pression à
      // chaque série. Il redevient volontaire : le bouton « Repos » du pavé.
      s.set.restAuto = false;
      s.mig.restAutoOff = 1;
      migAppliquee = true;
    }
    if (!s.mig.materiel) {
      /* Le matériel par défaut d'origine (barre 20 kg, disques de salle) ne
         correspondait pas du tout à l'équipement réel : 6 charges sur 11 de la
         séance du 17 étaient annoncées « non chargeable ». On remplace, mais
         UNIQUEMENT si les réglages n'ont jamais été touchés à la main. */
      var ancienJeu = [[20, 2], [15, 2], [10, 2], [5, 2], [2.5, 2], [1.25, 2]];
      var actuel = (s.set.plates || []).map(function (x) { return [x.w, x.n]; });
      var intact = s.set.bar === 20 &&
        JSON.stringify(actuel) === JSON.stringify(ancienJeu);
      if (intact) {
        s.set.bar = d.set.bar;
        s.set.bars = d.set.bars.slice();
        s.set.plates = JSON.parse(JSON.stringify(d.set.plates));
        s.set.step = d.set.step;
      }
      s.mig.materiel = 1;
      migAppliquee = true;
    }
    if (!s.mig.nomsAuto) {
      // Les noms de séance déduits du groupe musculaire (« Séance pectoraux »)
      // sont effacés : ils n'ont pas été écrits par l'utilisateur.
      var autoNoms = /^Séance (pectoraux|dos|épaules|biceps|triceps|quadriceps|ischios|fessiers|mollets|abdos|avant-bras|corps entier)$/i;
      var vider = function (z) { if (z && (z.n === 'Séance' || autoNoms.test(z.n || ''))) z.n = ''; };
      (s.ses || []).forEach(vider);
      vider(s.cur);
      s.mig.nomsAuto = 1;
      migAppliquee = true;
    }

    s.v = 1;
    return s;
  }

  var ecartees = 0, migAppliquee = false, brutAvantNettoyage = null;

  var saveT = null, echecEcriture = false;
  function save(now) {
    clearTimeout(saveT);
    var doIt = function () {
      try {
        localStorage.setItem(KEY, JSON.stringify(ST));
        if (echecEcriture) { echecEcriture = false; toast('Sauvegarde rétablie', 'ok'); }
      } catch (e) {
        // Un toast de 2 s puis la séance continue dans le vide : inacceptable.
        // On bloque explicitement jusqu'à ce que l'utilisateur ait exporté.
        if (echecEcriture) return;
        echecEcriture = true;
        askDialog({
          title: 'Impossible d’enregistrer',
          text: 'Le stockage du téléphone est plein ou verrouillé. Les séries que tu ajoutes ' +
            'maintenant ne seront PAS conservées. Exporte immédiatement, puis libère de la place.',
          ok: 'Exporter maintenant', cancel: 'Continuer quand même'
        }, function () { doExport(); });
      }
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

  /** Vocabulaire d'entraînement dans la langue choisie, français par défaut. */
  function enAnglais() { return ST.set.lang === 'en'; }
  function nomDe(o) {
    if (!o) return '';
    return (enAnglais() && o.en) ? o.en : (o.n || '');
  }
  function exName(id) { return (IX[id] && nomDe(IX[id])) || id; }
  function eqName(k) { return nomDe(CAT.EQUIP[k]); }
  /** Rappel technique dans la langue choisie. */
  function cueDe(ex) { return (enAnglais() && ex.ce) ? ex.ce : (ex.c || ''); }
  function exOf(id) { return IX[id] || { id: id, n: id, g: 'full', eq: 'bw' }; }
  function gColor(g) { return (CAT.GROUPS[g] && CAT.GROUPS[g].c) || 'var(--fg3)'; }
  function gName(g) { return nomDe(CAT.GROUPS[g]) || g; }

  /** Poids de corps à une date donnée. */
  function bwNow(dateStr) { return E.bodyweightAt(ST.bw, dateStr || todayStr(), ST.set.bw); }

  /**
   * À passer au moteur pour TOUT calcul portant sur plusieurs séances.
   * Avec un poids scalaire, le moteur recalculerait l'historique entier avec le
   * poids du jour : un record de tractions établi à 80 kg se réécrivait à 70 kg
   * dès la pesée suivante, et tout le passé bougeait avec.
   */
  function bwAt(dateStr) { return bwNow(dateStr); }

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
    sec = Math.max(1, Math.round(Number(sec) || 0));   // 0 s sonnerait aussitôt
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
    majChipRepos();
  }

  /** Le bouton « Repos » affiche la durée courante : elle change avec −30/+30. */
  function majChipRepos() {
    var c = document.querySelector('[data-act="rest-now"]');
    if (c) c.innerHTML = ico('timer', 17) + 'Repos ' + E.fmtClock(ST.set.rest);
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
      '<button class="btn sm" data-act="rest-sub">−30</button>' +
      '<button class="btn sm" data-act="rest-add">+30</button>' +
      '<button class="btn sm" data-act="rest-skip">Stop</button>' +
      '</div>';
  }

  /* ================================================================== */
  /* Séance : création, séries, clôture                                  */
  /* ================================================================== */

  var UI = { tab: 'ses', act: null, w: 20, r: 8, e: 0, wu: 0, edit: -1 };

  function newSession(planIds, name) {
    var now = Date.now();
    ST.cur = {
      id: 's' + now,
      d: todayStr(now),
      t0: now,
      t1: 0,
      n: name || '',
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

  /**
   * Libellé d'une séance : son nom s'il en a un, sinon sa date.
   * Aucun nom n'est inventé. L'ancien nom automatique était déduit du groupe
   * musculaire dominant (« Séance pectoraux ») : une logique de SPLIT, qui
   * produit une étiquette absurde et changeante quand on refait les mêmes
   * exercices à chaque séance.
   */
  function sesTitre(ses) {
    if (ses.n) return ses.n;
    return 'Séance du ' + longDate(ses.d).replace(/^\w+ /, '');
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
    var prev = E.bestSets(ST.ses.concat([ST.cur]), IX, bwAt)[UI.act];
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
    if (ex.sec) return (st.w ? '+' + num(st.w) + ' kg, ' : '') + fmtSec(st.r);
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
      text: st.sets + ' séries · ' + st.exs + ' exercices · ' + E.fmtDur(Date.now() - ST.cur.t0),
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
      autoCloudBackup(true);                   // impératif : la séance part dans le cloud
    });
  }

  /* ================================================================== */
  /* Rendu — aiguillage                                                  */
  /* ================================================================== */

  function render() {
    reindex();
    majBoutonRapport();
    var nav = $('nav').children, i, actif;
    for (i = 0; i < nav.length; i++) {
      actif = nav[i].dataset.tab === UI.tab;
      nav[i].className = actif ? 'on' : '';
      if (actif) nav[i].setAttribute('aria-current', 'page');
      else nav[i].removeAttribute('aria-current');
    }

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
    var derniere = ST.ses.length ? ST.ses[ST.ses.length - 1] : null;
    if (derniere) {
      var ecart = E.daysBetween(derniere.d, todayStr());
      h += '<div class="lastses">Dernière séance ' + esc(relDate(derniere.d)) +
        (ecart >= 4 ? ' — ça fait ' + ecart + ' jours' : '') + '</div>';
    }

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
          '<span class="t1">' + esc(sesTitre(quick[i])) + '</span>' +
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
      (delta ? '<div class="d ' + esc(delta.cls) + '">' + esc(delta.txt) + '</div>' : '') + '</div>';
  }

  function sessionActive() {
    var ses = ST.cur;
    var st = E.sessionStats(Object.assign({}, ses, { t1: Date.now() }), IX, bwNow());
    var h = '';

    /* Le nom est FACULTATIF, se voit comme un champ, et n'est PAS collant :
       on nomme une séance une fois, pas à chaque instant. Vide, il montre la date. */
    h += '<label class="sesname">' + ico('note', 16) +
      '<input id="sesName" value="' + esc(ses.n) + '" ' +
      'placeholder="' + esc(sesTitre(ses)) + '" ' +
      'aria-label="Nom de la séance, facultatif" enterkeyhint="done"></label>';

    /* Barre collante : le strict nécessaire pendant l'effort — le temps écoulé,
       ce qui est déjà fait, et la sortie. */
    h += '<div class="sesbar">' +
      '<div class="row" style="width:100%">' +
      '<span class="t" id="sesClock">0:00</span>' +
      '<span class="grow"></span>' +
      '<button class="btn sm pri" data-act="finish">Terminer</button>' +
      '</div>' +
      '<div class="sesline">' +
      '<span>' + st.sets + ' série' + (st.sets > 1 ? 's' : '') + '</span>' +
      (st.exs ? '<span>·</span><span>' + st.exs + ' exercice' + (st.exs > 1 ? 's' : '') + '</span>' : '') +
      '</div>' +
      '</div>';

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
      '<span class="grow"><span class="nm">' + esc(nomDe(ex)) + '</span><br>' +
      '<span class="sub">' + esc(gName(ex.g)) + ' · ' + esc(eqName(ex.eq)) +
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
          lp.sets.map(function (x) {
            return ex.sec ? fmtSec(x.r) : num(x.w) + '×' + x.r;
          }).join(', ') + '</div>';
      }
      h += pad(ex);
      if (ST.set.cues && cueDe(ex)) h += '<div class="cue">' + ico('bulb', 16) + '<span>' + esc(cueDe(ex)) + '</span></div>';
      // Action destructrice : tout en bas du bloc, loin du bouton de validation.
      h += '<button class="exdel" data-act="ex-del" data-id="' + esc(exId) + '" ' +
        'aria-label="Retirer ' + esc(nomDe(ex)) + ' de la séance">' + ico('trash', 15) +
        '<span>Retirer de la séance</span></button>';
    }

    h += '</div></div>';
    return h;
  }

  /** Unité affichée d'une série : secondes pour un gainage, répétitions sinon. */
  function unite(ex, r) { return ex.sec ? fmtSec(r) : String(r); }

  /** 45 -> « 45 s », 90 -> « 90 s », 180 -> « 3 min ».
   *  Un gainage se compte en secondes jusqu'à deux minutes : c'est ainsi qu'on
   *  l'annonce à voix haute, et « 90 s » se lit plus vite que « 1 min 30 ». */
  function fmtSec(v) {
    v = Math.max(0, Math.round(Number(v) || 0));
    if (v < 120) return v + ' s';
    var m = Math.floor(v / 60), r = v % 60;
    return m + ' min' + (r ? ' ' + r + ' s' : '');
  }

  function setLabel(s, ex) {
    if (ex.sec) return (s.w ? '+' + num(s.w) + ' kg · ' : '') + fmtSec(s.r);
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
      '<input class="val" id="padW" type="text" inputmode="decimal" enterkeyhint="done" ' +
      'autocomplete="off" aria-label="Charge en kilos" value="' + num(UI.w) + '">' +
      '<button class="pl" data-act="w+" data-step="' + step + '" aria-label="Augmenter la charge">' + ico('plus') + '</button>' +
      '</div>';

    if (ex.bar && ST.set.plateCalc) h += '<div class="plates" id="padPlates">' + platesLine(UI.w, ex.id) + '</div>';
    else if (ex.uni) h += '<div class="plates">charge d’UN côté — enregistre une série par côté</div>';
    else if (ex.sec) h += '<div class="plates">durée en secondes — hors tonnage, le record est le temps tenu</div>';
    else if (ex.bw) h += '<div class="plates">0 = poids du corps seul' +
      ' (' + num(bwNow()) + ' kg pris en compte)</div>';

    h += '<div class="stepper">' +
      '<div class="lab">' + (ex.sec ? 'Durée' : 'Reps') + '</div>' +
      '<button class="mn" data-act="r-" data-step="' + (ex.sec ? 5 : 1) + '" aria-label="' +
      (ex.sec ? 'Cinq secondes de moins' : 'Une répétition de moins') + '">' + ico('minus') + '</button>' +
      '<input class="val" id="padR" type="text" inputmode="numeric" enterkeyhint="done" ' +
      'autocomplete="off" aria-label="Nombre de répétitions" value="' + (UI.r | 0) + '">' +
      '<button class="pl" data-act="r+" data-step="' + (ex.sec ? 5 : 1) + '" aria-label="' +
      (ex.sec ? 'Cinq secondes de plus' : 'Une répétition de plus') + '">' + ico('plus') + '</button>' +
      '</div>';

    if (ST.set.rpe) {
      h += '<div class="rpe">';
      [6, 7, 8, 9, 10].forEach(function (v) {
        h += '<button data-act="rpe" data-v="' + v + '"' + (UI.e === v ? ' class="on"' : '') + '>RPE ' + v + '</button>';
      });
      h += '</div>';
    }

    h += '<div class="row wrap" style="margin-bottom:var(--s3)">' +
      (ST.set.warmup
        ? '<button class="chip' + (UI.wu ? ' on' : '') + '" data-act="wu" aria-pressed="' +
          (UI.wu ? 'true' : 'false') + '">' + ico('flame', 17) + 'Échauffement</button>'
        : '') +
      '<button class="chip" data-act="rest-now">' + ico('timer', 17) + 'Repos ' + E.fmtClock(ST.set.rest) + '</button>' +
      (ex.bar && ST.set.plateCalc && Number(ST.set.vest) > 0
        ? '<button class="chip' + (vesteDe(ex.id) ? ' on' : '') + '" data-act="vest" data-id="' +
          esc(ex.id) + '" aria-pressed="' + (vesteDe(ex.id) ? 'true' : 'false') + '">' +
          'Veste ' + num(ST.set.vest) + ' kg</button>'
        : '') +
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

  /**
   * Ligne « quels disques mettre ». Essaie TOUTES les barres disponibles :
   * avec deux barres de poids différents, une charge donnée ne tombe souvent
   * juste qu'avec l'une des deux.
   */
  /** Poids de la veste à déduire pour cet exercice, 0 si elle n'est pas portée. */
  function vesteDe(exId) {
    var v = Number(ST.set.vest) || 0;
    return (v > 0 && ST.set.vestEx && ST.set.vestEx[exId]) ? v : 0;
  }

  /**
   * Ligne « quels disques mettre ». Essaie TOUTES les barres disponibles, et
   * retire d'abord la veste lestée : elle est comptée dans la charge saisie mais
   * portée sur les épaules, pas enfilée sur la barre. Sans cette déduction,
   * l'app annonçait 5 kg de trop par côté à chaque série de squat.
   */
  function platesLine(target, exId) {
    var veste = vesteDe(exId);
    var surBarre = target - veste;
    var barres = ST.set.bars && ST.set.bars.length ? ST.set.bars : [ST.set.bar];
    var p = E.platePlanBest(surBarre, barres, ST.set.plates);
    var pre = (veste ? 'veste ' + num(veste) + ' · ' : '') +
      (barres.length > 1 ? 'barre ' + num(p.bar) + ' · ' : '');

    if (!p.ok) {
      return '<span class="warnc">' + ico('alert', 14) +
        ' non chargeable — le plus proche : <b>' + num(E.r2(p.total + veste)) + ' kg</b></span>';
    }
    if (!p.side.length) return pre + 'barre à vide (' + num(p.bar) + ' kg)';
    return pre + 'par côté : ' + p.side.map(function (x) {
      return '<b>' + (x.n > 1 ? x.n + '×' : '') + num(x.w) + '</b>';
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
        '<div class="row"><span class="grow"><b>' + esc(sesTitre(ST.cur)) + '</b><br>' +
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
      st = E.sessionStats(ses, IX, bwAt);
      h += '<button class="card seslink" data-act="sesdet" data-id="' + esc(ses.id) + '">' +
        '<div class="row"><span class="grow"><b>' + esc(sesTitre(ses)) + '</b><br>' +
        '<span class="small muted">' + esc(relDate(ses.d)) + '</span></span>' +
        '<span style="color:var(--fg3)">›</span></div>' +
        '<div class="stat">' +
        '<span><b>' + st.sets + '</b> séries</span>' +
        '<span><b>' + st.exs + '</b> exercices</span>' +
        (st.dur ? '<span><b>' + E.fmtDur(st.dur) + '</b></span>' : '') +
        '</div></button>';
    }
    return h;
  }

  function sessionDetail(id) {
    var ses = null, i;
    for (i = 0; i < ST.ses.length; i++) if (ST.ses[i].id === id) ses = ST.ses[i];
    if (!ses) return;
    var st = E.sessionStats(ses, IX, bwAt);
    var exs = sessionExercises(ses);

    var h = '<div class="card"><div class="kpis">' +
      kpi(st.sets, 'séries') + kpi(st.exs, 'exercices') +
      kpi(st.dur ? E.fmtDur(st.dur) : '—', 'durée') + '</div></div>';

    for (i = 0; i < exs.length; i++) {
      var ex = exOf(exs[i]);
      var mine = setsOf(ses, exs[i]);
      h += '<div class="card"><div class="row" style="margin-bottom:var(--s2)">' +
        '<span class="gdot" style="background:' + gColor(ex.g) + '"></span>' +
        '<b class="grow">' + esc(nomDe(ex)) + '</b></div>';
      var n = 0;
      mine.forEach(function (m) {
        if (!m.s.u) n++;
        h += '<div class="setrow' + (m.s.u ? ' wu' : '') + '">' +
          '<span class="i">' + (m.s.u ? ico('flame', 14) : n) + '</span>' +
          '<button class="grow" style="text-align:left" data-act="fix-set" ' +
          'data-sid="' + esc(ses.id) + '" data-ix="' + m.ix + '">' +
          '<span class="v">' + setLabel(m.s, ex) + '</span>' +
          (m.s.e ? ' <span class="tiny muted">RPE ' + m.s.e + '</span>' : '') + '</button>' +
          '<button class="x" data-act="fix-del" data-sid="' + esc(ses.id) + '" data-ix="' + m.ix + '" ' +
          'aria-label="Supprimer la série">' + ico('trash', 18) + '</button>' +
          '</div>';
      });
      // Une série oubliée se rattrape ici : sans cela, la seule issue était de
      // supprimer la séance entière et de tout ressaisir.
      h += '<button class="addset" data-act="fix-add" data-sid="' + esc(ses.id) + '" ' +
        'data-x="' + esc(exs[i]) + '">' + ico('plus', 16) + '<span>Ajouter une série</span></button>';
      h += '</div>';
    }

    h += '<button class="btn" style="width:100%" data-act="fix-addex" data-sid="' + esc(ses.id) + '">' +
      ico('plus', 20) + 'Ajouter un exercice oublié</button><div class="sp-4"></div>';

    h += '<div class="hint" style="margin:calc(-1 * var(--s2)) 0 var(--s3)">' +
      'Touche une série pour la corriger — une faute de frappe fausse les records tant qu’elle est là.</div>';

    h += '<div class="card"><label class="small muted">Note de séance</label>' +
      '<textarea id="sesNote" rows="3" placeholder="Sensations, douleurs, remarques…">' + esc(ses.note || '') + '</textarea></div>';

    h += '<button class="btn big" data-act="repeat" data-id="' + esc(ses.id) + '">' + ico('repeat', 21) + 'Refaire cette séance</button>' +
      '<div class="sp-2"></div>' +
      '<button class="btn big danger" data-act="delses" data-id="' + esc(ses.id) + '">' + ico('trash', 20) + 'Supprimer cette séance</button>' +
      '<div class="tail"></div>';

    openSheet(esc(sesTitre(ses)), h, function () {
      var t = $('sesNote');
      if (t) { ses.note = t.value; save(true); }
    });
  }

  /**
   * Ajoute une série à une séance DÉJÀ TERMINÉE.
   * Les valeurs sont pré-remplies avec la dernière série de cet exercice dans
   * cette séance : on rattrape presque toujours une série identique ou voisine.
   * La série s'insère juste après les autres du même exercice, avec un horodatage
   * qui suit — l'ordre de lecture reste celui de la séance.
   */
  function ajouterSerieA(ses, exId) {
    var ex = exOf(exId);
    var mine = setsOf(ses, exId);
    var ref = mine.length ? mine[mine.length - 1].s : null;
    askDialog({
      title: 'Ajouter une série',
      text: nomDe(ex) + ' — ' + longDate(ses.d),
      ok: 'Ajouter',
      inputs: [
        { key: 'w', label: (ex.sec || ex.bw) ? 'Lest (kg)' : 'Charge (kg)', value: ref ? num(ref.w) : '0' },
        { key: 'r', label: ex.sec ? 'Durée (s)' : 'Répétitions', value: ref ? String(ref.r) : '8', inputmode: 'numeric' }
      ]
    }, function (v) {
      var nw = Math.max(0, parseFloat(String(v.w).replace(',', '.').replace(/[^0-9.]/g, '')) || 0);
      var nr = Math.max(0, parseInt(String(v.r).replace(/[^0-9]/g, ''), 10) || 0);
      if (nr <= 0) { toast('Valeur invalide : rien n’a été ajouté', 'alert'); return; }
      var apres = mine.length ? mine[mine.length - 1].ix + 1 : ses.s.length;
      var t0 = mine.length ? (mine[mine.length - 1].s.t || 0) + 1 : (ses.t1 || ses.t0 || 0);
      var ajoutee = { x: exId, w: E.r2(nw), r: nr, e: 0, u: 0, t: t0 };
      ses.s.splice(apres, 0, ajoutee);
      if (ses.p.indexOf(exId) < 0) ses.p.push(exId);
      save(true);
      sessionDetail(ses.id);
      toast('Série ajoutée', 'ok', function () {
        // Retrait par RÉFÉRENCE : l'index aurait pu bouger si une autre série
        // a été ajoutée ou supprimée pendant les six secondes d'annulation.
        var i2 = ses.s.indexOf(ajoutee);
        if (i2 < 0) return;
        ses.s.splice(i2, 1);
        save(true); sessionDetail(ses.id);
        toast('Ajout annulé', 'ok');
      });
      autoCloudBackup();
    });
  }

  /* ================================================================== */
  /* Onglet PROGRÈS                                                      */
  /* ================================================================== */

  /**
   * Onglet PROGRÈS — une seule question : « est-ce que je monte ? »
   *
   * Un bloc par exercice, avec le MAX ATTEINT à chaque séance. Ni tonnage ni
   * 1RM estimé : le tonnage récompense le volume au détriment de l'intensité
   * (40 kg x 100 reps « battent » 100 kg x 5), et une estimation n'est pas une
   * performance. Ce qui compte, c'est ce qui a été soulevé.
   */
  function viewProgress() {
    if (!ST.ses.length) {
      return '<div class="empty"><div class="big">' + ico('trend', 44) + '</div>' +
        'Les courbes apparaîtront après ta première séance terminée.</div>';
    }

    // Exercices classés par usage le plus récent.
    var vus = [], i, j, x;
    for (i = ST.ses.length - 1; i >= 0; i--) {
      for (j = 0; j < ST.ses[i].s.length; j++) {
        x = ST.ses[i].s[j].x;
        if (vus.indexOf(x) < 0) vus.push(x);
      }
    }

    var h = '<div class="promode"><label for="proMode">Ce que je suis</label>' +
      '<select id="proMode">' + PRO_MODES.map(function (m) {
        return '<option value="' + m.k + '"' + (ST.set.proMode === m.k ? ' selected' : '') + '>' +
          esc(m.n) + '</option>';
      }).join('') + '</select></div>';

    for (i = 0; i < vus.length; i++) h += blocProgres(vus[i]);

    if (!h) h += '<div class="empty">Aucune série exploitable pour l’instant.</div>';

    h += '<div class="card"><h2>Poids de corps</h2>' +
      '<div class="row"><input id="bwIn" type="text" inputmode="decimal" autocomplete="off" placeholder="' +
      num(bwNow()) + '" class="grow"><button class="btn" data-act="bwadd">Noter</button></div>';
    if (ST.bw.length) {
      var tri = ST.bw.slice().sort(function (a, b) { return a.d < b.d ? 1 : -1; });
      h += '<div class="small muted" style="margin-top:var(--s3)">' +
        tri.slice(0, 4).map(function (b) { return esc(relDate(b.d)) + ' : <b>' + num(b.w) + ' kg</b>'; }).join(' · ') +
        '</div>';
    } else {
      h += '<div class="hint">Sert à compter les pompes et les tractions.</div>';
    }
    h += '</div>';

    h += '<div class="tail"></div>';
    return h;
  }

  var PRO_MODES = [
    { k: 'auto', n: 'Le plus parlant' },
    { k: 'charge', n: 'Charge max' },
    { k: 'e1rm', n: '1RM théorique' },
    { k: 'volset', n: 'Volume max sur une série' },
    { k: 'volses', n: 'Volume total de la séance' },
    { k: 'reps', n: 'Répétitions max' }
  ];

  /** Un exercice : son meilleur point, sa courbe, son écart depuis le début. */
  function blocProgres(exId) {
    var ex = exOf(exId);
    var mode = ST.set.proMode || 'auto';
    var pts = E.exerciseTrack(ST.ses, exId, IX, bwAt, mode);
    if (!pts.length) return '';

    var dernier = pts[pts.length - 1];
    var record = pts[0], k;
    for (k = 1; k < pts.length; k++) if (pts[k].v > record.v) record = pts[k];

    /* Le libellé décrit la GRANDEUR suivie, pas toujours la série :
       en volume, « 103,5 kg × 8 » serait faux. */
    var lib = function (p) {
      if (p.unit === 's') return fmtSec(p.r);
      if (mode === 'reps') return p.r + ' reps';
      if (mode === 'e1rm') return num(p.v) + ' kg';
      if (mode === 'volses' || mode === 'volset') return E.fmtVol(p.v);
      if (p.unit === 'reps') return p.r + ' reps';
      return num(p.w) + ' kg × ' + p.r;
    };

    var ecart = E.r2(dernier.v - (pts.length > 1 ? pts[0].v : dernier.v));
    var suffixe = dernier.unit === 's' ? ' s' : dernier.unit === 'reps' ? ' reps' : ' kg';

    var h = '<div class="card">';
    h += '<div class="row" style="margin-bottom:var(--s3)">' +
      '<span class="gdot" style="background:' + gColor(ex.g) + '"></span>' +
      '<b class="grow ellip">' + esc(nomDe(ex)) + '</b>' +
      '<span class="tiny muted">' + pts.length + ' séance' + (pts.length > 1 ? 's' : '') + '</span></div>';

    var titreRecord = mode === 'volses' ? 'meilleure séance'
      : mode === 'reps' ? 'meilleure série' : 'meilleure série';
    h += '<div class="prmax"><span class="v">' + esc(lib(record)) + '</span>' +
      '<span class="l">' + titreRecord + ' · ' + esc(relDate(record.d)) + '</span></div>';

    if (pts.length >= 2) {
      h += '<div id="ch_' + esc(exId) + '" class="prch"></div>';
      h += '<div class="prfoot">' +
        '<span>Dernière : <b>' + esc(lib(dernier)) + '</b></span>' +
        '<span class="' + (ecart > 0 ? 'up' : ecart < 0 ? 'dn' : '') + '">' +
        (ecart > 0 ? '+' : '') + num(ecart) + suffixe + ' depuis le début</span>' +
        '</div>';
    } else {
      h += '<div class="prfoot"><span class="muted">Une seule séance — la courbe viendra à la prochaine.</span></div>';
    }
    h += '</div>';
    return h;
  }

  /* --------------------------- Graphiques SVG ----------------------- */

  /** "2026-08-10" -> "10/08" : une date se situe, un numéro de semaine ISO non. */
  function dayMonth(ds) { return ds.slice(8) + '/' + ds.slice(5, 7); }

  /** "2026-08-10" -> "10/08". */
  function dayMonth(ds) { return ds.slice(8) + '/' + ds.slice(5, 7); }

  function drawCharts() {
    var vus = Object.keys(IX), i;
    for (i = 0; i < ST.ses.length; i++) { /* rien : les blocs sont déjà rendus */ }
    var blocs = document.querySelectorAll('[id^="ch_"]');
    for (i = 0; i < blocs.length; i++) {
      var exId = blocs[i].id.slice(3);
      var pts = E.exerciseTrack(ST.ses, exId, IX, bwAt, ST.set.proMode || 'auto');
      if (pts.length < 2) { blocs[i].innerHTML = ''; continue; }
      blocs[i].innerHTML = lineChart(
        pts.map(function (p) { return { v: p.v, l: dayMonth(p.d) }; }),
        pts[0].unit
      );
    }
  }

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
  function lineChart(data, unite) {
    unite = unite || 'kg';
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
      'aria-label="Progression, de ' + num(E.r1(bas)) + ' à ' + num(E.r1(haut)) + ' ' + esc(unite) + '">';
    s += '<line class="grid" x1="0" y1="' + pt + '" x2="' + W + '" y2="' + pt + '" stroke-dasharray="3 3"/>';
    s += '<line class="grid" x1="0" y1="' + (pt + ih) + '" x2="' + W + '" y2="' + (pt + ih) + '"/>';
    s += '<path class="ar" d="' + area + '"/><path class="ln" d="' + d + '"/>';
    data.forEach(function (p, i) {
      if (data.length <= 14 || i === 0 || i === data.length - 1) {
        s += '<circle class="pt" cx="' + X(i).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="3"/>';
      }
    });
    s += '<text class="val" x="2" y="' + (pt - 4) + '">' + num(E.r1(haut)) + ' ' + esc(unite) + '</text>';
    s += '<text class="val" x="2" y="' + (pt + ih - 4) + '">' + num(E.r1(bas)) + ' ' + esc(unite) + '</text>';
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
    if (o.inputs) {
      h += '<div class="drow">' + o.inputs.map(function (f) {
        return '<div class="dfield"><label class="dlab" for="dlg_' + esc(f.key) + '">' + esc(f.label) + '</label>' +
          '<input id="dlg_' + esc(f.key) + '" type="text" inputmode="' + esc(f.inputmode || 'decimal') + '" ' +
          'autocomplete="off" enterkeyhint="done" value="' + esc(f.value) + '"></div>';
      }).join('') + '</div>';
    }
    h += '<div class="dacts">' +
      '<button class="btn" data-act="dlg-no">' + esc(o.cancel || 'Annuler') + '</button>' +
      '<button class="btn ' + (o.danger ? 'dgr' : 'pri') + '" data-act="dlg-yes">' + esc(o.ok || 'Confirmer') + '</button>' +
      '</div></div></div>';
    $('dlg').innerHTML = h;
    dlgWord = o.input && o.input.confirmWord ? o.input.confirmWord : null;
    dlgFields = o.inputs || null;
    var f = $('dlgIn') || (o.inputs && $('dlg_' + o.inputs[0].key));
    if (f) { f.focus(); f.select(); } else {
      var b = $('dlg').querySelector('[data-act="dlg-yes"]');
      if (b) b.focus();
    }
  }

  var dlgWord = null, dlgFields = null;

  function closeDialog(run, depuisRetour) {
    var cb = dlgOk, f = $('dlgIn'), val = f ? f.value : null;
    if (dlgFields) {
      val = {};
      dlgFields.forEach(function (x) { var e2 = $('dlg_' + x.key); val[x.key] = e2 ? e2.value : ''; });
    }
    dlgFields = null;
    dlgOk = null;
    $('dlg').innerHTML = '';
    if (!depuisRetour) popLayer();
    if (dlgFocusBack && dlgFocusBack.focus) { try { dlgFocusBack.focus(); } catch (e) { } }
    dlgFocusBack = null;
    var word = dlgWord; dlgWord = null;
    if (run && cb) {
      if (word && String(val).trim().toUpperCase() !== word) { toast('Confirmation incorrecte', 'alert'); return; }
      cb(val);
    }
  }

  var sheetClose = null, sheetBack = null;

  /**
   * `retour` : si fourni, la croix devient une flèche de retour et appelle cette
   * fonction — pour une feuille ouverte DEPUIS une autre (réglages -> historique
   * des versions), qui doit ramener à la précédente et non à l'écran principal.
   */
  function openSheet(title, html, onClose, retour) {
    if (!$('sheet').innerHTML) pushLayer();
    sheetClose = onClose || null;
    sheetBack = retour || null;
    $('sheet').innerHTML =
      '<div class="sheet"><div class="shd">' +
      (retour
        ? '<button class="icobtn" data-act="sheet-back" aria-label="Retour">' + ico('chevronLeft', 20) + '</button>'
        : '<button class="icobtn" data-act="closesheet" aria-label="Fermer">' + ico('close', 20) + '</button>') +
      '<h2 class="ellip">' + title + '</h2></div>' +
      '<div class="sbody">' + html + '</div></div>';
  }

  function closeSheet(depuisRetour) {
    var etaitOuverte = !!$('sheet').innerHTML;
    if (sheetClose) { try { sheetClose(); } catch (e) { } }
    sheetClose = null; sheetBack = null;
    pickPour = null;          // sélecteur refermé sans choix : on le désarme
    $('sheet').innerHTML = '';
    // Ne dépiler QUE si une feuille était réellement ouverte : sinon on consomme
    // une entrée d'historique qui ne nous appartient pas, et history.back() fait
    // quitter l'application.
    if (etaitOuverte && !depuisRetour) popLayer();
    render();
  }

  /* --------------------------- Choix d'un exercice ------------------ */

  var pickQ = '', pickG = '', pickPour = null;

  /** Minuscules sans accents : « développé » se trouve en tapant « developpe ». */
  function sansAccents(x) {
    var t = String(x || '').toLowerCase();
    return t.normalize ? t.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : t;
  }

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

    var q = sansAccents(pickQ.trim());
    var list = allExercises().filter(function (ex) {
      if (ex.off) return false;
      if (pickG && ex.g !== pickG && (ex.g2 || []).indexOf(pickG) < 0) return false;
      /* On cherche dans les DEUX langues, quelle que soit celle affichée :
         taper « row » doit trouver le rowing même en français, et « rowing »
         doit trouver le barbell row même en anglais. */
      if (q) {
        var champs = [ex.n, ex.en, eqName(ex.eq), gName(ex.g),
          CAT.GROUPS[ex.g] && CAT.GROUPS[ex.g].en];
        var trouve = false, ci;
        for (ci = 0; ci < champs.length; ci++) {
          if (champs[ci] && sansAccents(champs[ci]).indexOf(q) >= 0) { trouve = true; break; }
        }
        if (!trouve) return false;
      }
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
      return nomDe(a).localeCompare(nomDe(b), enAnglais() ? 'en' : 'fr');
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
        '<span class="grow"><span class="nm">' + esc(nomDe(ex)) + '</span><br>' +
        '<span class="sub">' + esc(gName(ex.g)) + ' · ' + esc(eqName(ex.eq)) + '</span></span>' +
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
    // Complément d'une séance passée : on repart vers son détail, pas vers l'onglet Séance.
    if (pickPour) {
      var cible = null, kp;
      for (kp = 0; kp < ST.ses.length; kp++) if (ST.ses[kp].id === pickPour.sid) cible = ST.ses[kp];
      pickPour = null;
      if (!cible) { closeSheet(); return; }
      sheetClose = null;
      sessionDetail(cible.id);
      ajouterSerieA(cible, exId);
      return;
    }
    if (!ST.cur) { newSession([exId]); }
    else if (ST.cur.p.indexOf(exId) < 0) {
      ST.cur.p.push(exId);
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
          esc(eqName(e2)) + '</button>';
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
      toggle('stPlate', 'Calcul des disques', 'Dit quels disques mettre par côté, et sur quelle barre.', s.plateCalc) +
      toggle('stWarm', 'Marquer les échauffements', 'Une série marquée est exclue des maximums.', s.warmup) +
      toggle('stReport', 'Bouton « signaler »', 'Un drapeau dans l’en-tête pour noter un souci sans quitter la séance.', s.report) +
      '</div>';

    h += '<div class="card"><h2>Repos</h2>' +
      '<div class="field"><label>Durée par défaut (secondes)</label>' +
      '<input id="stRest" type="number" step="15" min="0" value="' + (s.rest | 0) + '"></div>' +
      toggle('stRestAuto', 'Démarrage automatique', 'Coupé par défaut : le chrono ne part que si tu appuies sur « Repos ».', s.restAuto) +
      toggle('stSound', 'Bip de fin', '', s.sound) +
      toggle('stVib', 'Vibration', '', s.vibrate) +
      '</div>';

    if (s.plateCalc) h += '<div class="card"><h2>Barres et disques</h2>' +
      '<div class="field"><label for="stBars">Barres disponibles (kg)</label>' +
      '<input id="stBars" type="text" inputmode="decimal" autocomplete="off" value="' +
      esc((s.bars || [s.bar]).map(num).join(', ')) + '">' +
      '<div class="hint">Séparées par des virgules. L’app choisit celle qui permet ' +
      'de tomber juste sur la charge saisie.</div></div>' +
      '<div class="field"><label for="stVest">Veste lestée (kg)</label>' +
      '<input id="stVest" type="text" inputmode="decimal" autocomplete="off" value="' + num(s.vest) + '">' +
      '<div class="hint">Comptée dans la charge saisie, mais retirée du calcul des disques : ' +
      'elle est sur tes épaules, pas sur la barre. 0 pour la désactiver. ' +
      'Le bouton « Veste » du pavé dit sur quels exercices tu la portes.</div></div>' +
      '<div class="field"><label>Disques disponibles</label>' +
      '<div id="plateEd">' + plateEditor() + '</div>' +
      '<div class="hint">Nombre de PAIRES de chaque disque. Sert au calcul « par côté » pendant la séance.</div></div>' +
      '</div>';

    h += '<div class="card"><h2>Toi</h2>' +
      '<div class="field"><label>Poids de corps par défaut (kg)</label>' +
      '<input id="stBw" type="number" step="0.5" value="' + dec(s.bw) + '">' +
      '<div class="hint">Utilisé tant qu’aucune pesée n’a été notée dans l’onglet Progrès. Compte les pompes et tractions dans le tonnage.</div></div>' +
      '<div class="field"><label for="stLang">Langue des exercices</label>' +
      '<select id="stLang">' +
      [['fr', 'Français'], ['en', 'English']].map(function (l) {
        return '<option value="' + l[0] + '"' + (s.lang === l[0] ? ' selected' : '') + '>' + l[1] + '</option>';
      }).join('') + '</select>' +
      '<div class="hint">Noms des exercices, groupes musculaires et rappels techniques. ' +
      'La recherche fonctionne dans les deux langues quel que soit ce choix.</div></div>' +
      '<div class="field"><label>Thème</label>' +
      '<select id="stTheme">' +
      ['auto', 'dark', 'light'].map(function (t) {
        var lab = t === 'auto' ? 'Automatique (système)' : t === 'dark' ? 'Sombre' : 'Clair';
        return '<option value="' + t + '"' + (s.theme === t ? ' selected' : '') + '>' + lab + '</option>';
      }).join('') + '</select></div>' +
      '</div>';

    var jeton = ghToken();
    h += '<div class="card"><h2>Sauvegarde cloud</h2>' +
      '<div class="small muted" style="margin-bottom:var(--s3)">' +
      (jeton
        ? 'Ta progression part toute seule dans le dépôt privé <b>' + esc(GH_REPO) + '</b> ' +
          '(dossier <b>' + esc(GH_DIR) + '</b>) à la fin de chaque séance. C’est ta vraie sauvegarde, ' +
          'et c’est aussi ce que je lis quand tu me demandes de regarder.'
        : 'Aucun jeton trouvé. Colle un jeton GitHub à portée restreinte (dépôt ' + esc(GH_REPO) +
          ', permission Contents : lecture et écriture) pour activer la sauvegarde automatique.') +
      '</div>' +
      (jeton && !ghTokenPropre()
        ? '<div class="hint" style="margin:calc(-1 * var(--s2)) 0 var(--s3)">Jeton réutilisé depuis Sori : ' +
          'les deux applications partagent le même domaine, donc le même stockage local. ' +
          'Rien à saisir.</div>'
        : '') +
      '<div class="field"><label for="ghtok">Jeton d’accès</label>' +
      '<input id="ghtok" type="password" autocomplete="off" placeholder="' +
      (jeton ? '•••• configuré ••••' : 'github_pat_…') + '"></div>' +
      '<div class="row">' +
      '<button class="btn grow" data-act="cloud-up"' + (jeton ? '' : ' disabled') + '>' +
      ico('cloudUp', 20) + 'Sauvegarder</button>' +
      '<button class="btn grow" data-act="cloud-down"' + (jeton ? '' : ' disabled') + '>' +
      ico('cloudDown', 20) + 'Restaurer</button></div>' +
      '<div class="hint" id="cloudstatus">' +
      (jeton
        ? (ST.lastCloud ? 'Dernière sauvegarde : ' + esc(relDate(ST.lastCloud)) + '.'
                        : 'Jeton en place — aucune sauvegarde encore envoyée.')
        : 'Le jeton reste sur ce téléphone et n’entre jamais dans un export.') +
      ((ST.reports || []).length ? ' · ' + ST.reports.length + ' rapport' +
        (ST.reports.length > 1 ? 's' : '') + ' joint' + (ST.reports.length > 1 ? 's' : '') : '') +
      '</div>' +
      toggle('stCloud', 'Envoi automatique', 'À la fin de chaque séance, au plus une fois toutes les 5 minutes.', s.cloud) +
      '</div>';

    h += '<div class="card"><h2>Sauvegarde fichier</h2>' +
      '<div class="small muted" style="margin-bottom:var(--s3)">Filet de secours hors-ligne. ' +
      'La progression vit dans ce téléphone : effacer les données du site l’effacerait entièrement.</div>' +
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

    h += '<div class="verline">Forge — version ' +
      '<button id="appver" class="verbtn" data-act="verhist" title="Voir l’historique des versions">…</button>' +
      '</div>';

    openSheet('Réglages', h, applySettings);
    majVersion();
  }

  /**
   * La version affichée est le nom du cache ACTIF du service worker, pas une
   * constante du code : c'est la seule source qui dise ce qui tourne vraiment
   * sur cet appareil, indépendamment de ce que le dépôt prétend.
   */
  var verCache = '—';

  function litVersion() {
    if (typeof caches === 'undefined' || !caches.keys) return Promise.resolve('—');
    return caches.keys().then(function (cles) {
      var nums = cles.map(function (k) { return /^forge-v(\d+)$/.exec(k); })
        .filter(Boolean).map(function (m) { return +m[1]; });
      verCache = nums.length ? 'v' + Math.max.apply(null, nums) : '—';
      return verCache;
    }).catch(function () { return '—'; });
  }

  function majVersion() {
    var av = $('appver');
    if (!av) return;
    litVersion().then(function (v) { var e2 = $('appver'); if (e2) e2.textContent = v; });
  }

  /* ================================================================== */
  /* Historique des versions                                             */
  /*                                                                     */
  /* Tiré en direct de l'API publique GitHub : le dépôt est public, aucun */
  /* jeton n'est nécessaire, et rien n'est à maintenir à la main dans     */
  /* l'app. Convention : le titre de commit d'une release commence par    */
  /* « vNN — », NN correspondant au CACHE de sw.js.                       */
  /* ================================================================== */

  var VH_URL = 'https://api.github.com/repos/mnafati-cloud/forge/commits';
  var VH_PAGE = 40;
  var vhPage = 1, vhCharge = false;

  function openVersionHistory() {
    vhPage = 1; vhCharge = false;
    openSheet('Historique des versions',
      '<div id="vhlist" class="vhlist"><p class="small muted">Chargement…</p></div>' +
      '<div id="vhmore"></div><div class="tail"></div>',
      null,
      openSettings);        // la flèche ramène aux réglages
    vhLoad();
  }

  function vhLoad() {
    if (vhCharge) return;
    vhCharge = true;
    var liste = $('vhlist'), plus = $('vhmore');
    if (plus) plus.innerHTML = '<div class="small muted center" style="padding:var(--s3)">Chargement…</div>';

    fetch(VH_URL + '?sha=main&per_page=' + VH_PAGE + '&page=' + vhPage,
      { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (commits) {
        if (!Array.isArray(commits)) throw new Error('format');
        if (!$('vhlist')) return;                       // feuille refermée entre-temps
        if (vhPage === 1) {
          liste.innerHTML = commits.length ? '' : '<p class="small muted">Aucune version trouvée.</p>';
        }
        liste.insertAdjacentHTML('beforeend', commits.map(vhLigne).join(''));
        $('vhmore').innerHTML = commits.length === VH_PAGE
          ? '<button class="btn" style="width:100%" data-act="vh-more">Charger la suite</button>'
          : '<div class="small muted center" style="padding:var(--s3)">Début du projet.</div>';
        vhPage++;
      })
      .catch(function () {
        if (!$('vhlist')) return;
        if (vhPage === 1) {
          liste.innerHTML = '<p class="small muted">Historique indisponible — hors-ligne, ' +
            'ou limite de l’API GitHub atteinte.<br>Il reste consultable sur ' +
            '<a href="https://github.com/mnafati-cloud/forge/commits/main" target="_blank" rel="noopener">GitHub</a>.</p>';
        }
        $('vhmore').innerHTML = '';
      })
      .then(function () { vhCharge = false; });
  }

  function vhLigne(c) {
    var msg = ((c.commit && c.commit.message) || '').split('\n')[0];
    var iso = c.commit && c.commit.author && c.commit.author.date;
    var d = '';
    if (iso) {
      try { d = new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
      catch (e) { d = iso.slice(0, 10); }
    }
    var mv = /^v(\d+)\s*[:\-\u2013\u2014]\s*/.exec(msg);
    var titre = mv ? msg.slice(mv[0].length).trim() : msg;
    var sha = (c.sha || '').slice(0, 7);
    return '<div class="vhitem">' +
      (mv ? '<span class="vhtag">v' + esc(mv[1]) + '</span>'
          : '<span class="vhtag off">·</span>') +
      '<span class="grow"><span class="vhtitle">' + esc(titre) + '</span>' +
      '<span class="vhmeta">' + esc(d) + (sha ? ' · ' + esc(sha) : '') + '</span></span></div>';
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
    v = g('stVest');
    if (v !== null) {
      var vv = parseFloat(String(v).replace(',', '.'));
      if (isFinite(vv) && vv >= 0) ST.set.vest = E.r2(vv);
    }
    v = g('stBars');
    if (v !== null) {
      var lb = String(v).split(/[,;]/).map(function (x) {
        return parseFloat(String(x).replace(',', '.').trim());
      }).filter(function (x) { return isFinite(x) && x >= 0; });
      if (lb.length) { ST.set.bars = lb; ST.set.bar = lb[lb.length - 1]; }
    }
    v = parseFloat(g('stBw')); if (v > 0) ST.set.bw = v;
    v = g('stTheme'); if (v) ST.set.theme = v;
    v = g('stLang'); if (v === 'fr' || v === 'en') ST.set.lang = v;
    var tk = $('ghtok');
    if (tk && tk.value.trim()) { setGhToken(tk.value); tk.value = ''; }
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

  var BAK = 'forge-state-v1-avant-import';

  function doImport(file) {
    var fr = new FileReader();
    fr.onerror = function () { toast('Lecture du fichier impossible', 'alert'); };
    fr.onload = function () {
      var data;
      try { data = JSON.parse(fr.result); } catch (e) { toast('Fichier illisible', 'alert'); return; }
      var st = data && data.state ? data.state : data;
      if (!st || typeof st !== 'object' || !Array.isArray(st.ses)) {
        toast('Ce n’est pas une sauvegarde Forge', 'alert'); return;
      }
      // On compte ce qui est RÉELLEMENT exploitable avant de proposer quoi que ce soit.
      var bonnes = st.ses.filter(function (z) { return saineSeance(z, false); }).length;
      if (!bonnes && st.ses.length) {
        toast('Sauvegarde illisible : aucune séance exploitable', 'alert'); return;
      }
      askDialog({
        title: 'Restaurer cette sauvegarde ?',
        text: bonnes + ' séance' + (bonnes > 1 ? 's' : '') + ' exploitable' + (bonnes > 1 ? 's' : '') +
          ' dans le fichier' +
          (st.ses.length !== bonnes ? ' (' + (st.ses.length - bonnes) + ' illisible' +
            (st.ses.length - bonnes > 1 ? 's' : '') + ')' : '') +
          '. Tes ' + ST.ses.length + ' séance' + (ST.ses.length > 1 ? 's' : '') +
          ' actuelle' + (ST.ses.length > 1 ? 's' : '') + ' seront remplacées — ' +
          'une copie de secours est conservée dans le téléphone.',
        ok: 'Restaurer', danger: true
      }, function () {
        // Filet : l'état actuel est mis de côté AVANT d'être écrasé.
        try { localStorage.setItem(BAK, localStorage.getItem(KEY) || ''); } catch (e) { }
        try {
          localStorage.setItem(KEY, JSON.stringify(st));
        } catch (e) {
          toast('Écriture impossible : rien n’a été modifié', 'alert'); return;
        }
        ST = loadState();
        reindex(); applyTheme();
        sheetClose = null;
        closeSheet();
        toast(ST.ses.length + ' séances restaurées', 'ok', function () {
          var av = localStorage.getItem(BAK);
          if (av === null) return;
          localStorage.setItem(KEY, av);
          ST = loadState(); reindex(); applyTheme(); render();
          toast('Import annulé', 'ok');
        });
      });
    };
    fr.readAsText(file);
  }

  /* ================================================================== */
  /* Sauvegarde cloud — dépôt PRIVÉ, via l'API Contents de GitHub         */
  /*                                                                     */
  /* Forge et Sori sont servis par la MÊME origine                        */
  /* (mnafati-cloud.github.io) : leur localStorage est commun. Le jeton    */
  /* déjà posé pour Sori est donc lisible ici, et sert tel quel — rien    */
  /* à reconfigurer sur le téléphone. Forge écrit dans un sous-dossier    */
  /* du même dépôt privé, sans jamais toucher aux fichiers de Sori.       */
  /*                                                                     */
  /* Le jeton vit dans SA PROPRE clé et n'entre JAMAIS dans un export.    */
  /* ================================================================== */

  var GH_KEY = 'forge-gh-token';
  var GH_KEY_SORI = 'sori-gh-token';
  var GH_REPO = 'mnafati-cloud/sori-data';
  var GH_DIR = 'forge/exports';

  function ghToken() {
    try { return localStorage.getItem(GH_KEY) || localStorage.getItem(GH_KEY_SORI) || ''; }
    catch (e) { return ''; }
  }
  function ghTokenPropre() {           // vrai si Forge a son propre jeton
    try { return !!localStorage.getItem(GH_KEY); } catch (e) { return false; }
  }
  function setGhToken(t) {
    try { t && t.trim() ? localStorage.setItem(GH_KEY, t.trim()) : localStorage.removeItem(GH_KEY); }
    catch (e) { }
  }

  function exportPayload() {
    return JSON.stringify({ app: 'forge', v: 1, exportedAt: new Date().toISOString(), state: ST });
  }

  /** UTF-8 -> base64, ce que l'API Contents attend. */
  function b64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function ghPut(chemin, contenu, H) {
    var url = 'https://api.github.com/repos/' + GH_REPO + '/contents/' + chemin;
    return fetch(url, { headers: H, cache: 'no-store' })
      .then(function (g) { return g.ok ? g.json().then(function (j) { return j.sha; }) : null; })
      .catch(function () { return null; })
      .then(function (sha) {
        var corps = { message: 'forge backup ' + todayStr(), content: contenu };
        if (sha) corps.sha = sha;
        return fetch(url, { method: 'PUT', headers: H, body: JSON.stringify(corps) });
      })
      .then(function (r) { return r.ok; });
  }

  function cloudBackup() {
    var tok = ghToken();
    if (!tok) return Promise.resolve({ ok: false, msg: 'aucun jeton configuré' });
    var contenu = b64(exportPayload());
    var octets = Math.floor(contenu.length * 3 / 4);
    if (octets > 700 * 1024) {
      // L'API Contents plafonne autour d'1 Mo par fichier : on alerte AVANT le mur.
      toast('Sauvegarde volumineuse (' + Math.round(octets / 1024) + ' Ko)', 'alert');
    }
    var H = { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' };
    return ghPut(GH_DIR + '/latest.json', contenu, H)
      .then(function (ok1) {
        if (!ok1) return false;
        return ghPut(GH_DIR + '/forge-export-' + todayStr() + '.json', contenu, H);
      })
      .then(function (ok) {
        if (!ok) return { ok: false, msg: 'refus de l’API (jeton invalide ou expiré ?)' };
        ST.lastCloud = todayStr();
        save(true);
        return { ok: true };
      })
      .catch(function () { return { ok: false, msg: 'hors ligne ?' }; });
  }

  /**
   * Sauvegarde silencieuse. Limitée à une tentative toutes les 5 minutes SAUF
   * si `impératif` : une fin de séance ne doit jamais être sautée sous prétexte
   * qu'un rapport vient d'être envoyé — c'est précisément le moment où il y a
   * quelque chose à sauver.
   */
  function autoCloudBackup(imperatif) {
    if (!ST.set.cloud || !ghToken()) return;
    var maintenant = Date.now();
    if (!imperatif && maintenant - (ST.lastCloudTs || 0) < 5 * 60 * 1000) return;
    ST.lastCloudTs = maintenant;
    save();                                   // consomme la fenêtre AVANT l'appel : anti double-tir
    cloudBackup().catch(function () { });
  }

  function cloudRestore() {
    var tok = ghToken();
    if (!tok) return Promise.resolve({ ok: false, msg: 'aucun jeton configuré' });
    var url = 'https://api.github.com/repos/' + GH_REPO + '/contents/' + GH_DIR + '/latest.json';
    return fetch(url, {
      headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github.raw' },
      cache: 'no-store'
    })
      .then(function (r) {
        if (r.status === 404) throw new Error('aucune sauvegarde dans le cloud');
        if (!r.ok) throw new Error('refus de l’API (' + r.status + ')');
        return r.json();
      })
      .then(function (data) {
        var st = data && data.state ? data.state : data;
        if (!st || !Array.isArray(st.ses)) throw new Error('sauvegarde illisible');
        var bonnes = st.ses.filter(function (z) { return saineSeance(z, false); }).length;
        return { ok: true, st: st, bonnes: bonnes, at: data.exportedAt || '' };
      })
      .catch(function (e) { return { ok: false, msg: e.message || 'hors ligne ?' }; });
  }

  /* ================================================================== */
  /* Rapport de problème                                                 */
  /*                                                                     */
  /* Les rapports vivent dans ST.reports, partent avec chaque sauvegarde  */
  /* cloud et chaque export : je les lis à la session suivante. Le        */
  /* contexte est capturé automatiquement — décrire « où » et « quand »   */
  /* au clavier, entre deux séries, personne ne le fait.                  */
  /* ================================================================== */

  function reportCtx() {
    var c = { onglet: UI.tab, v: verCache };
    try {
      if (ST.cur) {
        c.seance = {
          n: ST.cur.n, d: ST.cur.d,
          series: ST.cur.s.length,
          exercices: sessionExercises(ST.cur)
        };
        if (ST.cur.s.length) {
          var d = ST.cur.s[ST.cur.s.length - 1];
          c.derniereSerie = { x: d.x, nom: exName(d.x), w: d.w, r: d.r, u: d.u };
        }
      }
      if (UI.act) c.exerciceActif = { id: UI.act, nom: exName(UI.act) };
      c.total = { seances: ST.ses.length, exercicesPerso: Object.keys(ST.ex).length };

    } catch (e) { c.erreurContexte = String(e && e.message); }
    return c;
  }

  function openReport() {
    var ctx = reportCtx();                    // figé à l'OUVERTURE : l'écran d'où l'on vient
    var ou = ctx.seance
      ? 'Séance « ' + ctx.seance.n + ' », ' + ctx.seance.series + ' série' + (ctx.seance.series > 1 ? 's' : '')
      : 'Onglet ' + ({ ses: 'Séance', his: 'Historique', pro: 'Progrès' }[ctx.onglet] || ctx.onglet);
    var h = '<div class="card"><div class="small muted">' + esc(ou) +
      (ctx.exerciceActif ? ' · ' + esc(ctx.exerciceActif.nom) : '') +
      '</div><div class="hint">L’endroit exact, l’heure et la version sont joints tout seuls.</div></div>' +
      '<div class="field"><label for="rpttxt">Qu’est-ce qui cloche ?</label>' +
      '<textarea id="rpttxt" rows="6" placeholder="Décris le souci ou l’idée, même en trois mots."></textarea></div>' +
      '<button class="btn pri big" data-act="rpt-send">' + ico('check', 21) + 'Enregistrer</button>' +
      '<div class="hint">Part avec la prochaine sauvegarde et avec chaque export.</div>';
    var nb = (ST.reports || []).length;
    if (nb) {
      h += '<div class="sp-6"></div><h2 class="h2">' + nb + ' rapport' + (nb > 1 ? 's' : '') + ' en attente</h2>';
      h += (ST.reports || []).slice().reverse().slice(0, 20).map(function (r) {
        return '<div class="vhitem"><span class="grow"><span class="vhtitle">' + esc(r.txt) + '</span>' +
          '<span class="vhmeta">' + esc(String(r.d || '').slice(0, 16).replace('T', ' à ')) + '</span></span></div>';
      }).join('');
    }
    h += '<div class="tail"></div>';
    openSheet('Signaler un problème', h);
    REPORT_CTX = ctx;
    var t = $('rpttxt'); if (t) t.focus();
  }

  var REPORT_CTX = null;

  function sendReport() {
    var t = $('rpttxt');
    var txt = t ? t.value.trim() : '';
    if (!txt) { toast('Écris deux mots d’abord', 'alert'); if (t) t.focus(); return; }
    ST.reports = (ST.reports || []).slice(-99);
    ST.reports.push({ d: new Date().toISOString(), ctx: REPORT_CTX || {}, txt: txt });
    REPORT_CTX = null;
    save(true);
    closeSheet();
    toast('Noté — part à la prochaine sauvegarde', 'ok');
    autoCloudBackup();
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
    if (a === 'vest') {
      var vid = t.dataset.id;
      if (!ST.set.vestEx || typeof ST.set.vestEx !== 'object') ST.set.vestEx = {};
      if (ST.set.vestEx[vid]) delete ST.set.vestEx[vid]; else ST.set.vestEx[vid] = 1;
      save();
      t.className = 'chip' + (vesteDe(vid) ? ' on' : '');
      t.setAttribute('aria-pressed', vesteDe(vid) ? 'true' : 'false');
      var pv = $('padPlates');
      if (pv) pv.innerHTML = platesLine(UI.w, vid);
      return;
    }
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
    if (a === 'rest-add' || a === 'rest-sub') {
      var pas = a === 'rest-add' ? 30 : -30;
      var restant = Math.max(5, Math.round((rest.end - Date.now()) / 1000) + pas);
      rest.end = Date.now() + restant * 1000;
      rest.total = Math.max(rest.total + pas, restant);
      // La durée ajustée devient la nouvelle durée par défaut : on la choisit
      // une fois, elle est reprise à chaque relance.
      ST.set.rest = Math.max(5, (Number(ST.set.rest) || 0) + pas);
      ST.rest = { end: rest.end, total: rest.total };
      save();
      majChipRepos();
      restTick(); return;
    }
    if (a === 'rest-skip') { restStop(); return; }

    /* --- navigation --- */
    if (a === 'go-ses') { UI.tab = 'ses'; render(); return; }
    if (a === 'closesheet') { closeSheet(); return; }
    if (a === 'sheet-back') {
      var fb = sheetBack;
      sheetBack = null; sheetClose = null;
      if (fb) fb(); else closeSheet();
      return;
    }

    /* --- séance --- */
    if (a === 'new-empty') { newSession([]); render(); openPicker(); return; }
    if (a === 'repeat') {
      var src = null, i;
      for (i = 0; i < ST.ses.length; i++) if (ST.ses[i].id === t.dataset.id) src = ST.ses[i];
      if (!src) return;
      var go = function () {
        newSession(sessionExercises(src), src.n);
        closeSheet();   // exécute sheetClose : la note tapée dans le détail est enregistrée
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
      var ps = parseInt(t.dataset.step, 10) || 1;
      UI.r = Math.max(1, (UI.r | 0) + (a === 'r+' ? ps : -ps));
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

    if (a === 'fix-addex') {
      var sidA = t.dataset.sid;
      pickPour = { sid: sidA };
      openPicker();
      return;
    }

    if (a === 'fix-add') {
      var fsa = null, ka;
      for (ka = 0; ka < ST.ses.length; ka++) if (ST.ses[ka].id === t.dataset.sid) fsa = ST.ses[ka];
      if (!fsa) return;
      ajouterSerieA(fsa, t.dataset.x);
      return;
    }

    if (a === 'fix-set' || a === 'fix-del') {
      var fs = null, fi = +t.dataset.ix, k;
      for (k = 0; k < ST.ses.length; k++) if (ST.ses[k].id === t.dataset.sid) fs = ST.ses[k];
      if (!fs || !fs.s[fi]) return;
      var cible = fs.s[fi], cex = exOf(cible.x);

      if (a === 'fix-del') {
        var copie = fs.s[fi];
        fs.s.splice(fi, 1);
        if (!fs.s.length) {                       // plus aucune série : la séance n'a plus de sens
          ST.ses = ST.ses.filter(function (z) { return z.id !== fs.id; });
          sheetClose = null; closeSheet();
        } else {
          save(true); sessionDetail(fs.id);
        }
        save(true);
        toast('Série supprimée', null, function () {
          if (ST.ses.indexOf(fs) < 0) ST.ses.push(fs);
          fs.s.splice(Math.min(fi, fs.s.length), 0, copie);
          ST.ses.sort(function (x, y) { return (x.t0 || 0) - (y.t0 || 0); });
          save(true); sessionDetail(fs.id);
          toast('Série rétablie', 'ok');
        });
        return;
      }

      askDialog({
        title: 'Corriger la série',
        text: exName(cible.x) + ' — ' + longDate(fs.d),
        ok: 'Enregistrer',
        inputs: [
          { key: 'w', label: cex.sec ? 'Lest (kg)' : (cex.bw ? 'Lest (kg)' : 'Charge (kg)'), value: num(cible.w) },
          { key: 'r', label: cex.sec ? 'Durée (s)' : 'Répétitions', value: String(cible.r), inputmode: 'numeric' }
        ]
      }, function (v) {
        var nw = Math.max(0, parseFloat(String(v.w).replace(',', '.').replace(/[^0-9.]/g, '')) || 0);
        var nr = Math.max(0, parseInt(String(v.r).replace(/[^0-9]/g, ''), 10) || 0);
        if (nr <= 0) { toast('Valeur invalide : rien n’a été modifié', 'alert'); return; }
        cible.w = E.r2(nw); cible.r = nr;
        save(true); sessionDetail(fs.id);
        toast('Série corrigée', 'ok');
      });
      return;
    }
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
      var el = $('bwIn'), w = parseFloat(String(el ? el.value : '').replace(',', '.'));
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
      var map = { stRpe: 'rpe', stCues: 'cues', stRestAuto: 'restAuto', stSound: 'sound',
        stVib: 'vibrate', stReport: 'report', stCloud: 'cloud',
        stPlate: 'plateCalc', stWarm: 'warmup' };
      var k = map[t.id];
      if (!k) return;
      ST.set[k] = !ST.set[k];
      t.classList.toggle('on', ST.set[k]);
      t.setAttribute('aria-checked', ST.set[k] ? 'true' : 'false');
      save();
      if (k === 'report') majBoutonRapport();
      if (k === 'plateCalc' || k === 'warmup') { applySettings(); openSettings(); }
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
    if (a === 'rpt-send') { sendReport(); return; }

    if (a === 'cloud-up') {
      var st1 = $('cloudstatus');
      if (st1) st1.textContent = 'Envoi en cours…';
      cloudBackup().then(function (r) {
        var e2 = $('cloudstatus');
        if (e2) e2.textContent = r.ok ? 'Sauvegardé dans le cloud aujourd’hui.' : 'Échec : ' + r.msg;
        toast(r.ok ? 'Sauvegarde envoyée' : 'Échec : ' + r.msg, r.ok ? 'ok' : 'alert');
      });
      return;
    }

    if (a === 'cloud-down') {
      var st2 = $('cloudstatus');
      if (st2) st2.textContent = 'Lecture du cloud…';
      cloudRestore().then(function (r) {
        var e3 = $('cloudstatus');
        if (!r.ok) {
          if (e3) e3.textContent = 'Restauration : ' + r.msg;
          toast(r.msg, 'alert');
          return;
        }
        if (e3) e3.textContent = 'Sauvegarde trouvée : ' + r.bonnes + ' séance(s).';
        askDialog({
          title: 'Restaurer depuis le cloud ?',
          text: r.bonnes + ' séance' + (r.bonnes > 1 ? 's' : '') + ' dans le cloud' +
            (r.at ? ', sauvegardée le ' + String(r.at).slice(0, 10) : '') +
            '. Tes ' + ST.ses.length + ' séance' + (ST.ses.length > 1 ? 's' : '') +
            ' de ce téléphone seront remplacées.',
          ok: 'Restaurer', danger: true
        }, function () {
          try { localStorage.setItem(BAK, localStorage.getItem(KEY) || ''); } catch (e) { }
          try { localStorage.setItem(KEY, JSON.stringify(r.st)); }
          catch (e) { toast('Écriture impossible : rien n’a changé', 'alert'); return; }
          ST = loadState(); reindex(); applyTheme();
          sheetClose = null; closeSheet();
          toast(ST.ses.length + ' séances restaurées', 'ok', function () {
            var av = localStorage.getItem(BAK);
            if (av === null) return;
            localStorage.setItem(KEY, av);
            ST = loadState(); reindex(); applyTheme(); render();
            toast('Restauration annulée', 'ok');
          });
        });
      });
      return;
    }

    if (a === 'verhist') { applySettings(); openVersionHistory(); return; }
    if (a === 'vh-more') { vhLoad(); return; }
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
    if (ev.target.id === 'proMode') {
      ST.set.proMode = ev.target.value;
      save(true); render();
      return;
    }
    if (ev.target.id === 'impFile' && ev.target.files && ev.target.files[0]) doImport(ev.target.files[0]);

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
      if (pl) pl.innerHTML = platesLine(UI.w, UI.act);
      syncAddState();
    }
  });

  /** Lit les champs du pavé sans redessiner (évite de voler le focus). */
  function readPad() {
    var w = $('padW'), r = $('padR');
    // Un champ vidé vaut 0, jamais « l'ancienne valeur » : sinon on enregistre
    // en silence un chiffre différent de celui affiché.
    if (w) UI.w = Math.max(0, parseFloat(String(w.value).replace(',', '.').replace(/[^0-9.]/g, '')) || 0);
    if (r) UI.r = Math.max(0, parseInt(String(r.value).replace(/[^0-9]/g, ''), 10) || 0);
  }

  /** Le bouton Valider est désactivé tant que la saisie n'a pas de sens. */
  function syncAddState() {
    var b = document.querySelector('[data-act="add"]');
    if (b) b.disabled = !((UI.r | 0) > 0);
  }

  /** Réécrit les champs du pavé sans redessiner toute la vue. */
  function syncPad() {
    var w = $('padW'), r = $('padR'), pl = $('padPlates');
    if (w) w.value = num(UI.w);
    if (r) r.value = UI.r | 0;
    if (pl) pl.innerHTML = platesLine(UI.w, UI.act);
  }

  function syncName() {
    var n = $('sesName');
    if (n && ST.cur) { ST.cur.n = n.value.trim(); save(); }   // vide : la date fait office
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
  $('btnRpt').addEventListener('click', openReport);

  function majBoutonRapport() {
    var b = $('btnRpt');
    if (!b) return;
    b.hidden = ST.set.report !== true;
    var nb = (ST.reports || []).length;
    b.classList.toggle('badge', nb > 0);
    b.setAttribute('aria-label', nb ? 'Signaler un problème (' + nb + ' en attente)' : 'Signaler un problème');
  }

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
    if (retourInterne) { retourInterne = false; return; }   // notre propre fermeture
    if ($('dlg').innerHTML) { closeDialog(false, true); return; }
    if ($('sheet').innerHTML) { closeSheet(true); return; }
  });

  /* Chaque couche ouverte empile une entrée d'historique, consommée à sa
     fermeture. Sans le retrait, le bouton Retour d'Android n'avait plus d'effet
     visible pendant autant d'appuis que de feuilles ouvertes depuis le lancement. */
  function pushLayer() {
    try { history.pushState({ forge: 1 }, ''); } catch (e) { /* sans effet */ }
  }
  var retourInterne = false;

  function popLayer() {
    // history.back() déclenche un popstate. Sans ce drapeau, fermer un dialogue
    // ouvert DEPUIS une feuille refermait aussi la feuille dessous : le popstate
    // voyait la feuille encore ouverte et la prenait pour la couche à fermer.
    retourInterne = true;
    try { history.back(); } catch (e) { retourInterne = false; }
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
  /* Filet de sécurité                                                   */
  /* ================================================================== */

  /**
   * Une exception pendant le rendu laissait un écran vide et muet : plus aucune
   * commande, et surtout aucun moyen d'exporter avant de tenter quoi que ce soit.
   * On affiche donc un écran de secours dont le SEUL rôle est de sauver les données.
   */
  var filetArme = false;
  function ecranDeSecours(err) {
    if (filetArme) return;
    filetArme = true;
    try { restStop(); } catch (e) { }
    document.body.innerHTML =
      '<main><div class="card"><h2>Forge s’est arrêtée</h2>' +
      '<p class="small muted">Tes séances sont toujours dans ce téléphone. ' +
      '<b>Exporte-les maintenant</b>, avant toute autre manipulation.</p>' +
      '<button class="btn pri big" id="secExport">Exporter la sauvegarde</button>' +
      '<div class="sp-2"></div>' +
      '<button class="btn big" id="secReload">Relancer l’application</button>' +
      '<div class="hint">Détail technique : ' + esc(String((err && err.message) || err || '')) + '</div>' +
      '</div></main>';
    var b1 = $('secExport'), b2 = $('secReload');
    if (b1) b1.onclick = function () {
      try { doExport(); }
      catch (e) {
        // Dernier recours : l'état brut, sans passer par le code applicatif.
        var blob = new Blob([localStorage.getItem(KEY) || '{}'], { type: 'application/json' });
        var u = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = u; a.download = 'forge-secours-' + todayStr() + '.json';
        document.body.appendChild(a); a.click();
      }
    };
    if (b2) b2.onclick = function () { location.reload(); };
  }

  window.addEventListener('error', function (ev) { ecranDeSecours(ev.error || ev.message); });
  window.addEventListener('unhandledrejection', function (ev) { ecranDeSecours(ev.reason); });

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
  /* Ce qui a été écarté au chargement doit l'être aussi dans le stockage :
     sinon la même saleté est relue à chaque lancement, et un jour un correctif
     de lecture la laissera repasser. On garde une copie brute avant d'écrire. */
  if (ecartees) {
    try { if (brutAvantNettoyage) localStorage.setItem('forge-state-v1-avant-nettoyage', brutAvantNettoyage); }
    catch (e) { /* pas de place : tant pis pour la copie, on nettoie quand même */ }
  }
  /* Une migration doit être ÉCRITE, sinon elle repasse à chaque lancement — et
     réécraserait un réglage que l'utilisateur aurait volontairement remis. */
  if (ecartees || migAppliquee) save(true);

  /* Au tout premier lancement, le service worker n'a pas encore rempli son cache :
     caches.keys() renvoie une liste vide et la version resterait « — ». On relit
     donc dès qu'il est prêt, pour que le n° soit juste dans les rapports. */
  litVersion();
  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then(function () { litVersion(); }).catch(function () { });
  }
  restResume();
  render();

  /* Séance laissée ouverte un autre jour : sans cela, les séries du lendemain
     sont datées de la veille et le chrono affiche une durée absurde. */
  if (ST.cur && ST.cur.d !== todayStr()) {
    (function (ancienne) {
      askDialog({
        title: 'Séance du ' + longDate(ancienne.d) + ' encore ouverte',
        text: ancienne.s.length + ' série' + (ancienne.s.length > 1 ? 's' : '') +
          ' enregistrée' + (ancienne.s.length > 1 ? 's' : '') +
          '. La clôturer à sa date, ou la reprendre telle quelle ?',
        ok: 'La clôturer', cancel: 'La reprendre'
      }, function () {
        if (!ST.cur || ST.cur.id !== ancienne.id) return;
        var dernier = ST.cur.s.length ? ST.cur.s[ST.cur.s.length - 1].t : 0;
        ST.cur.t1 = dernier > ST.cur.t0 ? dernier : ST.cur.t0;   // pas 14 h de séance
        if (ST.cur.s.length) {
          ST.ses.push(ST.cur);
          ST.ses.sort(function (a, b) { return (a.t0 || 0) - (b.t0 || 0); });
        }
        ST.cur = null; UI.act = null;
        restStop(); wakeLock(false);
        save(true); render();
        toast('Séance clôturée', 'ok');
      });
    })(ST.cur);
  } else if (ecartees) {
    toast(ecartees + ' entrée' + (ecartees > 1 ? 's' : '') + ' illisible' +
      (ecartees > 1 ? 's' : '') + ' écartée' + (ecartees > 1 ? 's' : ''), 'alert');
  }
})();
