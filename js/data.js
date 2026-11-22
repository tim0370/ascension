// Catalogue des exercices et routines de départ.
// La clé est le nom utilisé par Hevy (pour que l'import retrouve tout), "fr" est le nom affiché.
// kind = réglage de départ : 'reps' (répétitions), 'weight' (répétitions avec lest ou charge), 'time' (durée), 'run' (course).
// L'utilisateur peut ensuite changer le type et le lest de chaque exercice dans l'app (voir prefs dans store.js).

export const EXOS = {
  // Pompes
  'Push Up': { fr: 'Pompes', kind: 'reps', g: 'pompes' },
  'Knee Push Up': { fr: 'Pompes sur les genoux', kind: 'reps', g: 'pompes' },
  'Incline Push Up': { fr: 'Pompes inclinées', kind: 'reps', g: 'pompes' },
  'Decline Push Up': { fr: 'Pompes déclinées', kind: 'reps', g: 'pompes' },
  'Wide Push Up': { fr: 'Pompes larges', kind: 'reps', g: 'pompes' },
  'Diamond Push Up': { fr: 'Pompes diamant', kind: 'reps', g: 'pompes' },
  'Slow Push Up': { fr: 'Pompes lentes', kind: 'reps', g: 'pompes' },
  'Deficit Push Up': { fr: 'Pompes sur haltères', kind: 'reps', g: 'pompes' },
  'Spiderman Push Up': { fr: 'Pompes spiderman', kind: 'reps', g: 'pompes' },
  'Hindu Push Up': { fr: 'Pompes hindoues', kind: 'reps', g: 'pompes' },
  'Explosive Push Up': { fr: 'Pompes explosives', kind: 'reps', g: 'pompes' },
  'Clap Push Up': { fr: 'Pompes claquées', kind: 'reps', g: 'pompes' },
  'Pseudo Planche Push Up': { fr: 'Pompes pseudo-planche', kind: 'reps', g: 'pompes' },
  'Archer Push Up': { fr: 'Pompes archer', kind: 'reps', g: 'pompes' },
  'One Arm Push Up': { fr: 'Pompes à une main', kind: 'reps', g: 'pompes' },
  // Dips
  'Triceps Dip': { fr: 'Dips', kind: 'weight', g: 'dips' },
  'Bench Dip': { fr: 'Dips sur banc', kind: 'reps', g: 'dips' },
  'Bench Dip (Feet Elevated)': { fr: 'Dips sur banc pieds surélevés', kind: 'reps', g: 'dips' },
  'Band Assisted Dip': { fr: 'Dips assistés à l’élastique', kind: 'reps', g: 'dips' },
  'Negative Dip': { fr: 'Dips négatifs', kind: 'reps', g: 'dips' },
  'Dips Hold': { fr: 'Maintien en dips', kind: 'time', g: 'dips' },
  'Chest Dip': { fr: 'Dips buste penché', kind: 'weight', g: 'dips' },
  'Explosive Dip': { fr: 'Dips explosifs', kind: 'reps', g: 'dips' },
  // Pectoraux
  'Bench Press (Dumbbell)': { fr: 'Développé couché haltères', kind: 'weight', g: 'pecs' },
  'Dumbbell Fly': { fr: 'Écarté couché haltères', kind: 'weight', g: 'pecs' },
  // Épaules
  'Pike Pushup': { fr: 'Pike push-up', kind: 'reps', g: 'epaules' },
  'Elevated Pike Push Up': { fr: 'Pike push-up pieds surélevés', kind: 'reps', g: 'epaules' },
  'Wall Walk': { fr: 'Montée au mur', kind: 'reps', g: 'epaules' },
  'Handstand Hold': { fr: 'Équilibre sur les mains', kind: 'time', g: 'epaules' },
  'Wall Handstand Push Up Negative': { fr: 'Descente lente en équilibre', kind: 'reps', g: 'epaules' },
  'Wall Handstand Push Up': { fr: 'Pompes en équilibre contre le mur', kind: 'reps', g: 'epaules' },
  'Planche Lean': { fr: 'Planche lean', kind: 'time', g: 'epaules' },
  'Seated Overhead Press (Dumbbell)': { fr: 'Développé épaules haltères', kind: 'weight', g: 'epaules' },
  'Arnold Press (Dumbbell)': { fr: 'Développé Arnold', kind: 'weight', g: 'epaules' },
  'Lateral Raise (Dumbbell)': { fr: 'Élévations latérales', kind: 'weight', g: 'epaules' },
  'Front Raise (Dumbbell)': { fr: 'Élévations frontales', kind: 'weight', g: 'epaules' },
  // Dos (sans barre de traction)
  'Bent Over Row (Dumbbell)': { fr: 'Rowing haltères', kind: 'weight', g: 'dos' },
  'Bent Over Row (Band)': { fr: 'Rowing à l’élastique', kind: 'weight', g: 'dos' },
  'Dumbbell Row': { fr: 'Rowing un bras', kind: 'weight', g: 'dos' },
  'Inverted Row': { fr: 'Rowing inversé', kind: 'reps', g: 'dos' },
  'Inverted Row (Feet Elevated)': { fr: 'Rowing inversé pieds surélevés', kind: 'reps', g: 'dos' },
  'Archer Row': { fr: 'Rowing inversé archer', kind: 'reps', g: 'dos' },
  'One Arm Inverted Row': { fr: 'Rowing inversé à un bras', kind: 'reps', g: 'dos' },
  'Band Pull Apart': { fr: 'Écartés à l’élastique', kind: 'reps', g: 'dos' },
  'Face Pull (Band)': { fr: 'Face pull à l’élastique', kind: 'reps', g: 'dos' },
  'Reverse Fly (Dumbbell)': { fr: 'Oiseau haltères', kind: 'weight', g: 'dos' },
  'Dumbbell Pullover': { fr: 'Pull-over haltère', kind: 'weight', g: 'dos' },
  'Superman': { fr: 'Superman', kind: 'reps', g: 'dos' },
  // Bras
  'Bicep Curl (Dumbbell)': { fr: 'Curl haltères', kind: 'weight', g: 'bras' },
  'Hammer Curl (Dumbbell)': { fr: 'Curl marteau', kind: 'weight', g: 'bras' },
  'Bicep Curl (Band)': { fr: 'Curl à l’élastique', kind: 'reps', g: 'bras' },
  'Triceps Extension (Dumbbell)': { fr: 'Extension triceps haltère', kind: 'weight', g: 'bras' },
  'Skullcrusher (Dumbbell)': { fr: 'Extension couchée haltères', kind: 'weight', g: 'bras' },
  'Triceps Kickback (Dumbbell)': { fr: 'Kickback triceps', kind: 'weight', g: 'bras' },
  'Farmers Walk': { fr: 'Marche du fermier', kind: 'weight', g: 'bras' },
  // Jambes
  'Squat (Bodyweight)': { fr: 'Squat', kind: 'reps', g: 'jambes' },
  'Goblet Squat': { fr: 'Goblet squat', kind: 'weight', g: 'jambes' },
  'Jump Squat': { fr: 'Squats sautés', kind: 'reps', g: 'jambes' },
  'Lunge': { fr: 'Fentes', kind: 'reps', g: 'jambes' },
  'Reverse Lunge': { fr: 'Fentes arrière', kind: 'reps', g: 'jambes' },
  'Jumping Lunge': { fr: 'Fentes sautées', kind: 'reps', g: 'jambes' },
  'Bulgarian Split Squat (Dumbbell)': { fr: 'Squat bulgare', kind: 'weight', g: 'jambes' },
  'Step Up': { fr: 'Montées sur banc', kind: 'reps', g: 'jambes' },
  'Cossack Squat': { fr: 'Squat cosaque', kind: 'reps', g: 'jambes' },
  'Assisted Pistol Squats': { fr: 'Pistol squat assisté', kind: 'reps', g: 'jambes' },
  'Pistol Squat': { fr: 'Pistol squat', kind: 'reps', g: 'jambes' },
  'Romanian Deadlift (Dumbbell)': { fr: 'Soulevé de terre jambes tendues', kind: 'weight', g: 'jambes' },
  'Glute Bridge': { fr: 'Pont fessier', kind: 'reps', g: 'jambes' },
  'Single Leg Glute Bridge': { fr: 'Pont fessier sur une jambe', kind: 'reps', g: 'jambes' },
  'Hip Thrust': { fr: 'Hip thrust sur le banc', kind: 'reps', g: 'jambes' },
  'Wall Sit': { fr: 'Chaise', kind: 'time', g: 'jambes' },
  'Standing Calf Raise (Dumbbell)': { fr: 'Mollets debout haltères', kind: 'weight', g: 'jambes' },
  'Single Leg Standing Calf Raise': { fr: 'Mollets sur une jambe', kind: 'reps', g: 'jambes' },
  'Broad Jump': { fr: 'Saut en longueur', kind: 'reps', g: 'jambes' },
  // Gainage
  'Plank': { fr: 'Gainage', kind: 'time', g: 'gainage' },
  'Side Plank': { fr: 'Gainage latéral', kind: 'time', g: 'gainage' },
  'Shoulder Taps': { fr: 'Touchers d’épaules', kind: 'reps', g: 'gainage' },
  'Mountain Climber': { fr: 'Mountain climbers', kind: 'time', g: 'gainage' },
  'Hollow Hold': { fr: 'Hollow body', kind: 'time', g: 'gainage' },
  'Hollow Rock': { fr: 'Hollow rock', kind: 'time', g: 'gainage' },
  'Crunch': { fr: 'Crunch', kind: 'reps', g: 'gainage' },
  'Dead Bug': { fr: 'Dead bug', kind: 'reps', g: 'gainage' },
  'Lying Leg Raise': { fr: 'Relevés de jambes au sol', kind: 'reps', g: 'gainage' },
  'Knee Raise (Dip Station)': { fr: 'Relevés de genoux à la station', kind: 'reps', g: 'gainage' },
  'Hanging Leg Raise': { fr: 'Relevés de jambes à la station', kind: 'reps', g: 'gainage' },
  'V Up': { fr: 'V-up', kind: 'reps', g: 'gainage' },
  'Russian Twist (Bodyweight)': { fr: 'Russian twist', kind: 'weight', g: 'gainage' },
  'Dragon Flag': { fr: 'Dragon flag', kind: 'reps', g: 'gainage' },
  // Cardio
  'Jumping Jack': { fr: 'Jumping jacks', kind: 'time', g: 'cardio' },
  'High Knees': { fr: 'Montées de genoux', kind: 'time', g: 'cardio' },
  'Burpee': { fr: 'Burpees', kind: 'reps', g: 'cardio' },
  'Tuck Jump': { fr: 'Sauts genoux poitrine', kind: 'reps', g: 'cardio' },
  'Running': { fr: 'Course à pied', kind: 'run', g: 'cardio' },
  // Anciens exercices : gardés pour l'historique, cachés dans le choix d'exercice (old: true).
  'Bent Over Row (Barbell)': { fr: 'Rowing barre', kind: 'weight', old: true },
  'Squat (Barbell)': { fr: 'Squat barre', kind: 'weight', old: true },
  'Seated Overhead Press (Barbell)': { fr: 'Développé épaules barre', kind: 'weight', old: true },
  'Bench Press (Barbell)': { fr: 'Développé couché barre', kind: 'weight', old: true },
  'Pull Up': { fr: 'Tractions', kind: 'reps', old: true },
  'Lying Neck Curls': { fr: 'Flexions du cou', kind: 'reps', old: true },
  'Lying Neck Extension': { fr: 'Extensions du cou', kind: 'reps', old: true },
  'L-Sit Hold': { fr: 'L-sit', kind: 'time', old: true },
  'Pike Compression Hold': { fr: 'Compression pike', kind: 'time', old: true },
};

