# ESTRUCTURA-CANONICA.md — "La Biblia" de Club Sincrónica (shorts diarios)

**Ancla de calidad:** lote **17–24 ago 2026** (composición inteligente con aspecto garantizado, vía `render.js` v2).
**Estado canónico actual (post-fixes 25-31 ago):** `storyboard-audio.js` (beats desde transcripción real) **+** `render.js` (`pickEl` + `elAspecto`) trabajando en armonía.
**Versión de este documento:** 2026-08-25. Git-tracked = stamp; para revertir: `git checkout <commit> -- docs/ESTRUCTURA-CANONICA.md` (y los scripts correspondientes).

> Regla de oro: este documento es la fuente de verdad de la ESTRUCTURA. Cualquier nuevo batch debe cumplirlo.
> Una desviación respecto a este doc es REGRESIÓN hasta que el humano la promueva explícitamente a mejora.

---

## 1. Orden de producción (obligatorio)

guion → grabación (voz real) → transcripción + subtítulos → **storyboard-audio.js** (frames.json desde transcripción real) → música Strudel → **render.js** (composición) → assemble.js.

- `storyboard-audio.js` NO sustituye a `render.js`. Sus beats alimentan a `render.js`, que compone con reglas de marca.

## 2. Reglas estructurales duras (checklist de no-regresión)

### Duraciones y ritmo
- [ ] Duración mínima de frame: **3.0 s** (clamp en `storyboard-audio.js`).
- [ ] Umbral de oráculo: aparece **+3 s** tras el cartouche (oráculo TEMPANO, nunca tardío).
- [ ] El cartouche (f00) arranca el video y presenta el kin del día (marco + "KIN {n}" + nombre con género + glifo maya + numeral del tono + recuadro "Tono · Poder").

### Aspecto astral (garantizado por render.js)
- [ ] `elAspecto` dibuja el aspecto detectado por mención planetaria y palabras clave.
- [ ] Símbolos de aspecto **centrados bajo el título**, separación **160 px**, escala **1.6**; conjunción a escala media.
- [ ] `cartaAstral`: **máximo 2 aspectos**.
- [ ] `kinCarta` ≤ **25 %** del frame (nunca >25 %).
- [ ] Fallback de aspecto presente si no se detecta ninguno.

### Glifos y numerales
- [ ] Sin mojibake: encoding `Â·` → `-`.
- [ ] Numerales maya: `GAP 26` (no superpuestos; sol/mercurio no se solapan).

### Subtítulos y texto
- [ ] Subtítulos en tamaños **42 / 36 / 30 px** (nunca "grandes").
- [ ] Ortografía correcta: **"Club Sincrónica"** y **"Kin Maya"** / **"Tzolkin"**.
- [ ] NUNCA: "King Maya", "Quim Maya", "quimaya".
- [ ] Oráculo centrado (radio **240**).

### Composición de marca (recuadros)
- [ ] Todos los recuadros usan la gama del color de la onda encantada (`cardFill`/`cardStroke` → `darken(colorDeOnda, 0.32)`), opacidad ~0.35 para ver la carta astral de fondo. NUNCA azul fijo `DEEP`.
- [ ] Outro con el lema canónico del kin del día (mediación de `contexto.json`), nunca texto fijo.

## 3. Archivos que definen el canon

- `club-sincronica/scripts/storyboard-audio.js` — beats reales (min 3.0 s, umbral oráculo +3 s, clamp 3 s).
- `club-sincronica/scripts/render.js` — `pickEl` (clasificación semántica de elementos) + `elAspecto` (composición con reglas de marca).
- `club-sincronica/scripts/frames.js` — encoding, numerales GAP 26, radio oráculo 240, subtítulos 42/36/30, spelling.
- `club-sincronica/scripts/assemble.js` — ensambla voz + bed.

## 4. Cómo promover una mejora (anti-deriva)

1. Nuevo batch vs este doc → listar deltas.
2. Regresión → corregir antes de publicar.
3. Mejora real → el humano la aprueba → actualizar ESTA SECCIÓN y hacer commit (nuevo stamp).
4. Sin aprobación, el doc no cambia: Aug 24 sigue siendo la barra.

## 5. Referencias

- `club-sincronica/AGENTS.md` — reglas de marca completas.
- `club-sincronica/content/output/BATCH-REPORT-2026-08-25-2026-09-01.md` — informe de la regresión y sus correcciones (origen de las reglas de esta sección 2).
- `club-sincronica/content/output/2026-08-24/` — ejemplo canónico publicado (benchmark visual).
