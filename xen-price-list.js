/* Enhance the one source of plan details; no duplicate fee data or shared UI changes. */
(() => {
  'use strict';
  document.querySelectorAll('.price-list-page .price-table').forEach(table => {
    const controls = [...table.querySelectorAll('.price-toggle')];
    const plans = controls.map(button => ({
      button,
      panel: document.getElementById(button.getAttribute('aria-controls')),
      row: button.closest('tr')
    }));
    if (plans.some(plan => !plan.panel || !plan.row)) return;
    const setOpen = (plan, open) => {
      plan.button.setAttribute('aria-expanded', String(open));
      plan.row.classList.toggle('is-open', open);
      plan.panel.classList.toggle('is-open', open);
      plan.panel.setAttribute('aria-hidden', String(!open));
      plan.panel.inert = !open;
    };
    plans.forEach(plan => {
      setOpen(plan, false);
      plan.button.disabled = false;
      plan.row.addEventListener('click', () => {
        setOpen(plan, plan.button.getAttribute('aria-expanded') !== 'true');
      });
    });
    table.classList.add('price-ready');
  });
})();
