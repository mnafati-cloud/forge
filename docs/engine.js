/* Forge — moteur pur et CONTRACTUEL.
 *
 * RÈGLES :
 *  - Aucun accès au DOM, à window, ni au localStorage dans ce fichier.
 *  - Tout est déterministe : les dates et le « maintenant » entrent en PARAMÈTRE.
 *  - Toute modification passe par les tests d'abord (tests/engine.test.mjs).
 *  - DEF_SET est un contrat : ajouter une clé = mettre à jour le test contractuel
 *    dans le MÊME commit. Ne jamais renommer ni resémantiser une clé existante.
 *
 * CONTRAT DE DONNÉES (localStorage "forge-state-v1", écrit uniquement par app.js) :
 *   Série   { x:string  exerciceId
 *             w:number  charge en kg (LEST additionnel si exercice au poids du corps ;
 *                       charge d'UN côté si exercice unilatéral)
 *             r:number  répétitions (ou secondes pour les gainages)
 *             e:number  RPE 0-10, 0 = non renseigné
 *             u:0|1     1 = série d'échauffement (exclue du volume et des records)
 *             t:number  timestamp ms de la validation }
 *   Séance  { id:string, d:"YYYY-MM-DD", t0:number, t1:number (0 = en cours),
 *             n:string nom, s:[Série], note:string }
 *
 * CONVENTION unilatéral : une entrée de série = UN côté. Enregistre deux séries
 * pour deux côtés. Le volume ne double donc jamais tout seul.
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Réglages par défaut — CONTRAT (cf. tests/engine.test.mjs)            */
  /* ------------------------------------------------------------------ */
  var DEF_SET = {
    unit: 'kg',
    bar: 20,
    plates: [
      { w: 20, n: 2 }, { w: 15, n: 2 }, { w: 10, n: 2 },
      { w: 5, n: 2 }, { w: 2.5, n: 2 }, { w: 1.25, n: 2 }
    ],
    step: 2.5,
    rest: 120,
    restAuto: true,
    sound: true,
    vibrate: true,
    rpe: false,
    theme: 'auto',
    cues: true,
    bw: 75,
    report: true,
    cloud: true
  };

  /* ------------------------------------------------------------------ */
  /* Utilitaires numériques                                              */
  /* ------------------------------------------------------------------ */

  function r1(x) { return Math.round(x * 10) / 10; }

  /* Les charges doivent garder 2 décimales : un disque de 1,25 kg passé dans un
   * arrondi au dixième deviendrait 1,3 et ferait dériver tous les totaux. */
  function r2(x) { return Math.round(x * 100) / 100; }

  /** Arrondit v au multiple de step le plus proche (step > 0). */
  function roundStep(v, step) {
    if (!(step > 0)) return v;
    return r2(Math.round(v / step) * step);
  }

  /**
   * 1RM estimé (Epley). r <= 1 renvoie la charge telle quelle.
   * Au-delà de 12 répétitions l'estimation devient indicative — on la calcule
   * quand même, l'UI signale l'incertitude.
   */
  function e1rm(w, r) {
    w = Number(w) || 0;
    r = Number(r) || 0;
    if (w <= 0 || r <= 0) return 0;
    if (r <= 1) return r1(w);
    return r1(w * (1 + r / 30));
  }

  /* ------------------------------------------------------------------ */
  /* Charge effective et volume                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Résout le poids de corps à utiliser.
   * `bw` accepte un NOMBRE (poids constant) ou une FONCTION (dateStr) -> kg.
   * La forme fonction est la bonne pour tout calcul historique : sans elle,
   * un record de tractions établi à 80 kg se réécrit dès qu'on pèse 70 kg,
   * et tout le passé bouge à chaque pesée.
   */
  function bwOf(bw, dateStr) {
    if (typeof bw === 'function') return Number(bw(dateStr)) || 0;
    return Number(bw) || 0;
  }

  /**
   * Charge réellement déplacée par une série.
   * Exercice au poids du corps : poids de corps + lest saisi.
   */
  function effLoad(set, ex, bodyweight) {
    var w = Number(set && set.w) || 0;
    if (ex && ex.bw) w += Number(bodyweight) || 0;
    return r2(w);
  }

  /**
   * Tonnage d'une série.
   * Zéro pour un échauffement (u:1) ET pour un exercice chronométré (ex.sec) :
   * `r` y est une DURÉE, pas un nombre de répétitions. Sans cette exclusion,
   * 60 secondes de gainage à 80 kg pesaient 4800 « kg » et écrasaient à elles
   * seules tout le tonnage réel de la séance.
   */
  function setVolume(set, ex, bodyweight) {
    if (!set || set.u) return 0;
    if (ex && ex.sec) return 0;
    return r2(effLoad(set, ex, bodyweight) * (Number(set.r) || 0));
  }

  /** Index {id: exercice} à partir d'une liste (catalogue + exercices persos). */
  function indexExercises(list) {
    var ix = {}, i;
    for (i = 0; i < (list || []).length; i++) ix[list[i].id] = list[i];
    return ix;
  }

  /**
   * Poids de corps connu à une date donnée : la mesure la plus récente
   * antérieure ou égale. Sinon la plus ancienne, sinon `fallback`.
   * log = [{d:"YYYY-MM-DD", w:number}] dans n'importe quel ordre.
   */
  function bodyweightAt(log, dateStr, fallback) {
    var arr = (log || []).slice().sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
    if (!arr.length) return Number(fallback) || 0;
    var best = null, i;
    for (i = 0; i < arr.length; i++) if (arr[i].d <= dateStr) best = arr[i];
    return Number((best || arr[0]).w) || Number(fallback) || 0;
  }

  /* ------------------------------------------------------------------ */
  /* Statistiques de séance                                              */
  /* ------------------------------------------------------------------ */

  /**
   * {vol, sets, reps, exs, dur} pour une séance.
   * `sets`/`reps`/`vol` excluent l'échauffement ; `exs` = nb d'exercices distincts.
   */
  function sessionStats(session, exIndex, bodyweight) {
    var out = { vol: 0, sets: 0, reps: 0, exs: 0, dur: 0, sec: 0 };
    if (!session) return out;
    var bw = bwOf(bodyweight, session.d);
    var seen = {}, i, s;
    for (i = 0; i < (session.s || []).length; i++) {
      s = session.s[i];
      seen[s.x] = 1;
      if (s.u) continue;
      out.sets++;
      // Les secondes de gainage sont comptées à part : ce ne sont pas des reps.
      if (exIndex[s.x] && exIndex[s.x].sec) out.sec += Number(s.r) || 0;
      else out.reps += Number(s.r) || 0;
      out.vol += setVolume(s, exIndex[s.x], bw);
    }
    out.vol = r2(out.vol);
    out.exs = Object.keys(seen).length;
    out.dur = session.t1 && session.t0 ? Math.max(0, session.t1 - session.t0) : 0;
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Records et historique par exercice                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Meilleure série par exercice sur toutes les séances fournies.
   * Critère : 1RM estimé le plus élevé ; à égalité, la charge la plus lourde.
   * Renvoie {exId: {w, r, e1rm, d, sid}}.
   */
  function bestSets(sessions, exIndex, bodyweight) {
    var out = {}, i, j, ses, s, ex, ld, est, cur, r, mieux;
    var bw;
    for (i = 0; i < (sessions || []).length; i++) {
      ses = sessions[i];
      bw = bwOf(bodyweight, ses.d);
      for (j = 0; j < (ses.s || []).length; j++) {
        s = ses.s[j];
        if (s.u) continue;
        ex = exIndex[s.x];
        ld = effLoad(s, ex, bw);
        r = Number(s.r) || 0;
        cur = out[s.x];

        if (ex && ex.sec) {
          // Chronométré : le record est la DURÉE, le lest ne départage qu'à
          // durée égale. Classer par charge d'abord ferait perdre son record de
          // gainage à quelqu'un qui maigrit — son poids de corps entre pourtant
          // dans la charge, sans rien dire de sa performance.
          if (r <= 0) continue;
          // `w` retenu = le LEST ajouté, pas la charge totale : le poids de corps
          // varie sans rien dire de la performance, et il déclencherait de faux
          // records les jours où l'on est plus lourd.
          var lest = Number(s.w) || 0;
          mieux = !cur || r > cur.r || (r === cur.r && lest > cur.w);
          if (mieux) out[s.x] = { w: lest, r: r, e1rm: 0, d: ses.d, sid: ses.id };
          continue;
        }

        est = e1rm(ld, r);
        if (est <= 0) continue;
        if (!cur || est > cur.e1rm || (est === cur.e1rm && ld > cur.w)) {
          out[s.x] = { w: ld, r: r, e1rm: est, d: ses.d, sid: ses.id };
        }
      }
    }
    return out;
  }

  /**
   * Série chronologique d'un exercice, un point par séance où il apparaît :
   * {d, top:{w,r}, e1rm, vol, sets}. Ordre = celui des séances fournies.
   */
  function exerciseSeries(sessions, exId, exIndex, bodyweight) {
    var pts = [], i, j, ses, s, ld, est, p, bw;
    for (i = 0; i < (sessions || []).length; i++) {
      ses = sessions[i];
      bw = bwOf(bodyweight, ses.d);
      p = null;
      for (j = 0; j < (ses.s || []).length; j++) {
        s = ses.s[j];
        if (s.x !== exId || s.u) continue;
        if (!p) p = { d: ses.d, sid: ses.id, top: { w: 0, r: 0 }, e1rm: 0, vol: 0, sets: 0 };
        ld = effLoad(s, exIndex[exId], bw);
        // Pour un chronométré, la « performance » suivie est la durée.
        est = (exIndex[exId] && exIndex[exId].sec) ? (Number(s.r) || 0) : e1rm(ld, s.r);
        p.sets++;
        p.vol = r2(p.vol + setVolume(s, exIndex[exId], bw));
        if (est > p.e1rm) { p.e1rm = est; p.top = { w: ld, r: Number(s.r) || 0 }; }
      }
      if (p) pts.push(p);
    }
    return pts;
  }

  /**
   * Les séries du dernier passage sur cet exercice (séance la plus récente
   * qui le contient), échauffement exclu. Sert à pré-remplir la saisie.
   * Renvoie {d, sets:[{w,r,e}]} ou null.
   */
  function lastPerf(sessions, exId, excludeSessionId) {
    var i, j, ses, s, out;
    for (i = (sessions || []).length - 1; i >= 0; i--) {
      ses = sessions[i];
      if (excludeSessionId && ses.id === excludeSessionId) continue;
      out = null;
      for (j = 0; j < (ses.s || []).length; j++) {
        s = ses.s[j];
        if (s.x !== exId || s.u) continue;
        if (!out) out = { d: ses.d, sid: ses.id, sets: [] };
        out.sets.push({ w: Number(s.w) || 0, r: Number(s.r) || 0, e: Number(s.e) || 0 });
      }
      if (out) return out;
    }
    return null;
  }

  /**
   * Une série est-elle un record ? Compare au meilleur PRÉCÉDENT fourni.
   * Renvoie {pr:boolean, kind:'e1rm'|'load'|'reps'|''}.
   *  - 'load'  charge jamais atteinte
   *  - 'reps'  autant de charge mais plus de répétitions
   *  - 'e1rm'  1RM estimé battu sans battre charge ni reps
   */
  function prCheck(prev, set, ex, bodyweight) {
    var ld = effLoad(set, ex, bodyweight);
    var r = Number(set.r) || 0;

    // Chronométré : tenir plus longtemps, ou tenir aussi longtemps avec plus de lest.
    if (ex && ex.sec) {
      var lest = Number(set.w) || 0;              // le poids de corps ne compte pas ici
      if (r <= 0) return { pr: false, kind: '' };
      if (!prev) return { pr: true, kind: 'temps' };
      if (r > prev.r) return { pr: true, kind: 'temps' };
      if (r === prev.r && lest > prev.w) return { pr: true, kind: 'load' };
      return { pr: false, kind: '' };
    }

    var est = e1rm(ld, r);
    if (est <= 0) return { pr: false, kind: '' };
    if (!prev) return { pr: true, kind: 'load' };
    if (ld > prev.w) return { pr: true, kind: 'load' };
    if (ld === prev.w && (Number(set.r) || 0) > prev.r) return { pr: true, kind: 'reps' };
    if (est > prev.e1rm) return { pr: true, kind: 'e1rm' };
    return { pr: false, kind: '' };
  }

  /* ------------------------------------------------------------------ */
  /* Volume par groupe musculaire                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Tonnage par groupe musculaire sur les séances dont d >= sinceDate.
   * Le groupe principal prend 1.0, chaque groupe secondaire 0.5.
   * Renvoie {groupe: tonnage}.
   */
  function groupVolume(sessions, exIndex, sinceDate, bodyweight) {
    var out = {}, i, j, ses, s, ex, v, k, bw;
    for (i = 0; i < (sessions || []).length; i++) {
      ses = sessions[i];
      if (sinceDate && ses.d < sinceDate) continue;
      bw = bwOf(bodyweight, ses.d);
      for (j = 0; j < (ses.s || []).length; j++) {
        s = ses.s[j];
        if (s.u) continue;
        ex = exIndex[s.x];
        if (!ex) continue;
        v = setVolume(s, ex, bw);
        if (!v) continue;
        out[ex.g] = r2((out[ex.g] || 0) + v);
        for (k = 0; k < (ex.g2 || []).length; k++) {
          out[ex.g2[k]] = r2((out[ex.g2[k]] || 0) + v * 0.5);
        }
      }
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Semaines (ISO 8601) et régularité                                   */
  /* ------------------------------------------------------------------ */

  /** Clé de semaine ISO "YYYY-Www" pour une date "YYYY-MM-DD". */
  function weekKey(dateStr) {
    var p = String(dateStr).split('-');
    var d = new Date(Date.UTC(+p[0], (+p[1]) - 1, +p[2]));
    var day = d.getUTCDay() || 7;            // lundi = 1 … dimanche = 7
    d.setUTCDate(d.getUTCDate() + 4 - day);  // jeudi de la semaine ISO
    var y = d.getUTCFullYear();
    var jan1 = new Date(Date.UTC(y, 0, 1));
    var wk = Math.ceil(((d - jan1) / 86400000 + 1) / 7);
    return y + '-W' + (wk < 10 ? '0' + wk : String(wk));
  }

  /**
   * Lundi de la semaine ISO "YYYY-Www", au format "YYYY-MM-DD".
   * Le 4 janvier appartient toujours à la semaine 1 : on part de lui.
   * Sert à étiqueter les graphiques avec une vraie date plutôt qu'un n° de semaine,
   * que personne ne sait situer dans l'année.
   */
  function weekStart(key) {
    var m = /^(\d{4})-W(\d{2})$/.exec(String(key));
    if (!m) return '';
    var y = +m[1], w = +m[2];
    var jan4 = new Date(Date.UTC(y, 0, 4));
    var dow = jan4.getUTCDay() || 7;                 // lundi = 1 … dimanche = 7
    jan4.setUTCDate(jan4.getUTCDate() - (dow - 1) + (w - 1) * 7);
    return jan4.toISOString().slice(0, 10);
  }

  /**
   * Plus petite graduation « propre » >= v : 1, 2, 2.5 ou 5 × une puissance de 10.
   * Un axe doit afficher une valeur qui existe, pas un maximum gonflé pour l'esthétique.
   */
  function niceMax(v) {
    v = Number(v) || 0;
    if (v <= 0) return 1;
    var mag = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
    var f = v / mag;
    var echelle = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    var i;
    for (i = 0; i < echelle.length; i++) if (f <= echelle[i] + 1e-9) return r2(echelle[i] * mag);
    return r2(10 * mag);
  }

  /** Décale une date "YYYY-MM-DD" de n jours (n négatif = passé). */
  function shiftDate(dateStr, n) {
    var p = String(dateStr).split('-');
    var d = new Date(Date.UTC(+p[0], (+p[1]) - 1, +p[2]));
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  /** Nombre de jours entiers entre deux dates "YYYY-MM-DD" (b - a). */
  function daysBetween(a, b) {
    var pa = String(a).split('-'), pb = String(b).split('-');
    var da = Date.UTC(+pa[0], (+pa[1]) - 1, +pa[2]);
    var db = Date.UTC(+pb[0], (+pb[1]) - 1, +pb[2]);
    return Math.round((db - da) / 86400000);
  }

  /**
   * Tonnage et nombre de séances par semaine ISO, ordre chronologique.
   * Renvoie [{k:"YYYY-Www", vol, sessions, sets}].
   */
  function weekSeries(sessions, exIndex, bodyweight) {
    var map = {}, order = [], i, k, st;
    for (i = 0; i < (sessions || []).length; i++) {
      k = weekKey(sessions[i].d);
      if (!map[k]) { map[k] = { k: k, vol: 0, sessions: 0, sets: 0 }; order.push(k); }
      st = sessionStats(sessions[i], exIndex, bodyweight);
      map[k].vol = r2(map[k].vol + st.vol);
      map[k].sets += st.sets;
      map[k].sessions++;
    }
    order.sort();
    return order.map(function (kk) { return map[kk]; });
  }

  /**
   * Semaines consécutives avec au moins une séance, en remontant depuis
   * la semaine de `todayStr`. La semaine en cours ne casse pas la série
   * si elle est encore vide : on repart alors de la semaine précédente.
   */
  function weekStreak(sessions, todayStr) {
    var have = {}, i;
    for (i = 0; i < (sessions || []).length; i++) have[weekKey(sessions[i].d)] = 1;
    var cur = todayStr, n = 0;
    if (!have[weekKey(cur)]) cur = shiftDate(cur, -7);
    while (have[weekKey(cur)]) { n++; cur = shiftDate(cur, -7); }
    return n;
  }

  /* ------------------------------------------------------------------ */
  /* Calcul des disques                                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Répartition des disques par côté pour atteindre `target` kg barre comprise.
   * plates = [{w, n}] où n = nombre de PAIRES disponibles.
   * Renvoie {ok, side:[{w,n}], total, diff} — `diff` = kg manquants (>0) ou 0.
   * Glouton du plus lourd au plus léger : optimal pour un jeu de disques usuel.
   */
  /**
   * Répartition des disques par côté pour atteindre `target` kg barre comprise.
   * plates = [{w, n}] où n = nombre de PAIRES disponibles.
   * Renvoie {ok, side:[{w,n}], total, diff} — `diff` = kg manquants (>0) ou 0.
   *
   * Recherche EXACTE, pas gloutonne : avec un jeu réduit, le glouton se piège.
   * Exemple vécu : disques 25/20/10 et 30 kg à charger par côté — le glouton
   * pose 25 puis bloque et annonce « non chargeable », alors que 20 + 10 tombe
   * juste. On explore donc toutes les combinaisons, en gardant la meilleure
   * approche par le bas quand la cible est hors d'atteinte.
   */
  function platePlan(target, bar, plates) {
    var need = (Number(target) || 0) - (Number(bar) || 0);
    var res = { ok: false, side: [], total: r2(Number(bar) || 0), diff: 0 };
    if (need < -0.001) { res.diff = r2(need); return res; }

    var av = (plates || []).filter(function (p) { return p.w > 0 && p.n > 0; })
      .slice().sort(function (a, b) { return b.w - a.w; });
    var cible = need / 2;

    var meilleur = { reste: cible, choix: [] };

    // Sac à dos borné. Le jeu de disques d'une salle maison tient en ~8 tailles :
    // l'exploration est instantanée, et le résultat est juste.
    function explore(i, reste, choix) {
      if (reste < 0.001) {                        // cible atteinte exactement
        meilleur = { reste: 0, choix: choix.slice() };
        return true;
      }
      if (reste < meilleur.reste) meilleur = { reste: reste, choix: choix.slice() };
      if (i >= av.length) return false;
      var maxK = Math.min(av[i].n, Math.floor((reste + 0.001) / av[i].w));
      var k;
      for (k = maxK; k >= 0; k--) {               // du plus chargé au moins chargé
        if (k > 0) choix.push({ w: av[i].w, n: k });
        if (explore(i + 1, reste - k * av[i].w, choix)) { if (k > 0) { } return true; }
        if (k > 0) choix.pop();
      }
      return false;
    }
    explore(0, cible, []);

    res.side = meilleur.choix.slice().sort(function (a, b) { return b.w - a.w; });
    var pose = 0, i;
    for (i = 0; i < res.side.length; i++) pose += res.side[i].w * res.side[i].n;
    res.total = r2((Number(bar) || 0) + 2 * pose);
    res.diff = r2(meilleur.reste * 2);
    res.ok = Math.abs(res.diff) < 0.001;
    return res;
  }

  /** Plus petit incrément possible sur la barre = 2 × le plus léger disque dispo. */
  function smallestStep(plates) {
    var m = Infinity, i;
    for (i = 0; i < (plates || []).length; i++) if (plates[i].n > 0) m = Math.min(m, plates[i].w * 2);
    return m === Infinity ? 0 : m;
  }

  /** Charge réalisable la plus proche de `target` (barre + disques dispo). */
  function nearestLoadable(target, bar, plates) {
    var p = platePlan(target, bar, plates);
    if (p.ok) return r2(target);
    var lo = p.total;                       // meilleure charge atteignable <= target
    var st = smallestStep(plates);
    var hi = lo;
    if (st > 0 && platePlan(r2(lo + st), bar, plates).ok) hi = r2(lo + st);
    if (hi === lo) return lo;
    return Math.abs(target - lo) <= Math.abs(hi - target) ? lo : hi;
  }

  /* ------------------------------------------------------------------ */
  /* Formatage (pur)                                                     */
  /* ------------------------------------------------------------------ */

  /** ms -> "1 h 04" ou "42 min" ou "38 s". */
  function fmtDur(ms) {
    var s = Math.max(0, Math.round((Number(ms) || 0) / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    if (h) return h + ' h ' + (m < 10 ? '0' + m : m);
    if (m) return m + ' min';
    return s + ' s';
  }

  /**
   * Secondes -> "2:05", et "1:23:12" au-delà de l'heure.
   * Sert au repos (toujours court) ET au chrono de séance (souvent > 1 h) :
   * sans le cas des heures, une séance de 83 minutes affichait « 83:12 ».
   */
  function fmtClock(sec) {
    sec = Math.max(0, Math.round(Number(sec) || 0));
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    var ss = s < 10 ? '0' + s : String(s);
    if (h) return h + ':' + (m < 10 ? '0' + m : m) + ':' + ss;
    return m + ':' + ss;
  }

  /** Tonnage -> "12,4 t" au-delà de 1000 kg, sinon "840 kg". */
  function fmtVol(kg) {
    kg = Number(kg) || 0;
    if (kg >= 1000) return String(r1(kg / 1000)).replace('.', ',') + ' t';
    return Math.round(kg) + ' kg';
  }

  var API = {
    DEF_SET: DEF_SET,
    r1: r1,
    r2: r2,
    roundStep: roundStep,
    e1rm: e1rm,
    effLoad: effLoad,
    setVolume: setVolume,
    indexExercises: indexExercises,
    bodyweightAt: bodyweightAt,
    bwOf: bwOf,
    sessionStats: sessionStats,
    bestSets: bestSets,
    exerciseSeries: exerciseSeries,
    lastPerf: lastPerf,
    prCheck: prCheck,
    groupVolume: groupVolume,
    weekKey: weekKey,
    weekStart: weekStart,
    niceMax: niceMax,
    shiftDate: shiftDate,
    daysBetween: daysBetween,
    weekSeries: weekSeries,
    weekStreak: weekStreak,
    platePlan: platePlan,
    nearestLoadable: nearestLoadable,
    fmtDur: fmtDur,
    fmtClock: fmtClock,
    fmtVol: fmtVol
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.FORGE_ENGINE = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
