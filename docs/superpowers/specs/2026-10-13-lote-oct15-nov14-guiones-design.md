# Spec — Lote de guiones Oct 15 → Nov 14 2026 (club-sincronica) + Meditaciones H14-H20 (pipeline-viral)

Fecha: 2026-10-13. Decisión Alquimista: paquete completo de una sola vez ("build ahead").

## Alcance

1. **club-sincronica:** 31 guiones diarios (`guion.md`) para **2026-10-15 → 2026-11-14** (kins ~50-80, verificados con el motor), con su `contexto.json` por día (`generate-day.js`).
2. **pipeline-viral:** 7 guiones de meditación **H14-H20** (kins 53-80) + **BLOCKS 14-20** en `kin-data.js` + `scripts/meditar-h14..h20.mjs` + gate `verify-guion.mjs` ampliado.
3. Fuera de alcance: grabación, transcripción, storyboard, beds, render, publicación (etapas del humano/pipeline posterior).

## Datos y gates (reglas duras heredadas)

- Datos astrales **solo del motor** (`generate-day.js` → `contexto.json`). `generate-day` SIEMPRE antes de escribir el guion, NUNCA después (DNR #15).
- Lema outro = `contexto.json → tzolkin.lema` **literal**; si `isGap`, frase GAP al final sin punto aparte. Género vía `kinName`/`signature` del motor.
- Puente SEO: keyword del nicho dicha en voz alta (`kin maya`/`tzolkin`/`energía del día`) + fase lunar real. Evento solo si fase Nueva/Llena o marcado por el motor.
- Sin CTA; sin "el kin cambia"; español, 1ª persona, voz Alquimista Resiliente.
- Meditaciones: **cero astro** (regex del gate), lemas `mediacion(kin)` verbatim en acts 2-5, timestamps 0/44/170/296/422/548, ≥5 `[PAUSA 2s]`, drone citado en Hz, 180-265w acts 2-4, 180-300w act 5 (poema+mantra), act 6 con "Silencio".
- Gates: `club-sincronica/scripts/verify-guion.js` 31/31; `pipeline-viral/scripts/verify-guion.mjs` 7/7 (ampliado a H20); `meditar-hN.mjs --dry-run` 7/7.
- Sin mojibake (`Ã`/`Â`); grep ASCII-safe en PowerShell (DNR club #19).

## Modos de contar — diarios (continuidad del lote Oct 1-14)

Mapa sello→modo (mismo tono de marca; sub-estilo variado cuando el sello se repita en el lote):

| Sello | Modo |
|---|---|
| Dragón | Haiku con agua |
| Viento | Free verse (verso que se lleva) |
| Noche | Soneto oscuro |
| Serpiente | Verso retrógrado |
| Luna | Canción de cuna |
| Enlazador | Eco en espejo |
| Mano | Coplas de trabajo |
| Estrella | Letrilla estelar |
| Caminante | **Nuevo: Marcha en tres tiempos** (verso de viaje, tres estaciones que se repiten) |
| Semilla | Copla de siembra |
| Perro | **Nuevo: Carta en verso** (lo que el corazón escribe, intimista) |
| Humano | **Nuevo: Oda a lo ordinario** (celebra lo cotidiano) |
| Mago | **Nuevo: Hechizo de boca** (dicho que se repite hasta que se cumple) |
| Mono | **Nuevo: Juego malabar** (versos que se tiran y se atrapan, rimas internas rápidas) |
| Águila | **Nuevo: Canto de altura** (verso largo, panorámico, mirada lejana) |
| Tormenta | Anti-soneto |
| Guerrero | Romance marcial |
| Tierra | Poema-piedra |
| Espejo | Acertijo que se espeja |

Eje por día de semana (heredado): Lun=Vulnerabilidad, Mié=Humor/Consciencia, Vie=Creatividad; Mar/Jue/Sáb/Dom=Investigación/Edición.

## Meditaciones H14-H20

| H | Kins | Fechas | centralDate |
|---|---|---|---|
| H14 | 53-56 | Oct 18-21 | 2026-10-19 |
| H15 | 57-60 | Oct 22-25 | 2026-10-23 |
| H16 | 61-64 | Oct 26-29 | 2026-10-27 |
| H17 | 65-68 | Oct 30-Nov 2 | 2026-10-31 |
| H18 | 69-72 | Nov 3-6 | 2026-11-04 |
| H19 | 73-76 | Nov 7-10 | 2026-11-08 |
| H20 | 77-80 | Nov 11-14 | 2026-11-12 |

- `actNames` = `['Respiración', <palabra sello kin1..4>, 'Cierre']` (mismo patrón que H11-H13; se derivan del motor).
- **Drone** = `droneFreqForBlock(kines)` (chakra del kin central = 2º de 4).
- Por bloque: **1 modo de contar nuevo por acto** (4 modos) + **1 poema** (serie que continúa Floración / Constelación / Testigo → siguientes en la tabla del lote) + **mantra**.
- Guion en `pipeline-viral/content/scripts/HN-meditacion-kins-X-Y.md` (plantilla H13).
- `meditar-h14..h20.mjs` = plantilla de `meditar-h13.mjs` con BLOCKS 14-20 y `--dry-run`.

## Entrega

- Spec (este archivo) + plan en `docs/superpowers/plans/2026-10-13-lote-oct15-nov14-guiones.md` (repo raíz).
- Commits: `club-sincronica` (31 guiones + contextos), `pipeline-viral` (BLOCKS, guiones, scripts, gate), raíz (spec/plan/PIPELINE-STATE.md).
- `PIPELINE-STATE.md` actualizado con el nuevo hito + DO-NOT-REPEAT si aparecen correcciones.
