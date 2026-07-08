#!/usr/bin/env python3
"""Génère _includes/senat-votes-data.json depuis les pages officielles senat.fr
sauvegardées localement + le référentiel sénateurs ODSEN_GENERAL.csv.

Usage :
    python3 generate_votes_senat.py <dossier> <sortie.json>

<dossier> doit contenir :
- les pages de scrutin sauvegardées depuis senat.fr (« Scrutin n°NNN - séance du ... - Sénat.html »),
  une par scrutin de la liste SCRUTINS ci-dessous
  (source : https://www.senat.fr/scrutin-public/YYYY/scrYYYY-NNN.html) ;
- ODSEN_GENERAL.csv (base « Sénateurs » de data.senat.fr, encodage Windows-1252).

Spécificités Sénat (vs pipeline AN) :
- Pas d'open data scrutins : parsing du HTML officiel. Si senat.fr change de gabarit,
  adapter les regex (elles ciblent les accordéons Bootstrap du gabarit 2024-2026).
- Catégories : Pour / Contre / Abstention / « N'a pas pris part au vote » (NPPV).
  Pas de distinction officielle entre non-votant présent et absent. Pour chaque
  groupe, P+C+A+NPPV = effectif (vérifié par le script).
- Les positions nominatives viennent des listes « Analyse détaillée » (liens vers
  les fiches sénateur → matricule) ; la ventilation par groupe vient des blocs
  « Analyse par groupes politiques » (effectifs au moment du vote).
- Le groupe affiché sur la fiche d'un·e sénateur·rice est son groupe ACTUEL (CSV) ;
  la ventilation par groupe est celle au moment du vote — même convention qu'à l'AN.
- Une éventuelle mise au point en séance est signalée (drapeau misesAuPoint).

Validation après génération : json.loads sur la sortie ; le script vérifie
P+C+A+N == E pour chaque groupe de chaque scrutin et la cohérence des totaux.
"""
import csv
import glob
import html as htmllib
import json
import os
import re
import sys

# ── Sélection éditoriale VALIDÉE par Ben le 2026-07-06 ──
# Règle de cohérence avec le tracker AN : votes « sur l'ensemble » uniquement,
# justice des mineurs incluse, PJL justice criminelle exclu (absent du tracker AN).
# Détail : passation/candidats-scrutins-senat.md. Nota : la PPL mineurs/réseaux
# sociaux (ppl25-304, dans le tracker AN) n'a pas eu de scrutin public « ensemble »
# au Sénat — mentionné dans la méthodologie de la page.
SCRUTINS = [
    ("scr2024-243", 243, "2025-03-26"),
    ("scr2024-253", 253, "2025-04-03"),
    ("scr2024-289", 289, "2025-05-19"),
    ("scr2024-326", 326, "2025-06-18"),
    ("scr2025-185", 185, "2026-02-10"),
    ("scr2025-226", 226, "2026-04-09"),
]

# Nom officiel du groupe (page scrutin) → code court + couleur.
# Couleurs : palette du site, familles politiques proches du tracker AN.
GROUPES = {
    "Les Républicains":                                            ("LR",     "#4A7AB5"),
    "Socialiste, Écologiste et Républicain":                       ("SER",    "#C4547D"),
    "Union Centriste":                                             ("UC",     "#F07E26"),
    "Les Indépendants - République et Territoires":                ("LIRT",   "#3367A7"),
    "Rassemblement des démocrates, progressistes et indépendants": ("RDPI",   "#7B4591"),
    "Communiste Républicain Citoyen et Écologiste - Kanaky":       ("CRCE-K", "#830E21"),
    "du Rassemblement Démocratique et Social Européen":            ("RDSE",   "#B8860B"),
    "Écologiste - Solidarité et Territoires":                      ("GEST",   "#4C8C4E"),
    "_NI":                                                         ("NI",     "#8D949A"),
}
# Codes du CSV ODSEN → codes courts ci-dessus
CSV_GROUPES = {"Les Républicains": "LR", "SER": "SER", "UC": "UC",
               "Les Indépendants": "LIRT", "RDPI": "RDPI", "CRCE-K": "CRCE-K",
               "RDSE": "RDSE", "GEST": "GEST", "NI": "NI"}

POSITIONS = [(r"Ont\s+voté\s+pour", "P"), (r"Ont\s+voté\s+contre", "C"),
             (r"Abstentions?", "A"), (r"N['’]ont\s+pas\s+pris\s+part\s+au\s+vote", "N")]


