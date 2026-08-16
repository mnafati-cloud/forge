/* Tests contractuels du moteur Forge.
 * `node --test tests/` doit être 100 % vert avant CHAQUE push.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('../docs/engine.js');
const CAT = require('../docs/exercises.js');

const IX = E.indexExercises(CAT.EXERCISES);

/* Fixtures ------------------------------------------------------------ */

function set(x, w, r, extra) {
  return Object.assign({ x, w, r, e: 0, u: 0, t: 0 }, extra || {});
}
function ses(id, d, sets) {
  return { id, d, t0: 0, t1: 0, n: 'Séance', s: sets, note: '' };
}

const SESSIONS = [
  ses('s1', '2026-08-01', [
    set('bb-bench', 20, 10, { u: 1 }),
    set('bb-bench', 40, 8),
    set('bb-bench', 40, 7),
    set('bb-squat', 60, 5)
  ]),
  ses('s2', '2026-08-05', [
    set('bb-bench', 42.5, 8),
    set('bb-bench', 42.5, 6),
    set('bw-pushup', 0, 20)
  ]),
  ses('s3', '2026-08-12', [
    set('bb-bench', 45, 5),
    set('bb-squat', 70, 5)
  ])
];

/* 1. Contrat DEF_SET -------------------------------------------------- */

test('DEF_SET est le contrat de réglages (toute clé ajoutée passe par ce test)', () => {
  assert.deepEqual(E.DEF_SET, {
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
    bw: 75
  });
});

/* 2. Catalogue : ids éternels ---------------------------------------- */

test('les ids du catalogue sont uniques et bien formés', () => {
  const seen = new Set();
  for (const ex of CAT.EXERCISES) {
    assert.match(ex.id, /^[a-z0-9-]+$/, `id invalide: ${ex.id}`);
    assert.ok(!seen.has(ex.id), `id dupliqué: ${ex.id}`);
    seen.add(ex.id);
  }
  assert.ok(seen.size >= 60, 'le catalogue de départ doit couvrir au moins 60 exercices');
});

test('chaque exercice référence des groupes musculaires connus', () => {
  for (const ex of CAT.EXERCISES) {
    assert.ok(CAT.GROUPS[ex.g], `groupe inconnu ${ex.g} sur ${ex.id}`);
    assert.ok(CAT.EQUIP[ex.eq], `équipement inconnu ${ex.eq} sur ${ex.id}`);
    for (const g of ex.g2 || []) assert.ok(CAT.GROUPS[g], `groupe secondaire inconnu ${g} sur ${ex.id}`);
  }
});

test('les ids historiques ne disparaissent jamais du catalogue', () => {
  // Sentinelle : ces ids sont référencés par la progression du téléphone.
  // Ne JAMAIS retirer une entrée de cette liste — seulement en ajouter.
  const ETERNELS = [
    'bb-squat', 'bb-deadlift', 'bb-bench', 'bb-ohp', 'bb-row',
    'db-bench', 'db-row', 'db-curl', 'db-lateral-raise',
    'bw-pushup', 'bw-pullup', 'bw-plank'
  ];
  const ids = new Set(CAT.EXERCISES.map((e) => e.id));
  for (const id of ETERNELS) assert.ok(ids.has(id), `id éternel disparu: ${id}`);
});

/* 3. 1RM estimé ------------------------------------------------------- */

test('e1rm : Epley, avec 1 répétition = la charge elle-même', () => {
  assert.equal(E.e1rm(100, 1), 100);
  assert.equal(E.e1rm(100, 0), 0);
  assert.equal(E.e1rm(0, 5), 0);
  assert.equal(E.e1rm(100, 10), 133.3);
  assert.equal(E.e1rm(40, 8), 50.7);
});

test('e1rm croît avec la charge et avec les répétitions', () => {
  assert.ok(E.e1rm(50, 5) > E.e1rm(45, 5));
  assert.ok(E.e1rm(50, 6) > E.e1rm(50, 5));
});