// Familles affichées dans le choix d'exercice (champ g de chaque exercice).
export const GROUPES = { pompes: 'Pompes', dips: 'Dips', pecs: 'Pectoraux', epaules: 'Épaules', dos: 'Dos', bras: 'Bras', jambes: 'Jambes', gainage: 'Gainage', cardio: 'Cardio' };

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
  { letter: 'Z', name: 'Mythe', tests: [
    { label: '80 pompes d’affilée', exo: 'Push Up', reps: 80 },
    { label: '5 pompes à une main', exo: 'One Arm Push Up', reps: 5 },
    { label: '12 dips avec 30 kg', exo: 'Triceps Dip', reps: 12, lest: 30 },
    { label: 'Hollow rock 2 minutes', exo: 'Hollow Rock', secs: 120 },
    { label: 'Semi-marathon en moins de 1 h 45', run: 21, pace: 298 },
  ] },
];

// ---------- Les 5 qualités ----------
// Chaque qualité a une lettre de E à Z, calculée d'après tes meilleures séries (voir qualities() dans stats.js).
// Le rang général = la moyenne des 5 lettres.
export const LETTRES = ['E', 'D', 'C', 'B', 'A', 'S', 'Z'];
export const QUALITES = [
  { id: 'force', name: 'Force', desc: 'Le plus lourd que tu pousses par rapport à ton poids : dips lestés, pompes difficiles, pistol squats.', tips: ['Triceps Dip', 'Archer Push Up', 'Pistol Squat'] },
  { id: 'explo', name: 'Explosivité', desc: 'Ta capacité à pousser ou sauter le plus vite possible : pompes claquées, dips explosifs, sauts.', tips: ['Clap Push Up', 'Jump Squat', 'Broad Jump'] },
  { id: 'vitesse', name: 'Vitesse', desc: 'Ton allure en course, ramenée à un 5 km : courir un peu plus vite chaque dimanche la fait monter.', tips: ['Running'] },
  { id: 'endu', name: 'Endurance', desc: 'Combien tu tiens : le plus de pompes ou de dips d’affilée, ta plus longue course, ton gainage.', tips: ['Push Up', 'Triceps Dip', 'Plank'] },
  { id: 'maitrise', name: 'Maîtrise du corps', desc: 'Les figures qui demandent contrôle et équilibre : équilibre sur les mains, pistol squat, hollow, dragon flag.', tips: ['Handstand Hold', 'Pistol Squat', 'Hollow Rock'] },
];
// Seuils pour passer à D, C, B, A, S puis Z (la lettre E est en dessous du premier seuil).
// Force : charge estimée sur une répétition divisée par ton poids. Explosivité : équivalent en pompes claquées d'affilée.
// Vitesse : temps sur 5 km en secondes (plus petit = mieux). Endurance et maîtrise : une table par exercice.
export const SEUILS = {
  dips: [1.2, 1.4, 1.6, 1.8, 2.0, 2.3],
  pompesForce: [0.85, 1.0, 1.2, 1.45, 1.75, 2.1],
  jambesForce: [0.9, 1.05, 1.2, 1.4, 1.6, 1.9],
  explo: [1, 3, 6, 10, 15, 22],
  course5k: [2100, 1800, 1560, 1380, 1200, 1020],
  pompesEndu: [15, 25, 35, 45, 60, 80],
  dipsEndu: [8, 14, 20, 26, 34, 45],
  courseLongue: [3, 5, 8, 12, 21, 42],
  gainage: [60, 90, 120, 180, 240, 360],
};
// Exercices de maîtrise : seuils en répétitions (r) ou en secondes (t).
export const MAITRISE = {
  'Handstand Hold': { t: [10, 20, 30, 45, 60, 90] },
  'Wall Handstand Push Up': { r: [1, 2, 4, 6, 9, 13] },
  'Wall Handstand Push Up Negative': { r: [1, 3, 5, 8, 12, 16] },
  'Pistol Squat': { r: [1, 3, 5, 8, 12, 20] },
  'Assisted Pistol Squats': { r: [3, 6, 10, 15, 25, 40] },
  'Hollow Rock': { t: [20, 30, 45, 60, 90, 120] },
  'Hollow Hold': { t: [20, 30, 45, 60, 90, 120] },
  'Dragon Flag': { r: [1, 2, 4, 6, 8, 12] },
  'One Arm Push Up': { r: [1, 2, 4, 6, 10, 15] },
  'Archer Push Up': { r: [2, 4, 6, 9, 12, 16] },
  'Planche Lean': { t: [10, 20, 30, 45, 60, 90] },
  'Hanging Leg Raise': { r: [3, 6, 10, 14, 18, 25] },
};

