#!/usr/bin/env python3
"""Génère une page statique par scrutin (Assemblée nationale et Sénat).

À relancer après toute mise à jour de _includes/votes-data.json ou de
_includes/senat-votes-data.json :
    python3 scripts/generate_scrutin_pages.py

Produit :
  scrutins/an-<numéro>.html            -> /votes-deputes/scrutin-<numéro>/
  scrutins/senat-<session>-<n>.html    -> /votes-senateurs/scrutin-<session>-<n>/
  _includes/scrutins-an-liste.html     liste de liens, incluse dans votes_deputes.html
  _includes/scrutins-senat-liste.html  liste de liens, incluse dans votes_senateurs.html

Règles reprises de assets/js/votes-logic.js et votes-senat-logic.js, pour que
les pages statiques disent exactement la même chose que l'outil de recherche :
  - positions officielles uniquement (pour, contre, abstention, non-votant·e) ;
  - mise au point : le vote enregistré fait foi, la mise au point est signalée ;
  - suppléance : la position du ou de la suppléant·e est listée à part,
    jamais fusionnée avec celle du ou de la titulaire ;
  - aucun score, aucun classement ; groupes triés par effectif.

Les fichiers de scrutins/ sont entièrement générés : ne pas les modifier à la
main. La date last_modified_at d'une page ne change que si son contenu change.
"""
import datetime
import html
import json
import pathlib
import re

RACINE = pathlib.Path(__file__).resolve().parent.parent
INC = RACINE / "_includes"
SORTIE = RACINE / "scrutins"
# Libellés en clair, repris de la méthodologie de la page des votes, pour les
# scrutins dont l'intitulé officiel ne dit pas l'objet (amendements).
# Clé : numéro du scrutin de l'Assemblée nationale.
EN_CLAIR = {
    "8308": "amendement instaurant l'imprescriptibilité des crimes sexuels sur mineurs",
    "8429": "rétablissement de la réclusion criminelle à perpétuité pour viol sériel sur mineur de quinze ans",
}

MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
        "août", "septembre", "octobre", "novembre", "décembre"]


def e(texte) -> str:
    return html.escape(str(texte), quote=False)


def date_fr(iso: str) -> str:
    a, m, j = (int(x) for x in iso.split("-"))
    return f"{'1er' if j == 1 else j} {MOIS[m - 1]} {a}"


def objet(titre: str) -> str:
    """Intitulé officiel, sans « sur » initial ni point final, majuscule en tête."""
    t = re.sub(r"^sur\s+", "", titre.strip()).rstrip(".")
    return t[0].upper() + t[1:]


def sujet(titre: str) -> str:
    """Objet du vote sans « l'ensemble de la / du », pour les balises title."""
    t = objet(titre)
    t = re.sub(r"^(L'ensemble (de la |du |de l')|La |Le )", "", t)
    return t[0].lower() + t[1:]


def tronque(texte: str, maxi: int) -> str:
    if len(texte) <= maxi:
        return texte
    return texte[:maxi].rsplit(" ", 1)[0].rstrip(" ,;:—-") + "…"


def yaml_str(texte: str) -> str:
    return '"' + texte.replace("\\", "\\\\").replace('"', '\\"') + '"'


def ecrire_page(chemin: pathlib.Path, front: dict, corps: str) -> bool:
    """Écrit la page ; conserve last_modified_at si le contenu est inchangé."""
    aujourd_hui = datetime.date.today().isoformat()

    def rendu(date: str) -> str:
        lignes = ["---"]
        for cle, val in front.items():
            lignes.append(f"{cle}: {val}")
        lignes += [f"last_modified_at: {date}", "---",
                   "{% comment %}Fichier généré par scripts/generate_scrutin_pages.py — ne pas modifier à la main.{% endcomment %}",
                   corps.rstrip(), ""]
        return "\n".join(lignes)

    if chemin.exists():
        ancien = chemin.read_text(encoding="utf-8")
        m = re.search(r"^last_modified_at: (\S+)$", ancien, re.M)
        if m and rendu(m.group(1)) == ancien:
            return False
    chemin.write_text(rendu(aujourd_hui), encoding="utf-8")
    return True