/* 4. Charge effective et volume --------------------------------------- */

test('effLoad ajoute le poids de corps sur les exercices au poids du corps', () => {
  assert.equal(E.effLoad({ w: 0 }, IX['bw-pushup'], 80), 80);
  assert.equal(E.effLoad({ w: 10 }, IX['bw-pullup'], 80), 90);
  assert.equal(E.effLoad({ w: 60 }, IX['bb-squat'], 80), 60);
});

test('setVolume ignore les séries d’échauffement', () => {
  assert.equal(E.setVolume(set('bb-bench', 40, 8), IX['bb-bench'], 80), 320);
  assert.equal(E.setVolume(set('bb-bench', 40, 8, { u: 1 }), IX['bb-bench'], 80), 0);
});

test('sessionStats agrège volume, séries, reps et exercices distincts', () => {
  const st = E.sessionStats(SESSIONS[0], IX, 80);
  assert.equal(st.sets, 3);              // l’échauffement est exclu
  assert.equal(st.reps, 20);
  assert.equal(st.exs, 2);               // bench + squat
  assert.equal(st.vol, 40 * 8 + 40 * 7 + 60 * 5);
});

test('sessionStats calcule la durée quand la séance est terminée', () => {
  const s = ses('sx', '2026-08-16', [set('bb-bench', 40, 5)]);
  s.t0 = 1000; s.t1 = 1000 + 45 * 60000;
  assert.equal(E.sessionStats(s, IX, 80).dur, 45 * 60000);
  s.t1 = 0;
  assert.equal(E.sessionStats(s, IX, 80).dur, 0);
});

/* 5. Poids de corps --------------------------------------------------- */

test('bodyweightAt prend la mesure la plus récente antérieure ou égale', () => {
  const log = [{ d: '2026-08-10', w: 78 }, { d: '2026-07-01', w: 80 }];
  assert.equal(E.bodyweightAt(log, '2026-08-16', 75), 78);
  assert.equal(E.bodyweightAt(log, '2026-08-10', 75), 78);
  assert.equal(E.bodyweightAt(log, '2026-07-15', 75), 80);
  assert.equal(E.bodyweightAt(log, '2026-01-01', 75), 80); // avant tout : la plus ancienne
  assert.equal(E.bodyweightAt([], '2026-08-16', 75), 75);  // aucune mesure : le réglage
});

/* 6. Records ---------------------------------------------------------- */

test('bestSets classe au 1RM estimé, pas à la charge brute', () => {
  const best = E.bestSets(SESSIONS, IX, 80);
  // 42.5 x 8 (e1rm 53.8) bat 45 x 5 (e1rm 52.5), bien que la charge soit plus faible.
  assert.equal(best['bb-bench'].w, 42.5);
  assert.equal(best['bb-bench'].r, 8);
  assert.equal(best['bb-bench'].d, '2026-08-05');
  assert.equal(best['bb-squat'].w, 70);
  assert.equal(best['bw-pushup'].w, 80);   // poids de corps inclus
});

test('prCheck distingue record de charge, de reps et de 1RM estimé', () => {
  const prev = { w: 40, r: 8, e1rm: E.e1rm(40, 8), d: '2026-08-01' };
  assert.deepEqual(E.prCheck(null, set('bb-bench', 30, 5), IX['bb-bench'], 80), { pr: true, kind: 'load' });
  assert.equal(E.prCheck(prev, set('bb-bench', 45, 3), IX['bb-bench'], 80).kind, 'load');
  assert.equal(E.prCheck(prev, set('bb-bench', 40, 9), IX['bb-bench'], 80).kind, 'reps');
  assert.equal(E.prCheck(prev, set('bb-bench', 37.5, 12), IX['bb-bench'], 80).kind, 'e1rm');
  assert.equal(E.prCheck(prev, set('bb-bench', 35, 5), IX['bb-bench'], 80).pr, false);
});

