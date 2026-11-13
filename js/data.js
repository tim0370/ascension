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

// Rangs : niveau minimum pour chaque rang (les examens de rang viendront remplacer cette règle).
export const RANKS = [
  { letter: 'E', name: 'Initié', min: 1 },
  { letter: 'D', name: 'Confirmé', min: 10 },
  { letter: 'C', name: 'Aguerri', min: 20 },
  { letter: 'B', name: 'Expert', min: 35 },
  { letter: 'A', name: 'Élite', min: 50 },
  { letter: 'S', name: 'Légende', min: 70 },
];
