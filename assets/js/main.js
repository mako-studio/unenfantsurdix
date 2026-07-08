
// ── TICKER : victimes depuis minuit ──────────────────────
const RATE_PER_DAY = 160000 / 365;
const RATE_PER_MS  = RATE_PER_DAY / (24 * 60 * 60 * 1000);
// Coût du déni : 9,7 Mds€/an = 307,44 €/s
const COUT_PER_S   = 9700000000 / (365 * 24 * 3600);

function getMsSinceMidnight() {
  const now = new Date(), midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  return now - midnight;
}

const tickerEl = document.getElementById('ticker-val');
const coutEl   = document.getElementById('ticker-cost');

function updateTicker() {
  const ms = getMsSinceMidnight();
  if (tickerEl) {
    tickerEl.textContent = Math.floor(ms * RATE_PER_MS).toLocaleString('fr-FR');
  }
  if (coutEl) {
    const euros = Math.floor(ms / 1000 * COUT_PER_S);
    coutEl.textContent = euros.toLocaleString('fr-FR') + ' €';
  }
  requestAnimationFrame(updateTicker);
}
requestAnimationFrame(updateTicker);

// ── COMPTEUR COÛT DU DÉNI (section dédiée) ──────────────
const coutValEl = document.getElementById('cout-val');
function updateCout() {
  if (!coutValEl) return;
  const euros = Math.floor(getMsSinceMidnight() / 1000 * COUT_PER_S);
  coutValEl.textContent = euros.toLocaleString('fr-FR') + ' €';
  requestAnimationFrame(updateCout);
}
requestAnimationFrame(updateCout);

// ── COMPTEUR INTERACTIF ──────────────────────────────────
const counters = {
  minute:  { main: '< 1', compare: '< 0,01', ctx: 'En une seule minute, en France', cctx: 'Décès sur la route sur la même période' },
  heure:   { main: Math.round(160000/8760), compare: (3524/8760).toFixed(2), ctx: 'En une seule heure, en France', cctx: 'Décès sur la route sur la même période' },
  jour:    { main: Math.round(160000/365), compare: Math.round(3524/365), ctx: 'En un seul jour, dans toute la France', cctx: 'Décès sur la route sur la même période (3 524 en 2023)' },
  semaine: { main: Math.round(160000/52),  compare: Math.round(3524/52),  ctx: 'En une semaine, dans toute la France', cctx: 'Décès sur la route sur la même période' },
  mois:    { main: Math.round(160000/12),  compare: Math.round(3524/12),  ctx: 'En un mois, dans toute la France', cctx: 'Décès sur la route sur la même période' },
};
const mainEl   = document.getElementById('counter-main');
const ctxEl    = document.getElementById('counter-ctx');
const cmpEl    = document.getElementById('counter-compare');
const cmpCtxEl = document.getElementById('counter-compare-ctx');

document.querySelectorAll('.counter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.counter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const d = counters[btn.dataset.unit];
    mainEl.textContent = d.main; ctxEl.textContent = d.ctx;
    cmpEl.textContent = d.compare; cmpCtxEl.textContent = d.cctx;
  });
});

// ── TABS RESSOURCES ──────────────────────────────────────
document.querySelectorAll('.res-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.res-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
    document.querySelectorAll('.res-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active'); tab.setAttribute('aria-selected','true');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ── BOUTON FLOTTANT — ÉCRIRE À UN ÉLU ───────────────────
(function () {
  const floatEl = document.getElementById('elu-float');
  const closeBtn = document.getElementById('elu-float-close');
  if (!floatEl) return;
  let dismissed = false;
  const heroEl = document.querySelector('.hero-body') || document.getElementById('chiffres');
  const eluSectionEl = document.getElementById('ecrire-elu');

  function updateFloat() {
    if (dismissed) { floatEl.classList.remove('visible'); return; }
    const pastHero = !heroEl || heroEl.getBoundingClientRect().bottom < 0;
    let insideEluSection = false;
    if (eluSectionEl) {
      const r = eluSectionEl.getBoundingClientRect();
      insideEluSection = r.top < window.innerHeight * 0.6 && r.bottom > 0;
    }
    floatEl.classList.toggle('visible', pastHero && !insideEluSection);
  }

  window.addEventListener('scroll', updateFloat, { passive: true });
  updateFloat();

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      dismissed = true;
      floatEl.classList.remove('visible');
    });
  }
})();

