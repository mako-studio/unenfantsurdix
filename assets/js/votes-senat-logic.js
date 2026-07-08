(function() {
  const raw = document.getElementById('senat-votes-data');
  if (!raw) return;
  const DATA = JSON.parse(raw.textContent);
  const groupes = DATA.groupes, senateurs = DATA.senateurs, scrutins = DATA.scrutins, votes = DATA.votes;
  const scrutinUids = DATA.meta.ordre;

  const posLabel = { P: 'Pour', C: 'Contre', A: 'Abstention', N: 'N’a pas pris part au vote (catégorie officielle, absence comprise)' };
  const NO_KEY = 'Pas encore en fonction à cette date, ou position non publiée';

  const selGroupe = document.getElementById('senat-filter-groupe');
  Object.keys(groupes).sort((a,b) => groupes[a].nom.localeCompare(groupes[b].nom)).forEach(code => {
    const opt = document.createElement('option');
    opt.value = code; opt.textContent = groupes[code].nom + ' (' + code + ')';
    selGroupe.appendChild(opt);
  });

  const selScrutin = document.getElementById('senat-chart-select');
  scrutinUids.forEach(uid => {
    const s = scrutins[uid];
    const opt = document.createElement('option');
    opt.value = uid;
    let titre = s.titre.replace(/^sur l['’]ensemble de la /i, '').replace(/^sur l['’]ensemble du /i, '');
    opt.textContent = s.date + ' — ' + (titre.length > 110 ? titre.slice(0, 110) + '…' : titre);
    selScrutin.appendChild(opt);
  });

  const listEl = document.getElementById('senat-scrutins-list');
  scrutinUids.forEach(uid => {
    const s = scrutins[uid];
    const li = document.createElement('li');
    li.textContent = s.date + ' — ' + s.titre + ' (' + s.synthese.pour + ' pour, ' + s.synthese.contre + ' contre, ' +
      s.synthese.abstentions + ' abst., ' + s.synthese.nppv + ' n’ont pas pris part au vote — ' + s.sort + ')' +
      (s.miseAuPoint ? ' — une mise au point a été publiée en séance' : '');
    listEl.appendChild(li);
  });

  function escAttr(str) { return String(str).replace(/"/g, '&quot;'); }

  function fingerprint(mat) {
    return scrutinUids.map(uid => {
      const pos = votes[uid][mat] || null;
      const s = scrutins[uid];
      const label = pos ? posLabel[pos] : NO_KEY;
      return '<span class="vote-pill ' + (pos || 'X') + '" title="' + escAttr(s.date + ' — ' + s.titre + ' — ' + label) + '"></span>';
    }).join('');
  }

  function detailRows(mat) {
    return scrutinUids.map(uid => {
      const pos = votes[uid][mat];
      const s = scrutins[uid];
      const label = pos ? posLabel[pos].split(' (')[0] : NO_KEY;
      return '<div class="vote-card-detail-row"><span>' + s.date + ' — ' + s.titre + '</span>' +
        '<span class="vote-card-detail-pos ' + (pos || 'X') + '">' + label + '</span></div>';
    }).join('');
  }

  const grid = document.getElementById('senat-grid');
  const countEl = document.getElementById('senat-count');
  const total = Object.keys(senateurs).length;
  let searchTerm = '', groupeFilter = '';

  function normalise(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function matchesSearch(d) {
    if (!searchTerm) return true;
    const t = normalise(searchTerm.trim());
    return normalise(d.nom).includes(t) || normalise(d.dept).includes(t);
  }

  function render() {
    const mats = Object.keys(senateurs).filter(mat => {
      const d = senateurs[mat];
      if (groupeFilter && d.groupe !== groupeFilter) return false;
      return matchesSearch(d);
    }).sort((a,b) => senateurs[a].nom.localeCompare(senateurs[b].nom));

    countEl.textContent = mats.length + ' sénateur·rice' + (mats.length > 1 ? 's' : '') + ' affiché·e' + (mats.length > 1 ? 's' : '') + ' sur ' + total;

    if (mats.length === 0) {
      grid.innerHTML = '<div class="votes-empty">Aucun·e sénateur·rice ne correspond à cette recherche. Essayez un nom ou un nom de département (ex. « Isère »).</div>';
      return;
    }

    const isFiltering = !!(searchTerm || groupeFilter);
    const display = isFiltering ? mats : mats.slice(0, 24);
    grid.innerHTML = display.map(mat => {
      const d = senateurs[mat];
      const g = groupes[d.groupe] || { nom: d.groupe, couleur: '#888' };
      return '<div class="vote-card">' +
        '<div class="vote-card-top"><div><div class="vote-card-name">' + d.nom + '</div>' +
        '<div class="vote-card-meta">' + d.dept + '</div></div>' +
        '<span class="vote-badge" style="background:' + g.couleur + '">' + d.groupe + '</span></div>' +
        '<div class="vote-fingerprint">' + fingerprint(mat) + '</div>' +
        '<button class="vote-card-toggle" data-mat="' + mat + '">Voir le détail des 6 votes</button>' +
        '<div class="vote-card-detail" id="senat-detail-' + mat + '">' + detailRows(mat) + '</div>' +
        (d.email ? '<a href="mailto:' + d.email + '" style="display:block;margin-top:0.6rem;text-align:center;font-size:0.85rem;font-weight:700;color:var(--red);text-decoration:none">✍️ Écrire à ce·tte sénateur·rice →</a>' : '') +
        '</div>';
    }).join('');

    if (!isFiltering && mats.length > 24) {
      grid.innerHTML += '<div class="votes-empty">Affinez la recherche (nom ou département) pour voir les ' + (mats.length - 24) + ' autres sénateur·rices.</div>';
    }

    grid.querySelectorAll('.vote-card-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const detail = document.getElementById('senat-detail-' + btn.dataset.mat);
        detail.classList.toggle('open');
        btn.textContent = detail.classList.contains('open') ? 'Masquer le détail' : 'Voir le détail des 6 votes';
        if (typeof umami !== 'undefined') umami.track('vote_senateur_detail');
      });
    });
  }

  const searchInput = document.getElementById('senat-search');
  searchInput.addEventListener('input', () => { searchTerm = searchInput.value.trim(); render(); });
  selGroupe.addEventListener('change', () => { groupeFilter = selGroupe.value; render(); });
  render();

  // ── Graphique par groupe : pourcentages sur l'effectif, NPPV visible ──
  const chartEl = document.getElementById('senat-chart');
  const currentEl = document.getElementById('senat-chart-current');
  function renderChart(uid) {
    const s = scrutins[uid];
    currentEl.innerHTML = '<strong>' + s.date + '</strong> — ' + s.titre +
      '<div class="votes-chart-current-result">Résultat global : ' + s.synthese.pour + ' pour · ' + s.synthese.contre + ' contre · ' +
      s.synthese.abstentions + ' abstention(s) · ' + s.synthese.nppv + ' n’ont pas pris part au vote — ' + s.sort +
      (s.miseAuPoint ? ' · mise au point publiée en séance (le vote enregistré fait foi)' : '') + '</div>';

    const groupCounts = s.ventilation;
    const order = Object.keys(groupCounts).sort((a, b) => {
      const ca = groupCounts[a], cb = groupCounts[b];
      return (cb.E ? cb.P / cb.E : -1) - (ca.E ? ca.P / ca.E : -1);
    });
    chartEl.innerHTML = '<div class="gbar-legend">' +
      '<span><span class="gbar-dot" style="background:#0EA882"></span>Pour</span>' +
      '<span><span class="gbar-dot" style="background:#D33A4B"></span>Contre</span>' +
      '<span><span class="gbar-dot" style="background:#E8A33C"></span>Abstention</span>' +
      '<span><span class="gbar-dot gbar-dot-abs"></span>N’a pas pris part au vote</span>' +
      '</div>' +
    order.map(code => {
      const c = groupCounts[code];
      const pct = c.E ? Math.round(c.P / c.E * 100) : null;
      const seg = (n, color, label) => n
        ? '<div class="gbar-item-seg" style="width:' + (n/c.E*100) + '%;background:' + color + '" title="' + n + ' ' + label + '"></div>'
        : '';
      const segs = c.E
        ? seg(c.P, '#0EA882', 'pour') + seg(c.C, '#D33A4B', 'contre') + seg(c.A, '#E8A33C', 'abstention') +
          (c.N ? '<div class="gbar-item-seg gbar-item-seg-abs" style="width:' + (c.N/c.E*100) + '%" title="' + c.N + ' n’ont pas pris part au vote"></div>' : '')
        : '';
      return '<div class="gbar-item">' +
        '<div class="gbar-item-top"><span class="gbar-item-name">' + code + '</span><span class="gbar-item-pct" title="Part du groupe ayant voté pour, sur l’effectif complet">' + (pct === null ? 'n/d' : pct + '% pour') + '</span></div>' +
        '<div class="gbar-item-track">' + segs + '</div>' +
        '<div class="gbar-item-count">' + c.P + ' pour · ' + c.C + ' contre · ' + c.A + ' abst. · ' + c.N + ' NPPV — sur ' + c.E + ' membres</div>' +
        '</div>';
    }).join('') +
    '<p class="gbar-note">Ventilation officielle du scrutin : groupes et effectifs au moment du vote, tous votants compris (y compris sénateur·rices ayant quitté le Sénat depuis). Les pourcentages sont calculés sur l’effectif du groupe. « N’a pas pris part au vote » (NPPV) est la catégorie officielle unique du Sénat : elle couvre l’absence comme le non-vote volontaire et n’équivaut pas à un vote contre.</p>';
  }
  selScrutin.addEventListener('change', () => renderChart(selScrutin.value));
  if (scrutinUids.length) { selScrutin.value = scrutinUids[scrutinUids.length - 1]; renderChart(selScrutin.value); }
})();