test('le poids de corps utilisé est celui de la DATE de la séance', () => {
  // Un record de tractions établi à 80 kg ne doit pas se réécrire quand on pèse 70 kg.
  const journal = [{ d: '2026-08-01', w: 80 }, { d: '2026-08-12', w: 70 }];
  const bwAt = (d) => E.bodyweightAt(journal, d, 75);
  const S = [
    ses('a', '2026-08-01', [set('bw-pullup', 0, 10)]),
    ses('b', '2026-08-12', [set('bw-pullup', 0, 10)])
  ];
  const best = E.bestSets(S, IX, bwAt);
  assert.equal(best['bw-pullup'].w, 80, 'le record doit rester celui du jour où il a été établi');
  assert.equal(best['bw-pullup'].d, '2026-08-01');

  const pts = E.exerciseSeries(S, 'bw-pullup', IX, bwAt);
  assert.equal(pts[0].top.w, 80);
  assert.equal(pts[1].top.w, 70);

  // Un poids scalaire reste accepté : c'est le mode utilisé par les tests existants.
  assert.equal(E.bestSets(S, IX, 80)['bw-pullup'].w, 80);
});

test('le tonnage par groupe suit aussi le poids de corps de chaque séance', () => {
  const bwAt = (d) => (d === '2026-08-01' ? 80 : 70);
  const S = [
    ses('a', '2026-08-01', [set('bw-pushup', 0, 10)]),
    ses('b', '2026-08-12', [set('bw-pushup', 0, 10)])
  ];
  assert.equal(E.groupVolume(S, IX, null, bwAt).pec, 800 + 700);
  assert.equal(E.sessionStats(S[0], IX, bwAt).vol, 800);
  assert.equal(E.weekSeries(S, IX, bwAt).reduce((a, w) => a + w.vol, 0), 1500);
});

/* 7. Historique par exercice ------------------------------------------ */

test('exerciseSeries donne un point par séance, avec la meilleure série', () => {
  const pts = E.exerciseSeries(SESSIONS, 'bb-bench', IX, 80);
  assert.equal(pts.length, 3);
  assert.equal(pts[0].sets, 2);                  // l’échauffement ne compte pas
  assert.deepEqual(pts[0].top, { w: 40, r: 8 });
  assert.equal(pts[2].top.w, 45);
  assert.equal(pts[1].vol, 42.5 * 8 + 42.5 * 6);
});

test('lastPerf renvoie le dernier passage, en excluant la séance en cours', () => {
  const lp = E.lastPerf(SESSIONS, 'bb-bench');
  assert.equal(lp.d, '2026-08-12');
  assert.deepEqual(lp.sets, [{ w: 45, r: 5, e: 0 }]);

  const prev = E.lastPerf(SESSIONS, 'bb-bench', 's3');
  assert.equal(prev.d, '2026-08-05');
  assert.equal(prev.sets.length, 2);

  assert.equal(E.lastPerf(SESSIONS, 'db-curl'), null);
});

/* 7bis. Exercices chronométrés ---------------------------------------- */

test('un gainage compte en secondes : hors tonnage, hors 1RM', () => {
  const S = [ses('t1', '2026-08-01', [set('bw-plank', 0, 60), set('bb-bench', 40, 8)])];
  const st = E.sessionStats(S[0], IX, 80);
  // 60 s x 80 kg = 4800 « kg » viendraient écraser les 320 kg réels du développé.
  assert.equal(st.vol, 320, 'le gainage ne doit pas entrer dans le tonnage');
  assert.equal(st.reps, 8, 'les secondes ne sont pas des répétitions');
  assert.equal(st.sets, 2, 'la série reste comptée comme une série');

  const best = E.bestSets(S, IX, 80);
  assert.equal(best['bw-plank'].r, 60);
  assert.equal(best['bw-plank'].w, 0, 'w = lest ajouté pour un chronométré');
  assert.equal(best['bw-plank'].e1rm, 0, 'aucun 1RM estimé sur un gainage');
});