def clean(s):
    s = htmllib.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def parse_scrutin(path):
    t = open(path, encoding="utf-8").read()

    # Numéro et date (titre de page)
    m = re.search(r"Scrutin n°(\d+) - séance du ([^<]+?) -", t)
    num = int(m.group(1))

    # Objet + sort ("sur l'ensemble de la proposition de loi ... " + "Adopté"/"Rejeté")
    m = re.search(r"(sur l['’]ensemble d[^<]{20,500}?)</", t)
    objet = clean(m.group(1)) if m else None
    sort = "Adopté" if re.search(r">\s*Adopté\s*<", t) else ("Rejeté" if re.search(r">\s*Rejeté\s*<", t) else None)

    # Résultat global
    flat = re.sub(r"<[^>]+>", "|", t)
    flat = re.sub(r"\s+", " ", flat)
    m = re.search(
        r"Résultat du scrutin.{0,200}?Le Sénat (a adopté|n'a pas adopté|a rejeté).{0,80}?"
        r"(\d+)\|? votants.{0,80}?(\d+)\|? suffrages exprimés.{0,80}?"
        r"(\d+)\|? pour.{0,80}?(\d+)\|? contre.{0,120}?Abstention\D{0,10}(\d+).{0,120}?"
        r"N'ont pas pris part au vote\D{0,10}(\d+)", flat)
    if not m:
        raise ValueError(f"{path} : bloc « Résultat du scrutin » introuvable — gabarit modifié ?")
    synthese = {"votants": int(m.group(2)), "exprimes": int(m.group(3)),
                "pour": int(m.group(4)), "contre": int(m.group(5)),
                "abstentions": int(m.group(6)), "nppv": int(m.group(7))}
    mise_au_point = "mise au point en séance publique" in flat

    # Ventilation par groupe : « Groupe X : NN sénateurs ... Pour : n Contre : n Abstention(s) : n N'a/ont pas pris part au vote : n »
    ventil = {}
    bloc_groupes = t[t.find("Analyse par groupes politiques"):t.find("Analyse détaillée")]
    pat = re.compile(
        r"Groupe ([^<:&]{3,70})&nbsp;:\s*(\d+)\s*<[^>]*>\s*sénateurs.{0,600}?"
        r"Pour&nbsp;:\s*<[^>]*>\s*(\d+).{0,300}?Contre&nbsp;:\s*<[^>]*>\s*(\d+)"
        r".{0,300}?Abstentions?&nbsp;:\s*<[^>]*>\s*(\d+).{0,300}?pas pris part au vote&nbsp;:\s*<[^>]*>\s*(\d+)",
        re.S)
    for g in pat.finditer(bloc_groupes):
        nom = clean(g.group(1))
        code = GROUPES.get(nom, (None,))[0]
        if code is None:
            raise ValueError(f"{path} : groupe inconnu « {nom} » — l'ajouter à GROUPES")
        ventil[code] = {"E": int(g.group(2)), "P": int(g.group(3)), "C": int(g.group(4)),
                        "A": int(g.group(5)), "N": int(g.group(6))}
    # Sénateurs sans groupe (réunion administrative) — libellé différent
    g = re.search(r"(?:Sénateurs ne figurant sur la liste\s+d['’]aucun groupe|Réunion administrative[^<:&]{0,60})&nbsp;:\s*(\d+)\s*<[^>]*>\s*sénateurs.{0,600}?"
                  r"Pour&nbsp;:\s*<[^>]*>\s*(\d+).{0,300}?Contre&nbsp;:\s*<[^>]*>\s*(\d+)"
                  r".{0,300}?Abstentions?&nbsp;:\s*<[^>]*>\s*(\d+).{0,300}?pas pris part au vote&nbsp;:\s*<[^>]*>\s*(\d+)",
                  bloc_groupes, re.S)
    if g:
        ventil["NI"] = {"E": int(g.group(1)), "P": int(g.group(2)), "C": int(g.group(3)),
                        "A": int(g.group(4)), "N": int(g.group(5))}

    # Contrôle d'intégrité par groupe
    for code, c in ventil.items():
        if c["P"] + c["C"] + c["A"] + c["N"] != c["E"]:
            raise ValueError(f"{path} {code} : P+C+A+N != effectif ({c})")

    # Positions nominatives : section « Analyse détaillée », listes avec liens fiches
    detail = t[t.find("Analyse détaillée"):]
    votes = {}
    # découpe la section par position, dans l'ordre d'apparition
    idx = []
    for label, code in POSITIONS:
        # ne retient que les libellés de boutons d'accordéon (listes nominatives liées)
        for mm in re.finditer(r"accordion-collapse-\d\"[^>]*>\s*" + label + r"\s*</button>", detail):
            idx.append((mm.end(), label, code))
            break
    idx.sort()
    for k, (p, label, code) in enumerate(idx):
        fin = idx[k + 1][0] if k + 1 < len(idx) else len(detail)
        seg = detail[p:fin]
        for mm in re.finditer(r"/senateur/([a-z0-9_]+?)(\d{2}\d{3}[a-z])\.html", seg):
            votes[mm.group(2).upper()] = code
    return num, {"titre": objet, "date": None, "sort": sort, "synthese": synthese,
                 "miseAuPoint": mise_au_point, "ventilation": ventil}, votes


