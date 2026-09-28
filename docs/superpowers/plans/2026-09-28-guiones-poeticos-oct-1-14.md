# Guiones poéticos Oct 1-14 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 14 `guion.md` poéticos (modo de contar por sello) para Oct 1-14 en `content/output/`, con astro real del motor.

**Architecture:** `generate-day.js` ×14 crea `contexto.json` (tzolkin+astro) + plantilla → cada guion se escribe a mano en el formato canónico (Hook/Puente/Cuerpo/Outro/Notas) con la pieza artística en el modo del sello y el dato astral real integrado → `verify-guion.js` valida placeholders + lema literal.

**Tech Stack:** Node v22 (motores `tzolkin.js`/`astro.js`), PowerShell 5.1, markdown.

**Spec:** `docs/superpowers/specs/2026-09-28-guiones-poeticos-oct-1-14-design.md`

## Global Constraints

- Todo en español, primera persona, voz "Alquimista Resiliente". Frases cortas. Humor permitido sin solemnidad. Sin CTA (el outro ES la firma). Sin consejo médico/legal/financiero.
- Datos astrales SOLO del motor (`contexto.json`). Nunca inventar aspectos/signos/fases. No hay eclipse en Oct 1-14.
- Género correlacionado: usar `kinName` y `signature` del motor (ej. "Tormenta Cósmica"), NUNCA sello+tono sueltos mal accordados.
- No mencionar "el kin cambia"; kin directo. Oct 5 puede mencionar el arranque de la Onda Encantada 4 de Sol (evento real).
- **Outro:** lema canónico LITERAL de `contexto.json → tzolkin.lema` (NUNCA sinónimos), en 3 líneas. Si `isGap` (Oct 4 y Oct 8), añadir al final: ` Soy un Portal de Activación Galáctica, entra en mí.` (sin punto aparte).
- Eje del header: Lun 5/12 = `Vulnerabilidad` · Mié 7/14 = `Humor y Consciencia` · Vie 2/9 = `Creatividad` · resto = `Investigación / Edición`.
- **NO re-ejecutar `generate-day.js` después de escribir los guiones** (pisa las ediciones — patrón Sep 12-30).
- `content/output/` está gitignored en club-sincronica → los guiones NO se commitean; solo `scripts/verify-guion.js`.

**Formato canónico de cada guion (modelo 2026-08-26):**

```markdown
# Guion — {fecha} · {eje}

**Kin {kin} — {signature}** · {onda} · {sello}
**Modo:** {modo}
**Fase lunar:** {faseLunar.name} ({faseLunar.illum}%)
**Aspecto del día:** {astro.aspectoDelDia}

---

## Hook (0–5s)

> {pregunta/afirmación magnética}

## Puente (5–11s)

> {keyword del nicho dicha en voz alta (kin maya / tzolkin / energía del día) + fase lunar real}

## Cuerpo — {modo} (11–{n}s)

> {la pieza artística completa en el modo del sello, con el dato astral real integrado}

## Outro — Lema del kin ({n}–{m}s)

> {lema en 3 líneas, literal del motor + GAP si isGap}

---

## Notas de interpretación

- {tono emocional / recurso del modo / datos usados / indicaciones de grabación}
```

**Modos de contar (verbatim de `content/brand/modos-de-contar.md`):**