test('le record d’un gainage est la durée la plus longue', () => {
  const S = [
    ses('a', '2026-08-01', [set('bw-plank', 0, 60)]),
    ses('b', '2026-08-08', [set('bw-plank', 0, 45)]),
    ses('c', '2026-08-15', [set('bw-plank', 0, 75)])
  ];
  const best = E.bestSets(S, IX, 80);
  assert.equal(best['bw-plank'].r, 75);
  assert.equal(best['bw-plank'].d, '2026-08-15');

  // Battre son temps est bien un record ; faire moins n'en est pas un.
  const prev = { w: 80, r: 60, e1rm: 0, d: '2026-08-01' };
  assert.equal(E.prCheck(prev, set('bw-plank', 0, 75), IX['bw-plank'], 80).pr, true);
  assert.equal(E.prCheck(prev, set('bw-plank', 0, 45), IX['bw-plank'], 80).pr, false);
});

test('perdre du poids ne fait pas perdre son record de gainage', () => {
  // Le poids de corps entre dans la charge. Classé par charge d'abord, un
  // gainage de 40 s à 82 kg battait 72 s à 78 kg : absurde pour un gainage.
  const bwAt = (d) => (d <= '2026-07-20' ? 82 : 78);
  const S = [
    ses('a', '2026-07-17', [set('bw-plank', 0, 40)]),
    ses('b', '2026-08-14', [set('bw-plank', 0, 72)])
  ];
  const best = E.bestSets(S, IX, bwAt);
  assert.equal(best['bw-plank'].r, 72, 'le record est la plus longue tenue');
  assert.equal(best['bw-plank'].d, '2026-08-14');

  // Pour un gainage, `w` est le LEST ajouté (0 ici), pas la charge totale.
  assert.equal(best['bw-plank'].w, 0);
  const prev = { w: 0, r: 40, e1rm: 0, d: '2026-07-17' };
  assert.equal(E.prCheck(prev, set('bw-plank', 0, 72), IX['bw-plank'], 78).kind, 'temps');
  // Et un jour plus lourd, à durée égale, n'est pas un record non plus.
  assert.equal(E.prCheck({ w: 0, r: 60, e1rm: 0 }, set('bw-plank', 0, 60), IX['bw-plank'], 82).pr, false);
});

test('un gainage lesté reste un record de charge', () => {
  const prev = { w: 0, r: 60, e1rm: 0, d: '2026-08-01' };   // w = lest, pas charge totale
  const v = E.prCheck(prev, set('bw-plank', 10, 60), IX['bw-plank'], 80);
  assert.equal(v.pr, true);
  assert.equal(v.kind, 'load');
});

test('tous les exercices chronométrés du catalogue portent le drapeau sec', () => {
  // Ces exercices se comptent en secondes : sans le drapeau, ils polluent le tonnage.
  for (const id of ['bw-plank', 'bw-side-plank', 'bw-hollow-hold', 'bw-superman', 'db-farmer-walk']) {
    assert.ok(IX[id], `${id} absent du catalogue`);
    assert.equal(IX[id].sec, 1, `${id} devrait être marqué sec:1`);
  }
  assert.ok(!IX['bb-bench'].sec, 'un exercice en répétitions ne doit pas être marqué sec');
});

/* 8. Volume par groupe ------------------------------------------------ */

test('groupVolume attribue 1.0 au groupe principal et 0.5 aux secondaires', () => {
  const one = [ses('sA', '2026-08-16', [set('bb-bench', 50, 10)])];
  const gv = E.groupVolume(one, IX, null, 80);
  assert.equal(gv.pec, 500);
  assert.equal(gv.tri, 250);
  assert.equal(gv.epa, 250);
});

test('groupVolume respecte la date de départ', () => {
  const gv = E.groupVolume(SESSIONS, IX, '2026-08-10', 80);
  assert.equal(gv.qua, 70 * 5);            // seul le squat de s3 compte
  assert.equal(gv.pec, 45 * 5);
});

/* 9. Semaines et régularité ------------------------------------------- */

