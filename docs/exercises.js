/* Forge — catalogue d'exercices (données ÉDITÉES À LA MAIN).
 *
 * CONTRAT — un id est ÉTERNEL. Ne jamais renommer, réutiliser ni supprimer un id :
 * l'historique du téléphone ne référence les exercices que par id.
 * Pour retirer un exercice du catalogue visible, mettre `off:1` (il reste lisible
 * dans l'historique). Ajouter un exercice = ajouter une ligne, jamais en modifier une.
 *
 * Champs :
 *   id  string  identifiant stable (slug équipement-mouvement)
 *   n   string  nom affiché (FR)
 *   g   string  groupe musculaire principal (clé de GROUPS)
 *   g2  array   groupes secondaires (facultatif)
 *   eq  string  équipement : bw | db | bb | mac | band
 *   bar 1|0     barre olympique -> calcul des disques applicable
 *   bw  1|0     poids du corps -> la charge saisie est un LEST additionnel
 *   uni 1|0     unilatéral -> la charge saisie est celle d'UN côté
 *   bench 1|0   nécessite le banc
 *   c   string  rappel technique court (affiché pendant la série)
 */
(function (root) {
  'use strict';

  var GROUPS = {
    pec: { n: 'Pectoraux', c: '#e5484d' },
    dos: { n: 'Dos', c: '#3e63dd' },
    epa: { n: 'Épaules', c: '#f76b15' },
    bic: { n: 'Biceps', c: '#12a594' },
    tri: { n: 'Triceps', c: '#8e4ec6' },
    qua: { n: 'Quadriceps', c: '#ffb224' },
    isc: { n: 'Ischios', c: '#30a46c' },
    fes: { n: 'Fessiers', c: '#e93d82' },
    mol: { n: 'Mollets', c: '#978365' },
    abd: { n: 'Abdos', c: '#00a2c7' },
    ava: { n: 'Avant-bras', c: '#889096' },
    full: { n: 'Corps entier', c: '#a0a0a0' }
  };

  var EQUIP = {
    bw: 'Poids du corps',
    db: 'Haltères',
    bb: 'Barre',
    mac: 'Machine / poulie',
    band: 'Élastique'
  };

  var EXERCISES = [
    /* ---------- BARRE ---------- */
    { id: 'bb-squat', n: 'Squat barre', g: 'qua', g2: ['fes', 'isc'], eq: 'bb', bar: 1, c: 'Buste fier, genoux dans l’axe des pieds, descends sous la parallèle si la mobilité suit.' },
    { id: 'bb-front-squat', n: 'Front squat', g: 'qua', g2: ['abd'], eq: 'bb', bar: 1, c: 'Coudes hauts en permanence, barre posée sur les deltoïdes avant.' },
    { id: 'bb-deadlift', n: 'Soulevé de terre', g: 'isc', g2: ['dos', 'fes'], eq: 'bb', bar: 1, c: 'Dos neutre, barre au contact des tibias, pousse le sol avec les jambes.' },
    { id: 'bb-rdl', n: 'Soulevé de terre jambes tendues', g: 'isc', g2: ['fes', 'dos'], eq: 'bb', bar: 1, c: 'Hanches vers l’arrière, légère flexion de genoux, dos plat.' },
    { id: 'bb-bench', n: 'Développé couché', g: 'pec', g2: ['tri', 'epa'], eq: 'bb', bar: 1, bench: 1, c: 'Omoplates serrées, pieds ancrés, barre au niveau du bas des pecs.' },
    { id: 'bb-incline-bench', n: 'Développé incliné barre', g: 'pec', g2: ['epa', 'tri'], eq: 'bb', bar: 1, bench: 1, c: 'Banc à 30°, barre en haut des pecs.' },
    { id: 'bb-ohp', n: 'Développé militaire', g: 'epa', g2: ['tri'], eq: 'bb', bar: 1, c: 'Abdos et fessiers gainés, ne cambre pas, tête passe sous la barre en haut.' },
    { id: 'bb-row', n: 'Rowing barre', g: 'dos', g2: ['bic'], eq: 'bb', bar: 1, c: 'Buste à ~45°, tire vers le nombril, pas d’à-coups de hanches.' },
    { id: 'bb-hip-thrust', n: 'Hip thrust barre', g: 'fes', g2: ['isc'], eq: 'bb', bar: 1, bench: 1, c: 'Menton rentré, verrouille en haut 1 seconde.' },
    { id: 'bb-lunge', n: 'Fente barre', g: 'qua', g2: ['fes'], eq: 'bb', bar: 1, uni: 1, c: 'Grand pas, genou arrière vers le sol, buste droit.' },
    { id: 'bb-curl', n: 'Curl barre', g: 'bic', g2: ['ava'], eq: 'bb', bar: 1, c: 'Coudes collés au buste, pas de balancier.' },
    { id: 'bb-skullcrusher', n: 'Barre au front', g: 'tri', eq: 'bb', bar: 1, bench: 1, c: 'Coudes fixes, seul l’avant-bras bouge.' },
    { id: 'bb-good-morning', n: 'Good morning', g: 'isc', g2: ['dos', 'fes'], eq: 'bb', bar: 1, c: 'Charge légère, dos verrouillé, amplitude contrôlée.' },
    { id: 'bb-calf-raise', n: 'Mollets debout barre', g: 'mol', eq: 'bb', bar: 1, c: 'Amplitude complète, pause 1 s en haut.' },
    { id: 'bb-shrug', n: 'Shrug barre', g: 'dos', g2: ['epa'], eq: 'bb', bar: 1, c: 'Monte les épaules vers les oreilles, sans rouler.' },
    { id: 'bb-pendlay-row', n: 'Pendlay row', g: 'dos', g2: ['bic'], eq: 'bb', bar: 1, c: 'Buste parallèle au sol, la barre repart du sol à chaque rep.' },

    /* ---------- HALTÈRES ---------- */
    { id: 'db-bench', n: 'Développé couché haltères', g: 'pec', g2: ['tri', 'epa'], eq: 'db', bench: 1, c: 'Amplitude plus grande qu’à la barre, contrôle la descente.' },
    { id: 'db-incline-bench', n: 'Développé incliné haltères', g: 'pec', g2: ['epa'], eq: 'db', bench: 1, c: 'Banc à 30°, ne creuse pas le bas du dos.' },
    { id: 'db-fly', n: 'Écarté haltères', g: 'pec', eq: 'db', bench: 1, c: 'Coudes légèrement fléchis et figés, mouvement d’étreinte.' },
    { id: 'db-incline-fly', n: 'Écarté incliné', g: 'pec', eq: 'db', bench: 1, c: 'Étire sans forcer, charge modérée.' },
    { id: 'db-pullover', n: 'Pull-over haltère', g: 'pec', g2: ['dos'], eq: 'db', bench: 1, c: 'Bras quasi tendus, cage ouverte, respire à l’étirement.' },
    { id: 'db-row', n: 'Rowing haltère', g: 'dos', g2: ['bic'], eq: 'db', uni: 1, bench: 1, c: 'Appui sur le banc, tire le coude vers la hanche.' },
    { id: 'db-bent-row', n: 'Rowing haltères buste penché', g: 'dos', g2: ['bic'], eq: 'db', c: 'Deux haltères, buste à 45°, serre les omoplates.' },
    { id: 'db-ohp', n: 'Développé militaire haltères', g: 'epa', g2: ['tri'], eq: 'db', c: 'Debout ou assis, gainage actif, ne cambre pas.' },
    { id: 'db-arnold', n: 'Développé Arnold', g: 'epa', g2: ['tri'], eq: 'db', c: 'Rotation des poignets pendant la montée.' },
    { id: 'db-lateral-raise', n: 'Élévations latérales', g: 'epa', eq: 'db', c: 'Léger, coudes légèrement fléchis, monte jusqu’à l’horizontale.' },
    { id: 'db-front-raise', n: 'Élévations frontales', g: 'epa', eq: 'db', c: 'Contrôle, pas d’élan de hanches.' },
    { id: 'db-rear-delt-fly', n: 'Oiseau (deltoïde postérieur)', g: 'epa', g2: ['dos'], eq: 'db', c: 'Buste penché, pouces vers le bas, charge légère.' },
    { id: 'db-curl', n: 'Curl haltères', g: 'bic', eq: 'db', c: 'Supination complète en haut, descente lente.' },
    { id: 'db-hammer-curl', n: 'Curl marteau', g: 'bic', g2: ['ava'], eq: 'db', c: 'Prise neutre, coudes fixes.' },
    { id: 'db-incline-curl', n: 'Curl incliné', g: 'bic', eq: 'db', bench: 1, c: 'Bras dans le prolongement du buste, gros étirement.' },
    { id: 'db-concentration-curl', n: 'Curl concentré', g: 'bic', eq: 'db', uni: 1, bench: 1, c: 'Coude calé sur la cuisse, contraction maximale en haut.' },
    { id: 'db-tricep-ext', n: 'Extension triceps haltère', g: 'tri', eq: 'db', c: 'Haltère derrière la nuque, coudes serrés vers l’avant.' },
    { id: 'db-kickback', n: 'Kickback triceps', g: 'tri', eq: 'db', uni: 1, c: 'Bras collé au buste, extension complète.' },
    { id: 'db-goblet-squat', n: 'Goblet squat', g: 'qua', g2: ['fes'], eq: 'db', c: 'Haltère contre la poitrine, buste droit, descends bas.' },
    { id: 'db-lunge', n: 'Fente haltères', g: 'qua', g2: ['fes'], eq: 'db', uni: 1, c: 'Grand pas, contrôle la descente du genou arrière.' },
    { id: 'db-bulgarian-split', n: 'Fente bulgare', g: 'qua', g2: ['fes'], eq: 'db', uni: 1, bench: 1, c: 'Pied arrière sur le banc, buste légèrement penché pour cibler les fessiers.' },
    { id: 'db-rdl', n: 'Soulevé jambes tendues haltères', g: 'isc', g2: ['fes'], eq: 'db', c: 'Hanches en arrière, haltères près des jambes.' },
    { id: 'db-step-up', n: 'Montée sur banc', g: 'qua', g2: ['fes'], eq: 'db', uni: 1, bench: 1, c: 'Pousse avec la jambe du haut, ne triche pas avec l’élan.' },
    { id: 'db-calf-raise', n: 'Mollets debout haltères', g: 'mol', eq: 'db', c: 'Amplitude maximale, pause en haut.' },
    { id: 'db-shrug', n: 'Shrug haltères', g: 'dos', g2: ['epa'], eq: 'db', c: 'Épaules vers les oreilles, sans rotation.' },
    { id: 'db-wrist-curl', n: 'Curl poignets', g: 'ava', eq: 'db', bench: 1, c: 'Avant-bras posés, amplitude complète.' },
    { id: 'db-farmer-walk', n: 'Marche du fermier', g: 'ava', g2: ['full'], eq: 'db', c: 'Gainage, épaules basses, mesure en secondes (note dans reps).' },

    /* ---------- POIDS DU CORPS ---------- */
    { id: 'bw-pushup', n: 'Pompes', g: 'pec', g2: ['tri', 'epa'], eq: 'bw', bw: 1, c: 'Corps aligné, coudes à ~45°, poitrine au sol.' },
    { id: 'bw-incline-pushup', n: 'Pompes inclinées (mains sur banc)', g: 'pec', g2: ['tri'], eq: 'bw', bw: 1, bench: 1, c: 'Version plus facile, garde l’alignement.' },
    { id: 'bw-decline-pushup', n: 'Pompes déclinées (pieds sur banc)', g: 'pec', g2: ['epa'], eq: 'bw', bw: 1, bench: 1, c: 'Plus dur, sollicite le haut des pecs.' },
    { id: 'bw-diamond-pushup', n: 'Pompes diamant', g: 'tri', g2: ['pec'], eq: 'bw', bw: 1, c: 'Mains jointes sous le sternum, coudes serrés.' },
    { id: 'bw-dip-bench', n: 'Dips sur banc', g: 'tri', g2: ['pec'], eq: 'bw', bw: 1, bench: 1, c: 'Descends jusqu’à 90° au coude, épaules basses.' },
    { id: 'bw-pullup', n: 'Tractions pronation', g: 'dos', g2: ['bic'], eq: 'bw', bw: 1, c: 'Menton au-dessus de la barre, descente complète.' },
    { id: 'bw-chinup', n: 'Tractions supination', g: 'bic', g2: ['dos'], eq: 'bw', bw: 1, c: 'Prise supination, coudes vers le bas.' },
    { id: 'bw-squat', n: 'Squat au poids du corps', g: 'qua', g2: ['fes'], eq: 'bw', bw: 1, c: 'Talons au sol, descends bas et contrôlé.' },
    { id: 'bw-glute-bridge', n: 'Pont fessier', g: 'fes', g2: ['isc'], eq: 'bw', bw: 1, c: 'Pousse par les talons, verrouille en haut.' },
    { id: 'bw-nordic-curl', n: 'Nordic curl', g: 'isc', eq: 'bw', bw: 1, c: 'Descente la plus lente possible, gainage total.' },
    { id: 'bw-plank', n: 'Gainage planche', g: 'abd', eq: 'bw', bw: 1, c: 'Mesure en secondes (note-les dans les reps). Bassin en rétroversion.' },
    { id: 'bw-side-plank', n: 'Gainage latéral', g: 'abd', eq: 'bw', bw: 1, uni: 1, c: 'Secondes dans les reps. Hanches hautes.' },
    { id: 'bw-hollow-hold', n: 'Hollow hold', g: 'abd', eq: 'bw', bw: 1, c: 'Secondes dans les reps. Lombaires plaquées au sol.' },
    { id: 'bw-crunch', n: 'Crunch', g: 'abd', eq: 'bw', bw: 1, c: 'Enroule la colonne, ne tire pas sur la nuque.' },
    { id: 'bw-leg-raise', n: 'Relevés de jambes', g: 'abd', eq: 'bw', bw: 1, c: 'Bas du dos plaqué, contrôle la descente.' },
    { id: 'bw-ab-wheel', n: 'Roulette abdos', g: 'abd', eq: 'bw', bw: 1, c: 'Bassin verrouillé, n’arrondis pas le bas du dos.' },
    { id: 'bw-calf-raise', n: 'Mollets au poids du corps', g: 'mol', eq: 'bw', bw: 1, c: 'Une jambe pour durcir, amplitude complète.' },
    { id: 'bw-superman', n: 'Superman (lombaires)', g: 'dos', eq: 'bw', bw: 1, c: 'Secondes dans les reps. Extension douce.' },
    { id: 'bw-burpee', n: 'Burpees', g: 'full', eq: 'bw', bw: 1, c: 'Cardio. Rythme régulier plutôt que rapide.' },
    { id: 'bw-mountain-climber', n: 'Mountain climbers', g: 'abd', g2: ['full'], eq: 'bw', bw: 1, c: 'Secondes ou répétitions, bassin stable.' },

    /* ---------- ÉLASTIQUE ---------- */
    { id: 'band-pull-apart', n: 'Pull apart élastique', g: 'epa', g2: ['dos'], eq: 'band', c: 'Idéal en échauffement, serre les omoplates.' },
    { id: 'band-face-pull', n: 'Face pull élastique', g: 'epa', g2: ['dos'], eq: 'band', c: 'Tire vers le front, rotation externe en fin de mouvement.' },
    { id: 'band-row', n: 'Rowing élastique', g: 'dos', g2: ['bic'], eq: 'band', c: 'Tension constante, contrôle le retour.' }
  ];

  var API = { GROUPS: GROUPS, EQUIP: EQUIP, EXERCISES: EXERCISES };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.FORGE_EX = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
