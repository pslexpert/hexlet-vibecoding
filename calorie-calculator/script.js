const GOAL_ADJUSTMENTS = {
  lose: { delta: -500, label: 'Норма калорий для снижения веса' },
  maintain: { delta: 0, label: 'Норма калорий для поддержания веса' },
  gain: { delta: 500, label: 'Норма калорий для набора веса' },
};

const MACRO_SPLIT = {
  protein: { ratio: 0.3, kcalPerGram: 4 },
  fat: { ratio: 0.25, kcalPerGram: 9 },
  carbs: { ratio: 0.45, kcalPerGram: 4 },
};

function calculateBmr({ gender, age, weightKg, heightCm }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

function calculateMacros(calories) {
  const macros = {};
  for (const [name, { ratio, kcalPerGram }] of Object.entries(MACRO_SPLIT)) {
    macros[name] = Math.round((calories * ratio) / kcalPerGram);
  }
  return macros;
}

function formatKcal(value) {
  return `${Math.round(value)} ккал`;
}

function formatGrams(value) {
  return `${value} г`;
}

document.getElementById('calc-form').addEventListener('submit', (event) => {
  event.preventDefault();

  const gender = document.querySelector('input[name="gender"]:checked').value;
  const age = Number(document.getElementById('age').value);
  const weightKg = Number(document.getElementById('weight').value);
  const heightCm = Number(document.getElementById('height').value);
  const activityFactor = Number(document.getElementById('activity').value);
  const goal = document.getElementById('goal').value;

  const bmr = calculateBmr({ gender, age, weightKg, heightCm });
  const tdee = bmr * activityFactor;
  const { delta, label } = GOAL_ADJUSTMENTS[goal];
  const goalCalories = Math.max(tdee + delta, 0);
  const macros = calculateMacros(goalCalories);

  document.getElementById('bmr-value').textContent = formatKcal(bmr);
  document.getElementById('tdee-value').textContent = formatKcal(tdee);
  document.getElementById('goal-label').textContent = label;
  document.getElementById('goal-value').textContent = formatKcal(goalCalories);
  document.getElementById('protein-value').textContent = formatGrams(macros.protein);
  document.getElementById('fat-value').textContent = formatGrams(macros.fat);
  document.getElementById('carbs-value').textContent = formatGrams(macros.carbs);

  document.getElementById('result').classList.remove('hidden');
});
