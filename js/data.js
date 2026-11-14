// Catalogue des exercices et routines de départ.
// La clé est le nom utilisé par Hevy (pour que l'import retrouve tout), "fr" est le nom affiché.
// kind = réglage de départ : 'reps' (répétitions), 'weight' (répétitions avec lest ou charge), 'time' (durée), 'run' (course).
// L'utilisateur peut ensuite changer le type et le lest de chaque exercice dans l'app (voir prefs dans store.js).

export const EXOS = {
  'Triceps Dip': { fr: 'Dips', kind: 'weight' },
  'Dips Hold': { fr: 'Maintien en dips', kind: 'time' },
  'Push Up': { fr: 'Pompes', kind: 'reps' },
  'Decline Push Up': { fr: 'Pompes déclinées', kind: 'reps' },
  'Diamond Push Up': { fr: 'Pompes diamant', kind: 'reps' },
  'Pike Pushup': { fr: 'Pike push-up', kind: 'reps' },
  'Bent Over Row (Band)': { fr: "Rowing à l'élastique", kind: 'weight' },
  'Bent Over Row (Dumbbell)': { fr: 'Rowing haltères', kind: 'weight' },
  'Bent Over Row (Barbell)': { fr: 'Rowing barre', kind: 'weight' },
  'Dumbbell Row': { fr: 'Rowing un bras', kind: 'weight' },
  'Inverted Row': { fr: 'Rowing inversé', kind: 'reps' },
  'Assisted Pistol Squats': { fr: 'Pistol squat assisté', kind: 'reps' },
  'Pistol Squat': { fr: 'Pistol squat', kind: 'reps' },
  'Reverse Lunge': { fr: 'Fentes arrière', kind: 'reps' },
  'Lunge': { fr: 'Fentes', kind: 'reps' },
  'Bulgarian Split Squat (Dumbbell)': { fr: 'Squat bulgare haltères', kind: 'weight' },
  'Goblet Squat': { fr: 'Goblet squat', kind: 'weight' },
  'Squat (Barbell)': { fr: 'Squat barre', kind: 'weight' },
  'Squat (Bodyweight)': { fr: 'Squat', kind: 'reps' },
  'Wall Sit': { fr: 'Chaise', kind: 'time' },
  'Russian Twist (Bodyweight)': { fr: 'Russian twist', kind: 'weight' },
  'Hanging Leg Raise': { fr: 'Relevés de jambes suspendu', kind: 'reps' },
  'Hollow Rock': { fr: 'Hollow rock', kind: 'time' },
  'Plank': { fr: 'Gainage', kind: 'time' },
  'Side Plank': { fr: 'Gainage latéral', kind: 'time' },
  'L-Sit Hold': { fr: 'L-sit', kind: 'time' },
  'Handstand Hold': { fr: 'Équilibre sur les mains', kind: 'time' },
  'Pike Compression Hold': { fr: 'Compression pike', kind: 'time' },
  'Planche Lean': { fr: 'Planche lean', kind: 'time' },
  'Standing Calf Raise (Dumbbell)': { fr: 'Mollets debout haltères', kind: 'weight' },
  'Single Leg Standing Calf Raise': { fr: 'Mollets sur une jambe', kind: 'reps' },
  'Hammer Curl (Dumbbell)': { fr: 'Curl marteau', kind: 'weight' },
  'Seated Overhead Press (Dumbbell)': { fr: 'Développé épaules haltères', kind: 'weight' },
  'Seated Overhead Press (Barbell)': { fr: 'Développé épaules barre', kind: 'weight' },
  'Lateral Raise (Dumbbell)': { fr: 'Élévations latérales', kind: 'weight' },
  'Bench Press (Barbell)': { fr: 'Développé couché barre', kind: 'weight' },
  'Bench Press (Dumbbell)': { fr: 'Développé couché haltères', kind: 'weight' },
  'Farmers Walk': { fr: 'Marche du fermier', kind: 'weight' },
  'Lying Neck Curls': { fr: 'Flexions du cou', kind: 'reps' },
  'Lying Neck Extension': { fr: 'Extensions du cou', kind: 'reps' },
  'Archer Push Up': { fr: 'Pompes archer', kind: 'reps' },
  'One Arm Push Up': { fr: 'Pompes à une main', kind: 'reps' },
  'Pull Up': { fr: 'Tractions', kind: 'reps' },
  'Running': { fr: 'Course à pied', kind: 'run' },
};