// Famille de chaque exercice, pour l'équilibre du corps.
export const CATS = { push: 'Poussée', pull: 'Tirage', legs: 'Jambes', core: 'Gainage' };
// Famille de chaque exercice pour l'équilibre du corps : déduite de la famille affichée (g), avec quelques exceptions.
const G2CAT = { pompes: 'push', dips: 'push', pecs: 'push', epaules: 'push', dos: 'pull', jambes: 'legs', gainage: 'core', cardio: 'legs' };
const CAT_SPECIAL = {
  'Bicep Curl (Dumbbell)': 'pull', 'Hammer Curl (Dumbbell)': 'pull', 'Bicep Curl (Band)': 'pull', 'Farmers Walk': 'pull',
  'Triceps Extension (Dumbbell)': 'push', 'Skullcrusher (Dumbbell)': 'push', 'Triceps Kickback (Dumbbell)': 'push',
  'Bent Over Row (Barbell)': 'pull', 'Pull Up': 'pull', 'Squat (Barbell)': 'legs', 'Seated Overhead Press (Barbell)': 'push', 'Bench Press (Barbell)': 'push',
  'L-Sit Hold': 'core', 'Pike Compression Hold': 'core', 'Running': null,
};
export const CAT = {};
for (const k of Object.keys(EXOS)) { const c = k in CAT_SPECIAL ? CAT_SPECIAL[k] : G2CAT[EXOS[k].g]; if (c) CAT[k] = c; }

// Arbres de progression : de vraies étapes de difficulté, toutes faisables à la maison avec la station de dips,
// le banc, les haltères, le gilet lesté et les élastiques (pas de barre de traction).
// L'utilisateur n'a voulu garder que trois arbres : pompes, dips et course.
// Un palier se valide tout seul quand une séance atteint l'objectif : sets × reps (ou secs), lest minimum éventuel.
// Pour la course : run = km, pace = secondes par km maximum.
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
    { exo: 'Triceps Dip', label: 'Dips avec 15 kg', sets: 3, reps: 8, lest: 15 },
    { exo: 'Triceps Dip', label: 'Dips avec 20 kg', sets: 3, reps: 8, lest: 20 },
    { exo: 'Triceps Dip', label: 'Dips avec 25 kg', sets: 3, reps: 6, lest: 25 },
  ] },
  { id: 'course', name: 'Course', nodes: [
    { run: 5, label: 'Courir 5 km' },
    { run: 5, pace: 324, label: '5 km en moins de 27 minutes' },
    { run: 10, label: 'Courir 10 km' },
    { run: 10, pace: 330, label: '10 km en moins de 55 minutes' },
    { run: 21, label: 'Semi-marathon (21 km)' },
  ] },
];

