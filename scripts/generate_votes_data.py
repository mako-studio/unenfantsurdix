#!/usr/bin/env python3
"""Génère _includes/votes-data.json depuis les archives open data de l'Assemblée nationale.

Usage :
    python3 generate_votes_data.py <dossier_amo10> <dossier_scrutins> <sortie.json>

- <dossier_amo10>   : dossier décompressé de AMO10_deputes_actifs_mandats_actifs_organes.xml.zip
                      (doit contenir xml/acteur/ et xml/organe/)
- <dossier_scrutins>: dossier décompressé de Scrutins.xml.zip (doit contenir xml/VTANR5L17Vxxx.xml)
- <sortie.json>     : chemin du votes-data.json à écrire

Principes (issus de l'audit du 2026-07-05) :
- La liste des député·es vient du référentiel AMO10 (tous les mandats ASSEMBLEE actifs),
  PAS des votants des scrutins — sinon les député·es n'ayant participé à aucun des 15
  scrutins disparaissent du site.
- Le graphique par groupe utilise la ventilation officielle du scrutin (groupe au moment
  du vote, tous les votants y compris ex-député·es), embarquée dans `scrutins[uid].ventilation`.
- Les mises au point officielles (vote enregistré ≠ intention déclarée) sont embarquées
  dans `misesAuPoint`.
- Abréviations de groupes officielles (UDR, EcoS, Dem…).
"""
import sys, json, glob, os
import xml.etree.ElementTree as ET

NS = '{http://schemas.assemblee-nationale.fr/referentiel}'

# Les 15 scrutins retenus (audit thématique — voir passation)
SCRUTINS = ["VTANR5L17V657","VTANR5L17V805","VTANR5L17V1018","VTANR5L17V1196",
            "VTANR5L17V1624","VTANR5L17V1725","VTANR5L17V4714","VTANR5L17V4723",
            "VTANR5L17V5192","VTANR5L17V5226","VTANR5L17V5244","VTANR5L17V5283",
            "VTANR5L17V6563","VTANR5L17V7258","VTANR5L17V7904"]

COULEURS = {  # couleurs officielles conservées de la V1 (clés = abréviations officielles)
    "EPR":"#7B4591","SOC":"#C4547D","RN":"#313567","DR":"#4A7AB5","UDR":"#3367A7",
    "EcoS":"#4C8C4E","Dem":"#F07E26","GDR":"#830E21","NI":"#8D949A",
    "LFI-NFP":"#C00D0D","LIOT":"#B8860B","HOR":"#4AA5D8"}

# Organes de groupe absents du référentiel AMO10 (groupes dissous/ré-enregistrés).
# PO847173 : organe précédent du groupe UDR (15/16 de ses votants siègent aujourd'hui
# au groupe UDR, dont l'organe actuel PO872880 date du 2025-09-05). Hypothèse vérifiée
# lors de l'audit ; à revalider si l'archive change.
ORGANES_HISTORIQUES = {"PO847173": "UDR"}