def tableau_groupes(ventilation: dict, groupes: dict, senat: bool) -> str:
    codes = sorted(ventilation, key=lambda c: -(ventilation[c].get("E") or 0))
    entetes = ["Groupe", "Pour", "Contre", "Abstention"]
    entetes += ["N'ont pas pris part au vote"] if senat else ["Non-votant·es", "Absent·es"]
    entetes.append("Membres")
    lignes = []
    for code in codes:
        c = ventilation[code]
        eff = c.get("E") or (c["P"] + c["C"] + c["A"] + c["N"])
        nom = groupes.get(code, {}).get("nom", code)
        cellules = [c["P"], c["C"], c["A"], c["N"]]
        if not senat:
            cellules.append(max(0, eff - c["P"] - c["C"] - c["A"] - c["N"]))
        cellules.append(eff)
        lignes.append("<tr><th scope=\"row\">" + e(nom) + " <span>(" + e(code) + ")</span></th>"
                      + "".join(f"<td>{n}</td>" for n in cellules) + "</tr>")
    return ("<div class=\"scrutin-table-wrap\"><table class=\"scrutin-table\">\n<thead><tr>"
            + "".join(f"<th scope=\"col\">{e(h)}</th>" for h in entetes)
            + "</tr></thead>\n<tbody>\n" + "\n".join(lignes) + "\n</tbody></table></div>")


def liste_noms(titre: str, entrees: list) -> str:
    if not entrees:
        return ""
    items = "\n".join(f"<li>{x}</li>" for x in entrees)
    return (f"<h3>{e(titre)} <span>({len(entrees)})</span></h3>\n"
            f"<ul class=\"scrutin-noms\">\n{items}\n</ul>")


def cle_tri(nom: str) -> str:
    return nom.split(" ", 1)[-1].lower() if " " in nom else nom.lower()


# ----------------------------------------------------------------- Assemblée
def pages_an() -> list:
    d = json.loads((INC / "votes-data.json").read_text(encoding="utf-8"))
    deputes, groupes = d["deputes"], d["groupes"]
    lib_map = {"P": "pour", "C": "contre", "A": "abstention", "N": "non-votant·e"}
    lib_sup = {"P": "pour", "C": "contre", "A": "abstention",
               "N": "non-votant·e (catégorie officielle)"}
    index = []
    for uid in d["meta"]["ordre"]:
        s = d["scrutins"][uid]
        num = re.search(r"V(\d+)$", uid).group(1)
        obj = objet(s["titre"])
        syn = s["synthese"]
        votes = d["votes"].get(uid, {})
        maps = d.get("misesAuPoint", {}).get(uid, {})
        sups = d.get("suppleances", {}).get(uid, {})
        clair = EN_CLAIR.get(num)
        url = f"/votes-deputes/scrutin-{num}/"
        officiel = f"https://www.assemblee-nationale.fr/dyn/17/scrutins/{num}"

        par_pos = {"P": [], "C": [], "A": [], "N": []}
        for pa, pos in votes.items():
            dep = deputes.get(pa)
            if not dep or pos not in par_pos:
                continue
            ligne = f"{e(dep['nom'])} <span>{e(dep['groupe'])} · {e(dep['dept'])}</span>"
            if pa in maps:
                ligne += f" <em>mise au point déposée : souhaitait « {lib_map[maps[pa]]} »</em>"
            par_pos[pos].append((cle_tri(dep["nom"]), ligne))
        listes = {k: [l for _, l in sorted(v)] for k, v in par_pos.items()}
        sup_lignes = []
        for pa, sup in sups.items():
            titulaire = deputes.get(pa, {}).get("nom", "un·e député·e")
            sup_lignes.append(f"{e(sup['nom'])} <span>suppléant·e de {e(titulaire)}</span> "
                              f"<em>a voté {lib_sup[sup['pos']]}</em>")

        corps = f"""<section class="section prose scrutin" aria-labelledby="scrutin-titre">
  <p class="section-eyebrow" aria-hidden="true">Assemblée nationale · {date_fr(s['date'])}</p>
  <h1 class="page-title" id="scrutin-titre">Scrutin n° {num} : {e(clair or sujet(s['titre']))}</h1>
  <p class="section-intro">Scrutin public du {date_fr(s['date'])} à l'Assemblée nationale (17e législature). Vote sur {e(obj[0].lower() + obj[1:])}. Résultat : {e(s['sort'][0].lower() + s['sort'][1:])}.</p>

  <ul class="scrutin-synthese">
    <li><strong>{e(syn['pour'])}</strong> pour</li>
    <li><strong>{e(syn['contre'])}</strong> contre</li>
    <li><strong>{e(syn['abstentions'])}</strong> abstention(s)</li>
    <li><strong>{e(syn['nonVotants'])}</strong> non-votant·e(s)</li>
  </ul>
  <p><a href="{officiel}" target="_blank" rel="noopener noreferrer">Voir ce scrutin sur le site de l'Assemblée nationale</a></p>

  <h2 id="groupes">Résultat par groupe politique</h2>
  {tableau_groupes(s['ventilation'], groupes, senat=False)}
  <p class="scrutin-note">Ventilation officielle du scrutin : groupes et effectifs au moment du vote, tous les votants comptés (y compris député·es remplacé·es ou parti·es depuis). « Absent·e » recouvre absence, empêchement, mission ou siège alors occupé par un·e suppléant·e — cela n'équivaut pas à un vote contre.</p>

  <h2 id="votes">Vote de chaque député·e</h2>
  <p>Positions officielles des député·es actuellement en exercice. Les député·es qui ne figurent dans aucune liste n'ont pas pris part au vote, ou n'étaient pas encore élu·es à cette date. Le groupe indiqué est le groupe actuel. Les listes ne comprennent pas les ancien·nes député·es : leur total peut être inférieur au résultat officiel ci-dessus.</p>
  {liste_noms('Pour', listes['P'])}
  {liste_noms('Contre', listes['C'])}
  {liste_noms('Abstention', listes['A'])}
  {liste_noms('Non-votant·es (catégorie officielle)', listes['N'])}
  {liste_noms('Votes de suppléant·es occupant alors le siège', sup_lignes)}
  {'<p class="scrutin-note">Mise au point : correction déposée après le vote et publiée au Journal officiel. Le vote enregistré fait foi.</p>' if maps else ''}

  <p class="scrutin-actions"><a href="/votes-deputes/">Chercher un·e député·e sur l'ensemble des scrutins</a> · <a href="/ecrire-a-mon-elu/">Écrire à mon élu·e</a></p>
  <p class="scrutin-note">Source : data.assemblee-nationale.fr (open data officiel). Méthode et périmètre : <a href="/a-propos/#votes">À propos et méthodologie</a>.</p>
</section>"""
        corps = re.sub(r"\n\s*\n(\s*\n)+", "\n\n", corps)
        front = {
            "layout": "default",
            "title": yaml_str(tronque(f"Scrutin n° {num} : {clair or sujet(s['titre'])}", 95)),
            "description": yaml_str(tronque(
                f"Scrutin public n° {num} du {date_fr(s['date'])} à l'Assemblée nationale : "
                f"{syn['pour']} pour, {syn['contre']} contre, {syn['abstentions']} abstention(s). "
                f"Résultat par groupe et vote de chaque député·e.", 160)),
            "permalink": url,
            "breadcrumb": yaml_str(f"Scrutin n° {num}"),
            "breadcrumb_parent": yaml_str("Votes des député·es"),
            "breadcrumb_parent_url": "/votes-deputes/",
            "voir_aussi": "[votes-deputes, observatoire-an, ecrire]",
        }
        ecrire_page(SORTIE / f"an-{num}.html", front, corps)
        index.append((s["date"], f'<li><a href="{url}">Scrutin n° {num}</a> · {date_fr(s["date"])} — {e(clair or sujet(s["titre"]))}</li>'))
    return index