// Fiches : comment faire, les erreurs fréquentes, les muscles, et la version plus facile ou plus dure (clé d'un autre exercice).
export const FICHES = {
  // ---------- Pompes ----------
  'Push Up': { muscles: 'Pectoraux, triceps, épaules, gainage', steps: ['Mains un peu plus larges que les épaules, corps droit de la tête aux talons.', 'Descends jusqu’à frôler le sol avec la poitrine, coudes à environ 45 degrés du corps.', 'Repousse le sol jusqu’à tendre les bras, sans lâcher le gainage.'], erreurs: ['Laisser le bassin tomber ou monter les fesses.', 'Descendre à moitié : la poitrine doit presque toucher le sol.', 'Écarter les coudes à 90 degrés, ce qui fatigue les épaules.'], facile: 'Incline Push Up', dur: 'Decline Push Up' },
  'Knee Push Up': { muscles: 'Pectoraux, triceps, épaules', steps: ['Genoux au sol, mains sous les épaules, corps droit des genoux à la tête.', 'Descends la poitrine jusqu’à frôler le sol.', 'Repousse jusqu’à tendre les bras.'], erreurs: ['Plier aux hanches : les fesses doivent rester dans l’alignement.', 'Mettre les genoux trop près des mains, ce qui rend l’exercice trop facile.'], facile: 'Incline Push Up', dur: 'Push Up' },
  'Incline Push Up': { muscles: 'Pectoraux (bas), triceps, épaules', steps: ['Mains sur le bord du banc, pieds en arrière, corps droit.', 'Descends la poitrine jusqu’au banc, coudes vers l’arrière.', 'Repousse jusqu’à tendre les bras.'], erreurs: ['Laisser la tête partir en avant au lieu de descendre la poitrine.', 'Creuser le bas du dos.'], facile: 'Knee Push Up', dur: 'Push Up' },
  'Decline Push Up': { muscles: 'Haut des pectoraux, épaules, triceps', steps: ['Pieds sur le banc, mains au sol sous les épaules.', 'Descends la poitrine vers le sol en gardant le corps aligné.', 'Remonte en poussant fort, bras tendus en haut.'], erreurs: ['Creuser le bas du dos parce que le gainage lâche.', 'Plier aux hanches pour se faciliter la descente.'], facile: 'Push Up', dur: 'Pseudo Planche Push Up' },
  'Wide Push Up': { muscles: 'Pectoraux surtout, épaules', steps: ['Mains nettement plus larges que les épaules, doigts vers l’avant.', 'Descends lentement, poitrine entre les mains.', 'Remonte en serrant les pectoraux.'], erreurs: ['Mettre les mains trop larges : les épaules souffrent.', 'Réduire l’amplitude en fin de série.'], facile: 'Push Up', dur: 'Archer Push Up' },
  'Diamond Push Up': { muscles: 'Triceps, intérieur des pectoraux', steps: ['Mains sous la poitrine, pouces et index qui se touchent.', 'Descends en gardant les coudes près du corps.', 'Pousse jusqu’à tendre les bras, sans creuser le dos.'], erreurs: ['Écarter les coudes sur les côtés.', 'Laisser le bassin tomber vers le sol.'], facile: 'Push Up', dur: 'Pseudo Planche Push Up' },
  'Slow Push Up': { muscles: 'Pectoraux, triceps, gainage', steps: ['Position de pompe classique, corps gainé.', 'Descends en trois secondes, garde une seconde en bas sans te poser.', 'Remonte en trois secondes : compte dans ta tête.'], erreurs: ['Accélérer à la fin de la série.', 'Se poser au sol en bas : la poitrine frôle sans toucher.'], facile: 'Push Up', dur: 'Archer Push Up' },
  'Deficit Push Up': { muscles: 'Pectoraux (étirement), triceps, épaules', steps: ['Mains posées sur les poignées de deux haltères, à plat et stables.', 'Descends plus bas que tes mains : la poitrine passe sous le niveau des poignées.', 'Remonte en poussant fort, sans rebondir en bas.'], erreurs: ['Haltères qui roulent : pose-les bien droits.', 'Descendre trop vite et forcer sur les épaules.'], facile: 'Push Up', dur: 'Decline Push Up' },
  'Spiderman Push Up': { muscles: 'Pectoraux, triceps, obliques, hanches', steps: ['Pompe classique : pendant la descente, amène un genou vers le coude du même côté.', 'Garde le corps bien droit pendant que la jambe monte.', 'Remonte en replaçant le pied, puis change de côté à la pompe suivante.'], erreurs: ['Tourner les hanches vers le sol.', 'Oublier de descendre pour se concentrer sur la jambe.'], facile: 'Push Up', dur: 'Archer Push Up' },
  'Hindu Push Up': { muscles: 'Épaules, pectoraux, triceps, souplesse du dos', steps: ['Pars fesses en l’air, corps en V inversé.', 'Plonge en avant en frôlant le sol avec la poitrine, comme pour passer sous une barrière.', 'Finis bras tendus, poitrine haute et regard devant, puis repousse vers le V.'], erreurs: ['Faire le mouvement trop vite sans contrôle.', 'Forcer sur le bas du dos en fin de mouvement : monte doucement.'], facile: 'Pike Pushup', dur: 'Elevated Pike Push Up' },
  'Explosive Push Up': { muscles: 'Pectoraux, triceps, puissance', steps: ['Descends contrôlé en position de pompe.', 'Pousse le sol le plus fort possible pour que les mains décollent.', 'Réceptionne-toi bras souples et enchaîne.'], erreurs: ['Atterrir bras tendus : amortis en pliant les coudes.', 'Casser l’alignement du corps pendant la poussée.'], facile: 'Push Up', dur: 'Clap Push Up' },
  'Clap Push Up': { muscles: 'Pectoraux, triceps, puissance', steps: ['Descends en pompe, corps gainé.', 'Pousse de toutes tes forces, claque des mains en l’air.', 'Replace vite les mains sous les épaules et amortis.'], erreurs: ['Ne pas pousser assez : commence par les pompes explosives.', 'Atterrir sur le visage : garde du gainage et entraîne-toi sur un tapis.'], facile: 'Explosive Push Up', dur: 'One Arm Push Up' },
  'Pseudo Planche Push Up': { muscles: 'Épaules (avant), pectoraux, gainage', steps: ['Mains au niveau du bas du ventre, doigts vers l’extérieur ou vers les pieds.', 'Penche les épaules bien devant les mains et garde cette inclinaison.', 'Descends puis remonte sans reculer les épaules.'], erreurs: ['Laisser les épaules revenir au-dessus des mains.', 'Plier les hanches pour se faciliter la vie.'], facile: 'Diamond Push Up', dur: 'Planche Lean' },
  'Archer Push Up': { muscles: 'Pectoraux, triceps, un bras après l’autre', steps: ['Mains très écartées, doigts tournés vers l’extérieur.', 'Descends sur un bras pendant que l’autre reste tendu sur le côté.', 'Remonte, puis change de côté.'], erreurs: ['Plier le bras qui doit rester tendu.', 'Tourner le buste au lieu de descendre droit.'], facile: 'Wide Push Up', dur: 'One Arm Push Up' },
  'One Arm Push Up': { muscles: 'Pectoraux, triceps, gainage complet', steps: ['Pieds bien écartés, une main sous l’épaule, l’autre dans le dos.', 'Descends lentement en gardant les épaules parallèles au sol.', 'Pousse sans tourner le buste.'], erreurs: ['Tourner tout le corps sur le côté pour tricher.', 'Rapprocher les pieds : plus ils sont écartés, plus c’est stable.'], facile: 'Archer Push Up', dur: 'Clap Push Up' },
  // ---------- Dips ----------
  'Triceps Dip': { muscles: 'Triceps, pectoraux, épaules', steps: ['Bras tendus sur les barres, épaules basses, buste légèrement penché.', 'Descends jusqu’à ce que les épaules passent sous les coudes.', 'Remonte en poussant jusqu’à verrouiller les bras.'], erreurs: ['Hausser les épaules vers les oreilles.', 'Descendre trop peu.', 'Se balancer avec les jambes pour remonter.'], facile: 'Negative Dip', dur: 'Chest Dip' },
  'Bench Dip': { muscles: 'Triceps, épaules', steps: ['Mains sur le bord du banc derrière toi, doigts vers l’avant, jambes devant.', 'Plie les coudes vers l’arrière et descends les fesses près du banc.', 'Remonte en tendant les bras.'], erreurs: ['Écarter les coudes sur les côtés.', 'Descendre trop bas : arrête-toi quand les bras font un angle droit.'], facile: 'Knee Push Up', dur: 'Bench Dip (Feet Elevated)' },
  'Bench Dip (Feet Elevated)': { muscles: 'Triceps, épaules', steps: ['Mains sur un banc derrière toi, pieds posés sur un second appui.', 'Descends les fesses en pliant les coudes vers l’arrière.', 'Remonte en tendant les bras. Pose le gilet sur les cuisses pour plus dur.'], erreurs: ['Laisser les épaules rouler en avant.', 'Pousser avec les jambes au lieu des bras.'], facile: 'Bench Dip', dur: 'Triceps Dip' },
  'Band Assisted Dip': { muscles: 'Triceps, pectoraux, épaules', steps: ['Accroche l’élastique entre les deux barres, pose les genoux dessus.', 'Descends lentement jusqu’à ce que les épaules passent sous les coudes.', 'Remonte : l’élastique t’aide surtout en bas.'], erreurs: ['Prendre un élastique trop fort : il doit juste aider.', 'Se laisser tomber en bas.'], facile: 'Bench Dip', dur: 'Triceps Dip' },
  'Negative Dip': { muscles: 'Triceps, pectoraux, épaules', steps: ['Monte bras tendus sur les barres en sautant ou avec un appui.', 'Descends le plus lentement possible, cinq secondes au moins.', 'Pose les pieds en bas, remonte avec les jambes, recommence.'], erreurs: ['Descendre trop vite : c’est la lenteur qui fait progresser.', 'Lâcher en bas sans contrôle.'], facile: 'Band Assisted Dip', dur: 'Triceps Dip' },
  'Dips Hold': { muscles: 'Triceps, épaules, gainage', steps: ['Bras tendus sur les barres, corps droit.', 'Pousse les barres vers le bas pour garder les épaules loin des oreilles.', 'Tiens en respirant calmement.'], erreurs: ['Laisser les épaules remonter.', 'Plier un peu les coudes : bras bien verrouillés.'], facile: 'Bench Dip', dur: 'Negative Dip' },
  'Chest Dip': { muscles: 'Pectoraux surtout, triceps, épaules', steps: ['Sur les barres, penche le buste en avant, jambes légèrement devant.', 'Descends en ouvrant un peu les coudes, épaules sous les coudes.', 'Remonte en gardant le buste penché.'], erreurs: ['Descendre trop bas trop tôt : les épaules doivent s’habituer.', 'Se redresser en remontant, ce qui fait travailler surtout les triceps.'], facile: 'Triceps Dip', dur: 'Explosive Dip' },
  'Explosive Dip': { muscles: 'Triceps, pectoraux, puissance', steps: ['Descends contrôlé en dips.', 'Remonte le plus vite possible, au point que les mains décollent presque des barres.', 'Rattrape-toi bras souples et enchaîne.'], erreurs: ['Perdre le contrôle en haut : commence sans décoller.', 'Rebondir en bas au lieu de démarrer de l’arrêt.'], facile: 'Triceps Dip', dur: 'Chest Dip' },
  // ---------- Pectoraux ----------
  'Bench Press (Dumbbell)': { muscles: 'Pectoraux, triceps, épaules', steps: ['Allongé sur le banc, pieds au sol, haltères au niveau de la poitrine.', 'Pousse vers le plafond jusqu’à tendre les bras.', 'Redescends lentement, coudes un peu sous le niveau du banc.'], erreurs: ['Décoller les fesses du banc.', 'Descendre les coudes trop bas : arrête-toi à hauteur du banc.'], facile: 'Push Up', dur: 'Deficit Push Up' },
  'Dumbbell Fly': { muscles: 'Pectoraux (étirement)', steps: ['Allongé sur le banc, haltères au-dessus de la poitrine, coudes légèrement pliés.', 'Ouvre les bras en arc de cercle jusqu’à sentir l’étirement.', 'Ramène les haltères au-dessus de toi comme pour serrer un arbre.'], erreurs: ['Plier puis tendre les coudes : ils restent fixes.', 'Descendre trop bas avec la charge.'], facile: 'Bench Press (Dumbbell)', dur: 'Deficit Push Up' },
  // ---------- Épaules ----------
  'Pike Pushup': { muscles: 'Épaules, triceps', steps: ['Fesses en l’air, corps en V inversé, mains au sol.', 'Plie les coudes et amène le sommet de la tête vers le sol, devant les mains.', 'Repousse jusqu’à tendre les bras en gardant les hanches hautes.'], erreurs: ['Faire une pompe classique en avançant trop le corps.', 'Écarter les coudes sur les côtés.'], facile: 'Hindu Push Up', dur: 'Elevated Pike Push Up' },
  'Elevated Pike Push Up': { muscles: 'Épaules, triceps', steps: ['Pieds sur le banc, mains au sol, fesses en l’air, corps en V inversé.', 'Descends le sommet de la tête vers le sol, devant les mains.', 'Repousse jusqu’à tendre les bras, hanches toujours hautes.'], erreurs: ['Aplatir le corps, ce qui transforme l’exercice en pompe déclinée.', 'Mettre les mains trop loin du banc.'], facile: 'Pike Pushup', dur: 'Wall Handstand Push Up Negative' },
  'Wall Walk': { muscles: 'Épaules, gainage, confiance à l’envers', steps: ['Pars en position de pompe, pieds contre le mur.', 'Monte les pieds sur le mur pendant que les mains reculent vers lui.', 'Va aussi près du mur que tu peux, puis redescends en marchant.'], erreurs: ['Aller trop près du mur dès le début.', 'Creuser le dos : serre les fesses et le ventre.'], facile: 'Elevated Pike Push Up', dur: 'Handstand Hold' },
  'Handstand Hold': { muscles: 'Épaules, gainage, équilibre', steps: ['Mains au sol à une main du mur, monte les pieds contre le mur.', 'Bras tendus, pousse le sol pour grandir les épaules.', 'Serre les fesses et les abdominaux, respire calmement.'], erreurs: ['Creuser le dos en banane au lieu de rester gainé.', 'Plier les coudes.'], facile: 'Wall Walk', dur: 'Wall Handstand Push Up Negative' },
  'Wall Handstand Push Up Negative': { muscles: 'Épaules, triceps', steps: ['En équilibre contre le mur, bras tendus.', 'Descends le plus lentement possible, cinq secondes au moins, jusqu’à poser la tête.', 'Redescends les pieds, puis remonte en équilibre pour la répétition suivante.'], erreurs: ['Se laisser tomber sur la tête : pose un coussin et garde le contrôle.', 'Mains trop larges.'], facile: 'Elevated Pike Push Up', dur: 'Wall Handstand Push Up' },
  'Wall Handstand Push Up': { muscles: 'Épaules, triceps', steps: ['En équilibre contre le mur, mains un peu plus larges que les épaules.', 'Descends jusqu’à frôler le sol avec la tête, coudes vers l’arrière.', 'Repousse jusqu’à verrouiller les bras.'], erreurs: ['Écarter les coudes sur les côtés, ce qui fatigue les épaules.', 'Pousser avec les jambes contre le mur.'], facile: 'Wall Handstand Push Up Negative', dur: 'Handstand Hold' },
  'Planche Lean': { muscles: 'Épaules (avant), poignets, gainage', steps: ['Position de pompe, doigts tournés vers les pieds ou vers l’extérieur.', 'Avance les épaules loin devant les mains, bras tendus.', 'Tiens la position, dos légèrement rond, sans plier les bras.'], erreurs: ['Plier les coudes.', 'Monter trop vite en inclinaison : les poignets doivent s’habituer.'], facile: 'Plank', dur: 'Pseudo Planche Push Up' },
  'Seated Overhead Press (Dumbbell)': { muscles: 'Épaules, triceps', steps: ['Assis sur le banc, dos droit, haltères au niveau des épaules.', 'Pousse vers le plafond jusqu’à tendre les bras.', 'Redescends lentement jusqu’aux oreilles.'], erreurs: ['Cambrer le bas du dos.', 'Redescendre trop vite.'], facile: 'Lateral Raise (Dumbbell)', dur: 'Arnold Press (Dumbbell)' },
  'Arnold Press (Dumbbell)': { muscles: 'Épaules (avant et côté), triceps', steps: ['Assis, haltères devant le visage, paumes vers toi.', 'Pousse vers le haut en tournant les poignets : paumes vers l’avant en haut.', 'Redescends en refaisant la rotation inverse.'], erreurs: ['Aller trop vite et perdre la rotation.', 'Cambrer le dos en haut.'], facile: 'Seated Overhead Press (Dumbbell)', dur: 'Pike Pushup' },
  'Lateral Raise (Dumbbell)': { muscles: 'Épaules (côté)', steps: ['Debout, haltères le long du corps, coudes légèrement pliés.', 'Monte les bras sur les côtés jusqu’à hauteur d’épaules.', 'Redescends lentement.'], erreurs: ['Donner un élan avec le dos.', 'Monter les mains plus haut que les coudes.'], facile: 'Band Pull Apart', dur: 'Seated Overhead Press (Dumbbell)' },
  'Front Raise (Dumbbell)': { muscles: 'Épaules (avant)', steps: ['Debout, haltères devant les cuisses.', 'Monte un bras tendu devant toi jusqu’à hauteur d’épaule.', 'Redescends lentement, puis l’autre bras.'], erreurs: ['Se balancer en arrière pour monter.', 'Monter trop haut.'], facile: 'Lateral Raise (Dumbbell)', dur: 'Seated Overhead Press (Dumbbell)' },
  // ---------- Dos ----------
  'Bent Over Row (Dumbbell)': { muscles: 'Dos, biceps', steps: ['Buste penché à environ 45 degrés, dos plat, haltères bras tendus.', 'Tire les haltères vers les hanches, coudes le long du corps.', 'Marque un temps d’arrêt en haut, puis redescends en contrôlant.'], erreurs: ['Donner des coups de reins pour monter la charge.', 'Arrondir le dos.'], facile: 'Bent Over Row (Band)', dur: 'Dumbbell Row' },
  'Bent Over Row (Band)': { muscles: 'Dos, biceps', steps: ['Pieds sur l’élastique, buste penché, dos plat.', 'Tire les coudes vers l’arrière en serrant les omoplates.', 'Redescends lentement sans relâcher la tension.'], erreurs: ['Arrondir le dos.', 'Tirer avec les bras seulement, sans serrer le dos.'], facile: 'Band Pull Apart', dur: 'Bent Over Row (Dumbbell)' },
  'Dumbbell Row': { muscles: 'Dos (grand dorsal), biceps', steps: ['Un genou et une main sur le banc, dos plat, haltère dans l’autre main.', 'Tire l’haltère vers la hanche, coude près du corps.', 'Redescends bras tendu en contrôlant.'], erreurs: ['Tourner le buste pour monter la charge.', 'Tirer vers l’épaule au lieu de la hanche.'], facile: 'Bent Over Row (Dumbbell)', dur: 'Inverted Row' },
  'Inverted Row': { muscles: 'Dos, biceps, arrière des épaules', steps: ['Allongé sous les barres de dips, mains sur les barres, talons au sol, corps droit.', 'Tire la poitrine jusqu’aux mains en serrant les omoplates.', 'Redescends bras tendus en gardant le corps gainé.'], erreurs: ['Laisser les hanches tomber.', 'Tirer avec le menton en avant.'], facile: 'Bent Over Row (Band)', dur: 'Inverted Row (Feet Elevated)' },
  'Inverted Row (Feet Elevated)': { muscles: 'Dos, biceps', steps: ['Suspendu sous les barres de dips, pieds posés sur le banc.', 'Tire la poitrine jusqu’aux mains, corps droit comme une planche.', 'Redescends bras tendus en contrôlant.'], erreurs: ['Laisser les hanches tomber.', 'Raccourcir le mouvement en bas.'], facile: 'Inverted Row', dur: 'Archer Row' },
  'Archer Row': { muscles: 'Dos, biceps, un côté après l’autre', steps: ['Suspendu sous les barres, prise large.', 'Tire vers une main pendant que l’autre bras reste presque tendu.', 'Redescends, puis change de côté.'], erreurs: ['Tirer autant avec le bras qui doit seulement accompagner.', 'Tourner les hanches.'], facile: 'Inverted Row (Feet Elevated)', dur: 'One Arm Inverted Row' },
  'One Arm Inverted Row': { muscles: 'Dos, biceps, gainage', steps: ['Suspendu d’une seule main, pieds écartés pour la stabilité.', 'Tire la poitrine vers la main sans tourner le buste.', 'Redescends lentement, bras tendu en bas.'], erreurs: ['Tourner tout le corps pour tricher.', 'Plier les hanches.'], facile: 'Archer Row', dur: 'One Arm Inverted Row' },
  'Band Pull Apart': { muscles: 'Arrière des épaules, haut du dos', steps: ['Debout, élastique tenu à deux mains devant toi, bras tendus à hauteur d’épaules.', 'Écarte les bras jusqu’à toucher la poitrine avec l’élastique.', 'Reviens lentement sans laisser l’élastique claquer.'], erreurs: ['Plier les coudes.', 'Hausser les épaules.'], facile: 'Face Pull (Band)', dur: 'Reverse Fly (Dumbbell)' },
  'Face Pull (Band)': { muscles: 'Arrière des épaules, haut du dos, rotateurs', steps: ['Élastique accroché à hauteur de visage (porte ou station), tiens-le bras tendus.', 'Tire vers ton visage en écartant les mains, coudes hauts.', 'Reviens lentement.'], erreurs: ['Tirer vers le ventre au lieu du visage.', 'Se pencher en arrière.'], facile: 'Band Pull Apart', dur: 'Reverse Fly (Dumbbell)' },
  'Reverse Fly (Dumbbell)': { muscles: 'Arrière des épaules, haut du dos', steps: ['Buste penché, dos plat, haltères sous la poitrine.', 'Ouvre les bras sur les côtés, coudes légèrement pliés.', 'Serre les omoplates en haut, redescends lentement.'], erreurs: ['Monter avec un élan.', 'Prendre trop lourd : 10 kg c’est déjà beaucoup, commence plus léger si besoin.'], facile: 'Band Pull Apart', dur: 'Bent Over Row (Dumbbell)' },
  'Dumbbell Pullover': { muscles: 'Grand dorsal, pectoraux', steps: ['Allongé sur le banc, un haltère tenu à deux mains au-dessus de la poitrine.', 'Descends l’haltère derrière la tête, bras presque tendus.', 'Ramène-le au-dessus de la poitrine en gardant les bras fixes.'], erreurs: ['Plier les coudes pendant le mouvement.', 'Cambrer le dos en bas.'], facile: 'Superman', dur: 'Dumbbell Row' },
  'Superman': { muscles: 'Bas du dos, fessiers, arrière des épaules', steps: ['Allongé sur le ventre, bras tendus devant.', 'Décolle en même temps bras, poitrine et jambes.', 'Tiens une seconde, redescends doucement.'], erreurs: ['Lever la tête vers le plafond : regarde le sol.', 'Faire de grands à-coups.'], facile: 'Glute Bridge', dur: 'Dumbbell Pullover' },
  // ---------- Bras ----------
  'Bicep Curl (Dumbbell)': { muscles: 'Biceps', steps: ['Debout, haltères le long du corps, paumes vers l’avant.', 'Plie les coudes pour monter les haltères vers les épaules.', 'Redescends lentement, bras presque tendus.'], erreurs: ['Avancer les coudes ou balancer le dos.', 'Redescendre trop vite.'], facile: 'Bicep Curl (Band)', dur: 'Hammer Curl (Dumbbell)' },
  'Hammer Curl (Dumbbell)': { muscles: 'Biceps, avant-bras', steps: ['Debout, haltères le long du corps, paumes face à face.', 'Monte les haltères en gardant les poignets droits.', 'Redescends lentement.'], erreurs: ['Se balancer pour monter.', 'Lever les coudes.'], facile: 'Bicep Curl (Band)', dur: 'Bicep Curl (Dumbbell)' },
  'Bicep Curl (Band)': { muscles: 'Biceps', steps: ['Pieds sur l’élastique, une poignée dans chaque main.', 'Monte les mains vers les épaules, coudes collés au corps.', 'Redescends en freinant l’élastique.'], erreurs: ['Laisser l’élastique ramener les mains d’un coup.', 'Avancer les coudes.'], facile: 'Bicep Curl (Band)', dur: 'Bicep Curl (Dumbbell)' },
  'Triceps Extension (Dumbbell)': { muscles: 'Triceps (longue portion)', steps: ['Debout ou assis, un haltère tenu à deux mains au-dessus de la tête.', 'Descends l’haltère derrière la tête en pliant les coudes.', 'Remonte en tendant les bras, coudes vers le plafond.'], erreurs: ['Écarter les coudes.', 'Cambrer le dos.'], facile: 'Bench Dip', dur: 'Skullcrusher (Dumbbell)' },
  'Skullcrusher (Dumbbell)': { muscles: 'Triceps', steps: ['Allongé sur le banc, haltères au-dessus de toi, bras tendus.', 'Plie seulement les coudes pour descendre les haltères près de la tête.', 'Remonte en tendant les bras.'], erreurs: ['Bouger les épaules : seuls les avant-bras bougent.', 'Descendre trop vite près du visage.'], facile: 'Triceps Extension (Dumbbell)', dur: 'Diamond Push Up' },
  'Triceps Kickback (Dumbbell)': { muscles: 'Triceps', steps: ['Buste penché, coude collé au corps et plié à angle droit.', 'Tends le bras vers l’arrière jusqu’à ce qu’il soit droit.', 'Reviens lentement à l’angle droit.'], erreurs: ['Bouger le coude.', 'Balancer l’haltère.'], facile: 'Bench Dip', dur: 'Triceps Extension (Dumbbell)' },
  'Farmers Walk': { muscles: 'Avant-bras, trapèzes, gainage', steps: ['Un haltère dans chaque main, épaules basses, dos droit.', 'Marche à petits pas réguliers.', 'Pose les haltères en pliant les jambes.'], erreurs: ['Pencher d’un côté.', 'Hausser les épaules.'], facile: 'Hammer Curl (Dumbbell)', dur: 'Farmers Walk' },
  // ---------- Jambes ----------
  'Squat (Bodyweight)': { muscles: 'Cuisses, fessiers', steps: ['Pieds largeur d’épaules, pointes légèrement ouvertes.', 'Descends les fesses en arrière jusqu’à passer sous les genoux.', 'Remonte en poussant dans les talons.'], erreurs: ['Décoller les talons.', 'Arrondir le dos.', 'Laisser les genoux rentrer vers l’intérieur.'], facile: 'Wall Sit', dur: 'Goblet Squat' },
  'Goblet Squat': { muscles: 'Cuisses, fessiers, gainage', steps: ['Un haltère tenu contre la poitrine, coudes vers le bas.', 'Descends entre tes genoux, buste droit.', 'Remonte en poussant dans les talons.'], erreurs: ['Pencher le buste en avant.', 'Laisser l’haltère s’éloigner du corps.'], facile: 'Squat (Bodyweight)', dur: 'Bulgarian Split Squat (Dumbbell)' },
  'Jump Squat': { muscles: 'Cuisses, fessiers, mollets, explosivité', steps: ['Descends en squat, bras en arrière.', 'Saute le plus haut possible en lançant les bras.', 'Atterris sur l’avant des pieds, genoux souples, et redescends tout de suite.'], erreurs: ['Atterrir jambes tendues.', 'Laisser les genoux rentrer à l’atterrissage.'], facile: 'Squat (Bodyweight)', dur: 'Tuck Jump' },
  'Lunge': { muscles: 'Cuisses, fessiers', steps: ['Debout, fais un grand pas en avant.', 'Descends jusqu’à frôler le sol avec le genou arrière.', 'Repousse sur la jambe avant pour revenir debout.'], erreurs: ['Genou avant qui dépasse loin devant les orteils.', 'Pas trop court.'], facile: 'Reverse Lunge', dur: 'Bulgarian Split Squat (Dumbbell)' },
  'Reverse Lunge': { muscles: 'Cuisses, fessiers', steps: ['Debout, haltères le long du corps si tu es lesté.', 'Recule un pied et descends jusqu’à frôler le sol avec le genou arrière.', 'Reviens debout en poussant sur la jambe avant.'], erreurs: ['Pencher le buste en avant.', 'Cogner le genou au sol.'], facile: 'Squat (Bodyweight)', dur: 'Bulgarian Split Squat (Dumbbell)' },
  'Jumping Lunge': { muscles: 'Cuisses, fessiers, explosivité, cardio', steps: ['Pars en fente, genou arrière près du sol.', 'Saute et change de jambe en l’air.', 'Atterris directement en fente, genoux souples.'], erreurs: ['Atterrir genou arrière contre le sol.', 'Perdre l’équilibre : commence lentement.'], facile: 'Reverse Lunge', dur: 'Jump Squat' },
  'Bulgarian Split Squat (Dumbbell)': { muscles: 'Cuisses, fessiers', steps: ['Dos au banc, pose le dessus d’un pied dessus, l’autre pied loin devant.', 'Descends sur la jambe avant jusqu’à ce que la cuisse soit à plat.', 'Remonte en poussant dans le talon avant.'], erreurs: ['Pied avant trop près du banc.', 'Pousser avec la jambe arrière.'], facile: 'Reverse Lunge', dur: 'Pistol Squat' },
  'Step Up': { muscles: 'Cuisses, fessiers', steps: ['Face au banc, pose un pied entier dessus.', 'Monte en poussant sur ce pied, sans t’aider de l’autre jambe.', 'Redescends doucement, puis change de jambe.'], erreurs: ['Pousser avec le pied resté au sol.', 'Laisser le genou rentrer.'], facile: 'Squat (Bodyweight)', dur: 'Bulgarian Split Squat (Dumbbell)' },
  'Cossack Squat': { muscles: 'Cuisses, adducteurs, souplesse', steps: ['Pieds très écartés.', 'Descends sur une jambe pendant que l’autre reste tendue, pointe vers le haut.', 'Remonte au milieu, puis descends de l’autre côté.'], erreurs: ['Décoller le talon de la jambe pliée.', 'Arrondir le dos.'], facile: 'Squat (Bodyweight)', dur: 'Pistol Squat' },
  'Assisted Pistol Squats': { muscles: 'Cuisses, fessiers, équilibre', steps: ['Tiens un appui d’une main, une jambe tendue devant toi.', 'Descends sur l’autre jambe le plus bas possible, talon au sol.', 'Remonte en t’aidant le moins possible de la main.'], erreurs: ['Tirer fort avec le bras au lieu de pousser avec la jambe.', 'Décoller le talon.'], facile: 'Bulgarian Split Squat (Dumbbell)', dur: 'Pistol Squat' },
  'Pistol Squat': { muscles: 'Cuisses, fessiers, équilibre', steps: ['Debout sur une jambe, l’autre tendue devant, bras en avant.', 'Descends lentement jusqu’en bas, talon collé au sol.', 'Remonte sans poser l’autre pied.'], erreurs: ['Décoller le talon.', 'Laisser le genou rentrer vers l’intérieur.'], facile: 'Assisted Pistol Squats', dur: 'Pistol Squat' },
  'Romanian Deadlift (Dumbbell)': { muscles: 'Arrière des cuisses, fessiers, bas du dos', steps: ['Debout, haltères devant les cuisses, genoux à peine pliés.', 'Pousse les fesses en arrière en descendant les haltères le long des jambes, dos plat.', 'Remonte en serrant les fessiers.'], erreurs: ['Arrondir le dos.', 'Plier les genoux comme un squat.'], facile: 'Glute Bridge', dur: 'Hip Thrust' },
  'Glute Bridge': { muscles: 'Fessiers, arrière des cuisses', steps: ['Allongé sur le dos, pieds à plat près des fesses.', 'Monte les hanches jusqu’à aligner genoux, hanches et épaules.', 'Serre les fessiers une seconde en haut, redescends.'], erreurs: ['Cambrer le bas du dos en haut.', 'Pousser sur la pointe des pieds au lieu des talons.'], facile: 'Superman', dur: 'Single Leg Glute Bridge' },
  'Single Leg Glute Bridge': { muscles: 'Fessiers, arrière des cuisses', steps: ['Allongé sur le dos, un pied au sol, l’autre jambe tendue en l’air.', 'Monte les hanches en poussant dans le talon au sol.', 'Garde le bassin bien droit, redescends lentement.'], erreurs: ['Laisser un côté du bassin tomber.', 'Aller trop vite.'], facile: 'Glute Bridge', dur: 'Hip Thrust' },
  'Hip Thrust': { muscles: 'Fessiers, arrière des cuisses', steps: ['Haut du dos contre le bord du banc, pieds au sol, haltère ou gilet sur les hanches.', 'Pousse les hanches vers le haut jusqu’à faire une table.', 'Serre les fessiers en haut, redescends en contrôlant.'], erreurs: ['Cambrer le dos au lieu de monter les hanches.', 'Pieds trop loin.'], facile: 'Glute Bridge', dur: 'Single Leg Glute Bridge' },
  'Wall Sit': { muscles: 'Cuisses', steps: ['Dos collé au mur, descends jusqu’à avoir les cuisses à plat.', 'Genoux au-dessus des chevilles, bras libres.', 'Tiens en respirant.'], erreurs: ['Poser les mains sur les cuisses pour se soulager.', 'Rester trop haut.'], facile: 'Squat (Bodyweight)', dur: 'Pistol Squat' },
  'Standing Calf Raise (Dumbbell)': { muscles: 'Mollets', steps: ['Debout, avant des pieds sur une marche, talons dans le vide.', 'Monte le plus haut possible sur la pointe des pieds.', 'Redescends lentement sous le niveau de la marche.'], erreurs: ['Rebondir en bas au lieu de contrôler.', 'Plier les genoux.'], facile: 'Jumping Jack', dur: 'Single Leg Standing Calf Raise' },
  'Single Leg Standing Calf Raise': { muscles: 'Mollets', steps: ['Sur une jambe, avant du pied sur la marche, une main au mur.', 'Monte sur la pointe le plus haut possible.', 'Redescends lentement, talon sous la marche.'], erreurs: ['Aller trop vite.', 'Faire une demi-amplitude.'], facile: 'Standing Calf Raise (Dumbbell)', dur: 'Broad Jump' },
  'Broad Jump': { muscles: 'Cuisses, fessiers, mollets, explosivité', steps: ['Pieds largeur de hanches, descends en lançant les bras en arrière.', 'Saute le plus loin possible vers l’avant en lançant les bras.', 'Atterris jambes fléchies et tiens l’atterrissage avant de recommencer.'], erreurs: ['Atterrir jambes raides.', 'Enchaîner sans s’arrêter : chaque saut est un effort maximum.'], facile: 'Jump Squat', dur: 'Tuck Jump' },
  // ---------- Gainage ----------
  'Plank': { muscles: 'Abdominaux, gainage', steps: ['Avant-bras au sol, coudes sous les épaules.', 'Corps aligné, fesses et abdominaux serrés.', 'Respire normalement et tiens la position.'], erreurs: ['Monter les fesses ou creuser le dos.', 'Bloquer sa respiration.'], facile: 'Dead Bug', dur: 'Hollow Hold' },
  'Side Plank': { muscles: 'Obliques, gainage', steps: ['Sur le côté, avant-bras au sol sous l’épaule, pieds l’un sur l’autre.', 'Monte les hanches pour faire une ligne droite.', 'Tiens, puis change de côté.'], erreurs: ['Laisser les hanches tomber.', 'Avancer les épaules.'], facile: 'Plank', dur: 'Russian Twist (Bodyweight)' },
  'Shoulder Taps': { muscles: 'Gainage, épaules', steps: ['Position haute de pompe, pieds écartés.', 'Touche une épaule avec la main opposée sans bouger les hanches.', 'Repose la main et change de côté.'], erreurs: ['Balancer les hanches de gauche à droite.', 'Aller trop vite.'], facile: 'Plank', dur: 'Mountain Climber' },
  'Mountain Climber': { muscles: 'Gainage, cuisses, cardio', steps: ['Position haute de pompe.', 'Ramène un genou vers la poitrine, puis l’autre, en alternant vite.', 'Garde les fesses basses et les épaules au-dessus des mains.'], erreurs: ['Monter les fesses.', 'Ne pas ramener le genou assez loin.'], facile: 'Shoulder Taps', dur: 'Burpee' },
  'Hollow Hold': { muscles: 'Abdominaux profonds', steps: ['Allongé sur le dos, bas du dos plaqué au sol.', 'Décolle les épaules et les jambes tendues, bras derrière la tête.', 'Tiens la forme de banane en respirant.'], erreurs: ['Laisser le bas du dos se décoller du sol.', 'Monter les jambes trop haut, ce qui rend l’exercice trop facile.'], facile: 'Dead Bug', dur: 'Hollow Rock' },
  'Hollow Rock': { muscles: 'Abdominaux profonds', steps: ['Allongé sur le dos, bas du dos plaqué au sol, bras derrière la tête.', 'Décolle les épaules et les jambes pour former une banane.', 'Balance doucement d’avant en arrière sans casser la forme.'], erreurs: ['Laisser le bas du dos se décoller du sol.', 'Plier aux hanches pendant le balancement.'], facile: 'Hollow Hold', dur: 'Dragon Flag' },
  'Crunch': { muscles: 'Abdominaux (haut)', steps: ['Allongé, genoux pliés, pieds au sol.', 'Enroule le haut du dos pour décoller les épaules, regard vers les genoux.', 'Redescends lentement.'], erreurs: ['Tirer sur la nuque avec les mains.', 'Se relever en entier : seules les épaules décollent.'], facile: 'Dead Bug', dur: 'V Up' },
  'Dead Bug': { muscles: 'Abdominaux profonds, coordination', steps: ['Allongé sur le dos, bras vers le plafond, genoux au-dessus des hanches.', 'Tends un bras derrière la tête et la jambe opposée, sans toucher le sol.', 'Reviens et change de côté.'], erreurs: ['Décoller le bas du dos du sol.', 'Aller trop vite.'], facile: 'Plank', dur: 'Hollow Hold' },
  'Lying Leg Raise': { muscles: 'Abdominaux (bas), fléchisseurs de hanche', steps: ['Allongé sur le dos, mains sous les fesses, jambes tendues.', 'Monte les jambes jusqu’à la verticale.', 'Redescends lentement sans toucher le sol.'], erreurs: ['Creuser le bas du dos en descendant.', 'Laisser retomber les jambes.'], facile: 'Dead Bug', dur: 'Hanging Leg Raise' },
  'Knee Raise (Dip Station)': { muscles: 'Abdominaux, fléchisseurs de hanche', steps: ['En appui bras tendus sur la station de dips, dos contre le dossier si tu en as un.', 'Monte les genoux vers la poitrine en enroulant le bassin.', 'Redescends lentement sans balancer.'], erreurs: ['Se balancer pour monter.', 'Hausser les épaules.'], facile: 'Lying Leg Raise', dur: 'Hanging Leg Raise' },
  'Hanging Leg Raise': { muscles: 'Abdominaux, fléchisseurs de hanche', steps: ['En appui bras tendus sur la station, épaules basses.', 'Monte les jambes tendues devant toi jusqu’à l’horizontale.', 'Redescends lentement, sans élan.'], erreurs: ['Se servir du balancement pour monter.', 'Plier les genoux en fin de série.'], facile: 'Knee Raise (Dip Station)', dur: 'Dragon Flag' },
  'V Up': { muscles: 'Abdominaux complets', steps: ['Allongé, bras tendus derrière la tête, jambes tendues.', 'Monte en même temps le buste et les jambes pour toucher tes pieds.', 'Redescends lentement sans te poser complètement.'], erreurs: ['Plier les jambes.', 'Retomber lourdement.'], facile: 'Crunch', dur: 'Dragon Flag' },
  'Russian Twist (Bodyweight)': { muscles: 'Obliques, abdominaux', steps: ['Assis, buste incliné en arrière, pieds décollés si tu peux.', 'Tourne les épaules d’un côté puis de l’autre, le poids suit les mains.', 'Garde le dos droit et un rythme régulier.'], erreurs: ['Bouger seulement les bras sans tourner le buste.', 'Arrondir le dos.'], facile: 'Side Plank', dur: 'V Up' },
  'Dragon Flag': { muscles: 'Abdominaux, gainage complet', steps: ['Allongé sur le banc, attrape le banc derrière ta tête.', 'Monte tout le corps bien droit, en appui sur le haut du dos.', 'Redescends le corps d’un bloc, lentement, sans plier les hanches.'], erreurs: ['Plier au niveau des hanches : commence par la descente seule.', 'Poser le bas du dos trop tôt.'], facile: 'Hanging Leg Raise', dur: 'Dragon Flag' },
  // ---------- Cardio ----------
  'Jumping Jack': { muscles: 'Cardio, mollets, épaules', steps: ['Debout, pieds joints, bras le long du corps.', 'Saute en écartant les pieds et en montant les bras au-dessus de la tête.', 'Saute pour revenir pieds joints, et enchaîne.'], erreurs: ['Atterrir sur les talons.', 'Faire les bras à moitié.'], facile: 'High Knees', dur: 'High Knees' },
  'High Knees': { muscles: 'Cardio, cuisses, gainage', steps: ['Cours sur place en montant les genoux à hauteur de hanches.', 'Reste sur l’avant des pieds, bras qui accompagnent.', 'Garde le buste droit.'], erreurs: ['Se pencher en arrière.', 'Monter les genoux de moins en moins.'], facile: 'Jumping Jack', dur: 'Burpee' },
  'Burpee': { muscles: 'Tout le corps, cardio', steps: ['Debout, accroupis-toi et pose les mains au sol.', 'Lance les pieds en arrière en planche, fais une pompe si tu veux.', 'Ramène les pieds et saute bras en l’air.'], erreurs: ['Creuser le dos en planche.', 'Ne pas sauter vraiment à la fin.'], facile: 'Mountain Climber', dur: 'Tuck Jump' },
  'Tuck Jump': { muscles: 'Cuisses, abdominaux, explosivité', steps: ['Debout, descends un peu et saute.', 'En l’air, ramène les genoux vers la poitrine.', 'Atterris souplement et enchaîne.'], erreurs: ['Atterrir jambes tendues.', 'Pencher le buste vers les genoux au lieu de monter les genoux.'], facile: 'Jump Squat', dur: 'Broad Jump' },
  'Running': { muscles: 'Jambes, cœur', steps: ['Commence par 5 minutes tranquilles.', 'Garde un rythme où tu peux encore parler en courtes phrases.', 'Finis par quelques minutes au pas.'], erreurs: ['Partir trop vite.', 'Faire de trop grands pas : petits pas rapides.'] },
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

// Nouveautés affichées une fois après chaque mise à jour (la plus récente en premier).
// À chaque version : augmenter VERSION dans ui.js et dans sw.js, puis ajouter un bloc ici.
export const NEWS = [
  { v: 14, items: [
    'Programme guidé : l’app choisit ta séance du jour (pompes et épaules, jambes et gainage, dips et dos, complet), à tour de rôle',
    'Cycles de 4 semaines : 3 semaines où ça monte, puis une semaine de re-test pour mettre à jour tes lettres',
    'Séance d’environ 45 min, en version courte ou en grosse séance quand tu as l’énergie',
    'Les exercices principaux passent tout seuls à leur version plus dure quand tu atteins le cap',
    'Tes routines Full Body A et B restent dans « Mes routines », en secours',
  ] },
  { v: 13, items: [
    'Nouveau bip, plus doux : deux notes de clochette au lieu de trois bips secs',
    'Plus de bip en retard : si tu étais sur une autre app à la fin du repos, l’app ne sonne plus quand tu reviens',
  ] },
  { v: 12, items: [
    'Le bip est refait : il passe par un vrai lecteur audio, plus fiable sur iPhone, et sonne même en mode silencieux',
    'Nouveau réglage « Bip discret » si tu veux garder ta musique pendant la séance',
  ] },
  { v: 11, items: [
    'Ascension 2, première étape : tes 5 qualités (force, explosivité, vitesse, endurance, maîtrise du corps), notées de E à Z',
    'Nouvelle carte de rang dans Progrès, avec l’étoile de tes qualités : ton rang est maintenant la moyenne de tes 5 lettres',
    'Les lettres tiennent compte de ton poids et de ton âge (à remplir dans les réglages)',
    '93 exercices, dont 15 sortes de pompes et 8 de dips, chacun avec une image animée',
    'Le choix d’exercice se fait en images, rangées par famille',
    'Chaque fiche dit comment faire, les erreurs fréquentes, et une version plus facile ou plus dure',
    'Le bip sonne même en mode silencieux, avec un bouton pour tester le son dans les réglages',
  ] },
  { v: 10, items: [
    'Mises à jour fiables : l’app vérifie elle-même s’il y a une nouvelle version à chaque ouverture',
    'Bouton « Mettre à jour » dans les réglages, qui force le téléchargement',
    'Nouvel accueil : la séance à faire en grand, deux tuiles pour le rang et la course',
    'Recherche libre dans l’historique : une séance, un exercice, un mois',
    'La course n’est plus un onglet : elle est dans Séance et sur l’accueil',
    'Les réglages sont dans la barre du bas',
    'Plus de zoom par erreur ni de double validation quand tu tapes vite',
  ] },
  { v: 9, items: [
    'Nouvel accueil : la séance à faire en grand, deux tuiles pour le rang et la course',
    'Recherche libre dans l’historique : une séance, un exercice, un mois',
    'La course n’est plus un onglet : elle est dans Séance et sur l’accueil',
    'Les réglages sont dans la barre du bas',
    'Plus de zoom par erreur quand tu tapes vite sur plus, moins ou valider',
    'Deux appuis rapides ne valident plus deux séries d’un coup',
    'La recherche d’exercice s’ouvre en plein écran, au-dessus du clavier',
  ] },
  { v: 8, items: [
    'Chrono intégré pour les exercices en secondes, avec un bip à l’objectif',
    'Note sur chaque exercice, reprise automatiquement la fois suivante',
    'Ressenti en fin de séance : facile, bien ou dur',
    'Image de ta séance à partager',
    'Objectif de séances par semaine, avec une quête à 150 XP',
    'Tableau de tes records dans l’onglet Progrès',
    'Filtres et bilan de chaque mois dans l’historique',
    'Date et heure modifiables pour une séance ou une course',
    'Dupliquer une routine',
    'Alerte s’il reste des séries quand tu termines',
    'Son du repos réglable, numéro de version et bouton de mise à jour dans les réglages',
    'Arbres de progression réduits à trois : pompes, dips et course',
  ] },
];