// ── ANIMATIONS BARRES ────────────────────────────────────
const firedSections = new Set();
function fireAllBarsIn(container) {
  if (firedSections.has(container)) return;
  firedSections.add(container);
  container.querySelectorAll('.funnel-bar-fill').forEach(el => { el.style.width = el.dataset.width; });
  container.querySelectorAll('.bar-fill').forEach(el => { el.style.width = (el.dataset.pct || '0') + '%'; });
  container.querySelectorAll('.jbar-fill').forEach(el => { el.style.width = (el.dataset.pct || '0') + '%'; });
}
function checkVisibility() {
  document.querySelectorAll('#impunite, #comparaisons, #justice, .counter-section').forEach(s => {
    if (firedSections.has(s)) return;
    const r = s.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) fireAllBarsIn(s);
  });
}
const pollInterval = setInterval(() => { checkVisibility(); if (firedSections.size >= 4) clearInterval(pollInterval); }, 200);
window.addEventListener('scroll', checkVisibility, { passive: true });
document.addEventListener('scroll', checkVisibility, { passive: true });
window.addEventListener('load', checkVisibility);
setTimeout(checkVisibility, 100); setTimeout(checkVisibility, 500); setTimeout(checkVisibility, 1000);

// ── B — GÉNÉRATEUR D'EMAIL ───────────────────────────────
let eluGeneratedCount = 0;

// Département → nom affiché + lien AN
const deptData = {
  '01':'l\'Ain','02':'l\'Aisne','03':'l\'Allier','04':'les Alpes-de-Haute-Provence','05':'les Hautes-Alpes','06':'les Alpes-Maritimes','07':'l\'Ardèche','08':'les Ardennes','09':'l\'Ariège','10':'l\'Aube','11':'l\'Aude','12':'l\'Aveyron','13':'les Bouches-du-Rhône','14':'le Calvados','15':'le Cantal','16':'la Charente','17':'la Charente-Maritime','18':'le Cher','19':'la Corrèze','21':'la Côte-d\'Or','22':'les Côtes-d\'Armor','23':'la Creuse','24':'la Dordogne','25':'le Doubs','26':'la Drôme','27':'l\'Eure','28':'l\'Eure-et-Loir','29':'le Finistère','2A':'la Corse-du-Sud','2B':'la Haute-Corse','30':'le Gard','31':'la Haute-Garonne','32':'le Gers','33':'la Gironde','34':'l\'Hérault','35':'l\'Ille-et-Vilaine','36':'l\'Indre','37':'l\'Indre-et-Loire','38':'l\'Isère','39':'le Jura','40':'les Landes','41':'le Loir-et-Cher','42':'la Loire','43':'la Haute-Loire','44':'la Loire-Atlantique','45':'le Loiret','46':'le Lot','47':'le Lot-et-Garonne','48':'la Lozère','49':'le Maine-et-Loire','50':'la Manche','51':'la Marne','52':'la Haute-Marne','53':'la Mayenne','54':'la Meurthe-et-Moselle','55':'la Meuse','56':'le Morbihan','57':'la Moselle','58':'la Nièvre','59':'le Nord','60':'l\'Oise','61':'l\'Orne','62':'le Pas-de-Calais','63':'le Puy-de-Dôme','64':'les Pyrénées-Atlantiques','65':'les Hautes-Pyrénées','66':'les Pyrénées-Orientales','67':'le Bas-Rhin','68':'le Haut-Rhin','69':'le Rhône','70':'la Haute-Saône','71':'la Saône-et-Loire','72':'la Sarthe','73':'la Savoie','74':'la Haute-Savoie','75':'Paris','76':'la Seine-Maritime','77':'la Seine-et-Marne','78':'les Yvelines','79':'les Deux-Sèvres','80':'la Somme','81':'le Tarn','82':'le Tarn-et-Garonne','83':'le Var','84':'le Vaucluse','85':'la Vendée','86':'la Vienne','87':'la Haute-Vienne','88':'les Vosges','89':'l\'Yonne','90':'le Territoire de Belfort','91':'l\'Essonne','92':'les Hauts-de-Seine','93':'la Seine-Saint-Denis','94':'le Val-de-Marne','95':'le Val-d\'Oise','971':'la Guadeloupe','972':'la Martinique','973':'la Guyane','974':'la Réunion','975':'Saint-Pierre-et-Miquelon','976':'Mayotte','977':'Saint-Barthélemy et Saint-Martin','986':'Wallis-et-Futuna','987':'la Polynésie française','988':'la Nouvelle-Calédonie','099':'l\'étranger (Français établis hors de France)'
};