- Guerrero → **Romance marcial:** verso de desafío y valentía, con estribillo de temple. Tono: coraje.
- Tierra → **Poema-piedra:** minimalista, compacto, sin adorno. La estabilidad como forma. Tono: madurez.
- Espejo → **Acertijo que se espeja:** el texto se responde a sí mismo: primera mitad afirmada, segunda espejada. Pregunta que devuelve pregunta. Tono: revelación quieta.
- Tormenta → **Anti-soneto:** la tormenta como personaje con carácter propio, que danza, desorden y desmiente. Forma de soneto pero rebelde (rima rota, verso que no cierra, ironía Storni). Tono: humor + verdad.
- Sol → **Letrilla luminosa:** estribillo cálido que sube. Tono: calidez y poder que se comparte.
- Dragón → **Haiku con agua:** el nacimiento como gota que se suelta. Cadenas de haiku (5-7-5 aproximado) con respiración de agua. Tono: reverencia sin solemnidad.
- Viento → **Free verse (verso que se lleva):** prosa poética sin ataduras, en una sola respiración. Tono: desapego y frescura.
- Noche → **Soneto oscuro:** forma clásica, materia de sombra. El misterio con marco formal. Tono: intimidad.
- Semilla → **Copla de siembra:** verso de tierra y paciencia, refrán que vuelve. Tono: humildad, ciclo.
- Serpiente → **Verso retrógrado:** el poema puede leerse al derecho y al revés; se enrosca sobre sí. Tono: desprendimiento y conocimiento antiguo.
- Enlazador de Mundos → **Eco en espejo:** dos voces que se responden (verso/contraverso), pareado que entrelaza. Tono: vínculo.
- Mano → **Coplas de trabajo:** ritmo de tarea, de contar y armar. El hacer como poema. Tono: habilidad y oficio.
- Estrella → **Letrilla estelar:** breve, luminosa, con estribillo que parpadea. Tono: inspiración.
- Luna → **Canción de cuna:** ritmo de mecedora, repetición tierna, vocativo a la noche. Tono: vulnerabilidad y abrigo.

---

### Task 1: Paquetes base + verificador

**Files:**
- Create: `club-sincronica/content/output/2026-10-{01..14}/` (vía generate-day.js)
- Create: `club-sincronica/scripts/verify-guion.js`

**Interfaces:**
- Consumes: `scripts/generate-day.js <fecha>` (motor tzolkin+astro), `scripts/tzolkin.js` output.
- Produces: `contexto.json` ×14 (`tzolkin.kinName/lema/isGap`, `astro.faseLunar`, `astro.aspectoDelDia`); `verify-guion.js <fecha>` → `GUION OK` (exit 0) / `GUION INVALIDO` (exit 1).

- [ ] **Step 1: Generar los 14 paquetes base**

```powershell
1..14 | ForEach-Object { $d = "2026-10-" + $_.ToString("00"); node scripts/generate-day.js $d }
```

- [ ] **Step 2: Verificar que los 14 contexto.json existen**

```powershell
1..14 | ForEach-Object { $d = "2026-10-" + $_.ToString("00"); if (-not (Test-Path "content\output\$d\contexto.json")) { Write-Output "FALTA $d" } }
```
Expected: sin salida (14/14 OK).

- [ ] **Step 3: Escribir el verificador**

```javascript
#!/usr/bin/env node
// verify-guion.js <YYYY-MM-DD> — valida el guion del día:
// 1) sin placeholders de plantilla  2) lema literal vs contexto.json (+GAP)  3) kinName presente
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fecha = process.argv[2];
if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
  console.error('Uso: node scripts/verify-guion.js <YYYY-MM-DD>');
  process.exit(2);
}

let g, ctx;
try {
  g = readFileSync(join(ROOT, 'content', 'output', fecha, 'guion.md'), 'utf8');
  ctx = JSON.parse(readFileSync(join(ROOT, 'content', 'output', fecha, 'contexto.json'), 'utf8'));
} catch (e) {
  console.error(`FALTA: ${e.message.split('\n')[0]}`);
  process.exit(1);
}

let fail = false;

const ph = g.match(/\{(pregunta|desarrollo|emocionalidad|estilo)[^}]*\}/g);
if (ph) { console.error(`PLACEHOLDER: ${ph.join(' | ')}`); fail = true; }

const gapPhrase = ' Soy un Portal de Activación Galáctica, entra en mí.';
const lema = ctx.tzolkin.lema + (ctx.tzolkin.isGap ? gapPhrase : '');
const norm = (s) => s.replace(/^>\s?/gm, '').replace(/\s+/g, ' ').trim();
if (!norm(g).includes(norm(lema))) {
  console.error(`LEMA DIFIERE de contexto.json (isGap=${ctx.tzolkin.isGap})`);
  fail = true;
}

if (!norm(g).includes(ctx.tzolkin.kinName)) {
  console.error(`FALTA kinName: ${ctx.tzolkin.kinName}`);
  fail = true;
}
if (!g.includes('**Modo:**')) {
  console.error('FALTA **Modo:** en el header');
  fail = true;
}

console.log(fail ? 'GUION INVALIDO' : 'GUION OK');
process.exit(fail ? 1 : 0);
```