def parse_senateurs(csv_path):
    lines = [l for l in open(csv_path, encoding="cp1252") if not l.startswith("%")]
    rows = list(csv.reader(lines))
    hdr = rows[0]
    i = {c: hdr.index(c) for c in hdr}
    sens = {}
    for r in rows[1:]:
        if len(r) != len(hdr) or r[i["État"]].strip() != "ACTIF":
            continue
        mat = r[i["Matricule"]].strip().upper()
        email = r[i["Courrier électronique"]].strip()
        sens[mat] = {
            "nom": f"{r[i['Prénom usuel']].strip()} {r[i['Nom usuel']].strip()}",
            "civ": r[i["Qualité"]].strip(),
            "dept": r[i["Circonscription"]].strip(),
            "groupe": CSV_GROUPES.get(r[i["Groupe politique"]].strip(), "NI"),
            "email": email if "@" in email else ""}
    return sens


def main(dossier, out_path):
    sens = parse_senateurs(os.path.join(dossier, "ODSEN_GENERAL.csv"))
    print(f"{len(sens)} sénateur·rices actifs (ODSEN)")

    fichiers = {}
    for f in glob.glob(os.path.join(dossier, "*.html")):
        m = re.search(r"Scrutin n°(\d+)", os.path.basename(f))
        if m:
            fichiers[int(m.group(1))] = f

    scrutins, votes, ordre = {}, {}, []
    for sid, num, date in SCRUTINS:
        if num not in fichiers:
            sys.exit(f"Fichier manquant pour le scrutin n°{num} ({sid})")
        n, sc, vm = parse_scrutin(fichiers[num])
        assert n == num
        sc["date"] = date
        # cohérence globale : somme des ventilations == synthèse
        tot = {k: sum(c[k] for c in sc["ventilation"].values()) for k in "EPCAN"}
        syn = sc["synthese"]
        assert tot["P"] == syn["pour"] and tot["C"] == syn["contre"], (sid, tot, syn)
        assert tot["A"] == syn["abstentions"] and tot["N"] == syn["nppv"], (sid, tot, syn)
        # cohérence nominative : positions individuelles vs synthèse
        from collections import Counter
        cnt = Counter(vm.values())
        assert cnt["P"] == syn["pour"] and cnt["C"] == syn["contre"], (sid, cnt, syn)
        scrutins[sid] = sc
        # ne garde nominativement que les sénateur·rices en exercice (comme à l'AN)
        votes[sid] = {mat: pos for mat, pos in vm.items() if mat in sens}
        ordre.append(sid)
        print(f"{sid} OK — {len(vm)} positions nominatives ({len(vm)-len(votes[sid])} ex-sénateur·rices non attribuées)")

    groupes = {code: {"nom": (nom if nom != "_NI" else "Sans groupe (réunion administrative)"), "couleur": coul}
               for nom, (code, coul) in GROUPES.items()}

    data = {
        "meta": {
            "chambre": "Sénat",
            "genereLe": "2026-07-06",
            "source": "senat.fr (pages officielles des scrutins publics) et data.senat.fr (base Sénateurs ODSEN, licence open data Sénat)",
            "perimetre": ("Scrutins publics « sur l'ensemble » des sessions 2024-2025 et 2025-2026 relatifs à la protection de l'enfance, "
                          "aux violences sexuelles et sexistes et aux mineurs — périmètre aligné sur le tracker Assemblée nationale. "
                          "Sélection validée le 2026-07-06 (voir passation/candidats-scrutins-senat.md)."),
            "note": ("P=pour, C=contre, A=abstention, N=« n'a pas pris part au vote » (catégorie officielle unique du Sénat : "
                     "elle couvre sans distinction l'absence et le non-vote volontaire ; P+C+A+N = effectif du groupe). "
                     "Absence de clé pour un·e sénateur·rice = pas encore en fonction à cette date ou position non publiée. "
                     "La ventilation par groupe est celle du moment du vote ; le groupe affiché sur les fiches est le groupe actuel. "
                     "miseAuPoint=true : une mise au point a été publiée en séance (le vote enregistré fait foi)."),
            "ordre": ordre},
        "groupes": groupes,
        "senateurs": sens,
        "scrutins": scrutins,
        "votes": votes}
    with open(out_path, "w") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"OK : {len(sens)} sénateur·rices, {len(groupes)} groupes, {len(ordre)} scrutins -> {out_path} ({os.path.getsize(out_path)//1024} Ko)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