// Objets de mail par sujet (utilisés par le bouton « Ouvrir dans ma messagerie »)
const emailSubjects = {
  session2026: 'Inscription de la PPL intégrale à la session extraordinaire 2026',
  prescriptibilite: 'Imprescriptibilité des crimes d\'inceste commis sur mineurs',
  ppl: 'Inscription de la PPL intégrale contre les violences sexistes et sexuelles à l\'ordre du jour',
  ciivise: 'Mise en œuvre des 82 recommandations de la CIIVISE',
  budget: 'Budget consacré à la lutte contre les violences sexuelles faites aux enfants',
  formation: 'Formation obligatoire des professionnels au repérage des violences',
  signalement: 'Traitement judiciaire des violences sexuelles sur mineurs'
};

const emailTemplates = {

  prescriptibilite: (nom, deptNom, deptCode) =>
`${nom}
Citoyen·ne de ${deptNom} (département ${deptCode})

Madame la Députée, Monsieur le Député,

Je me permets de vous adresser ce courrier pour vous soumettre une préoccupation qui, je l'espère, retiendra votre attention : l'imprescriptibilité des crimes d'inceste commis sur mineurs.

La CIIVISE (Commission Indépendante sur l'Inceste et les Violences Sexuelles faites aux Enfants) a rendu public en novembre 2023 un rapport fondé sur 30 000 témoignages. Il établit que 7,4 millions de Français adultes ont été victimes d'inceste dans leur enfance — soit 11 % de la population. Parmi les témoignages recueillis, 75 % portaient sur des faits prescrits au moment de la prise de parole (Sénat, PPL n°127, exposé des motifs, novembre 2025). La prescription légale prive ainsi la grande majorité des victimes de tout accès à la justice — non en raison de l'absence de preuves, mais uniquement du fait du temps écoulé entre des violences subies dans l'enfance et la capacité, souvent tardive, d'en parler.

Ce délai est documenté et compris. Les mécanismes de l'emprise, de la honte et de la dépendance affective à l'agresseur expliquent que la parole des victimes intervienne fréquemment des décennies après les faits. La loi actuelle ne prend pas en compte cette réalité clinique.

La Proposition de loi intégrale contre les violences sexistes et sexuelles (AN n°2169, décembre 2025), cosignée par 109 député·es de 8 groupes politiques, prévoit l'imprescriptibilité des crimes d'inceste commis sur mineurs. Un sondage Ipsos réalisé pour l'association Face à l'inceste en octobre 2023 indique que 90 % des Français se déclarent favorables à cette mesure.

Je vous serais reconnaissant·e de bien vouloir me faire connaître votre position sur ce sujet, et, le cas échéant, les démarches que vous entendez entreprendre pour que cette proposition soit inscrite à l'ordre du jour de l'Assemblée nationale.

Je vous prie de croire, Madame la Députée, Monsieur le Député, à l'expression de ma haute considération.

${nom}`,

  ppl: (nom, deptNom, deptCode) =>
`${nom}
Citoyen·ne de ${deptNom} (département ${deptCode})

Madame la Députée, Monsieur le Député,

Je me permets de vous adresser ce courrier pour vous alerter sur l'absence d'inscription à l'ordre du jour de la Proposition de loi intégrale contre les violences sexistes et sexuelles (PPL AN n°2169, décembre 2025).

Cette proposition a été cosignée par 109 député·es issus de 8 groupes politiques distincts. Elle constitue la traduction législative des 82 recommandations formulées par la CIIVISE à l'issue de deux années de travaux et de 30 000 témoignages recueillis. En novembre 2023, le gouvernement n'en a retenu que 41. Quarante et une recommandations demeurent à ce jour sans suite réglementaire ou législative, tandis que 160 000 enfants continuent d'être victimes de violences sexuelles chaque année en France, le plus souvent dans un contexte intrafamilial (CIIVISE, rapport public, novembre 2023).

Les données judiciaires disponibles sont préoccupantes : moins de 1 % des affaires d'inceste aboutissent à une condamnation (CIIVISE, 2023 ; Fondation Jean-Jaurès, avril 2026 ; Sénat, PPL n°127). Par ailleurs, la CIIVISE a évalué le coût social de l'impunité à 9,7 milliards d'euros par an (avis « Le coût du déni », 12 juin 2023), soit 194 fois le budget annuel que l'État consacre à la lutte contre les violences sexistes et sexuelles. Ces chiffres posent une question d'efficacité de la dépense publique autant qu'une question de principe.

Je souhaiterais connaître votre position sur l'inscription de cette PPL à l'ordre du jour de l'Assemblée nationale, et votre appréciation des conditions dans lesquelles son examen pourrait être organisé dans les prochains mois.

Dans l'attente de votre réponse, je vous prie d'agréer, Madame la Députée, Monsieur le Député, l'expression de mes respectueuses salutations.

${nom}`,

  session2026: (nom, deptNom, deptCode) =>
`${nom}
Citoyen·ne de ${deptNom} (département ${deptCode})

Madame la Députée, Monsieur le Député,

Je vous écris à la suite des événements tragiques qui ont marqué le pays début juin 2026, pour vous demander de soutenir l'inscription de la Proposition de loi intégrale contre les violences sexistes et sexuelles (PPL AN n°2169, décembre 2025) à l'ordre du jour de la session extraordinaire du Parlement.

Le 8 juin 2026, la présidente de l'Assemblée nationale a elle-même demandé au gouvernement l'inscription de ce texte, cosigné par plus de 100 député·es de huit groupes politiques, lors de la session extraordinaire de juillet ou de septembre. Cette demande transpartisane fait suite à la reconnaissance, par le procureur général près la Cour de cassation, d'un « échec collectif » et d'une « crise systémique » dans le traitement judiciaire des violences sexuelles sur mineurs.

Le 15 juin 2026, la CIIVISE a publié son bilan de mise en œuvre des 82 recommandations formulées en novembre 2023 : deux ans et demi après, seules 23 d'entre elles (28 %) sont pleinement effectives, et 3 seulement sur les 17 mesures jugées prioritaires sont aujourd'hui totalement opérationnelles. Le volet judiciaire reste le plus en retard, avec l'inceste toujours non reconnu comme infraction autonome et l'imprescriptibilité des crimes sexuels sur mineurs toujours en suspens.

Au-delà de l'émotion légitime suscitée par l'actualité récente, c'est cette lenteur structurelle qui appelle une réponse politique au moment précis où le Parlement aura l'occasion de se saisir du texte.

Je vous serais reconnaissant·e de bien vouloir me faire connaître votre position sur l'inscription de cette proposition de loi à la session extraordinaire de 2026, et les démarches que vous entendez entreprendre en ce sens.

Je vous prie de croire, Madame la Députée, Monsieur le Député, à l'expression de ma haute considération.

${nom}`,

  ciivise: (nom, deptNom, deptCode) =>
`${nom}
Citoyen·ne de ${deptNom} (département ${deptCode})

Madame la Députée, Monsieur le Député,

Je me permets de vous adresser ce courrier pour vous soumettre une question relative à la mise en œuvre des recommandations de la CIIVISE, dont le suivi me semble insuffisant au regard de l'ampleur du problème documenté.

En novembre 2023, la Commission Indépendante sur l'Inceste et les Violences Sexuelles faites aux Enfants a rendu un rapport fondé sur 30 000 témoignages et deux ans d'auditions. Elle y formule 82 recommandations concrètes, articulées autour de quatre axes : prévention, repérage, protection judiciaire et soutien aux victimes. Le gouvernement n'en a retenu que 41. Les recommandations écartées couvrent notamment l'imprescriptibilité des crimes sur mineurs, le renforcement des parquets spécialisés, la formation obligatoire des professionnels et le financement pérenne des associations d'aide aux victimes.

Le bilan chiffré actuel est le suivant : 160 000 enfants victimes par an, moins de 1 % des affaires aboutissant à une condamnation, et un coût social évalué à 9,7 milliards d'euros annuels, dont les deux tiers résultent des conséquences à long terme sur la santé physique et mentale des victimes (CIIVISE, avis juin 2023). Ce constat n'est pas partisan : il est formulé par une instance créée par le gouvernement lui-même, dont les conclusions ont été saluées par l'ensemble du spectre politique lors de leur présentation.

Je vous serais reconnaissant·e de bien vouloir m'indiquer votre position sur les recommandations non retenues, et si vous entendez, dans le cadre de votre mandat, soutenir leur adoption par voie législative ou réglementaire — que ce soit via la PPL intégrale (AN n°2169, déc. 2025) ou tout autre vecteur approprié.

Avec l'expression de mes respectueuses salutations,

${nom}`,

  budget: (nom, deptNom, deptCode) =>
`${nom}
Citoyen·ne de ${deptNom} (département ${deptCode})

Madame la Députée, Monsieur le Député,

Je vous adresse ce courrier afin d'attirer votre attention sur une réalité budgétaire documentée qui me paraît appeler une réponse politique claire lors des prochaines discussions financières.

En juin 2023, la CIIVISE a publié un avis intitulé « Le coût du déni », dans lequel elle évalue à 9,7 milliards d'euros le coût annuel pour la société française de l'impunité des agresseurs et de l'absence de soutien structuré aux victimes. Cette évaluation repose sur des données économiques et épidémiologiques reconnues ; elle intègre les pertes de productivité, les coûts de santé à long terme, les dépenses de justice et les prestations sociales. Les deux tiers de ce montant résultent des séquelles psychiques et physiques portées par les victimes tout au long de leur vie.

Dans le même temps, le budget consacré par l'État à la lutte contre les violences sexistes et sexuelles — programme 137 de la DGCS et action CIPDR — s'établit à environ 50 millions d'euros par an (PLF 2024). L'écart entre le coût documenté du problème et les moyens publics qui lui sont alloués est d'un facteur 194.

La CIIVISE formule cette conclusion sobrement : « Traiter le problème coûte moins cher que de l'ignorer. » Il ne s'agit pas d'une posture idéologique, mais d'un calcul économique construit par une commission gouvernementale, à partir de méthodologies reconnues en économie de la santé.

Je souhaiterais connaître votre appréciation de cet écart budgétaire, et savoir si vous envisagez de défendre, dans le cadre des prochaines lois de finances, une révision substantielle des crédits alloués à la protection de l'enfance et au traitement judiciaire des violences sexuelles sur mineurs.

Je vous prie d'agréer, Madame la Députée, Monsieur le Député, l'expression de mes respectueuses salutations.

${nom}`,

  formation: (nom, deptNom, deptCode) =>
`${nom}
Citoyen·ne de ${deptNom} (département ${deptCode})

Madame la Députée, Monsieur le Député,

Je me permets de vous adresser ce courrier pour appeler votre attention sur un angle spécifique de la politique de protection de l'enfance : la formation des professionnels au repérage des violences sexuelles sur mineurs.

La CIIVISE a documenté que 92 % des enfants qui révèlent des violences ne reçoivent pas de réponse protectrice de la part des adultes professionnels qui les entourent (rapport intermédiaire, 2022-2023). Ce chiffre reflète un déficit de formation structurel qui touche l'ensemble des professions en contact régulier avec des enfants : personnels de l'Éducation nationale, professionnels de santé, travailleurs sociaux, officiers de police judiciaire, magistrats.

Les outils existent et sont disponibles. Le programme pédagogique « Mélissa et les autres », conçu par la CIIVISE, est en accès libre et a été téléchargé par plus de 8 000 organismes de formation. Les ressources produites par la MIPROF (Mission Interministérielle pour la Protection des Femmes) couvrent les professionnels de santé et du droit. Ce qui fait défaut, c'est le cadre légal rendant cette formation obligatoire et son financement garanti dans la durée.

La Proposition de loi intégrale contre les violences sexistes et sexuelles (AN n°2169, décembre 2025) prévoit précisément cette obligation. En l'absence d'inscription à l'ordre du jour, la mesure demeure inappliquée : les professionnels continuent d'agir sans socle commun de formation sur un sujet qui touche statistiquement au moins un enfant dans chaque classe de trente élèves.

Pourriez-vous me faire connaître votre position sur cette mesure, et les initiatives que vous envisagez de soutenir afin que la formation au repérage des violences sexuelles sur mineurs devienne effective et obligatoire ?

Dans l'attente de votre réponse, je vous prie d'agréer, Madame la Députée, Monsieur le Député, l'expression de mes respectueuses salutations.

${nom}`,

  signalement: (nom, deptNom, deptCode) =>
`${nom}
Citoyen·ne de ${deptNom} (département ${deptCode})

Madame la Députée, Monsieur le Député,

Je vous adresse ce courrier pour appeler votre attention sur le traitement judiciaire des plaintes pour violences sexuelles sur mineurs, et sur les réformes qui me semblent nécessaires pour remédier à une situation dont les données chiffrées sont, à ce stade, particulièrement préoccupantes.

Plusieurs sources convergentes permettent d'établir le constat suivant. Édouard Durand, co-président de la CIIVISE, relevait que 70 % des plaintes pour violences sexuelles sur mineurs sont classées sans suite. Au terme du parcours judiciaire complet, moins de 1 % des affaires d'inceste aboutissent à une condamnation (CIIVISE, novembre 2023 ; Sénat, PPL n°127, novembre 2025 ; Fondation Jean-Jaurès, avril 2026). Ce résultat ne s'explique pas principalement par la faiblesse des dossiers ou l'absence de preuves, mais par des contraintes structurelles documentées.

La France compte en effet 3,2 procureurs pour 100 000 habitants, contre une médiane européenne de 11,2 et une moyenne de 12,2 (Commission Européenne pour l'efficacité de la justice — CEPEJ, rapport octobre 2024, données 2022). Chaque magistrat du parquet français traite une charge de travail près de trois fois supérieure à la médiane européenne. Ce contexte est aggravé par la réduction de 328 millions d'euros du budget du ministère de la Justice intervenue par décret en 2024.

Les victimes déposent plainte. La capacité institutionnelle de traiter ces plaintes dans des délais et avec des moyens d'investigation adaptés est, en l'état, insuffisante. Il s'agit d'une question de politique budgétaire et d'organisation judiciaire autant que d'une question de droit.

Je vous serais reconnaissant·e de bien vouloir me préciser votre position sur le renforcement des moyens des parquets spécialisés dans les affaires de crimes sexuels sur mineurs, ainsi que sur les dispositions de la PPL intégrale (AN n°2169) relatives à la réforme du traitement judiciaire de ces plaintes.

Avec l'expression de mes respectueuses salutations,

${nom}`,
};


