# Forge 🏋️

Suivi de séances de musculation à la maison. PWA installable, **hors-ligne**, sans compte,
sans serveur, sans dépendance : trois fichiers JS servis en statique.

**→ https://mnafati-cloud.github.io/forge/**

Sur Android : ouvrir le lien dans Chrome → menu ⋮ → **Ajouter à l'écran d'accueil**.
L'app se lance ensuite en plein écran et fonctionne sans réseau.

## Ce que ça fait

- **Séance** — saisie en deux gestes entre deux séries : charge et reps en gros boutons `+`/`−`,
  la dernière performance rappelée sous l'exercice, chrono de repos automatique avec bip et vibration.
  Pour les exercices à la barre, l'app dit **quels disques mettre de chaque côté**.
- **Historique** — toutes les séances, leur volume, leur durée, le détail série par série,
  et « refaire cette séance » en un tap.
- **Progrès** — tonnage par semaine, courbe de 1RM estimé par exercice, répartition par groupe
  musculaire sur 4 semaines, tableau des records, suivi du poids de corps.

Détection automatique des records (charge, répétitions, 1RM estimé), séries d'échauffement
exclues des statistiques, RPE en option, mode clair/sombre.

## Où sont mes données

**Dans ton téléphone, et nulle part ailleurs** — localStorage, clé `forge-state-v1`.
Aucun compte, aucun envoi réseau, aucune télémétrie.

Conséquence directe : **exporte régulièrement** (⚙️ → Données → Exporter). Effacer les données
du site dans Chrome effacerait toute la progression, sans retour possible.

## Développement

Zéro build : on édite, on recharge.

```bash
python3 -m http.server 8123 --directory docs   # http://localhost:8123
node --test tests/*.test.mjs                   # 40 tests du moteur
for f in docs/*.js; do node --check "$f"; done # syntaxe
```

`docs/engine.js` est pur et testé (aucun DOM, aucune date implicite) ; `docs/app.js` est la seule
couche qui touche au stockage ; `docs/exercises.js` est le catalogue.

Avant toute modification : **`CLAUDE.md`** (les règles d'or) et **`MAINTENANCE.md`**
(les contrats de données, les recettes et les pièges déjà rencontrés).

## Licence

Projet personnel, à usage personnel.