# --------------------------------------------------------------------- Sénat
def pages_senat() -> list:
    d = json.loads((INC / "senat-votes-data.json").read_text(encoding="utf-8"))
    senateurs, groupes = d["senateurs"], d["groupes"]
    index = []
    for uid in d["meta"]["ordre"]:
        s = d["scrutins"][uid]
        annee, num = re.match(r"scr(\d{4})-(\d+)$", uid).groups()
        session = f"{annee}-{int(annee) + 1}"
        obj = objet(s["titre"])
        syn = s["synthese"]
        votes = d["votes"].get(uid, {})
        url = f"/votes-senateurs/scrutin-{annee}-{num}/"
        officiel = f"https://www.senat.fr/scrutin-public/{annee}/{uid}.html"

        par_pos = {"P": [], "C": [], "A": [], "N": []}
        for mat, pos in votes.items():
            sen = senateurs.get(mat)
            if not sen or pos not in par_pos:
                continue
            par_pos[pos].append((cle_tri(sen["nom"]),
                                 f"{e(sen['nom'])} <span>{e(sen['groupe'])} · {e(sen['dept'])}</span>"))
        listes = {k: [l for _, l in sorted(v)] for k, v in par_pos.items()}
        map_note = ('<p class="scrutin-note">Une mise au point a été publiée en séance pour ce scrutin. '
                    'Le vote enregistré fait foi.</p>') if s.get("miseAuPoint") else ""

        corps = f"""<section class="section prose scrutin" aria-labelledby="scrutin-titre">
  <p class="section-eyebrow" aria-hidden="true">Sénat · {date_fr(s['date'])}</p>
  <h1 class="page-title" id="scrutin-titre">Sénat, scrutin n° {num} : {e(sujet(s['titre']))}</h1>
  <p class="section-intro">Scrutin public du {date_fr(s['date'])} au Sénat (session {session}). Vote sur {e(obj[0].lower() + obj[1:])}. Résultat : {e(s['sort'][0].lower() + s['sort'][1:])}.</p>

  <ul class="scrutin-synthese">
    <li><strong>{e(syn['pour'])}</strong> pour</li>
    <li><strong>{e(syn['contre'])}</strong> contre</li>
    <li><strong>{e(syn['abstentions'])}</strong> abstention(s)</li>
    <li><strong>{e(syn['nppv'])}</strong> n'ont pas pris part au vote</li>
  </ul>
  <p><a href="{officiel}" target="_blank" rel="noopener noreferrer">Voir ce scrutin sur le site du Sénat</a></p>
  {map_note}

  <h2 id="groupes">Résultat par groupe politique</h2>
  {tableau_groupes(s['ventilation'], groupes, senat=True)}
  <p class="scrutin-note">Ventilation officielle du scrutin : groupes et effectifs au moment du vote, tous votants compris (y compris sénateur·rices ayant quitté le Sénat depuis). « N'a pas pris part au vote » est la catégorie officielle unique du Sénat : elle couvre l'absence comme le non-vote volontaire et n'équivaut pas à un vote contre.</p>

  <h2 id="votes">Vote de chaque sénateur·rice</h2>
  <p>Positions officielles des sénateur·rices du référentiel du site. Le groupe indiqué est le groupe actuel. Les listes ne comprennent pas les sénateur·rices ayant quitté le Sénat : leur total peut être inférieur au résultat officiel ci-dessus.</p>
  {liste_noms('Pour', listes['P'])}
  {liste_noms('Contre', listes['C'])}
  {liste_noms('Abstention', listes['A'])}
  {liste_noms("N'ont pas pris part au vote (catégorie officielle)", listes['N'])}

  <p class="scrutin-actions"><a href="/votes-senateurs/">Chercher un·e sénateur·rice sur l'ensemble des scrutins</a> · <a href="/votes-deputes/">Votes des député·es</a></p>
  <p class="scrutin-note">Sources : senat.fr (pages officielles des scrutins publics) et data.senat.fr. Méthode et périmètre : <a href="/a-propos/#votes">À propos et méthodologie</a>.</p>
</section>"""
        corps = re.sub(r"\n\s*\n(\s*\n)+", "\n\n", corps)
        front = {
            "layout": "default",
            "title": yaml_str(tronque(f"Sénat, scrutin n° {num} : {sujet(s['titre'])}", 95)),
            "description": yaml_str(tronque(
                f"Scrutin public n° {num} du {date_fr(s['date'])} au Sénat : {syn['pour']} pour, "
                f"{syn['contre']} contre, {syn['abstentions']} abstention(s). "
                f"Résultat par groupe et vote de chaque sénateur·rice.", 160)),
            "permalink": url,
            "breadcrumb": yaml_str(f"Scrutin n° {num}"),
            "breadcrumb_parent": yaml_str("Votes des sénateur·rices"),
            "breadcrumb_parent_url": "/votes-senateurs/",
            "voir_aussi": "[votes-senateurs, votes-deputes, observatoire-ciivise]",
        }
        ecrire_page(SORTIE / f"senat-{annee}-{num}.html", front, corps)
        index.append((s["date"], f'<li><a href="{url}">Scrutin n° {num}</a> · {date_fr(s["date"])} — {e(sujet(s["titre"]))}</li>'))
    return index


def ecrire_liste(nom: str, index: list) -> None:
    lignes = [l for _, l in sorted(index, reverse=True)]
    (INC / nom).write_text(
        "{% comment %}Généré par scripts/generate_scrutin_pages.py{% endcomment %}\n"
        "<ul class=\"scrutins-liste\">\n" + "\n".join(lignes) + "\n</ul>\n", encoding="utf-8")


def main() -> None:
    SORTIE.mkdir(exist_ok=True)
    an, senat = pages_an(), pages_senat()
    ecrire_liste("scrutins-an-liste.html", an)
    ecrire_liste("scrutins-senat-liste.html", senat)
    print(f"{len(an)} pages Assemblée nationale et {len(senat)} pages Sénat générées dans scrutins/")


if __name__ == "__main__":
    main()