test('weekKey suit la norme ISO 8601', () => {
  assert.equal(E.weekKey('2026-08-16'), '2026-W33');  // un dimanche
  assert.equal(E.weekKey('2026-08-17'), '2026-W34');  // le lundi suivant
  assert.equal(E.weekKey('2026-01-01'), '2026-W01');
});

test('shiftDate et daysBetween traversent les mois', () => {
  assert.equal(E.shiftDate('2026-08-31', 1), '2026-09-01');
  assert.equal(E.shiftDate('2026-03-01', -1), '2026-02-28');
  assert.equal(E.daysBetween('2026-08-01', '2026-08-16'), 15);
  assert.equal(E.daysBetween('2026-08-16', '2026-08-01'), -15);
});

test('weekStart donne le lundi de la semaine ISO', () => {
  assert.equal(E.weekStart('2026-W33'), '2026-08-10');   // lundi
  assert.equal(E.weekStart(E.weekKey('2026-08-16')), '2026-08-10'); // dimanche -> lundi précédent
  assert.equal(E.weekStart(E.weekKey('2026-08-17')), '2026-08-17'); // lundi -> lui-même
  assert.equal(E.weekStart('2026-W01'), '2025-12-29');   // la S1 2026 commence en 2025
  assert.equal(E.weekStart('2027-W01'), '2027-01-04');
});

test('weekStart est cohérent avec weekKey sur une année entière', () => {
  let d = '2026-01-01';
  for (let i = 0; i < 365; i++) {
    const k = E.weekKey(d);
    const lundi = E.weekStart(k);
    assert.equal(E.weekKey(lundi), k, `${d} -> ${k} -> ${lundi}`);
    assert.ok(E.daysBetween(lundi, d) >= 0 && E.daysBetween(lundi, d) <= 6, `${d} hors de sa semaine`);
    d = E.shiftDate(d, 1);
  }
});

test('niceMax arrondit à une graduation lisible sans jamais tronquer', () => {
  assert.ok(E.niceMax(53.8) >= 53.8);
  assert.equal(E.niceMax(53.8), 60);
  assert.equal(E.niceMax(100), 100);
  assert.equal(E.niceMax(7), 8);
  assert.equal(E.niceMax(0), 1);
  assert.equal(E.niceMax(1240), 1500);
});

test('weekSeries regroupe les séances par semaine ISO', () => {
  const ws = E.weekSeries(SESSIONS, IX, 80);
  assert.equal(ws.length, 3);
  assert.equal(ws[0].k, E.weekKey('2026-08-01'));
  assert.equal(ws[0].sessions, 1);
  assert.equal(ws[2].sets, 2);
});

test('weekStreak compte les semaines consécutives, semaine en cours vide tolérée', () => {
  const mk = (d) => ses('x' + d, d, [set('bb-bench', 40, 5)]);
  const today = '2026-08-16';                         // 2026-W33
  assert.equal(E.weekStreak([mk('2026-08-16')], today), 1);
  assert.equal(E.weekStreak([mk('2026-08-10'), mk('2026-08-03')], today), 2); // W33 en cours vide
  assert.equal(E.weekStreak([mk('2026-07-01')], today), 0);
  assert.equal(E.weekStreak([], today), 0);
});

/* 10. Calcul des disques ---------------------------------------------- */

test('platePlan répartit les disques par côté', () => {
  const p = E.platePlan(60, 20, E.DEF_SET.plates);
  assert.equal(p.ok, true);
  assert.equal(p.total, 60);
  assert.deepEqual(p.side, [{ w: 20, n: 1 }]);
});

test('platePlan combine plusieurs disques et signale le manque', () => {
  const p = E.platePlan(42.5, 20, E.DEF_SET.plates);
  assert.equal(p.ok, true);
  assert.deepEqual(p.side, [{ w: 10, n: 1 }, { w: 1.25, n: 1 }]);

  const q = E.platePlan(41, 20, E.DEF_SET.plates);
  assert.equal(q.ok, false);
  assert.equal(q.total, 40);
  assert.equal(q.diff, 1);
});

