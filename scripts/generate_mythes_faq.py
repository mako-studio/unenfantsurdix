#!/usr/bin/env python3
"""Génère _includes/mythes-faq.json (données structurées FAQPage) à partir
des cartes de _includes/mythes.html.

À relancer après toute modification des idées reçues :
    python3 scripts/generate_mythes_faq.py

Chaque carte devient une question (« idée reçue » + « Vrai ou faux ? ») dont
la réponse reprend, sans réécriture, le texte de la carte, sa réserve
éventuelle et ses sources. Le JSON-LD reste ainsi identique au contenu visible.
"""
import html
import json
import pathlib
import re

RACINE = pathlib.Path(__file__).resolve().parent.parent
SOURCE = RACINE / "_includes" / "mythes.html"
CIBLE = RACINE / "_includes" / "mythes-faq.json"


def texte(fragment: str) -> str:
    """Retire les balises et normalise les espaces."""
    brut = re.sub(r"<[^>]+>", "", fragment)
    return re.sub(r"\s+", " ", html.unescape(brut)).strip()


def bloc(carte: str, classe: str) -> str:
    m = re.search(r'<p class="%s">(.*?)</p>' % classe, carte, re.S)
    return texte(m.group(1)) if m else ""


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    cartes = re.split(r'<div class="mythe-card"', source)[1:]
    questions = []
    for carte in cartes:
        mythe_face, verite_face = re.split(r'class="mythe-face truth-side"', carte, maxsplit=1)
        mythe = bloc(mythe_face, "mythe-text")
        reponse = bloc(verite_face, "mythe-text")
        reserve = bloc(verite_face, "mythe-reserve")
        sources = bloc(verite_face, "mythe-source")
        if not mythe or not reponse:
            raise SystemExit("Carte incomplète : " + carte[:120])
        parties = [reponse]
        if reserve:
            parties.append(reserve)
        if sources:
            parties.append("Sources : " + sources)
        questions.append({
            "@type": "Question",
            "name": mythe + " Vrai ou faux ?",
            "acceptedAnswer": {"@type": "Answer", "text": " ".join(parties)},
        })
    faq = {
        "@type": "FAQPage",
        "@id": "https://unenfantsurdix.com/mythes-vs-realite/#faq",
        "mainEntity": questions,
    }
    CIBLE.write_text(json.dumps(faq, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(questions)} idées reçues écrites dans {CIBLE.relative_to(RACINE)}")


if __name__ == "__main__":
    main()
