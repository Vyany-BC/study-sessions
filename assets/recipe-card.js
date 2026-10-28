// Recipe card prototype, based on the Figma component "Recipe Card".
// Data below comes from the CS 331 meal planner database (calories per serving = SUM(grams * kcal_100g / 100) / servings).
const RECIPES = [
  { id: 1, meal: 'Breakfast', badge: 'breakfast', name: 'Almond berry parfait', time: '10 min', level: 'Easy', kcal: 507, ingredients: 'Blueberries, Strawberry, Almonds +2 more' },
  { id: 2, meal: 'Lunch / Dinner', badge: '', name: 'Chicken-Tortilla soup', time: '60 min', level: 'Medium', kcal: 451, ingredients: 'Dried ancho chiles, Avocado +15 more' },
  { id: 3, meal: 'Dessert', badge: 'dessert', name: 'Rice Pudding', time: '30 min', level: 'Medium', kcal: 372, ingredients: 'White Rice, Milk, Condensed milk +2 more' },
];
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

// State per card: favorite is independent of status (idle -> menu -> added).
const state = new Map(RECIPES.map(r => [r.id, { favorite: false, status: 'idle', slot: null }]));

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function cardHTML(r) {
  const s = state.get(r.id);
  const added = s.status === 'added';
  return `
  <article class="recipe-card" data-id="${r.id}" data-status="${s.status}">
    <div class="recipe-card__header">
      <span class="badge ${r.badge ? 'badge--' + r.badge : ''}">${esc(r.meal)}</span>
      <button class="fav" type="button" data-action="favorite" aria-pressed="${s.favorite}" aria-label="${s.favorite ? 'Remove from favorites' : 'Add to favorites'}">
        <img src="assets/icons/${s.favorite ? 'heart-filled' : 'heart'}.svg" alt="" width="18" height="18">
      </button>
    </div>
    <h2 class="recipe-card__title">${esc(r.name)}</h2>
    <ul class="chips"><li>${esc(r.time)}</li><li>${esc(r.level)}</li><li>${r.kcal} kcal / serving</li></ul>
    <p class="ingredients">${esc(r.ingredients)}</p>
    <hr class="divider">
    <div class="actions">
      <button class="btn btn--primary" type="button" data-action="${added ? 'noop' : 'open-menu'}" ${added ? 'aria-disabled="true"' : ''}>${added ? 'Added to plan' : 'Add to plan'}</button>
      <button class="btn btn--secondary" type="button" data-action="${added ? 'undo' : 'view'}">${added ? 'Undo' : 'View recipe'}</button>
    </div>
    <div class="options" role="group" aria-label="Choose a meal" ${s.status === 'menu' ? '' : 'hidden'}>
      <p class="options__title">Add to which meal?</p>
      ${MEALS.map(m => `<button class="option" type="button" data-action="choose" data-meal="${m}">${m}</button>`).join('')}
      <button class="option option--cancel" type="button" data-action="cancel">Cancel</button>
    </div>
    ${added && s.slot ? `<p class="ingredients" role="status">Added to ${esc(s.slot)}.</p>` : ''}
  </article>`;
}

const grid = document.getElementById('recipe-grid');
function render(focusId, focusAction) {
  grid.innerHTML = RECIPES.map(cardHTML).join('');
  if (focusId) {
    const el = grid.querySelector(`[data-id="${focusId}"] [data-action="${focusAction}"]`);
    if (el) el.focus();
  }
}

grid.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.closest('[data-id]').dataset.id);
  const s = state.get(id);
  switch (btn.dataset.action) {
    case 'favorite': s.favorite = !s.favorite; render(id, 'favorite'); break;
    case 'open-menu': s.status = 'menu'; render(id, 'choose'); break;
    case 'choose': s.status = 'added'; s.slot = btn.dataset.meal; render(id, 'undo'); break;
    case 'cancel': s.status = 'idle'; s.slot = null; render(id, 'open-menu'); break;
    case 'undo': s.status = 'idle'; s.slot = null; render(id, 'open-menu'); break;
    default: break; // 'view' and 'noop' are placeholders
  }
});

render();