// Variantes regroupées : dans Hevy, la version lestée est un exercice à part. Ici c'est le même exercice,
// avec un lest facultatif. À gauche le nom Hevy, à droite le nom gardé.
export const ALIAS = {
  'Triceps Dip (Weighted)': 'Triceps Dip',
  'Push Up (Weighted)': 'Push Up',
  'Russian Twist (Weighted)': 'Russian Twist (Bodyweight)',
  'Reverse Lunge (Dumbbell)': 'Reverse Lunge',
  'Lunge (Dumbbell)': 'Lunge',
  'Squat (Dumbbell)': 'Squat (Bodyweight)',
};

// Routines actuelles (reprises des dernières séances Hevy de novembre 2026).
// Chaque série : r = répétitions, w = charge en kg, t = durée en secondes.
export const ROUTINES = [
  {
    title: 'FULL BODY  A',
    label: 'Full Body A',
    exercises: [
      { name: 'Triceps Dip (Weighted)', sets: [{ r: 8, w: 15 }, { r: 8, w: 15 }, { r: 8, w: 15 }] },
      { name: 'Assisted Pistol Squats', sets: [{ r: 4 }, { r: 4 }] },
      { name: 'Bent Over Row (Band)', sets: [{ r: 12, w: 55 }, { r: 12, w: 55 }, { r: 12, w: 55 }] },
      { name: 'Russian Twist (Weighted)', sets: [{ r: 45, w: 10 }, { r: 45, w: 10 }] },
      { name: 'Pike Pushup', sets: [{ r: 8 }, { r: 8 }, { r: 8 }] },
      { name: 'Bent Over Row (Dumbbell)', sets: [{ r: 12, w: 20 }, { r: 12, w: 20 }, { r: 12, w: 20 }] },
      { name: 'Hanging Leg Raise', sets: [{ r: 8 }, { r: 8 }] },
      { name: 'Decline Push Up', sets: [{ r: 12 }, { r: 12 }, { r: 12 }] },
    ],
  },
  {
    title: 'FULL BODY  B',
    label: 'Full Body B',
    exercises: [
      { name: 'Push Up', sets: [{ r: 32 }] },
      { name: 'Triceps Dip (Weighted)', sets: [{ r: 10, w: 15 }, { r: 10, w: 15 }] },
      { name: 'Reverse Lunge (Dumbbell)', sets: [{ r: 12, w: 20 }, { r: 12, w: 20 }, { r: 12, w: 20 }] },
      { name: 'Bent Over Row (Band)', sets: [{ r: 12, w: 55 }, { r: 12, w: 55 }] },
      { name: 'Hollow Rock', sets: [{ t: 30 }, { t: 30 }] },
      { name: 'Pistol Squat', sets: [{ r: 4 }, { r: 4 }, { r: 4 }] },
      { name: 'Bent Over Row (Dumbbell)', sets: [{ r: 12, w: 20 }, { r: 12, w: 20 }] },
      { name: 'Russian Twist (Weighted)', sets: [{ r: 45, w: 10 }, { r: 45, w: 10 }] },
      { name: 'Standing Calf Raise (Dumbbell)', sets: [{ r: 8, w: 10 }, { r: 8, w: 10 }, { r: 8, w: 10 }] },
    ],
  },
];

