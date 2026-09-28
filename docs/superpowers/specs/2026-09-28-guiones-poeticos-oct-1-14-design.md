# Lote guiones poéticos Oct 1-14 — Design

Fecha: 2026-09-28 · Pipeline: club-sincronica · Fase 1 (aprobación humana)

## Objetivo

Escribir los 14 guiones poéticos (modo de contar por sello) del lote Oct 1-14 de
Club Sincrónica: paso 1 del pipeline (Guion), según `club-sincronica/AGENTS.md`
y `content/brand/modos-de-contar.md`.

## Alcance

- `generate-day.js` para los 14 días (contexto.json con astro real del motor).
- 14 `content/output/YYYY-MM-DD/guion.md` escritos a mano (opción 1: voz
  consistente, poesía real — no plantilla, no subagentes).
- NO incluye: grabación, transcripción, storyboard, frames, música ni publicación
  (pasos 2-5 del pipeline, sesiones siguientes con la voz real del Alquimista).

## Kins del lote (motor tzolkin.js)

| Fecha | Kin | Signature | Onda Encantada | Modo de contar | GAP | Eje |
|-------|-----|-----------|----------------|----------------|-----|-----|
| Oct 1 | 36 | Guerrero Planetario | 3 de Mano (pos 10) | Romance marcial | No | Jue (Investigación/Edición) |
| Oct 2 | 37 | Tierra Espectral | 3 de Mano (pos 11) | Poema-piedra | No | Vie (Creatividad) |
| Oct 3 | 38 | Espejo Cristal | 3 de Mano (pos 12) | Acertijo espejado | No | Sáb (Investigación/Edición) |
| Oct 4 | 39 | Tormenta Cósmica | 3 de Mano (pos 13, cierra) | Anti-soneto | **SÍ** | Dom (Investigación/Edición) |
| Oct 5 | 40 | Sol Magnético | 4 de Sol (pos 1, abre) | Letrilla luminosa | No | Lun (Vulnerabilidad) |
| Oct 6 | 41 | Dragón Lunar | 4 de Sol (pos 2) | Haiku con agua | No | Mar (Investigación/Edición) |
| Oct 7 | 42 | Viento Eléctrico | 4 de Sol (pos 3) | Free verse (verso que se lleva) | No | Mié (Humor/Consciencia) |
| Oct 8 | 43 | Noche Autoexistente | 4 de Sol (pos 4) | Soneto oscuro | **SÍ** | Jue (Investigación/Edición) |
| Oct 9 | 44 | Semilla Entonada | 4 de Sol (pos 5) | Copla de siembra | No | Vie (Creatividad) |
| Oct 10 | 45 | Serpiente Rítmica | 4 de Sol (pos 6) | Verso retrógrado | No | Sáb (Investigación/Edición) |
| Oct 11 | 46 | Enlazador de Mundos Resonante | 4 de Sol (pos 7) | Eco en espejo | No | Dom (Investigación/Edición) |
| Oct 12 | 47 | Mano Galáctica | 4 de Sol (pos 8) | Coplas de trabajo | No | Lun (Vulnerabilidad) |
| Oct 13 | 48 | Estrella Solar | 4 de Sol (pos 9) | Letrilla estelar | No | Mar (Investigación/Edición) |
| Oct 14 | 49 | Luna Planetaria | 4 de Sol (pos 10) | Canción de cuna | No | Mié (Humor/Consciencia) |

## Formato de cada guion (canónico 2026-08-26)

1. **Header:** `# Guion — YYYY-MM-DD · {eje}` + `**Kin {n} — {signature}** ·
   {onda} · {sello}` + `**Modo:** {modo}` + `**Fase lunar:** {real del motor}` +
   `**Aspecto del día:** {real del motor}`.
2. **Hook (0-5s):** pregunta o afirmación magnética. Sin presentación previa.
3. **Puente (5-11s):** keyword del nicho dicha en voz alta (`kin maya` /
   `tzolkin` / `energía del día`) + la fase lunar real del día. No hay eclipse
   en Oct 1-14 (verificado con el motor); el puente no usa cuenta regresiva.
4. **Cuerpo:** la pieza artística completa en el modo del sello, con el dato
   astral real integrado DENTRO de la pieza. Sin inventar nada.
5. **Outro:** lema canónico LITERAL de `contexto.json → tzolkin.lema` (NUNCA
   sinónimos). Si `isGap`, añadir al final: ` Soy un Portal de Activación
   Galáctica, entra en mí.` (sin punto aparte) — aplica a Oct 4 y Oct 8.
6. **Notas de interpretación:** tono emocional, recurso del modo, datos usados,
   indicaciones de grabación (pausas, volumen).

## Reglas duras

- Español, primera persona, voz "Alquimista Resiliente". Frases cortas. Humor
  permitido sin solemnidad. Sin CTA (el outro ES la firma).
- Datos astrales SOLO del motor (tzolkin.js / astro.js vía generate-day.js).
  Nunca inventar aspectos/signos/fases.
- Género correlacionado: usar `kinName` y `signature` del motor (ej. "Tormenta
  Cósmica", "Semilla Entonada"), NUNCA sello+tono sueltos mal accordados.
- No mencionar "el kin cambia" ni nada obvio por ser diario. Kin directo.
- Oct 5 puede mencionar el arranque de la Onda Encantada 4 de Sol (evento real,
  activa el renderer de onda); no es "cambio de kin".
- Sin llamadas a la acción médica/legal/financiera.
- **NO re-ejecutar `generate-day.js` después de escribir los guiones** (el
  script regenera `guion.md` desde plantilla y pisa las ediciones — patrón
  observado en Sep 12-30).

## Flujo de implementación

1. Extracción compacta: comando Node que importa los motores y escupe tabla
   compacta de los 14 días (fecha, kin, signature, lema, onda, fase lunar,
   aspectos destacados, isGap) — dieta de contexto.
2. `generate-day.js` ×14 (crea contexto.json + plantilla guion.md).
3. Escribir los 14 guion.md en el formato canónico.
4. Verificación: sin placeholders `{...}` vacíos; lema literal vs contexto.json
   (grep); aspectos/fase lunar vs contexto.json; género correlacionado.
5. Commit en el repo `club-sincronica`.

## Entrega

- 14 `guion.md` + commit. Grabación/transcripción/storyboard quedan para las
  sesiones siguientes.
