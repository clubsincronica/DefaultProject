# Spike REA + Calidad Musical — cancionero-rojo

**Date:** 2026-10-16
**Status:** Approved (design), pre-implementation
**Approach:** C — dos carriles (spike REA acotado + música sin dependencias)

---

## 1. Contexto

La integración con Ableton en cancionero-rojo produjo 2 problemas distintos:

1. **Formato/integración:** cada bug de `.als` (crash 0xc0000005, clips mudos,
   stems rotos, campos arrangement mezclando escalas) se resolvió por empirismo
   con donors (sets reales del usuario), no entendiendo el parser de Live.
   Funciona, pero cada unknown nuevo cuesta días de hunt (ver DNRs #9-15 en
   PIPELINE-STATE).
2. **Calidad musical:** "Je Veux" y "Disritmia" suenan a juguete barato —
   instrumentos heredados de la lección donor, mal calibrados a tempo, tonalidad
   poco clara, timbres artificiales. Meta declarado: acercarse a la referencia
   ("Disritmia — Stefano Mota, Bm"), agradable de escuchar.

**REA** (morluto/rea, MIT, 285k stars): MCP + CLI de reverse engineering para
agentes — pseudocódigo/strings/xrefs de binarios nativos vía Ghidra/Hopper/IDA,
más JS/.NET/runtime. Corre local. Windows: Ghidra soporte "experimental"
(doc `windows-ghidra-p0.md`); process capture es Linux/macOS.

Target local: `Ableton Live 10 Suite.exe` (82 MB PE, en `Music/_Serato_/Program/Live/`).

## 2. Objetivo

1. Evaluar con un **spike acotado (1 sesión, deadline duro)** si REA+Ghidra da
   ground truth accionable sobre el parser de `.als` de Live 10 en Windows.
2. **Mejorar la calidad sonora** de ambas canciones (fin del "juguete barato")
   sin depender del resultado del spike.

## 3. Alcance

**Entra:**
- Spike REA contra las 4 preguntas (§4) + veredicto go/no-go.
- Carril música: swap de instrumentos del template, pass de tonalidad/voicings,
  verificación de calibración de tempo, escucha humana por sección (§5).
- Findings documentados en `cancionero-rojo/ableton/rea-findings/`.

**No entra:**
- Cambios al builder basados en findings sin pasar por `alsopentest.mjs` +
  tests ground-truth (el spike *informa*, no refactoriza).