// Rangs : on change de rang en réussissant toutes les épreuves du rang suivant.
// Les épreuves se valident toutes seules à partir de tes séances (uniquement des exercices actuels).
// reps = répétitions dans une série, secs = secondes, lest = kg minimum, run = km, pace = secondes par km maximum.
export const RANKS = [
  { letter: 'E', name: 'Initié', tests: [] },
  { letter: 'D', name: 'Confirmé', tests: [
    { label: '20 pompes d’affilée', exo: 'Push Up', reps: 20 },
    { label: '8 dips', exo: 'Triceps Dip', reps: 8 },
    { label: 'Hollow rock 20 secondes', exo: 'Hollow Rock', secs: 20 },
    { label: 'Courir 3 km', run: 3 },
  ] },
  { letter: 'C', name: 'Aguerri', tests: [
    { label: '30 pompes d’affilée', exo: 'Push Up', reps: 30 },
    { label: '8 dips avec 10 kg', exo: 'Triceps Dip', reps: 8, lest: 10 },
    { label: '4 pistol squats assistés', exo: 'Assisted Pistol Squats', alt: ['Pistol Squat'], reps: 4 },
    { label: 'Hollow rock 30 secondes', exo: 'Hollow Rock', secs: 30 },
    { label: 'Courir 5 km', run: 5 },
  ] },
  { letter: 'B', name: 'Expert', tests: [
    { label: '40 pompes d’affilée', exo: 'Push Up', reps: 40 },
    { label: '10 dips avec 15 kg', exo: 'Triceps Dip', reps: 10, lest: 15 },
    { label: '5 pistol squats', exo: 'Pistol Squat', reps: 5 },
    { label: 'Hollow rock 45 secondes', exo: 'Hollow Rock', secs: 45 },
    { label: 'Courir 10 km', run: 10 },
  ] },
  { letter: 'A', name: 'Élite', tests: [
    { label: '50 pompes d’affilée', exo: 'Push Up', reps: 50 },
    { label: '10 dips avec 25 kg', exo: 'Triceps Dip', reps: 10, lest: 25 },
    { label: '8 pistol squats', exo: 'Pistol Squat', reps: 8 },
    { label: 'Hollow rock 60 secondes', exo: 'Hollow Rock', secs: 60 },
    { label: 'Courir 10 km en moins de 55 minutes', run: 10, pace: 330 },
  ] },
  { letter: 'S', name: 'Légende', tests: [
    { label: '60 pompes d’affilée', exo: 'Push Up', reps: 60 },
    { label: '8 dips avec 35 kg', exo: 'Triceps Dip', reps: 8, lest: 35 },
    { label: '10 pistol squats avec 10 kg', exo: 'Pistol Squat', reps: 10, lest: 10 },
    { label: 'Hollow rock 90 secondes', exo: 'Hollow Rock', secs: 90 },
    { label: 'Courir un semi-marathon (21 km)', run: 21 },
  ] },
];

// Famille de chaque exercice, pour l'équilibre du corps.
export const CATS = { push: 'Poussée', pull: 'Tirage', legs: 'Jambes', core: 'Gainage' };
export const CAT = {
  'Triceps Dip': 'push', 'Dips Hold': 'push', 'Push Up': 'push', 'Decline Push Up': 'push', 'Diamond Push Up': 'push', 'Pike Pushup': 'push',
  'Archer Push Up': 'push', 'One Arm Push Up': 'push', 'Seated Overhead Press (Dumbbell)': 'push', 'Seated Overhead Press (Barbell)': 'push',
  'Bench Press (Barbell)': 'push', 'Bench Press (Dumbbell)': 'push', 'Lateral Raise (Dumbbell)': 'push', 'Handstand Hold': 'push', 'Planche Lean': 'push',
  'Bent Over Row (Band)': 'pull', 'Bent Over Row (Dumbbell)': 'pull', 'Bent Over Row (Barbell)': 'pull', 'Dumbbell Row': 'pull', 'Inverted Row': 'pull',
  'Pull Up': 'pull', 'Hammer Curl (Dumbbell)': 'pull', 'Farmers Walk': 'pull',
  'Assisted Pistol Squats': 'legs', 'Pistol Squat': 'legs', 'Reverse Lunge': 'legs', 'Lunge': 'legs', 'Bulgarian Split Squat (Dumbbell)': 'legs',
  'Goblet Squat': 'legs', 'Squat (Barbell)': 'legs', 'Squat (Bodyweight)': 'legs', 'Wall Sit': 'legs',
  'Standing Calf Raise (Dumbbell)': 'legs', 'Single Leg Standing Calf Raise': 'legs',
  'Russian Twist (Bodyweight)': 'core', 'Hanging Leg Raise': 'core', 'Hollow Rock': 'core', 'Plank': 'core', 'Side Plank': 'core',
  'L-Sit Hold': 'core', 'Pike Compression Hold': 'core',
};

