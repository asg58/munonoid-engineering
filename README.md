# Munonoid Designer

Versie 0.4 van de 1:1 engineeringomgeving voor Munonoid. Dit is geen getekende robotweergave meer: de browser draait een echte OpenCascade B-Rep CAD-kernel in een aparte worker.

## Huidige functies

- parametrische rechter-schouderassemblage met zes afzonderlijke CAD-solids;
- live herberekening van boringen, montagegaten, platen, lager, motor, as en capstan;
- exacte millimetergeometrie en STEP-export in de browser;
- zichtbare randen en afzonderlijk selecteerbare solids;
- dezelfde schouderassemblage reproduceerbaar gebouwd met CadQuery 2.8/OpenCascade;
- automatische volume-, massa- en bounding-boxrapportage;
- harde vrijgaveblokkade zolang motor en lager nog geen geverifieerde leveranciers-STEP hebben;
- assemblageboom en eigenschappeninspecteur;
- centrale BOM met leveranciers-, sector-, massa-, prijs- en statusvelden;
- directe technische validatiemeldingen;
- CLI voor reproduceerbare robotwijzigingen en validatie;
- lokale MCP-toolserver voor AI-besturing van het digitale ontwerp.

## CLI

```bash
npm run munonoid -- status
npm run munonoid -- components
npm run munonoid -- height 1700
npm run munonoid -- move rightShoulder --x 312 --y 1428.5 --z 210
npm run munonoid -- rotate rightShoulder --roll 0 --pitch 5 --yaw 0
npm run munonoid -- bom list
npm run munonoid -- validate
```

Gebruik `--json` voor machineleesbare uitvoer en `--dry-run` om een wijziging te controleren zonder deze op te slaan. Start de lokale AI-toolserver met `npm run mcp`.

## Professionele CAD-build

```bash
python -m venv .venv
.venv/bin/pip install -r cad/requirements.txt
PYTHONPATH=. .venv/bin/python -m cad.build
PYTHONPATH=. .venv/bin/python -m unittest cad.test_build
```

De build maakt een STEP-assemblage, een GLB-weergavemodel en een controleerbaar massarapport. Leveranciersonderdelen worden niet stilzwijgend nagetekend: zonder fabrikant, MPN, datasheet en STEP-bestand blijven ze expliciet een `envelope` en blokkeren ze productievrijgave.

De huidige besturing verandert alleen het digitale ontwerp. Dynamische simulatie en fysieke motorbesturing volgen pas na afzonderlijke validatie- en veiligheidslagen.
