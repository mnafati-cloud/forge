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
 *   sec 1|0     l'exercice se mesure en SECONDES : `r` est une durée, pas un nombre
 *               de répétitions. Exclu du tonnage et du 1RM estimé ; son record
 *               est la durée la plus longue.
 *   c   string  rappel technique court (affiché pendant la série)
 */
(function (root) {
  'use strict';

  var GROUPS = {
    pec: { n: 'Pectoraux', en: 'Chest', c: '#e5484d' },
    dos: { n: 'Dos', en: 'Back', c: '#3e63dd' },
    epa: { n: 'Épaules', en: 'Shoulders', c: '#f76b15' },
    bic: { n: 'Biceps', en: 'Biceps', c: '#12a594' },
    tri: { n: 'Triceps', en: 'Triceps', c: '#8e4ec6' },
    qua: { n: 'Quadriceps', en: 'Quads', c: '#ffb224' },
    isc: { n: 'Ischios', en: 'Hamstrings', c: '#30a46c' },
    fes: { n: 'Fessiers', en: 'Glutes', c: '#e93d82' },
    mol: { n: 'Mollets', en: 'Calves', c: '#978365' },
    abd: { n: 'Abdos', en: 'Abs', c: '#00a2c7' },
    ava: { n: 'Avant-bras', en: 'Forearms', c: '#889096' },
    full: { n: 'Corps entier', en: 'Full body', c: '#a0a0a0' }
  };

  var EQUIP = {
    bw: { n: 'Poids du corps', en: 'Bodyweight' },
    db: { n: 'Haltères', en: 'Dumbbells' },
    bb: { n: 'Barre', en: 'Barbell' },
    mac: { n: 'Machine / poulie', en: 'Machine / cable' },   /* aucun exercice livré : réservé aux exercices personnels */
    band: { n: 'Élastique', en: 'Band' }
  };

  var EXERCISES = [
    /* ---------- BARRE ---------- */
    { id: 'bb-squat', n: 'Squat barre', en: 'Back squat', g: 'qua', g2: ['fes', 'isc'], eq: 'bb', bar: 1, c: 'Buste fier, genoux dans l’axe des pieds, descends sous la parallèle si la mobilité suit.', ce: 'Chest up, knees tracking over toes, break parallel if mobility allows.' },
    { id: 'bb-front-squat', n: 'Front squat', en: 'Front squat', g: 'qua', g2: ['abd'], eq: 'bb', bar: 1, c: 'Coudes hauts en permanence, barre posée sur les deltoïdes avant.', ce: 'Elbows high throughout, bar resting on the front delts.' },
    { id: 'bb-deadlift', n: 'Soulevé de terre', en: 'Deadlift', g: 'isc', g2: ['dos', 'fes'], eq: 'bb', bar: 1, c: 'Dos neutre, barre au contact des tibias, pousse le sol avec les jambes.', ce: 'Neutral spine, bar against the shins, push the floor away.' },
    { id: 'bb-rdl', n: 'Soulevé de terre jambes tendues', en: 'Romanian deadlift', g: 'isc', g2: ['fes', 'dos'], eq: 'bb', bar: 1, c: 'Hanches vers l’arrière, légère flexion de genoux, dos plat.', ce: 'Hips back, slight knee bend, flat back.' },
    { id: 'bb-bench', n: 'Développé couché', en: 'Bench press', g: 'pec', g2: ['tri', 'epa'], eq: 'bb', bar: 1, bench: 1, c: 'Omoplates serrées, pieds ancrés, barre au niveau du bas des pecs.', ce: 'Shoulder blades pinched, feet planted, bar to the lower chest.' },
    { id: 'bb-incline-bench', n: 'Développé incliné barre', en: 'Incline bench press', g: 'pec', g2: ['epa', 'tri'], eq: 'bb', bar: 1, bench: 1, c: 'Banc à 30°, barre en haut des pecs.', ce: 'Bench at 30 degrees, bar to the upper chest.' },
    { id: 'bb-ohp', n: 'Développé militaire', en: 'Overhead press', g: 'epa', g2: ['tri'], eq: 'bb', bar: 1, c: 'Abdos et fessiers gainés, ne cambre pas, tête passe sous la barre en haut.', ce: 'Brace abs and glutes, no arching, head through at the top.' },
    { id: 'bb-row', n: 'Rowing barre', en: 'Barbell row', g: 'dos', g2: ['bic'], eq: 'bb', bar: 1, c: 'Buste à ~45°, tire vers le nombril, pas d’à-coups de hanches.', ce: 'Torso at about 45 degrees, pull to the navel, no hip jerking.' },
    { id: 'bb-hip-thrust', n: 'Hip thrust barre', en: 'Barbell hip thrust', g: 'fes', g2: ['isc'], eq: 'bb', bar: 1, bench: 1, c: 'Menton rentré, verrouille en haut 1 seconde.', ce: 'Chin tucked, lock out for one second at the top.' },
    { id: 'bb-lunge', n: 'Fente barre', en: 'Barbell lunge', g: 'qua', g2: ['fes'], eq: 'bb', bar: 1, c: 'Une barre unique sur le dos : la charge saisie est la charge totale. Une série par jambe.', ce: 'One bar on the back: the load entered is the total. One set per leg.' },
    { id: 'bb-curl', n: 'Curl barre', en: 'Barbell curl', g: 'bic', g2: ['ava'], eq: 'bb', bar: 1, c: 'Coudes collés au buste, pas de balancier.', ce: 'Elbows pinned to the torso, no swinging.' },
    { id: 'bb-skullcrusher', n: 'Barre au front', en: 'Skull crusher', g: 'tri', eq: 'bb', bar: 1, bench: 1, c: 'Coudes fixes, seul l’avant-bras bouge.', ce: 'Elbows fixed, only the forearms move.' },
    { id: 'bb-good-morning', n: 'Good morning', en: 'Good morning', g: 'isc', g2: ['dos', 'fes'], eq: 'bb', bar: 1, c: 'Charge légère, dos verrouillé, amplitude contrôlée.', ce: 'Light load, back locked, controlled range.' },
    { id: 'bb-calf-raise', n: 'Mollets debout barre', en: 'Standing barbell calf raise', g: 'mol', eq: 'bb', bar: 1, c: 'Amplitude complète, pause 1 s en haut.', ce: 'Full range, one-second pause at the top.' },
    { id: 'bb-shrug', n: 'Shrug barre', en: 'Barbell shrug', g: 'dos', g2: ['epa'], eq: 'bb', bar: 1, c: 'Monte les épaules vers les oreilles, sans rouler.', ce: 'Shoulders straight up towards the ears, no rolling.' },
    { id: 'bb-pendlay-row', n: 'Pendlay row', en: 'Pendlay row', g: 'dos', g2: ['bic'], eq: 'bb', bar: 1, c: 'Buste parallèle au sol, la barre repart du sol à chaque rep.', ce: 'Torso parallel to the floor, bar resets on the ground each rep.' },

    /* ---------- HALTÈRES ---------- */
    { id: 'db-bench', n: 'Développé couché haltères', en: 'Dumbbell bench press', g: 'pec', g2: ['tri', 'epa'], eq: 'db', bench: 1, c: 'Amplitude plus grande qu’à la barre, contrôle la descente.', ce: 'Greater range than the bar. Control the descent.' },
    { id: 'db-incline-bench', n: 'Développé incliné haltères', en: 'Incline dumbbell press', g: 'pec', g2: ['epa'], eq: 'db', bench: 1, c: 'Banc à 30°, ne creuse pas le bas du dos.', ce: 'Bench at 30 degrees, do not arch the lower back.' },
    { id: 'db-fly', n: 'Écarté haltères', en: 'Dumbbell fly', g: 'pec', eq: 'db', bench: 1, c: 'Coudes légèrement fléchis et figés, mouvement d’étreinte.', ce: 'Elbows slightly bent and locked, hugging motion.' },
    { id: 'db-incline-fly', n: 'Écarté incliné', en: 'Incline dumbbell fly', g: 'pec', eq: 'db', bench: 1, c: 'Étire sans forcer, charge modérée.', ce: 'Stretch without forcing, moderate load.' },
    { id: 'db-pullover', n: 'Pull-over haltère', en: 'Dumbbell pullover', g: 'pec', g2: ['dos'], eq: 'db', bench: 1, c: 'Bras quasi tendus, cage ouverte, respire à l’étirement.', ce: 'Arms nearly straight, ribcage open, breathe into the stretch.' },
    { id: 'db-row', n: 'Rowing haltère', en: 'One-arm dumbbell row', g: 'dos', g2: ['bic'], eq: 'db', uni: 1, bench: 1, c: 'Appui sur le banc, tire le coude vers la hanche.', ce: 'Hand on the bench, pull the elbow towards the hip.' },
    { id: 'db-bent-row', n: 'Rowing haltères buste penché', en: 'Bent-over dumbbell row', g: 'dos', g2: ['bic'], eq: 'db', c: 'Deux haltères, buste à 45°, serre les omoplates.', ce: 'Two dumbbells, torso at 45 degrees, squeeze the shoulder blades.' },
    { id: 'db-ohp', n: 'Développé militaire haltères', en: 'Dumbbell shoulder press', g: 'epa', g2: ['tri'], eq: 'db', c: 'Debout ou assis, gainage actif, ne cambre pas.', ce: 'Standing or seated, brace hard, do not arch.' },
    { id: 'db-arnold', n: 'Développé Arnold', en: 'Arnold press', g: 'epa', g2: ['tri'], eq: 'db', c: 'Rotation des poignets pendant la montée.', ce: 'Rotate the wrists through the press.' },
    { id: 'db-lateral-raise', n: 'Élévations latérales', en: 'Lateral raise', g: 'epa', eq: 'db', c: 'Léger, coudes légèrement fléchis, monte jusqu’à l’horizontale.', ce: 'Light, elbows slightly bent, up to shoulder height.' },
    { id: 'db-front-raise', n: 'Élévations frontales', en: 'Front raise', g: 'epa', eq: 'db', c: 'Contrôle, pas d’élan de hanches.', ce: 'Controlled, no hip drive.' },
    { id: 'db-rear-delt-fly', n: 'Oiseau (deltoïde postérieur)', en: 'Rear delt fly', g: 'epa', g2: ['dos'], eq: 'db', c: 'Buste penché, pouces vers le bas, charge légère.', ce: 'Torso bent, thumbs down, light load.' },
    { id: 'db-curl', n: 'Curl haltères', en: 'Dumbbell curl', g: 'bic', eq: 'db', c: 'Supination complète en haut, descente lente.', ce: 'Full supination at the top, slow negative.' },
    { id: 'db-hammer-curl', n: 'Curl marteau', en: 'Hammer curl', g: 'bic', g2: ['ava'], eq: 'db', c: 'Prise neutre, coudes fixes.', ce: 'Neutral grip, elbows fixed.' },
    { id: 'db-incline-curl', n: 'Curl incliné', en: 'Incline dumbbell curl', g: 'bic', eq: 'db', bench: 1, c: 'Bras dans le prolongement du buste, gros étirement.', ce: 'Arms in line with the torso, big stretch.' },
    { id: 'db-concentration-curl', n: 'Curl concentré', en: 'Concentration curl', g: 'bic', eq: 'db', uni: 1, bench: 1, c: 'Coude calé sur la cuisse, contraction maximale en haut.', ce: 'Elbow braced on the thigh, peak contraction at the top.' },
    { id: 'db-tricep-ext', n: 'Extension triceps haltère', en: 'Overhead triceps extension', g: 'tri', eq: 'db', c: 'Haltère derrière la nuque, coudes serrés vers l’avant.', ce: 'Dumbbell behind the head, elbows tucked forward.' },
    { id: 'db-kickback', n: 'Kickback triceps', en: 'Triceps kickback', g: 'tri', eq: 'db', uni: 1, c: 'Bras collé au buste, extension complète.', ce: 'Upper arm glued to the torso, full extension.' },
    { id: 'db-goblet-squat', n: 'Goblet squat', en: 'Goblet squat', g: 'qua', g2: ['fes'], eq: 'db', c: 'Haltère contre la poitrine, buste droit, descends bas.', ce: 'Dumbbell against the chest, chest up, sit deep.' },
    { id: 'db-lunge', n: 'Fente haltères', en: 'Dumbbell lunge', g: 'qua', g2: ['fes'], eq: 'db', uni: 1, c: 'Grand pas, contrôle la descente du genou arrière.', ce: 'Long stride, control the back knee down.' },
    { id: 'db-bulgarian-split', n: 'Fente bulgare', en: 'Bulgarian split squat', g: 'qua', g2: ['fes'], eq: 'db', uni: 1, bench: 1, c: 'Pied arrière sur le banc, buste légèrement penché pour cibler les fessiers.', ce: 'Back foot on the bench, lean slightly to hit the glutes.' },
    { id: 'db-rdl', n: 'Soulevé jambes tendues haltères', en: 'Dumbbell Romanian deadlift', g: 'isc', g2: ['fes'], eq: 'db', c: 'Hanches en arrière, haltères près des jambes.', ce: 'Hips back, dumbbells close to the legs.' },
    { id: 'db-step-up', n: 'Montée sur banc', en: 'Step-up', g: 'qua', g2: ['fes'], eq: 'db', uni: 1, bench: 1, c: 'Pousse avec la jambe du haut, ne triche pas avec l’élan.', ce: 'Drive through the top leg, no momentum.' },
    { id: 'db-calf-raise', n: 'Mollets debout haltères', en: 'Standing dumbbell calf raise', g: 'mol', eq: 'db', c: 'Amplitude maximale, pause en haut.', ce: 'Full range, pause at the top.' },
    { id: 'db-shrug', n: 'Shrug haltères', en: 'Dumbbell shrug', g: 'dos', g2: ['epa'], eq: 'db', c: 'Épaules vers les oreilles, sans rotation.', ce: 'Shoulders to the ears, no rotation.' },
    { id: 'db-wrist-curl', n: 'Curl poignets', en: 'Wrist curl', g: 'ava', eq: 'db', bench: 1, c: 'Avant-bras posés, amplitude complète.', ce: 'Forearms supported, full range.' },
    { id: 'db-farmer-walk', n: 'Marche du fermier', en: 'Farmer’s walk', g: 'ava', g2: ['full'], eq: 'db', sec: 1, c: 'Gainage, épaules basses, pas courts et réguliers.', ce: 'Braced, shoulders down, short steady steps.' },

    /* ---------- POIDS DU CORPS ---------- */
    { id: 'bw-pushup', n: 'Pompes', en: 'Push-up', g: 'pec', g2: ['tri', 'epa'], eq: 'bw', bw: 1, c: 'Corps aligné, coudes à ~45°, poitrine au sol.', ce: 'Body in line, elbows at about 45 degrees, chest to the floor.' },
    { id: 'bw-incline-pushup', n: 'Pompes inclinées (mains sur banc)', en: 'Incline push-up (hands on bench)', g: 'pec', g2: ['tri'], eq: 'bw', bw: 1, bench: 1, c: 'Version plus facile, garde l’alignement.', ce: 'Easier version. Keep the body aligned.' },
    { id: 'bw-decline-pushup', n: 'Pompes déclinées (pieds sur banc)', en: 'Decline push-up (feet on bench)', g: 'pec', g2: ['epa'], eq: 'bw', bw: 1, bench: 1, c: 'Plus dur, sollicite le haut des pecs.', ce: 'Harder, hits the upper chest.' },
    { id: 'bw-diamond-pushup', n: 'Pompes diamant', en: 'Diamond push-up', g: 'tri', g2: ['pec'], eq: 'bw', bw: 1, c: 'Mains jointes sous le sternum, coudes serrés.', ce: 'Hands together under the sternum, elbows tucked.' },
    { id: 'bw-dip-bench', n: 'Dips sur banc', en: 'Bench dip', g: 'tri', g2: ['pec'], eq: 'bw', bw: 1, bench: 1, c: 'Descends jusqu’à 90° au coude, épaules basses.', ce: 'Down to 90 degrees at the elbow, shoulders down.' },
    { id: 'bw-pullup', n: 'Tractions pronation', en: 'Pull-up', g: 'dos', g2: ['bic'], eq: 'bw', bw: 1, c: 'Menton au-dessus de la barre, descente complète.', ce: 'Chin over the bar, full extension at the bottom.' },
    { id: 'bw-chinup', n: 'Tractions supination', en: 'Chin-up', g: 'dos', g2: ['bic'], eq: 'bw', bw: 1, c: 'Prise supination, coudes vers le bas, poitrine vers la barre.', ce: 'Supinated grip, elbows down, chest to the bar.' },
    { id: 'bw-squat', n: 'Squat au poids du corps', en: 'Bodyweight squat', g: 'qua', g2: ['fes'], eq: 'bw', bw: 1, c: 'Talons au sol, descends bas et contrôlé.', ce: 'Heels down, deep and controlled.' },
    { id: 'bw-glute-bridge', n: 'Pont fessier', en: 'Glute bridge', g: 'fes', g2: ['isc'], eq: 'bw', bw: 1, c: 'Pousse par les talons, verrouille en haut.', ce: 'Drive through the heels, lock out at the top.' },
    { id: 'bw-nordic-curl', n: 'Nordic curl', en: 'Nordic hamstring curl', g: 'isc', eq: 'bw', bw: 1, c: 'Descente la plus lente possible, gainage total.', ce: 'Lower as slowly as possible, stay braced.' },
    { id: 'bw-plank', n: 'Gainage planche', en: 'Plank', g: 'abd', eq: 'bw', bw: 1, sec: 1, c: 'Bassin en rétroversion, corps aligné des talons à la nuque.', ce: 'Pelvis tucked, body in line from heels to neck.' },
    { id: 'bw-side-plank', n: 'Gainage latéral', en: 'Side plank', g: 'abd', eq: 'bw', bw: 1, uni: 1, sec: 1, c: 'Hanches hautes, épaule à l’aplomb du coude. Un côté par série.', ce: 'Hips high, shoulder over the elbow. One side per set.' },
    { id: 'bw-hollow-hold', n: 'Hollow hold', en: 'Hollow hold', g: 'abd', eq: 'bw', bw: 1, sec: 1, c: 'Lombaires plaquées au sol, bras et jambes tendus.', ce: 'Lower back pressed into the floor, arms and legs long.' },
    { id: 'bw-crunch', n: 'Crunch', en: 'Crunch', g: 'abd', eq: 'bw', bw: 1, c: 'Enroule la colonne, ne tire pas sur la nuque.', ce: 'Roll the spine up, do not pull on the neck.' },
    { id: 'bw-leg-raise', n: 'Relevés de jambes', en: 'Leg raise', g: 'abd', eq: 'bw', bw: 1, c: 'Bas du dos plaqué, contrôle la descente.', ce: 'Lower back flat, control the way down.' },
    { id: 'bw-ab-wheel', n: 'Roulette abdos', en: 'Ab wheel rollout', g: 'abd', eq: 'bw', bw: 1, c: 'Bassin verrouillé, n’arrondis pas le bas du dos.', ce: 'Pelvis locked, do not let the lower back arch.' },
    { id: 'bw-calf-raise', n: 'Mollets au poids du corps', en: 'Bodyweight calf raise', g: 'mol', eq: 'bw', bw: 1, c: 'Une jambe pour durcir, amplitude complète.', ce: 'Single leg to make it harder, full range.' },
    { id: 'bw-superman', n: 'Superman (lombaires)', en: 'Superman hold', g: 'dos', eq: 'bw', bw: 1, sec: 1, c: 'Extension douce, sans à-coup. Regard vers le sol.', ce: 'Gentle extension, no jerking. Eyes to the floor.' },
    { id: 'bw-burpee', n: 'Burpees', en: 'Burpee', g: 'full', eq: 'bw', bw: 1, c: 'Cardio. Rythme régulier plutôt que rapide.', ce: 'Conditioning. Steady rhythm beats fast.' },
    { id: 'bw-mountain-climber', n: 'Mountain climbers', en: 'Mountain climber', g: 'abd', g2: ['full'], eq: 'bw', bw: 1, sec: 1, c: 'Bassin stable, rythme régulier.', ce: 'Hips steady, even rhythm.' },

    /* ---------- ÉLASTIQUE ---------- */
    { id: 'band-pull-apart', n: 'Pull apart élastique', en: 'Band pull-apart', g: 'epa', g2: ['dos'], eq: 'band', c: 'Idéal en échauffement, serre les omoplates.', ce: 'Great as a warm-up, squeeze the shoulder blades.' },
    { id: 'band-face-pull', n: 'Face pull élastique', en: 'Band face pull', g: 'epa', g2: ['dos'], eq: 'band', c: 'Tire vers le front, rotation externe en fin de mouvement.', ce: 'Pull to the forehead, external rotation at the end.' },
    { id: 'band-row', n: 'Rowing élastique', en: 'Band row', g: 'dos', g2: ['bic'], eq: 'band', c: 'Tension constante, contrôle le retour.', ce: 'Constant tension, control the return.' },
    { id: 'band-lat-pulldown', n: 'Tirage vertical élastique', en: 'Band lat pulldown', g: 'dos', g2: ['bic'], eq: 'band', c: 'Élastique ancré en hauteur, tire les coudes vers les hanches.', ce: 'Band anchored high, drive the elbows to the hips.' },
    { id: 'band-assisted-pullup', n: 'Traction assistée élastique', en: 'Band-assisted pull-up', g: 'dos', g2: ['bic'], eq: 'band', c: 'Pied dans l’élastique : la progression se fait en réduisant l’assistance.', ce: 'Foot in the band. Progress by using less assistance.' },
    { id: 'bw-inverted-row', n: 'Rowing inversé (sous une barre)', en: 'Inverted row (under a bar)', g: 'dos', g2: ['bic'], eq: 'bw', bw: 1, c: 'Barre calée bas, corps gainé. Plus les pieds sont loin, plus c’est dur.', ce: 'Bar set low, body braced. Feet further out is harder.' },

    /* ---------- AJOUTS — mouvements évidents pour halteres + banc + barre ---------- */
    { id: 'db-floor-press', n: 'Développé au sol haltères', en: 'Dumbbell floor press', g: 'pec', g2: ['tri'], eq: 'db', c: 'Coudes au sol à chaque répétition, amplitude limitée et sûre pour l’épaule.', ce: 'Elbows touch the floor each rep. Limited, shoulder-friendly range.' },
    { id: 'db-chest-supported-row', n: 'Rowing buste sur banc incliné', en: 'Chest-supported row', g: 'dos', g2: ['bic'], eq: 'db', bench: 1, c: 'Buste posé sur le banc incliné : aucune triche lombaire possible.', ce: 'Chest on the incline bench: no lower-back cheating possible.' },
    { id: 'db-upright-row', n: 'Rowing menton haltères', en: 'Dumbbell upright row', g: 'epa', g2: ['dos'], eq: 'db', c: 'Coudes plus hauts que les mains, ne monte pas au-delà des clavicules.', ce: 'Elbows above the hands, stop at collarbone height.' },
    { id: 'bb-overhead-shrug', n: 'Shrug barre bras tendus', en: 'Overhead barbell shrug', g: 'epa', g2: ['dos'], eq: 'bb', bar: 1, c: 'Barre au-dessus de la tête, pousse les épaules vers le plafond.', ce: 'Bar overhead, push the shoulders to the ceiling.' },
    { id: 'db-reverse-fly-bench', n: 'Oiseau buste sur banc', en: 'Chest-supported rear delt fly', g: 'epa', g2: ['dos'], eq: 'db', bench: 1, c: 'Buste posé, charge légère, serre les omoplates sans hausser les épaules.', ce: 'Chest supported, light load, squeeze without shrugging.' },
    { id: 'db-single-leg-rdl', n: 'Soulevé de terre unilatéral', en: 'Single-leg Romanian deadlift', g: 'isc', g2: ['fes'], eq: 'db', uni: 1, c: 'Une jambe, hanche qui recule, bassin bien parallèle au sol.', ce: 'One leg, hip travels back, keep the pelvis square.' },
    { id: 'db-tricep-ext-bench', n: 'Extension triceps couché haltères', en: 'Lying triceps extension', g: 'tri', eq: 'db', bench: 1, c: 'Coudes fixes vers le plafond, seul l’avant-bras descend.', ce: 'Elbows pointed at the ceiling, only the forearm drops.' },
    { id: 'bw-reverse-crunch', n: 'Crunch inversé', en: 'Reverse crunch', g: 'abd', eq: 'bw', bw: 1, c: 'Enroule le bassin vers le buste, sans élan de jambes.', ce: 'Curl the pelvis towards the chest, no leg swing.' }
  ];

  var API = { GROUPS: GROUPS, EQUIP: EQUIP, EXERCISES: EXERCISES };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.FORGE_EX = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