// Arbres de progression : chaque palier se valide tout seul quand une séance atteint l'objectif.
// sets × reps (ou secs), avec un lest minimum éventuel.
export const TREES = [
  { id: 'pompes', name: 'Pompes', nodes: [
    { exo: 'Push Up', label: 'Pompes classiques', sets: 3, reps: 12 },
    { exo: 'Decline Push Up', label: 'Pompes déclinées', sets: 3, reps: 12 },
    { exo: 'Diamond Push Up', label: 'Pompes diamant', sets: 3, reps: 10 },
    { exo: 'Archer Push Up', label: 'Pompes archer', sets: 3, reps: 6 },
    { exo: 'One Arm Push Up', label: 'Pompes à une main', sets: 1, reps: 3 },
  ] },
  { id: 'dips', name: 'Dips', nodes: [
    { exo: 'Triceps Dip', label: 'Dips', sets: 3, reps: 10 },
    { exo: 'Triceps Dip', label: 'Dips avec 10 kg', sets: 3, reps: 8, lest: 10 },
    { exo: 'Triceps Dip', label: 'Dips avec 20 kg', sets: 3, reps: 8, lest: 20 },
    { exo: 'Triceps Dip', label: 'Dips avec 30 kg', sets: 3, reps: 6, lest: 30 },
    { exo: 'Triceps Dip', label: 'Dips avec 40 kg', sets: 3, reps: 5, lest: 40 },
  ] },
  { id: 'jambes', name: 'Jambes', nodes: [
    { exo: 'Squat (Bodyweight)', label: 'Squats', sets: 3, reps: 20 },
    { exo: 'Reverse Lunge', label: 'Fentes arrière', sets: 3, reps: 12 },
    { exo: 'Assisted Pistol Squats', label: 'Pistol squat assisté', sets: 3, reps: 5 },
    { exo: 'Pistol Squat', label: 'Pistol squat', sets: 3, reps: 5 },
    { exo: 'Pistol Squat', label: 'Pistol squat avec 10 kg', sets: 3, reps: 5, lest: 10 },
  ] },
  { id: 'tirage', name: 'Tirage', nodes: [
    { exo: 'Bent Over Row (Band)', label: 'Rowing à l’élastique', sets: 3, reps: 12 },
    { exo: 'Inverted Row', label: 'Rowing inversé', sets: 3, reps: 8 },
    { exo: 'Inverted Row', label: 'Rowing inversé, 12 répétitions', sets: 3, reps: 12 },
    { exo: 'Pull Up', label: 'Tractions', sets: 3, reps: 5 },
    { exo: 'Pull Up', label: 'Tractions, 10 répétitions', sets: 3, reps: 10 },
  ] },
  { id: 'gainage', name: 'Gainage', nodes: [
    { exo: 'Hollow Rock', label: 'Hollow rock 30 secondes', sets: 2, secs: 30 },
    { exo: 'Hollow Rock', label: 'Hollow rock 45 secondes', sets: 2, secs: 45 },
    { exo: 'Hollow Rock', label: 'Hollow rock 60 secondes', sets: 2, secs: 60 },
    { exo: 'Hanging Leg Raise', label: 'Relevés de jambes, 10 répétitions', sets: 3, reps: 10 },
    { exo: 'Hanging Leg Raise', label: 'Relevés de jambes, 15 répétitions', sets: 3, reps: 15 },
  ] },
];