// ── D — GÉNÉRATEUR D'IMAGE À PARTAGER ───────────────────
const shareData = [
  { stat: '7,4 millions', label: 'de Français adultes victimes d\'inceste', sublabel: '1 personne sur 10', source: 'Ipsos · Face à l\'inceste, oct. 2023' },
  { stat: '160 000', label: 'enfants victimes chaque année en France', sublabel: 'soit 1 enfant toutes les 3 minutes', source: 'CIIVISE, rapport public nov. 2023' },
  { stat: '< 1 %', label: 'des affaires d\'inceste aboutissent', sublabel: 'à une condamnation', source: 'CIIVISE 2023 · Sénat PPL n°127, 2025' },
  { stat: '9,7 milliards €', label: 'le coût annuel du déni', sublabel: 'pour la société française', source: 'CIIVISE, avis "Le coût du déni", juin 2023' },
  { stat: '92 %', label: 'des enfants qui parlent', sublabel: 'ne reçoivent pas de réponse protectrice', source: 'CIIVISE, rapport intermédiaire 2022–2023' },
  { stat: '97 %', label: 'des auteurs d\'inceste sont des hommes', sublabel: 'tous milieux sociaux confondus', source: 'CIIVISE 2023 · Enquête Virage, Ined 2015' },
];