- Separación de audio (Demucs sigue vetado; excepción única = pYIN melody).
- Canciones nuevas (#3+) hasta cerrar sonido de #1 y #2.
- Reescritura a control en vivo (Remote Scripts/OSC/M4L) — queda como opción
  futura.

## 4. Carril 1 — Spike REA

### Setup (orden)
1. `npx rea-agents@latest setup` — registra MCP server con opencode (si opencode
   no está en la lista soportada, registro manual tipo `local` en `opencode.json`).
2. Instalar Ghidra (free, Java 17+) — provider indicado en Windows.
3. Verificar readiness con una pregunta trivial contra el binario antes del spike.

### Método
- **No** full auto-analysis de 82MB. Workflow **targeted** por pregunta:
  strings de interés → xrefs → pseudocódigo de las funciones → lectura de lógica.
- Evidencia mínima por respuesta: string + función(s) + pseudocode + confidence
  (alta / media / especulativa).

### Las 4 preguntas (orden de valor)
1. **¿Qué rompe un .als?** — path de carga (gzip → XML → objetos); qué
   condiciones tiran fatal `0xc0000005` vs "documento dañado". Meta: reglas de
   validación explícitas para el builder.
2. **Semántica de campos** — xrefs de `CurrentStart`, `CurrentEnd`, `LoopStart`,
   `LoopEnd`, `HiddenLoopEnd`, `OutMarker`, `Time`, `HasRelativePath`,
   `RelativePathType`, `Note=` vs `KeyTracks`/`MidiKey`. Confirmar o corregir
   las reglas ya inferidas de donors (DNR #10, #11, #15).
3. **Devices/routing** — cómo parsea Live devices y racks; en particular qué
   produce el crash al anidar dispositivos en racks (DNR #9, bug Echo). Meta:
   ¿es seguro inyectar/swapear instrumentos por XML?
4. **Factibilidad** — métricas del spike: tiempo de import de Ghidra, calidad
   de xrefs a strings, tiempo por pregunta. Este número alimenta el go/no-go.

### Salida
- `cancionero-rojo/ableton/rea-findings/00-spike-verdict.md`
- Un doc por pregunta: `01-que-rompe-als.md`, `02-semantica-campos.md`,
  `03-devices-routing.md`, `04-factibilidad.md`
- Formato por doc: pregunta → hallazgo → evidencia → implicación para el
  builder → confidence.

### Límites duros
- No editar builder, template ni tests durante el spike.
- Análisis 100% local (el binario no sale de la máquina).
- Si Ghidra/Windows se traba (crashes, timeouts even con
  `REA_GHIDRA_STARTUP_TIMEOUT_MS` alto): cortar, documentar el bloqueo como
  veredicto. **Deadline: 1 sesión.**

## 5. Carril 2 — Calidad musical

### Diagnóstico primero (sin tocar nada)
Escucha guiada con el usuario, canción × sección (Intro/Verse/Chorus/Outro),
lista concreta de agravios: pads fuera de tempo, guía desalineada, bajo confuso,
claridad de tonalidad. Sin diagnóstico por sección no se parchea (historial de
3 rondas de bugs "arreglados" que seguían sonando mal).

### Intervenciones (según diagnóstico)
1. **Swap de instrumentos del template:**
   - Usuario abre `template.als` en Live 10 y reemplaz instruments de
     Keys/Guitar/Bass/Perc/Strings/Texture por timbres que convengan (presets
     stock de Live 10; roster sin VSTs de terceros).
   - **Obligatorio:** portar el cambio a `ableton/TEMPLATE-RECIPE.md` antes de
     regenerar (DNR #6 — `build-template.js` es la única fuente del template).
   - Gate: `node scripts/build-template.js` → XML validado → `alsopentest.mjs`
     (DNR #9: nada anidado en racks).
2. **Tonalidad y voicings** (disritmia Bm, je-veux Am): voicings de bossa/samba
   más característicos de la referencia (7ths/9ths/tensión), guía de guitarra
   menos "trompeta GM 56" (probar otro programa GM o simplificar línea),
   progresión legible al oído.
3. **Calibración de tempo:** verificar onsets de stems contra líneas de compás
   por sección; stem malo → repro/regen SOLO ese pattern.
4. **Loop de escucha:** rebuild → escucha del usuario por sección → ajuste →
   OK en ambas canciones.

### Puente con el spike
Si la pregunta 3 concluye que inyectar devices por XML es seguro, el swap
manual se automatiza como device-patch en el builder (futuro). Si no, swap
manual — aceptable, 1 vez por template.

## 6. Orden de ejecución

1. Spike REA (1 sesión, deadline) → veredicto en findings.
2. Diagnóstico musical (escucha guiada) → lista de agravios.
3. Intervenciones en orden de impacto: instrumentos → voicings → tempo →
   loop de escucha.
4. Cierre: actualizar `PIPELINE-STATE.md` (hitos + DNRs nuevos) + commits.

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Ghidra Windows experimental | deadline del spike; veredicto documentado si se traba |
| Import 82MB lento | workflow targeted; `REA_GHIDRA_STARTUP_TIMEOUT_MS` alto una vez |
| Recipe pisa template nuevo | checklist: portar devices a TEMPLATE-RECIPE.md antes de regenerar |
| Device injection crash (DNR #9) | todo cambio de devices pasa `alsopentest.mjs`; si REA dice que es riesgoso → swap manual |
| Parchear a ciegas | nada musical sin diagnóstico por sección previo |

## 8. Verificación / definición de hecho

- **Spike:** 4 docs de findings + veredicto go/no-go escrito.
- **Música:** ambas canciones en Live con timbres nuevos, tonalidad clara,
  tempo verificado; escucha OK del usuario por sección.
- **Gates automáticos:** build-template validado, `alsopentest` OPEN_OK,
  `npm test` verde, stems con onsets en compás.
- `PIPELINE-STATE.md` actualizado.

## 9. Referencias

- `PIPELINE-STATE.md` (sección cancionero-rojo: hitos FIX STEMS/ARRANGEMENT,
  DNRs #1-18)
- `cancionero-rojo/AGENTS.md`, `ableton/TEMPLATE-RECIPE.md`, `ableton/xml-map.md`
- Spec original: `docs/superpowers/specs/2026-09-24-cancionero-rojo-karaoke-design.md`
- Disritmia: `docs/superpowers/specs/2026-10-10-disritmia-bm-design.md`
- REA: https://github.com/morluto/rea · https://rea.tools