// Fiches : comment faire l'exercice, ce qu'il travaille, l'erreur à éviter.
export const FICHES = {
  'Push Up': { muscles: 'Pectoraux, triceps, épaules', steps: ['Mains un peu plus larges que les épaules, corps droit de la tête aux talons.', 'Descends jusqu’à frôler le sol avec la poitrine, coudes à environ 45 degrés du corps.', 'Repousse le sol jusqu’à tendre les bras, sans lâcher le gainage.'], erreur: 'Laisser le bassin tomber ou monter les fesses.' },
  'Decline Push Up': { muscles: 'Haut des pectoraux, épaules, triceps', steps: ['Pieds sur le banc ou le step, mains au sol sous les épaules.', 'Descends la poitrine vers le sol en gardant le corps aligné.', 'Remonte en poussant fort, bras tendus en haut.'], erreur: 'Creuser le bas du dos parce que le gainage lâche.' },
  'Diamond Push Up': { muscles: 'Triceps, intérieur des pectoraux', steps: ['Mains sous la poitrine, pouces et index qui se touchent.', 'Descends en gardant les coudes près du corps.', 'Pousse jusqu’à tendre les bras, sans creuser le dos.'], erreur: 'Écarter les coudes sur les côtés.' },
  'Pike Pushup': { muscles: 'Épaules, triceps', steps: ['Fesses en l’air, corps en V inversé, mains au sol.', 'Plie les coudes et amène le sommet de la tête vers le sol, devant les mains.', 'Repousse jusqu’à tendre les bras en gardant les hanches hautes.'], erreur: 'Faire une pompe classique en avançant trop le corps.' },
  'Archer Push Up': { muscles: 'Pectoraux, triceps, un bras après l’autre', steps: ['Mains très écartées, doigts tournés vers l’extérieur.', 'Descends sur un bras pendant que l’autre reste tendu sur le côté.', 'Remonte, puis change de côté.'], erreur: 'Plier le bras qui doit rester tendu.' },
  'One Arm Push Up': { muscles: 'Pectoraux, triceps, gainage', steps: ['Pieds bien écartés, une main sous l’épaule, l’autre dans le dos.', 'Descends lentement en gardant les épaules parallèles au sol.', 'Pousse sans tourner le buste.'], erreur: 'Tourner tout le corps sur le côté pour tricher.' },
  'Triceps Dip': { muscles: 'Triceps, pectoraux, épaules', steps: ['Bras tendus sur les barres, épaules basses, buste légèrement penché.', 'Descends jusqu’à ce que les épaules passent sous les coudes.', 'Remonte en poussant jusqu’à verrouiller les bras.'], erreur: 'Hausser les épaules vers les oreilles ou descendre trop peu.' },
  'Assisted Pistol Squats': { muscles: 'Cuisses, fessiers, équilibre', steps: ['Tiens un appui d’une main, une jambe tendue devant toi.', 'Descends sur l’autre jambe le plus bas possible, talon au sol.', 'Remonte en t’aidant le moins possible de la main.'], erreur: 'Tirer fort avec le bras au lieu de pousser avec la jambe.' },
  'Pistol Squat': { muscles: 'Cuisses, fessiers, équilibre', steps: ['Debout sur une jambe, l’autre tendue devant, bras en avant.', 'Descends lentement jusqu’en bas, talon collé au sol.', 'Remonte sans poser l’autre pied.'], erreur: 'Décoller le talon ou laisser le genou rentrer vers l’intérieur.' },
  'Reverse Lunge': { muscles: 'Cuisses, fessiers', steps: ['Debout, haltères le long du corps si tu es lesté.', 'Recule un pied et descends jusqu’à frôler le sol avec le genou arrière.', 'Reviens debout en poussant sur la jambe avant.'], erreur: 'Pencher le buste en avant ou cogner le genou au sol.' },
  'Squat (Bodyweight)': { muscles: 'Cuisses, fessiers', steps: ['Pieds largeur d’épaules, pointes légèrement ouvertes.', 'Descends les fesses en arrière jusqu’à passer sous les genoux.', 'Remonte en poussant dans les talons.'], erreur: 'Décoller les talons ou arrondir le dos.' },
  'Bent Over Row (Band)': { muscles: 'Dos, biceps', steps: ['Pieds sur l’élastique, buste penché, dos plat.', 'Tire les coudes vers l’arrière en serrant les omoplates.', 'Redescends lentement sans relâcher la tension.'], erreur: 'Arrondir le dos ou tirer avec les bras seulement.' },
  'Bent Over Row (Dumbbell)': { muscles: 'Dos, biceps', steps: ['Buste penché à environ 45 degrés, dos plat, haltères bras tendus.', 'Tire les haltères vers les hanches, coudes le long du corps.', 'Marque un temps d’arrêt en haut, puis redescends en contrôlant.'], erreur: 'Donner des coups de reins pour monter la charge.' },
  'Inverted Row': { muscles: 'Dos, biceps, arrière des épaules', steps: ['Suspendu sous une barre basse, corps droit, talons au sol.', 'Tire la poitrine jusqu’à la barre en serrant les omoplates.', 'Redescends bras tendus en gardant le corps gainé.'], erreur: 'Laisser les hanches tomber.' },
  'Pull Up': { muscles: 'Dos, biceps', steps: ['Suspendu bras tendus, mains un peu plus larges que les épaules.', 'Tire jusqu’à passer le menton au-dessus de la barre.', 'Redescends complètement, sans te laisser tomber.'], erreur: 'Ne pas tendre les bras en bas ou balancer les jambes.' },
  'Russian Twist (Bodyweight)': { muscles: 'Obliques, abdominaux', steps: ['Assis, buste incliné en arrière, pieds décollés si tu peux.', 'Tourne les épaules d’un côté puis de l’autre, le poids suit les mains.', 'Garde le dos droit et un rythme régulier.'], erreur: 'Bouger seulement les bras sans tourner le buste.' },
  'Hanging Leg Raise': { muscles: 'Abdominaux, fléchisseurs de hanche', steps: ['Suspendu bras tendus, épaules engagées.', 'Monte les jambes devant toi sans te balancer.', 'Redescends lentement, sans élan.'], erreur: 'Se servir du balancement pour monter.' },
  'Hollow Rock': { muscles: 'Abdominaux profonds', steps: ['Allongé sur le dos, bas du dos plaqué au sol, bras derrière la tête.', 'Décolle les épaules et les jambes pour former une banane.', 'Balance doucement d’avant en arrière sans casser la forme.'], erreur: 'Laisser le bas du dos se décoller du sol.' },
  'Plank': { muscles: 'Abdominaux, gainage', steps: ['Avant-bras au sol, coudes sous les épaules.', 'Corps aligné, fesses et abdominaux serrés.', 'Respire normalement et tiens la position.'], erreur: 'Monter les fesses ou creuser le dos.' },
  'Standing Calf Raise (Dumbbell)': { muscles: 'Mollets', steps: ['Debout, avant des pieds sur le step, talons dans le vide.', 'Monte le plus haut possible sur la pointe des pieds.', 'Redescends lentement sous le niveau du step.'], erreur: 'Rebondir en bas au lieu de contrôler.' },
};

// Échauffement guidé (facultatif) : environ 3 minutes 30.
export const WARMUP = [
  { name: 'Rotations des épaules', secs: 30, tip: 'Grands cercles, dans un sens puis dans l’autre.' },
  { name: 'Cercles des poignets', secs: 30, tip: 'Mains jointes, tourne doucement dans les deux sens.' },
  { name: 'Squats à vide', secs: 40, tip: 'Lentement, descends de plus en plus bas.' },
  { name: 'Pompes lentes', secs: 40, tip: 'Trois secondes pour descendre, sans forcer.' },
  { name: 'Planche sur les mains', secs: 30, tip: 'Pousse le sol, écarte les omoplates.' },
  { name: 'Fentes alternées', secs: 40, tip: 'Un pas en arrière, puis l’autre jambe.' },
];