test('platePlan gère la barre seule et les cibles impossibles', () => {
  const bar = E.platePlan(20, 20, E.DEF_SET.plates);
  assert.equal(bar.ok, true);
  assert.deepEqual(bar.side, []);

  const light = E.platePlan(10, 20, E.DEF_SET.plates);
  assert.equal(light.ok, false);
  assert.ok(light.diff < 0);
});

test('platePlan trouve une solution que le glouton manque', () => {
  // Glouton : 25 puis plus rien -> 5 kg manquants par côté, alors que 20+10 fait exactement 30.
  const jeu = [{ w: 25, n: 1 }, { w: 20, n: 1 }, { w: 10, n: 2 }];
  const p = E.platePlan(80, 20, jeu);   // 30 kg par côté
  assert.equal(p.ok, true, 'la barre EST chargeable : 20 + 10 par côté');
  assert.equal(p.total, 80);
  const parPoids = Object.fromEntries(p.side.map((x) => [x.w, x.n]));
  assert.equal((parPoids[20] || 0) * 20 + (parPoids[10] || 0) * 10 + (parPoids[25] || 0) * 25, 30);
});

test('platePlan reste exact avec un jeu de disques réduit', () => {
  const jeu = [{ w: 15, n: 1 }, { w: 5, n: 3 }];
  assert.equal(E.platePlan(60, 20, jeu).ok, true);      // 15 + 5 par côté
  assert.equal(E.platePlan(70, 20, jeu).ok, true);      // 15 + 5 + 5 : les 3 paires suffisent
  assert.equal(E.platePlan(50, 20, jeu).total, 50);     // 15 par côté
  // 35 par côté dépasse le stock (15 + 5x3 = 30) : on annonce le manque, pas une fausse solution.
  const trop = E.platePlan(90, 20, jeu);
  assert.equal(trop.ok, false);
  assert.equal(trop.total, 80);
  assert.equal(trop.diff, 10);
});

test('platePlan ne dépasse jamais le nombre de paires disponibles', () => {
  const p = E.platePlan(300, 20, E.DEF_SET.plates);
  const byW = Object.fromEntries(p.side.map((s) => [s.w, s.n]));
  for (const pl of E.DEF_SET.plates) assert.ok((byW[pl.w] || 0) <= pl.n, `trop de disques de ${pl.w}`);
  assert.ok(p.diff > 0);
});

test('nearestLoadable arrondit vers la charge réalisable la plus proche', () => {
  assert.equal(E.nearestLoadable(42.5, 20, E.DEF_SET.plates), 42.5);
  assert.equal(E.nearestLoadable(41, 20, E.DEF_SET.plates), 40);
  assert.equal(E.nearestLoadable(42, 20, E.DEF_SET.plates), 42.5);
});

/* 11. Arrondis et formatage ------------------------------------------- */

test('roundStep colle au pas de charge choisi', () => {
  assert.equal(E.roundStep(41, 2.5), 40);
  assert.equal(E.roundStep(41.5, 2.5), 42.5);
  assert.equal(E.roundStep(41, 0), 41);
});

test('fmtDur, fmtClock et fmtVol restent lisibles', () => {
  assert.equal(E.fmtDur(45 * 60000), '45 min');
  assert.equal(E.fmtDur(64 * 60000), '1 h 04');
  assert.equal(E.fmtDur(38000), '38 s');
  assert.equal(E.fmtClock(125), '2:05');
  assert.equal(E.fmtClock(0), '0:00');
  // Une séance dépasse l'heure : sans ce cas, le chrono affichait « 83:12 ».
  assert.equal(E.fmtClock(3600), '1:00:00');
  assert.equal(E.fmtClock(83 * 60 + 12), '1:23:12');
  assert.equal(E.fmtClock(59 * 60 + 59), '59:59');
  assert.equal(E.fmtVol(840), '840 kg');
  assert.equal(E.fmtVol(12400), '12,4 t');
});