let currentShareIdx = 0;
const overlay   = document.getElementById('share-overlay');
const canvas    = document.getElementById('share-canvas');
const dlBtn     = document.getElementById('share-dl-btn');
const closeBtn  = document.getElementById('share-close-btn');

function openShareModal(idx) {
  currentShareIdx = idx;
  drawShareImage(idx);
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeShareModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

if (closeBtn) closeBtn.addEventListener('click', closeShareModal);
if (overlay)  overlay.addEventListener('click', e => { if (e.target === overlay) closeShareModal(); });

function drawShareImage(idx) {
  if (!canvas) return;
  const d   = shareData[idx];
  const ctx = canvas.getContext('2d');
  const W = 1080, H = 1080;
  canvas.width = W; canvas.height = H;

  const PAD = 64;
  const HEADER_H = 140;
  const FOOTER_H = 160;
  const STAT_TOP_PAD = 80;

  // Fond blanc cassé
  ctx.fillStyle = '#F5F3FA';
  ctx.fillRect(0, 0, W, H);

  // Barre latérale gauche
  ctx.fillStyle = '#571FEA';
  ctx.fillRect(0, 0, 10, H);

  // Bande header sombre
  ctx.fillStyle = '#0D0A1A';
  ctx.fillRect(0, 0, W, HEADER_H);
  ctx.fillStyle = 'rgba(245,243,250,0.45)';
  ctx.font = '500 20px "DM Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('INCESTE EN FRANCE  ·  DONNÉES OFFICIELLES', PAD, HEADER_H / 2 + 8);
  ctx.fillStyle = '#571FEA';
  ctx.beginPath(); ctx.arc(W - 60, HEADER_H / 2, 12, 0, Math.PI * 2); ctx.fill();

  // Chiffre principal
  const statLen = d.stat.length;
  const statSize = statLen <= 4 ? 240 : statLen <= 7 ? 195 : statLen <= 10 ? 160 : 125;
  const statY = HEADER_H + STAT_TOP_PAD + statSize * 0.82;
  ctx.fillStyle = '#571FEA';
  ctx.font = `italic ${statSize}px Georgia, serif`;
  ctx.textAlign = 'left';
  ctx.fillText(d.stat, PAD, statY);

  // Séparateur
  const sepY = statY + statSize * 0.18 + 20;
  ctx.fillStyle = 'rgba(87,31,234,0.2)';
  ctx.fillRect(PAD, sepY, W - PAD * 2, 2);

  // Label principal
  ctx.fillStyle = '#0D0A1A';
  ctx.font = '700 56px "Inter", system-ui, sans-serif';
  const labelY = sepY + 72;
  const labelLines = wrapText(ctx, d.label.toUpperCase(), W - PAD * 2);
  labelLines.forEach((line, i) => ctx.fillText(line, PAD, labelY + i * 72));

  // Sublabel
  ctx.fillStyle = '#571FEA';
  ctx.font = '500 40px "Inter", system-ui, sans-serif';
  ctx.fillText(d.sublabel, PAD, labelY + labelLines.length * 72 + 36);

  // Bande footer
  ctx.fillStyle = '#0D0A1A';
  ctx.fillRect(0, H - FOOTER_H, W, FOOTER_H);
  ctx.fillStyle = 'rgba(245,243,250,0.5)';
  ctx.font = '400 22px "DM Mono", monospace';
  ctx.fillText('Source : ' + d.source, PAD, H - FOOTER_H + 52);
  ctx.fillStyle = 'rgba(87,31,234,0.45)';
  ctx.fillRect(PAD, H - FOOTER_H + 74, W - PAD * 2, 1);
  ctx.fillStyle = 'rgba(245,243,250,0.32)';
  ctx.font = '400 20px "DM Mono", monospace';
  ctx.fillText('unenfantsurdix.com  ·  Libre de diffusion  ·  Sensibilisation non commerciale', PAD, H - FOOTER_H + 110);
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, maxW) {
  const words = text.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

if (dlBtn) {
  dlBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `unenfantsurdix-chiffre-${currentShareIdx + 1}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });
}

// ── BURGER MENU MOBILE ───────────────────────────────────
(function() {
  const btn  = document.getElementById('burger-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  function openMenu()  { btn.classList.add('open'); menu.classList.add('open'); btn.setAttribute('aria-expanded','true');  document.body.style.overflow='hidden'; }
  function closeMenu() { btn.classList.remove('open'); menu.classList.remove('open'); btn.setAttribute('aria-expanded','false'); document.body.style.overflow=''; }
  btn.addEventListener('click', () => menu.classList.contains('open') ? closeMenu() : openMenu());
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
})();

// ── GÉNÉRATEUR D'EMAIL (onglet Ressources) ───────────────
(function() {
  const genBtn   = document.getElementById('elu-generate-btn-t');
  const outputDiv = document.getElementById('elu-output-t');
  const emailBox  = document.getElementById('elu-email-box-t');
  const copyBtn   = document.getElementById('elu-copy-btn-t');
  const counterEl = document.getElementById('elu-counter-t');
  const deptLinkEl = document.getElementById('elu-dept-link-t');
  const mailtoBtn = document.getElementById('elu-mailto-btn-t');
  const deputeSel = document.getElementById('elu-depute-t');
  if (!genBtn) return;

  // Contacts officiels des député·es (embarqués sur la page par le layout,
  // source : référentiel AMO10, open data Assemblée nationale)
  let contactsDepts = null;
  const contactsRaw = document.getElementById('deputes-contacts');
  if (contactsRaw) {
    try { contactsDepts = JSON.parse(contactsRaw.textContent).departements; } catch (e) { contactsDepts = null; }
  }

  const deptSelEl = document.getElementById('elu-dept-t');
  const deputeField = document.getElementById('elu-depute-field-t');
  function refreshDeputes() {
    if (!deputeSel || !contactsDepts) return;
    const deptCode = deptSelEl.value;
    const list = (deptCode && contactsDepts[deptCode]) || [];
    deputeSel.innerHTML = '';
    if (!deptCode || !list.length) {
      // champ masqué tant qu'aucun département n'est choisi (sobriété du formulaire)
      if (deputeField) deputeField.style.display = 'none';
      deputeSel.disabled = true;
      deputeSel.innerHTML = '<option value="">— Sélectionnez d\'abord un département —</option>';
      return;
    }
    if (deputeField) deputeField.style.display = '';
    deputeSel.disabled = false;
    deputeSel.innerHTML = '<option value="">Je choisirai moi-même (courrier générique)</option>' +
      list.map((d, i) =>
        '<option value="' + i + '">Circo ' + d.circo + ' — ' + d.nom + ' (' + d.groupe + ')</option>'
      ).join('');
  }
  if (deptSelEl && deputeSel && contactsDepts) deptSelEl.addEventListener('change', refreshDeputes);

  // Pré-remplissage depuis l'URL — liens « Écrire à ce·tte député·e » du tracker
  // de votes (/ecrire-a-mon-elu/?dept=69&circo=7)
  if (deptSelEl && contactsDepts) {
    const params = new URLSearchParams(window.location.search);
    const pDept = params.get('dept'), pCirco = params.get('circo');
    if (pDept && contactsDepts[pDept]) {
      deptSelEl.value = pDept;
      refreshDeputes();
      if (pCirco && deputeSel && !deputeSel.disabled) {
        const idx = contactsDepts[pDept].findIndex(d => d.circo === pCirco);
        if (idx >= 0) deputeSel.value = String(idx);
      }
    }
  }

  genBtn.addEventListener('click', () => {
    const nom      = (document.getElementById('elu-nom-t').value || '').trim();
    const deptCode = document.getElementById('elu-dept-t').value;
    const sujet    = document.getElementById('elu-sujet-t').value;
    if (!nom || !deptCode || !sujet) { alert('Merci de remplir les trois champs.'); return; }
    const deptNom  = deptData[deptCode] || ('le département ' + deptCode);
    const template = emailTemplates[sujet];
    if (!template) return;

    // Député·e ciblé·e (facultatif)
    let depute = null;
    if (deputeSel && contactsDepts && deputeSel.value !== '' && contactsDepts[deptCode]) {
      depute = contactsDepts[deptCode][parseInt(deputeSel.value, 10)] || null;
    }

    let lettre = template(nom, deptNom, deptCode);
    if (depute && depute.civ) {
      // Adapte la civilité générique « Madame la Députée, Monsieur le Député »
      const civilite = depute.civ === 'Mme' ? 'Madame la Députée' : 'Monsieur le Député';
      lettre = lettre.split('Madame la Députée, Monsieur le Député').join(civilite);
    }
    emailBox.textContent = lettre;
    outputDiv.classList.add('visible');

    if (depute && depute.email) {
      if (deptLinkEl) deptLinkEl.innerHTML = '→ ' + depute.nom + ' · <a href="mailto:' + depute.email + '">' + depute.email + '</a>';
      if (mailtoBtn) {
        mailtoBtn.href = 'mailto:' + depute.email +
          '?subject=' + encodeURIComponent(emailSubjects[sujet] || 'Protection de l\'enfance') +
          '&body=' + encodeURIComponent(lettre);
        mailtoBtn.style.display = '';
      }
    } else {
      if (deptLinkEl) deptLinkEl.innerHTML = `→ <a href="https://www.assemblee-nationale.fr/dyn/vos-deputes#recherche" target="_blank" rel="noopener noreferrer">Trouver les député·es de ${deptNom}</a>`;
      if (mailtoBtn) mailtoBtn.style.display = 'none';
    }

    eluGeneratedCount++;
    if (counterEl) counterEl.innerHTML = `<strong>${eluGeneratedCount}</strong> courrier${eluGeneratedCount > 1 ? 's' : ''} généré${eluGeneratedCount > 1 ? 's' : ''} depuis le chargement. — 🔒 Aucune donnée conservée.`;
    if (typeof umami !== 'undefined') umami.track('lettre_generee');
    outputDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    copyBtn.textContent = 'Copier'; copyBtn.classList.remove('copied');
  });

  if (mailtoBtn) mailtoBtn.addEventListener('click', () => {
    if (typeof umami !== 'undefined') umami.track('lettre_mailto');
  });

  copyBtn && copyBtn.addEventListener('click', () => {
    const text = emailBox.textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = 'Copié ✓'; copyBtn.classList.add('copied');
      setTimeout(() => { copyBtn.textContent = 'Copier'; copyBtn.classList.remove('copied'); }, 2500);
    }).catch(() => {
      const sel = window.getSelection(), range = document.createRange();
      range.selectNodeContents(emailBox); sel.removeAllRanges(); sel.addRange(range);
      document.execCommand('copy');
      copyBtn.textContent = 'Copié ✓'; copyBtn.classList.add('copied');
      setTimeout(() => { copyBtn.textContent = 'Copier'; copyBtn.classList.remove('copied'); }, 2500);
    });
  });
})();