def main(amo_dir, scr_dir, out_path):
    # --- organes ---
    organes = {}
    for f in glob.glob(os.path.join(amo_dir, 'xml/organe/*.xml')):
        r = ET.parse(f).getroot()
        organes[r.findtext(NS+'uid')] = {
            'type': r.findtext(NS+'codeType'),
            'abrev': r.findtext(NS+'libelleAbrege') or '',
            'lib': r.findtext(NS+'libelle') or ''}

    # --- député·es : tous les mandats ASSEMBLEE actifs de la législature 17 ---
    deputes, groupes_vus = {}, {}
    for f in glob.glob(os.path.join(amo_dir, 'xml/acteur/*.xml')):
        r = ET.parse(f).getroot()
        uid = r.findtext(NS+'uid')
        ident = r.find(f'{NS}etatCivil/{NS}ident')
        nom = f"{ident.findtext(NS+'prenom')} {ident.findtext(NS+'nom')}"
        mandat_ass, groupe = None, 'NI'
        for m in r.iter(NS+'mandat'):
            to, leg, fin = m.findtext(NS+'typeOrgane'), m.findtext(NS+'legislature'), m.findtext(NS+'dateFin')
            if to == 'ASSEMBLEE' and leg == '17' and not fin:
                mandat_ass = m
            if to == 'GP' and not fin:
                o = organes.get(m.find(f'{NS}organes/{NS}organeRef').text, {})
                groupe = o.get('abrev') or 'NI'
                groupes_vus[groupe] = o.get('lib', groupe)
        if mandat_ass is None:
            continue  # pas député·e en exercice (AMO10 ne devrait pas en contenir)
        el = mandat_ass.find(NS+'election')
        deputes[uid] = {
            'nom': nom,
            'dept': el.findtext(f'{NS}lieu/{NS}departement'),
            'numDept': el.findtext(f'{NS}lieu/{NS}numDepartement'),
            'circo': el.findtext(f'{NS}lieu/{NS}numCirco'),
            'groupe': groupe,
            'mandatDebut': mandat_ass.findtext(NS+'dateDebut')}
    groupes_vus.setdefault('NI', 'Non inscrit')

    groupes = {g: {'nom': lib if g != 'NI' else 'Non inscrit',
                   'couleur': COULEURS.get(g, '#888888')}
               for g, lib in groupes_vus.items()}

    # --- scrutins ---
    scrutins, votes, maps = {}, {}, {}
    CAT = [('pours','P'),('contres','C'),('abstentions','A'),
           ('nonVotants','N'),('nonVotantsVolontaires','N')]
    for sid in SCRUTINS:
        r = ET.parse(os.path.join(scr_dir, f'xml/{sid}.xml')).getroot()
        syn = r.find(NS+'syntheseVote')
        vmap, ventil = {}, {}
        for grp in r.iter(NS+'groupe'):
            oref = grp.findtext(NS+'organeRef')
            o = organes.get(oref)
            label = (o and o['abrev']) or ORGANES_HISTORIQUES.get(oref) or 'Autre'
            dn = grp.find(f'{NS}vote/{NS}decompteNominatif')
            v = ventil.setdefault(label, {'P':0,'C':0,'A':0,'N':0})
            for cat, code in CAT:
                node = dn.find(NS+cat)
                if node is None: continue
                for votant in node.findall(NS+'votant'):
                    a = votant.findtext(NS+'acteurRef')
                    v[code] += 1
                    if a in deputes:
                        vmap[a] = code
        # mises au point officielles (vote enregistré ≠ intention déclarée)
        mp = r.find(NS+'miseAuPoint')
        mps = {}
        if mp is not None:
            for cat, code in CAT + [('dysfonctionnement','D')]:
                for node in mp.findall(NS+cat):
                    for votant in node.findall(NS+'votant'):
                        a = votant.findtext(NS+'acteurRef')
                        if a in deputes:
                            mps[a] = code
        scrutins[sid] = {
            'titre': r.findtext(NS+'titre'),
            'date': r.findtext(NS+'dateScrutin'),
            'sort': r.findtext(f'{NS}sort/{NS}libelle'),
            'synthese': {
                'pour': syn.findtext(f'{NS}decompte/{NS}pour'),
                'contre': syn.findtext(f'{NS}decompte/{NS}contre'),
                'abstentions': syn.findtext(f'{NS}decompte/{NS}abstentions'),
                'nonVotants': syn.findtext(f'{NS}decompte/{NS}nonVotants')},
            'ventilation': ventil}
        votes[sid] = vmap
        if mps: maps[sid] = mps

    data = {
        'meta': {
            'legislature': 17,
            'genereLe': '2026-07-05',
            'source': 'data.assemblee-nationale.fr (open data officiel, jeu "Votes" et référentiel AMO10 du 2026-07-01)',
            'perimetre': "Scrutins publics nominatifs de la 17e legislature (depuis juillet 2024) relatifs a la protection de l'enfance, aux violences faites aux femmes et aux enfants, et a la famille. Liste etablie par audit exhaustif des 7906 scrutins de la legislature.",
            'note': ("P=pour, C=contre, A=abstention, N=non-votant (categorie officielle). "
                     "Absence de cle pour un depute sur un scrutin = n'a pas pris part au vote "
                     "(absence, mission, siege alors occupe par un-e suppleant-e) ou pas encore elu-e a cette date. "
                     "La ventilation par groupe de chaque scrutin est la ventilation officielle au moment du vote, "
                     "tous votants compris (y compris ex-deputes et suppleants ayant quitte l'Assemblee depuis). "
                     "misesAuPoint = corrections officielles publiees au JO (le vote enregistre fait foi)."),
            'ordre': SCRUTINS},
        'groupes': groupes,
        'deputes': deputes,
        'scrutins': scrutins,
        'votes': votes,
        'misesAuPoint': maps}
    with open(out_path, 'w') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f"OK : {len(deputes)} deputes, {len(groupes)} groupes, {len(SCRUTINS)} scrutins, "
          f"mises au point sur {len(maps)} scrutins -> {out_path} ({os.path.getsize(out_path)//1024} Ko)")

if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
