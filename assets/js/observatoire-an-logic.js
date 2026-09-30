(function() {
  const raw = document.getElementById('observatoire-an-data');
  if (!raw) return;
  const DATA = JSON.parse(raw.textContent);
  const STATUTS = DATA.statuts, RECOS = DATA.recommandations;
  const ORDRE_STATUTS = ['reprise', 'partielle', 'attente'];

  // ── Synthèse : barre empilée + compteurs ──
  const summaryEl = document.getElementById('obs-summary');
  const counts = {};
  ORDRE_STATUTS.forEach(s => { counts[s] = RECOS.filter(r => r.statut === s).length; });
  const total = RECOS.length;
  summaryEl.innerHTML =
    '<div class="obs-bar" role="img" aria-label="' +
      ORDRE_STATUTS.map(s => counts[s] + ' ' + STATUTS[s].label.toLowerCase()).join(', ') + '">' +
      ORDRE_STATUTS.map(s =>
        '<div class="obs-bar-seg" style="width:' + (counts[s] / total * 100) + '%;background:' + STATUTS[s].couleur + '" title="' + counts[s] + ' — ' + STATUTS[s].label + '"></div>'
      ).join('') +
    '</div>' +
    '<div class="obs-stats">' +
      ORDRE_STATUTS.map(s =>
        '<div class="obs-stat"><span class="obs-stat-num" style="color:' + STATUTS[s].couleur + '">' + counts[s] + '</span>' +
        '<span class="obs-stat-label">' + STATUTS[s].label + '<br>(' + Math.round(counts[s] / total * 100) + '&nbsp;%)</span></div>'
      ).join('') +
    '</div>';

  // ── Filtres ──
  const filtersEl = document.getElementById('obs-filters');
  let statutFilter = '';
  filtersEl.innerHTML = '<button class="obs-chip active" data-statut="">Toutes (' + total + ')</button>' +
    ORDRE_STATUTS.map(s =>
      '<button class="obs-chip" data-statut="' + s + '"><span class="obs-chip-dot" style="background:' + STATUTS[s].couleur + '"></span>' + STATUTS[s].label + ' (' + counts[s] + ')</button>'
    ).join('');

  const searchInput = document.getElementById('obs-search');
  const gridEl = document.getElementById('obs-grid');
  const countEl = document.getElementById('obs-count');
  let searchTerm = '';

  function normalise(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function render() {
    const t = normalise(searchTerm.trim());
    const list = RECOS.filter(r => {
      if (statutFilter && r.statut !== statutFilter) return false;
      if (t && !(String(r.n) === t || normalise(r.titre).includes(t) || (r.suivi && normalise(r.suivi).includes(t)))) return false;
      return true;
    });
    countEl.textContent = list.length + ' recommandation' + (list.length > 1 ? 's' : '') + ' affichée' + (list.length > 1 ? 's' : '') + ' sur ' + total;
    if (!list.length) {
      gridEl.innerHTML = '<div class="votes-empty">Aucune recommandation ne correspond à ces critères.</div>';
      return;
    }
    gridEl.innerHTML = list.map(r => {
      const st = STATUTS[r.statut];
      return '<div class="obs-card" style="border-left-color:' + st.couleur + '">' +
        '<div class="obs-card-top">' +
          '<span class="obs-card-num">N°&nbsp;' + r.n + '</span>' +
          '<span class="obs-card-statut" style="background:' + st.couleur + '">' + st.label + '</span>' +
        '</div>' +
        '<p class="obs-card-titre">' + r.titre + '</p>' +
        (r.suivi ? '<p class="obs-card-axe">' + r.suivi + '</p>' : '') +
      '</div>';
    }).join('');
  }

  filtersEl.querySelectorAll('.obs-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      statutFilter = btn.dataset.statut;
      filtersEl.querySelectorAll('.obs-chip').forEach(b => b.classList.toggle('active', b === btn));
      render();
      if (typeof umami !== 'undefined') umami.track('observatoire_an_filtre_statut');
    });
  });
  searchInput.addEventListener('input', () => { searchTerm = searchInput.value; render(); });
  render();
})();