- [ ] **Step 4: Probar el verificador (positivo y negativo)**

```powershell
node scripts/verify-guion.js 2026-08-26
node scripts/verify-guion.js 2026-09-28; Write-Output "exit=$LASTEXITCODE"
```
Expected: `GUION OK` para 2026-08-26 (escrito) y `GUION INVALIDO` (exit=1) para 2026-09-28 (plantilla con placeholders).
Si 2026-08-26 da `LEMA DIFIERE`: leer el lema del guion vs `contexto.json` — si el guion viejo driftó, NO es bloqueante para este lote; apuntarlo y seguir.

- [ ] **Step 5: Commit del verificador**

```powershell
git add scripts/verify-guion.js
git commit -m "feat(scripts): verify-guion.js valida placeholders + lema literal vs contexto.json"
```

---

### Tasks 2-15: Un guion por día

Cada tarea = un `guion.md`. Datos del día ya verificados con el motor (lema LITERAL — copiar tal cual). Fase lunar y aspecto destacado se leen del `contexto.json` del día en el Step 1 (los valores abajo son de referencia del motor; contexto.json manda).

**Files (todas las tareas):**
- Modify: `club-sincronica/content/output/{fecha}/guion.md` (plantilla → guion completo)

**Interfaces:**
- Consumes: `contexto.json` del día (fase lunar real, aspecto destacado, lema), formato canónico + modo (Global Constraints), `scripts/verify-guion.js`.
- Produces: guion completo validado (`GUION OK`).

**Steps (iguales para todas):**

- [ ] **Step 1: Leer el contexto.json del día**

```powershell
node -e "const c=JSON.parse(require('fs').readFileSync('content/output/{fecha}/contexto.json','utf8'));console.log(JSON.stringify({fase:c.astro.faseLunar,aspecto:c.astro.aspectoDelDia,onda:c.tzolkin.wavespell,isGap:c.tzolkin.isGap},null,1))"
```

- [ ] **Step 2: Escribir el guion completo** en el formato canónico (Global Constraints), con la pieza artística en el modo del día, el dato astral real integrado en el cuerpo, y el outro con el lema literal (3 líneas, + GAP si isGap).

- [ ] **Step 3: Verificar**

```powershell
node scripts/verify-guion.js {fecha}
```
Expected: `GUION OK`. (Sin commit — `content/output/` está gitignored.)

---

#### Task 2: Guion 2026-10-01 — Guerrero Planetario

- [ ] **Step 1** (comando arriba con `content/output/2026-10-01/contexto.json`)
- [ ] **Step 2** Escribir guion: `# Guion — 2026-10-01 · Investigación / Edición` / `**Kin 36 — Guerrero Planetario** · Onda Encantada 3 de Mano · Guerrero` / `**Modo:** Romance marcial`. Cuerpo: verso de desafío y valentía con estribillo de temple (coraje); pieza en la que el Guerrero pregunta/perfecciona. Outro lema LITERAL: "Yo perfecciono con el fin de Cuestionar, Produciendo la Intrepidez. Yo sello la Matriz de la Inteligencia con el tono Planetario de la Manifestación. Me guía el poder del Florecimiento." (3 líneas).
- [ ] **Step 3** `node scripts/verify-guion.js 2026-10-01` → `GUION OK`

#### Task 3: Guion 2026-10-02 — Tierra Espectral

