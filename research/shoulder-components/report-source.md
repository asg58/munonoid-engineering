# Munonoid schoudercomponenten — intern bronrapport

Onderzoeksdatum: 2026-09-05. Doel: alleen fabrikantdata en fabrikantbeheerde repositories toelaten als basis voor maatvaste component-CAD.

## Besluit

RobStride RS02 en DAMIAO DM-J4310P-2EC zijn beide technisch serieuze kandidaten met officiële handleidingen en STEP-modellen. De RS02 heeft meer piekkoppel (17 N·m) maar is groter en zwaarder. De DAMIAO is veel compacter (57 × 49,3 mm, circa 325 g) en sluit aan bij een 24 V proefopstelling, maar levert minder continu- en piekkoppel. Er is nog geen winnaar: eerst worden kabelkracht, capstanstraal, thermiek en benodigde bewegingshoek berekend.

Het huidige centrale lager is geen geselecteerd marktdeel. Een standaard dun ringlager mag niet stilzwijgend worden gebruikt voor een 3-DOF kogelgewricht. Daarom blijft dit een expliciete release-blocker.

## Vergelijking

| Veld | RobStride RS02 | DAMIAO DM-J4310P-2EC V1.1 |
|---|---:|---:|
| Nominale spanning | 48 V | 24 V uitvoering gekozen voor vergelijking |
| Bedrijfsspanning | 24–60 V | 24–28 V |
| Nominaal koppel | 6 N·m volgens manual; 7 N·m in nieuwere productspecificatie | 3,5 N·m |
| Piekkoppel | 17 N·m | 12,5 N·m |
| Massa | 380 ± 3 g | circa 325 g |
| STEP-bounding box, zelf gemeten | 78,5 × 78,5 × 45,4 mm | 57,0 × 49,05 × 57,0 mm |
| Reductie | 7,75:1 | 10:1 |
| Encoder | 2 magnetische encoders, 14-bit absoluut | 2 magnetische encoders, 16-bit |
| Officiële STEP | Ja | Ja |

## Claim-to-source ledger

| Claim | Primaire bron | Controle |
|---|---|---|
| RS02 productdata, handleiding en STEP worden door fabrikant gepubliceerd | RobStride Product_Information repository, commit `6ad12f50006273b7ea4eea88980f927d97c22f0d` | Repository en bestanden lokaal gecontroleerd |
| RS02 STEP is exact 954 kB-bronbestand met SHA-256 `c988…f063` | Fabrikant-STEP uit bovenstaande commit | Hash en B-Rep bounding box lokaal gemeten |
| DAMIAO onderhoudt een officiële productrepository met handleiding, 2D-tekening, testdata en STEP | DAMIAO Gitee hoofdingang en DM-J4310P subrepository, commits `4711…1564` en `4b1c…a107` | Repositorystructuur lokaal gecontroleerd |
| DAMIAO STEP SHA-256 is `0483…e08a` | Fabrikant-STEP uit commit `4b1c…a107` | Hash en B-Rep bounding box lokaal gemeten |
| RS02 continuvermogen is thermisch afhankelijk | RS02 User Manual 260713, secties 1.2 en 1.3 | Manual vermeldt aluminium koellichaam en afwijkende testcondities |

## Releasevoorwaarden

1. Bepaal arm-massa, zwaartepunt, dynamische factor en gewenste schoudermomenten.
2. Leg capstanstraal en kabelrouting vast; bereken kabelkracht en voorspanning per paar.
3. Selecteer pas dan motor en overbrengingsverhouding.
4. Definieer bewegingsruimte en radiale/axiale belastingen van het centrale 3-DOF gewricht.
5. Voer thermische proef, kabelvermoeiing, noodstop en onafhankelijke veiligheidslaag uit vóór bestelling of productievrijgave.
