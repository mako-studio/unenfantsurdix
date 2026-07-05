
(function() {
  const raw = document.getElementById('votes-data');
  if (!raw) return;
  const DATA = JSON.parse(raw.textContent);
  const groupes = DATA.groupes, deputes = DATA.deputes, scrutins = DATA.scrutins, votes = DATA.votes;
  const misesAuPoint = DATA.misesAuPoint || {};
  const scrutinUids = DATA.meta.ordre;

  // Table ville -> département (préfectures + grandes villes de France)
  const VILLES = {"paris":"75","versailles":"78","nanterre":"92","créteil":"94","creteil":"94","bobigny":"93","évry":"91","evry":"91","cergy":"95","melun":"77","boulogne-billancourt":"92","saint-denis":"93","montreuil":"93","argenteuil":"95","vitry-sur-seine":"94","aulnay-sous-bois":"93","colombes":"92","asnières-sur-seine":"92","asnieres":"92","rueil-malmaison":"92","aubervilliers":"93","champigny-sur-marne":"94","issy-les-moulineaux":"92","levallois-perret":"92","noisy-le-grand":"93","antony":"92","clichy":"92","ivry-sur-seine":"94","villejuif":"94","neuilly-sur-seine":"92","fontenay-sous-bois":"94","meaux":"77","marseille":"13","lyon":"69","toulouse":"31","nice":"06","nantes":"44","montpellier":"34","strasbourg":"67","bordeaux":"33","lille":"59","rennes":"35","reims":"51","le havre":"76","saint-étienne":"42","saint-etienne":"42","toulon":"83","grenoble":"38","dijon":"21","angers":"49","nîmes":"30","nimes":"30","villeurbanne":"69","clermont-ferrand":"63","le mans":"72","aix-en-provence":"13","brest":"29","tours":"37","amiens":"80","limoges":"87","annecy":"74","perpignan":"66","besançon":"25","besancon":"25","orléans":"45","orleans":"45","metz":"57","rouen":"76","mulhouse":"68","caen":"14","nancy":"54","saint-denis-reunion":"974","roubaix":"59","tourcoing":"59","avignon":"84","poitiers":"86","dunkerque":"59","pau":"64","la rochelle":"17","calais":"62","cherbourg":"50","béziers":"34","beziers":"34","colmar":"68","drancy":"93","ajaccio":"2A","porto-vecchio":"2A","sartène":"2A","sartene":"2A","bourges":"18","quimper":"29","valence":"26","antibes":"06","niort":"79","beauvais":"60","troyes":"10","chambéry":"73","chambery":"73","angoulême":"16","angouleme":"16","lorient":"56","montauban":"82","chalon-sur-saône":"71","chalon-sur-saone":"71","charleville-mézières":"08","charleville-mezieres":"08","vannes":"56","bourg-en-bresse":"01","albi":"81","blois":"41","laval":"53","évreux":"27","evreux":"27","auxerre":"89","chartres":"28","cholet":"49","macon":"71","mâcon":"71","arras":"62","saint-brieuc":"22","cahors":"46","agen":"47","alès":"30","ales":"30","épinal":"88","epinal":"88","tarbes":"65","périgueux":"24","perigueux":"24","narbonne":"11","compiègne":"60","compiegne":"60","carcassonne":"11","brive-la-gaillarde":"19","roanne":"42","vienne":"38","vesoul":"70","gap":"05","digne-les-bains":"04","mende":"48","privas":"07","aurillac":"15","guéret":"23","gueret":"23","nevers":"58","moulins":"03","le puy-en-velay":"43","rodez":"12","foix":"09","tulle":"19","chaumont":"52","bar-le-duc":"55","saint-lô":"50","saint-lo":"50","alençon":"61","alencon":"61","laon":"02","cambrai":"59","abbeville":"80","soissons":"02","bastia":"2B","calvi":"2B","auch":"32","mont-de-marsan":"40","dax":"40","castres":"81","sète":"34","sete":"34","martigues":"13","fréjus":"83","frejus":"83","cannes":"06","grasse":"06","hyères":"83","hyeres":"83","vitrolles":"13","évian":"74","chalon":"71","belfort":"90","montbéliard":"25","montbeliard":"25","haguenau":"67","sarreguemines":"57","forbach":"57","thionville":"57","épernay":"51","epernay":"51","châlons-en-champagne":"51","chalons-en-champagne":"51","saint-nazaire":"44","lannion":"22","concarneau":"29","douarnenez":"29","royan":"17","rochefort":"17","saintes":"17","libourne":"33","arcachon":"33","bayonne":"64","biarritz":"64","anglet":"64","oyonnax":"01","annemasse":"74","thonon-les-bains":"74","villefranche-sur-saône":"69","villefranche-sur-saone":"69","vichy":"03","montluçon":"03","montlucon":"03","châteauroux":"36","chateauroux":"36","issoudun":"36","dreux":"28","vernon":"27","lisieux":"14","bayeux":"14","flers":"61","fontenay-le-comte":"85","les sables-d'olonne":"85","la roche-sur-yon":"85","challans":"85","carpentras":"84","orange":"84","apt":"84","salon-de-provence":"13","arles":"13","istres":"13","manosque":"04","draguignan":"83","brignoles":"83","menton":"06","cagnes-sur-mer":"06","le cannet":"06","mougins":"06","sospel":"06","annonay":"07","aubenas":"07","tournon-sur-rhône":"07","montélimar":"26","montelimar":"26","romans-sur-isère":"26","bourgoin-jallieu":"38","voiron":"38","échirolles":"38","echirolles":"38","albertville":"73","aix-les-bains":"73","cluses":"74","sallanches":"74","bonneville":"74","vaulx-en-velin":"69","vénissieux":"69","venissieux":"69","bron":"69","saint-priest":"69","tarare":"69","riom":"63","thiers":"63","issoire":"63","cusset":"03","yzeure":"03","bellac":"87","brive":"19","ussel":"19","figeac":"46","gourdon":"46","villeneuve-sur-lot":"47","marmande":"47","tonneins":"47","lourdes":"65","lannemezan":"65","condom":"32","lectoure":"32","millau":"12","villefranche-de-rouergue":"12","castelnaudary":"11","limoux":"11","lodève":"34","lodeve":"34","pézenas":"34","pezenas":"34","céret":"66","ceret":"66","prades":"66","colomiers":"31","tournefeuille":"31","blagnac":"31","muret":"31","saint-gaudens":"31","bagnères-de-bigorre":"65","bagneres-de-bigorre":"65","mérignac":"33","merignac":"33","pessac":"33","talence":"33","villenave-d'ornon":"33","bègles":"33","begles":"33","gujan-mestras":"33","châtellerault":"86","chatellerault":"86","bressuire":"79","parthenay":"79","cognac":"16","confolens":"16","panazol":"87","aixe-sur-vienne":"87","saint-herblain":"44","rezé":"44","reze":"44","orvault":"44","vertou":"44","clisson":"44","ancenis":"44","saumur":"49","segré":"49","segre":"49","la flèche":"72","la fleche":"72","mamers":"72","château-gontier":"53","chateau-gontier":"53","mayenne":"53","saint-malo":"35","fougères":"35","fougeres":"35","vitré":"35","vitre":"35","redon":"35","dinard":"35","morlaix":"29","landerneau":"29","pontivy":"56","auray":"56","dinan":"22","lamballe":"22","guingamp":"22","hérouville-saint-clair":"14","herouville-saint-clair":"14","vire":"14","dieppe":"76","les andelys":"27","argentan":"61","albert":"80","senlis":"60","chantilly":"60","saint-quentin":"02","château-thierry":"02","chateau-thierry":"02","vitry-le-françois":"51","vitry-le-francois":"51","sedan":"08","romilly-sur-seine":"10","langres":"52","saint-dizier":"52","verdun":"55","lunéville":"54","luneville":"54","toul":"54","sélestat":"67","selestat":"67","guebwiller":"68","pontarlier":"25","lure":"70","beaune":"21","autun":"71","cosne-cours-sur-loire":"58","sens":"89","avallon":"89","dole":"39","lons-le-saunier":"39","briançon":"05","corte":"2B"};

  const posLabel = { P: 'Pour', C: 'Contre', A: 'Abstention', N: 'Non-votant·e (catégorie officielle)' };
  const mapLabel = { P: 'pour', C: 'contre', A: 'abstention', N: 'non-votant·e', D: 'dysfonctionnement du dispositif de vote' };

  // Libellé quand un·e député·e n'a pas de position enregistrée sur un scrutin :
  // soit pas encore élu·e à cette date, soit n'a pas pris part au vote (absence,
  // mission, ou siège alors occupé par un·e suppléant·e).
  function noKeyLabel(ref, uid) {
    const d = deputes[ref];
    if (d.mandatDebut && scrutins[uid].date < d.mandatDebut) return 'Pas encore élu·e à cette date';
    return 'N’a pas pris part au vote';
  }
  function mapNote(ref, uid) {
    const mp = misesAuPoint[uid] && misesAuPoint[uid][ref];
    return mp ? ' — mise au point déposée : souhaitait « ' + mapLabel[mp] + ' »' : '';
  }

  const selGroupe = document.getElementById('votes-filter-groupe');
  Object.keys(groupes).sort((a,b) => groupes[a].nom.localeCompare(groupes[b].nom)).forEach(code => {
    const opt = document.createElement('option');
    opt.value = code; opt.textContent = groupes[code].nom + ' (' + code + ')';
    selGroupe.appendChild(opt);
  });

  const selScrutin = document.getElementById('votes-chart-select');
  scrutinUids.forEach(uid => {
    const s = scrutins[uid];
    const opt = document.createElement('option');
    opt.value = uid;
    let titre = s.titre.replace(/^l'ensemble de la /i, '').replace(/^la /i, '');
    opt.textContent = s.date + ' — ' + (titre.length > 110 ? titre.slice(0, 110) + '…' : titre);
    selScrutin.appendChild(opt);
  });

  const listEl = document.getElementById('votes-scrutins-list');
  scrutinUids.forEach(uid => {
    const s = scrutins[uid];
    const li = document.createElement('li');
    li.textContent = s.date + ' — ' + s.titre + ' (' + s.synthese.pour + ' pour, ' + s.synthese.contre + ' contre, ' + s.synthese.abstentions + ' abst.)';
    listEl.appendChild(li);
  });

  function escAttr(str) { return String(str).replace(/"/g, '&quot;'); }

  function fingerprint(ref) {
    return scrutinUids.map(uid => {
      const pos = votes[uid][ref] || null;
      const s = scrutins[uid];
      const label = (pos ? posLabel[pos] : noKeyLabel(ref, uid)) + (pos ? mapNote(ref, uid) : '');
      return '<span class="vote-pill ' + (pos || 'X') + '" title="' + escAttr(s.date + ' — ' + s.titre + ' — ' + label) + '"></span>';
    }).join('');
  }

  function detailRows(ref) {
    return scrutinUids.map(uid => {
      const pos = votes[uid][ref];
      const s = scrutins[uid];
      const label = pos ? posLabel[pos] : noKeyLabel(ref, uid);
      const note = pos ? mapNote(ref, uid) : '';
      return '<div class="vote-card-detail-row"><span>' + s.date + ' — ' + s.titre +
        (note ? '<em class="vote-map-note">' + note.slice(3) + '</em>' : '') +
        '</span><span class="vote-card-detail-pos ' + (pos || 'X') + '">' + label + (note ? ' *' : '') + '</span></div>';
    }).join('');
  }

  const grid = document.getElementById('votes-grid');
  const countEl = document.getElementById('votes-count');
  const totalDeputes = Object.keys(deputes).length;
  let searchTerm = '';
  let groupeFilter = '';

  function matchesSearch(d) {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase().trim();
    if (d.nom.toLowerCase().includes(t)) return true;
    if (d.dept.toLowerCase().includes(t)) return true;
    if (d.numDept === t) return true;
    const villeDept = VILLES[t];
    if (villeDept && villeDept === d.numDept) return true;
    return false;
  }

  function render() {
    const refs = Object.keys(deputes).filter(ref => {
      const d = deputes[ref];
      if (groupeFilter && d.groupe !== groupeFilter) return false;
      return matchesSearch(d);
    }).sort((a,b) => deputes[a].nom.localeCompare(deputes[b].nom));

    countEl.textContent = refs.length + ' député·e' + (refs.length > 1 ? 's' : '') + ' affiché' + (refs.length > 1 ? 's' : '') + ' sur ' + totalDeputes;

    if (refs.length === 0) {
      grid.innerHTML = '<div class="votes-empty">Aucun·e député·e ne correspond à cette recherche. Vérifiez l\'orthographe, ou essayez un nom de département plutôt qu\'une ville.</div>';
      return;
    }

    const isFiltering = !!(searchTerm || groupeFilter);
    const display = isFiltering ? refs : refs.slice(0, 24);
    grid.innerHTML = display.map(ref => {
      const d = deputes[ref];
      const g = groupes[d.groupe] || { nom: d.groupe, couleur: '#888' };
      return '<div class="vote-card">' +
        '<div class="vote-card-top"><div><div class="vote-card-name">' + d.nom + '</div>' +
        '<div class="vote-card-meta">' + d.dept + ' · circo ' + d.circo + '</div></div>' +
        '<span class="vote-badge" style="background:' + g.couleur + '">' + d.groupe + '</span></div>' +
        '<div class="vote-fingerprint">' + fingerprint(ref) + '</div>' +
        '<button class="vote-card-toggle" data-ref="' + ref + '">Voir le détail des 15 votes</button>' +
        '<div class="vote-card-detail" id="detail-' + ref + '">' + detailRows(ref) + '</div>' +
        '<a href="/ecrire-a-mon-elu/" style="display:block;margin-top:0.6rem;text-align:center;font-size:0.85rem;font-weight:700;color:var(--red);text-decoration:none">✍️ Écrire à ce·tte député·e →</a></div>';
    }).join('');

    if (!isFiltering && refs.length > 24) {
      grid.innerHTML += '<div class="votes-empty">Affinez la recherche (nom, ville ou département) pour voir les ' + (refs.length - 24) + ' autres député·es.</div>';
    }

    grid.querySelectorAll('.vote-card-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const detail = document.getElementById('detail-' + btn.dataset.ref);
        detail.classList.toggle('open');
        btn.textContent = detail.classList.contains('open') ? 'Masquer le détail' : 'Voir le détail des 15 votes';
        if (typeof umami !== 'undefined') umami.track('vote_depute_detail');
      });
    });
  }

  const searchInput = document.getElementById('votes-search');
  searchInput.addEventListener('input', () => { searchTerm = searchInput.value.trim(); render(); });
  selGroupe.addEventListener('change', () => { groupeFilter = selGroupe.value; render(); });
  render();

  const chartEl = document.getElementById('votes-chart');
  const currentEl = document.getElementById('votes-chart-current');
  function renderChart(uid) {
    const s = scrutins[uid];
    currentEl.innerHTML = '<strong>' + s.date + '</strong> — ' + s.titre +
      '<div class="votes-chart-current-result">Résultat global : ' + s.synthese.pour + ' pour · ' + s.synthese.contre + ' contre · ' + s.synthese.abstentions + ' abstention(s) — ' + s.sort + '</div>';

    // Ventilation officielle du scrutin : groupe au moment du vote, tous les
    // votants comptés (y compris député·es ayant quitté l'Assemblée depuis).
    const groupCounts = s.ventilation;
    const order = Object.keys(groupCounts).sort((a, b) => {
      const ca = groupCounts[a], cb = groupCounts[b];
      const expA = ca.P + ca.C + ca.A, expB = cb.P + cb.C + cb.A;
      const pctA = expA ? ca.P / expA : -1, pctB = expB ? cb.P / expB : -1;
      return pctB - pctA;
    });
    chartEl.innerHTML = order.map(code => {
      const c = groupCounts[code];
      const exprimes = c.P + c.C + c.A;
      const pct = exprimes ? Math.round(c.P / exprimes * 100) : null;
      const segs = exprimes
        ? '<div class="gbar-item-seg" style="width:' + (c.P/exprimes*100) + '%;background:#0EA882" title="' + c.P + ' pour"></div>' +
          '<div class="gbar-item-seg" style="width:' + (c.C/exprimes*100) + '%;background:#D33A4B" title="' + c.C + ' contre"></div>' +
          '<div class="gbar-item-seg" style="width:' + (c.A/exprimes*100) + '%;background:#E8A33C" title="' + c.A + ' abstention"></div>'
        : '';
      return '<div class="gbar-item">' +
        '<div class="gbar-item-top"><span class="gbar-item-name">' + code + '</span><span class="gbar-item-pct">' + (pct === null ? 'n/d' : pct + '%') + '</span></div>' +
        '<div class="gbar-item-track">' + segs + '</div>' +
        '<div class="gbar-item-count">' + c.P + ' pour · ' + c.C + ' contre · ' + c.A + ' abst. · ' + c.N + ' non-votant·e·s</div>' +
        '</div>';
    }).join('') +
    '<p class="gbar-note">Ventilation officielle du scrutin : groupes au moment du vote, tous les votants comptés (y compris député·es remplacé·es ou parti·es depuis). Les absent·es ne figurent pas dans le décompte officiel.</p>';
  }
  selScrutin.addEventListener('change', () => renderChart(selScrutin.value));
  if (scrutinUids.length) { selScrutin.value = scrutinUids[scrutinUids.length - 1]; renderChart(selScrutin.value); }

  const factEl = document.getElementById('votes-flagship-fact');
  if (factEl) {
    factEl.textContent = totalDeputes + ' député·es passé·es au crible · ' + scrutinUids.length + ' votes clés · 17e législature';
  }

  const flagForm = document.getElementById('votes-flagship-form');
  const flagInput = document.getElementById('votes-flagship-input');
  if (flagForm) {
    flagForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = flagInput.value.trim();
      searchInput.value = val;
      searchTerm = val;
      render();
      document.getElementById('votes-deputes').scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (typeof umami !== 'undefined') umami.track('votes_deputes_recherche_hero');
    });
  }
})();