- [ ] **Step 1** (`content/output/2026-10-02/contexto.json`)
- [ ] **Step 2** `# Guion — 2026-10-02 · Creatividad` / `**Kin 37 — Roja Espectral Tierra** · Onda Encantada 3 de Mano · Tierra` / `**Modo:** Poema-piedra`. Cuerpo: minimalista, compacto, sin adorno (madurez); el Espectral disuelve/libera — la piedra que se deshace en polvo fértil. Outro lema LITERAL: "Yo disuelvo con el fin de Evolucionar, Liberando la Sincronicidad. Yo sello la Matriz de la Navegación con el tono Espectral de la Liberación. Me guía el poder de la Navegación. Mi propio poder duplicado."
- [ ] **Step 3** `node scripts/verify-guion.js 2026-10-02` → `GUION OK`

#### Task 4: Guion 2026-10-03 — Espejo Cristal

- [ ] **Step 1** (`content/output/2026-10-03/contexto.json`)
- [ ] **Step 2** `# Guion — 2026-10-03 · Investigación / Edición` / `**Kin 38 — Blanco Cristal Espejo** · Onda Encantada 3 de Mano · Espejo` / `**Modo:** Acertijo que se espeja`. Cuerpo: primera mitad afirmada, segunda espejada; pregunta que devuelve pregunta (revelación quieta); el Cristal dedica/universaliza. Outro lema LITERAL (¡"Matríz" con acento, literal del motor!): "Yo dedico con el fin de Reflejar, Universalizando el Orden. Yo sello la Matríz del Sin Fin con el tono Cristal de la Cooperación. Me guía el poder del Corazón."
- [ ] **Step 3** `node scripts/verify-guion.js 2026-10-03` → `GUION OK`

#### Task 5: Guion 2026-10-04 — Tormenta Cósmica (GAP)

- [ ] **Step 1** (`content/output/2026-10-04/contexto.json`; `isGap=true`)
- [ ] **Step 2** `# Guion — 2026-10-04 · Investigación / Edición` / `**Kin 39 — Azul Cósmica Tormenta** · Onda Encantada 3 de Mano · Tormenta` / `**Modo:** Anti-soneto`. Cuerpo: la tormenta como personaje que danza, desorden y desmiente; rima rota, verso que no cierra, ironía Storni (humor + verdad); cierra la Onda 3 de Mano (pos 13). Outro lema LITERAL + **frase GAP**: "Yo perduro con el fin de Catalizar, Trascendiendo la Energía. Yo sello la Matriz de la Autogeneración con el tono Cósmico de la Presencia. Me guía el poder de la Abundancia. Soy un Portal de Activación Galáctica, entra en mí."
- [ ] **Step 3** `node scripts/verify-guion.js 2026-10-04` → `GUION OK`

#### Task 6: Guion 2026-10-05 — Sol Magnético (abre Onda 4)

- [ ] **Step 1** (`content/output/2026-10-05/contexto.json`)
- [ ] **Step 2** `# Guion — 2026-10-05 · Vulnerabilidad` / `**Kin 40 — Amarillo Magnético Sol** · Onda Encantada 4 de Sol · Sol` / `**Modo:** Letrilla luminosa`. Cuerpo: estribillo cálido que sube; puede mencionar que ARRANCA la Onda Encantada 4 de Sol (evento real, activa el renderer de onda). Outro lema LITERAL: "Yo unifico con el fin de Iluminar, Atrayendo la Vida. Yo sello la Matriz del Fuego Universal con el tono Magnético del Propósito. Me guía el poder del Fuego Universal. Mi propio poder duplicado."
- [ ] **Step 3** `node scripts/verify-guion.js 2026-10-05` → `GUION OK`

#### Task 7: Guion 2026-10-06 — Dragón Lunar

