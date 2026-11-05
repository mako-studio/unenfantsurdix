#!/usr/bin/env python3
"""Ajoute à _includes/votes-data.json un scrutin AN lu depuis sa page officielle
« Analyse du scrutin » sauvegardée (assemblee-nationale.fr/dyn/17/scrutins/NNNN),
quand l'archive open data Scrutins.xml.zip n'est pas disponible.

Usage :
    python3 ajouter_scrutin_an_html.py <page.html> <dossier_amo30> <votes-data.json> <AAAA-MM-JJ>

Même format de sortie que generate_votes_data.py pour ce scrutin (titre, date, sort,
synthèse, ventilation officielle par groupe avec effectif, positions nominatives des
député·es en exercice). Limites par rapport au pipeline XML :
- les suppléances ne sont pas recalculées pour ce scrutin ;
- les mises au point nominatives ne sont pas lues (la page n'en publiait aucune
  pour le n° 9241 au 5 novembre 2026).
Le scrutin est aussi listé dans SCRUTINS de generate_votes_data.py : la prochaine
régénération complète depuis l'open data le recalculera à l'identique ou mieux.
Contrôles : somme des ventilations == synthèse ; positions nominatives == ventilation.
"""
import datetime, html as htmllib, json, os, re, sys


def main(page, amo_dir, out_path, date):
    t = open(page, encoding="utf-8").read()
    num = re.search(r"Analyse du scrutin n°\s*(\d+)", htmllib.unescape(t)).group(1)
    sid = f"VTANR5L17V{num}"
    sans_js = re.sub(r"<script.*?</script>|<style.*?</style>", "", t, flags=re.S)
    flat = htmllib.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "|", sans_js)))
    flat = re.sub(r"(\|\s*)+", "|", flat)
    titre = re.search(r"sur (l'ensemble [^|]+?)\|\s*Synthèse du vote", flat).group(1).strip()
    g = lambda lab: int(re.search(lab + r"\s*:\s*\|(\d+)", flat).group(1))
    pour, contre, abst = g("Pour l'adoption"), g(r"\|Contre"), g(r"\|Abstention")
    sort = re.search(r"\|(L'Assemblée nationale (?:a adopté|n'a pas adopté))\|", flat).group(1)
    sort = sort[0].lower() + sort[1:]

    d = json.load(open(out_path, encoding="utf-8"))
    if sid in d["scrutins"]:
        sys.exit(f"{sid} déjà présent dans {out_path}")

    # Ventilation : un bloc par groupe (lien /dyn/org/POxxx, « (N membres) »),
    # puis des sous-listes Pour / Contre / Abstention / Non votant avec data-acteur-id.
    bloc = t[t.find("Répartition des votes par groupe"):t.find("Mises au point")]
    starts = [m for m in re.finditer(r'href="/dyn/org/(PO\d+)"[^>]*>[^<]*</a>\s*</h3>\s*<span>\((\d+) membres?\)', bloc)]
    CODES = {"Pour": "P", "Contre": "C", "Abstention": "A", "Non votant": "N", "Non votants": "N"}
    ventil, vmap = {}, {}
    for k, m in enumerate(starts):
        seg = bloc[m.end(): starts[k + 1].start() if k + 1 < len(starts) else len(bloc)]
        po, eff = m.group(1), int(m.group(2))
        # libelleAbrege = abréviation utilisée par generate_votes_data.py (EcoS, Dem, UDR)
        abrev = re.search(r"<libelleAbrege>([^<]+)", open(os.path.join(amo_dir, "organe", f"{po}.xml"), encoding="utf-8").read()).group(1)
        v = ventil.setdefault(abrev, {"E": 0, "P": 0, "C": 0, "A": 0, "N": 0})
        v["E"] += eff
        pos = list(re.finditer(r'<span class="h6[^"]*">\s*([^<]+?)\s*</span>\s*<span>:\s*(\d+)</span>', seg))
        for j, p in enumerate(pos):
            code = CODES[p.group(1)]
            sub = seg[p.end(): pos[j + 1].start() if j + 1 < len(pos) else len(seg)]
            ids = re.findall(r'data-acteur-id="(PA\d+)', sub)
            assert len(ids) == int(p.group(2)), (abrev, p.group(1), len(ids), p.group(2))
            v[code] += len(ids)
            for a in ids:
                if a in d["deputes"]:
                    vmap[a] = code
    tot = {c: sum(x[c] for x in ventil.values()) for c in "PCAN"}
    assert (tot["P"], tot["C"], tot["A"]) == (pour, contre, abst), (tot, pour, contre, abst)

    d["scrutins"][sid] = {"titre": titre, "date": date, "sort": sort,
                          "synthese": {"pour": str(pour), "contre": str(contre),
                                       "abstentions": str(abst), "nonVotants": str(tot["N"])},
                          "ventilation": ventil}
    d["votes"][sid] = vmap
    d["meta"]["ordre"].append(sid)
    d["meta"]["source"] += f" ; scrutin n° {num} lu sur sa page officielle (assemblee-nationale.fr) le {datetime.date.today().isoformat()}"
    with open(out_path, "w") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    print(f"OK : {sid} ajouté — {pour} pour, {contre} contre, {abst} abst., {tot['N']} non-votant(s) ; "
          f"{len(vmap)} positions nominatives de député·es en exercice")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    main(*sys.argv[1:])
