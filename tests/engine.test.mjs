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
  assert.equal(E.fmtVol(840), '840 kg');
  assert.equal(E.fmtVol(12400), '12,4 t');
});