- [ ] **Step 1** (`content/output/2026-10-06/contexto.json`)
- [ ] **Step 2** `# Guion — 2026-10-06 · Investigación / Edición` / `**Kin 41 — Rojo Lunar Dragón** · Onda Encantada 4 de Sol · Dragón` / `**Modo:** Haiku con agua`. Cuerpo: cadenas de haiku (5-7-5 aproximado), el nacimiento como gota que se suelta, respiración de agua (reverencia sin solemnidad). Outro lema LITERAL: "Yo polarizo con el fin de Nutrir, Estabilizando el Ser. Yo sello la Matriz del Nacimiento con el tono Lunar del Desafío. Me guía el poder del Espacio."
- [ ] **Step 3** `node scripts/verify-guion.js 2026-10-06` → `GUION OK`

#### Task 8: Guion 2026-10-07 — Viento Eléctrico

- [ ] **Step 1** (`content/output/2026-10-07/contexto.json`)
- [ ] **Step 2** `# Guion — 2026-10-07 · Humor y Consciencia` / `**Kin 42 — Blanco Eléctrico Viento** · Onda Encantada 4 de Sol · Viento` / `**Modo:** Free verse (verso que se lleva)`. Cuerpo: prosa poética sin ataduras, una sola respiración (desapego y frescura); el Eléctrico activa/enlaza el servicio. Outro lema LITERAL: "Yo activo con el fin de Comunicar, Vinculando el Aliento. Yo sello la Matriz del Espíritu con el tono Eléctrico del Servicio. Me guía el poder de la Muerte."
- [ ] **Step 3** `node scripts/verify-guion.js 2026-10-07` → `GUION OK`

#### Task 9: Guion 2026-10-08 — Noche Autoexistente (GAP)

- [ ] **Step 1** (`content/output/2026-10-08/contexto.json`; `isGap=true`)
- [ ] **Step 2** `# Guion — 2026-10-08 · Investigación / Edición` / `**Kin 43 — Azul Autoexistente Noche** · Onda Encantada 4 de Sol · Noche` / `**Modo:** Soneto oscuro`. Cuerpo: forma clásica, materia de sombra, misterio con marco formal (intimidad). Outro lema LITERAL + **frase GAP**: "Yo defino con el fin de Soñar, Midiendo la Intuición. Yo sello la Matriz de la Abundancia con el tono Autoexistente de la Forma. Me guía el poder de la Autogeneración. Soy un Portal de Activación Galáctica, entra en mí."
- [ ] **Step 3** `node scripts/verify-guion.js 2026-10-08` → `GUION OK`

#### Task 10: Guion 2026-10-09 — Semilla Entonada

- [ ] **Step 1** (`content/output/2026-10-09/contexto.json`)
- [ ] **Step 2** `# Guion — 2026-10-09 · Creatividad` / `**Kin 44 — Amarilla Entonada Semilla** · Onda Encantada 4 de Sol · Semilla` / `**Modo:** Copla de siembra`. Cuerpo: verso de tierra y paciencia, refrán que vuelve (humildad, ciclo); la Entonada comanda/empodera. Outro lema LITERAL: "Yo empodero con el fin de Atinar, Comandando la Consciencia. Yo sello la Matriz del Florecimiento con el tono Entonado de la Radiancia. Me guía el poder de la Libre Voluntad."
- [ ] **Step 3** `node scripts/verify-guion.js 2026-10-09` → `GUION OK`

#### Task 11: Guion 2026-10-10 — Serpiente Rítmica

- [ ] **Step 1** (`content/output/2026-10-10/contexto.json`)
- [ ] **Step 2** `# Guion — 2026-10-10 · Investigación / Edición` / `**Kin 45 — Roja Rítmica Serpiente** · Onda Encantada 4 de Sol · Serpiente` / `**Modo:** Verso retrógrado`. Cuerpo: el poema puede leerse al derecho y al revés, se enrosca sobre sí (desprendimiento, conocimiento antiguo); la Rítmica equilibra/organiza. Outro lema LITERAL: "Yo organizo con el fin de Sobrevivir, Equilibrando los Instintos. Yo sello la Matriz de la Fuerza Vital con el tono Rítmico de la Igualdad. Me guía el poder de la Fuerza Vital. Mi propio poder duplicado."
- [ ] **Step 3** `node scripts/verify-guion.js 2026-10-10` → `GUION OK`

#### Task 12: Guion 2026-10-11 — Enlazador de Mundos Resonante

- [ ] **Step 1** (`content/output/2026-10-11/contexto.json`)
- [ ] **Step 2** `# Guion — 2026-10-11 · Investigación / Edición` / `**Kin 46 — Blanco Resonante Enlazador de Mundos** · Onda Encantada 4 de Sol · Enlazador de Mundos` / `**Modo:** Eco en espejo`. Cuerpo: dos voces que se responden (verso/contraverso), pareado que entrelaza (vínculo); el Resonante canaliza/inspira. Outro lema LITERAL: "Yo canalizo con el fin de Igualar, Inspirando la Oportunidad. Yo sello la Matriz de la Muerte con el tono Resonante de la Armonización. Me guía el poder del Sin Fin."
- [ ] **Step 3** `node scripts/verify-guion.js 2026-10-11` → `GUION OK`

#### Task 13: Guion 2026-10-12 — Mano Galáctica

- [ ] **Step 1** (`content/output/2026-10-12/contexto.json`)
- [ ] **Step 2** `# Guion — 2026-10-12 · Vulnerabilidad` / `**Kin 47 — Azul Galáctica Mano** · Onda Encantada 4 de Sol · Mano` / `**Modo:** Coplas de trabajo`. Cuerpo: ritmo de tarea, de contar y armar, el hacer como poema (habilidad y oficio); curación como trabajo de manos. Outro lema LITERAL: "Yo armonizo con el fin de Realizar, Modelando la Curación. Yo sello la Matriz del Conocer con el tono Galáctico de la Integridad. Me guía el poder de la Magia."
- [ ] **Step 3** `node scripts/verify-guion.js 2026-10-12` → `GUION OK`

#### Task 14: Guion 2026-10-13 — Estrella Solar

- [ ] **Step 1** (`content/output/2026-10-13/contexto.json`)
- [ ] **Step 2** `# Guion — 2026-10-13 · Investigación / Edición` / `**Kin 48 — Amarilla Solar Estrella** · Onda Encantada 4 de Sol · Estrella` / `**Modo:** Letrilla estelar`. Cuerpo: breve, luminosa, estribillo que parpadea (inspiración); la Solar pulsa/embellece el arte. Outro lema LITERAL: "Yo pulso con el fin de Embellecer, Realizando el Arte. Yo sello la Matriz de la Elegancia con el tono Solar de la Intención. Me guía el poder del Florecimiento."
- [ ] **Step 3** `node scripts/verify-guion.js 2026-10-13` → `GUION OK`

#### Task 15: Guion 2026-10-14 — Luna Planetaria

- [ ] **Step 1** (`content/output/2026-10-14/contexto.json`)
- [ ] **Step 2** `# Guion — 2026-10-14 · Humor y Consciencia` / `**Kin 49 — Roja Planetaria Luna** · Onda Encantada 4 de Sol · Luna` / `**Modo:** Canción de cuna`. Cuerpo: ritmo de mecedora, repetición tierna, vocativo a la noche (vulnerabilidad y abrigo); la Luna purifica/produce flujo. Outro lema LITERAL: "Yo perfecciono con el fin de Purificar, Produciendo el Flujo. Yo sello la Matriz del Agua Universal con el tono Planetario de la Manifestación. Me guía el poder de la Navegación."
- [ ] **Step 3** `node scripts/verify-guion.js 2026-10-14` → `GUION OK`

---

### Verificación final del lote (Task 16)

- [ ] **Step 1:** correr el verificador en los 14 días:

```powershell
1..14 | ForEach-Object { $d = "2026-10-" + $_.ToString("00"); $r = node scripts/verify-guion.js $d; Write-Output "$d -> $r" }
```
Expected: 14 × `GUION OK`.

- [ ] **Step 2:** actualizar `PIPELINE-STATE.md` (raíz) con el lote escrito + commit.
