# XML MAP — `template.als` + donor fragments (Task 9 + Task 10 / builder)

Fuente `scripts/build-template.js` genera `ableton/template.als`; donor SOLO LECTURA:
`C:\Users\tom_w\Music\_Serato_\Program\Live\Resources\Core Library\Lessons\Sets\Live 10 Suite Empty.als`
(Live 10 Suite = version objetivo). Descomprimir: `node -e "require('fs').writeFileSync('tmp.xml', require('zlib').gunzipSync(require('fs').readFileSync('<ruta>')).toString())"` o `gunzipSync(readFileSync(...))`.

## Task 10 — Builder core: `ableton/builder/als.js`

`als.js` usa `fast-xml-parser` `preserveOrder:true` (`@_`=attribute, `:@` contenedor).
API: `parseAls(buf) → {xml,tree}`, `buildAls(state)→xml`, `saveAls(state,path)`, `inventoryXml(xml) → {scenes,tracks}`,
`loadAls(path)`, `query(state)`, `findTrackBody(xml,name) → {start,end}`, `setSceneNames(state,names[])` (escribe `EffectiveName Value` via `:@.@_Value`).

Reconstrucción es `gunzip → parse → walk(tree) → XMLBuilder.build` (si `built` empieza con `<?xml` no se duplica header).

## Donor provenance (Task 10 Step 6)

| Fragment | Source (FILE) | Raw bytes | Donor XML | Placeholders |
|---|---|---|---|---|
| `midi-clip.xml` | Live 10 Suite Empty.als (44 MidiClip, 1948 MidiNote) | 38484 → 37149 | `<MidiClip Id="0"...><Notes>{{NOTES}}</Notes> ... <CurrentEnd Value="{{DUR_BEATS}}"/>` | `{{NOTES}}` (inner Notes), `{{DUR_BEATS}}` (CurrentEnd/LoopEnd/OutMarker), `{{CLIP_NAME}}` (Name Value) |
| `audio-clip.xml` | Live 10 Suite Empty.als (1 AudioClip) — Zamba (12) / Jeckyl (25) también tienen audio pero se conserva el oficial | 8685 → 8582 | `<AudioClip ...><FileSize Value="{{SIZE}}"/><Crc Value="{{MD5}}"/><BrowserContentPath Value="{{FILE_PATH}}"/><Name Value="{{CLIP_NAME}}"/>` | `{{FILE_PATH}}`, `{{SIZE}}`, `{{MD5}}`, `{{CLIP_NAME}}` |
| `locator.xml` | Live 10 Suite Empty.als (1 Locator, Time=0) — Zamba/Jeckyl 0 locators | 167 → 186 | `<Locator Id="2"><Time Value="{{TIME}}"/><Name Value="{{LOC_NAME}}"/>` | `{{LOC_NAME}}`, `{{TIME}}` |
| `clip-event*.xml` | **NOT FOUND** en los 3 .als (0 ClipEvent en todos) | — | — | `{{TIME}}` previsto — Task 13 fallback: **clonar session clip (`<MidiClip>`/`<AudioClip>`) dentro de estructura arrangement descubierta en Task 13 Step 1** |

Verificación:

```powershell
Select-String -Path ableton\donors\midi-clip.xml -Pattern "<MidiClip"
Select-String -Path ableton\donors\audio-clip.xml -Pattern "<AudioClip"
Select-String -Path ableton\donors\midi-clip.xml -Pattern "{{NOTES}}"
Select-String -Path ableton\donors\locator.xml -Pattern "{{LOC_NAME}}"
node scripts/inspect-als.js ableton/template.als --json
npm test
```

Expected `donors/` tras `node scripts/extract-donors.js "<Live 10 Suite Empty.als>"`:
`midi-clip.xml` + `audio-clip.xml` + `locator.xml` (clip-event ausente → fallback Task 13).

## Estructura global (Live 10, template.als)

```
<Ableton MajorVersion="5" ...><LiveSet>
  <Tracks>                      ← 8 pistas roster (orden fijo) + 2 returns al final
    <MidiTrack Id=...> <AudioTrack Id=...> <ReturnTrack Id=...>
  </Tracks>
  <MasterTrack>                 ← SIN Id, contiene Tempo/TimeSignature wrappers
  <PreHearTrack>
  <SceneNames><Scene Id="..." Value="">…</SceneNames>  ← 16 escenas, Value vacío
  <Locators><Locators><Locator Id="2"><Time Value="0"/><Name Value=""/></Locator></Locators></Locators>
  <Tempo><LomId/><Manual Value="100"/><AutomationTarget Id="8"/>…</Tempo>  ← global
  <TimeSignature><TimeSignatures><RemoteableTimeSignature Id="0"><Numerator Value="4"/><Denominator Value="4"/></></TimeSignatures></TimeSignature>  ← 4/4
  <NextPointeeId Value="...">    ← ≥ maxId+1 (template freshIds 209)
</LiveSet></Ableton>
```

- `Track.<N>` en sidechains = Id de pista, no índice.
- `<ArrangerAutomation><Events/>` vacío en donor y template (defensivo: Task 13 requiere vacío; clonar session clip si ClipEvent falta).

## Pista (`<MidiTrack|AudioTrack Id=...>`)

| Bloque | Ruta dentro de pista | Notas |
|---|---|---|
| Nombre | `<Name><EffectiveName Value/><UserName Value/></Name>` | Cambiar ambos; EffectiveName también en rack chains → solo 1º |
| Grupo | `<TrackGroupId Value="-1"/>` | Donor 85="Vocals Group" borrado |
| Output | `<AudioOutputRouting><Target Value="AudioOut/Master"/> + Upper Master + Lower ""` | Hijas de grupo → Master |
| Input (audio) | `<AudioInputRouting><Target Value="AudioIn/External/M0|M1"/><LowerDisplayString Value="1|2"/><UpperDisplayString Value="Ext. In"/>` | M0/M1 mono |
| Monitor | `<MonitoringEnum Value/>` ×2 (MainSequencer+FreezeSequencer) | 0=In 1=Auto 2=Off; mics→0 |
| Sends | `<TrackSendHolder Id="0|1"><Manual Value/></TrackSendHolder>` | 2/pista (A/B) 0..1; floor `0.0003162277571` |
| Slots | `<DeviceChain><MainSequencer><ClipSlotList>` + `<FreezeSequencer><ClipSlotList>` | 16 slots/lista Id="0".."15" (local). Slot vacío: LomId/ClipSlot/Value/HasStop/NeedRefreeze. Ocupado: `<MidiClip|AudioClip>` dentro de `<Value>`. Returns/master/prehear: self-closing → no tocar |
| Devices | `<DeviceChain><Devices>` (7 tabs) | Top-level `\t{7}<Nombre Id>` |
| Arrangement | `<DeviceChain><MainSequencer><ClipTimeable><ArrangerAutomation><Events/></ArrangerAutomation></ClipTimeable>` | Vaciar Events → `<Events />` |

`ClipSlotList` template: 16/lista ×2 = 32/pista; donor original 7/lista.

## Escenas, Tempo, Locators, Arrangement

| Concepto | Ruta exacta | Valor template |
|---|---|---|
| Escenas lista | `LiveSet > SceneNames > Scene` (NO MasterTrack, NO SessionView) | 16 × `<Scene Id="..." Value="">` (template): `LiveSet/SceneNames/Scene[@Value]` |
| Escena body (builder) | `Scene[@Value="{{SCENE_NAME}}"]` (template) / `Scene > Name > EffectiveName Value` (fixture legacy) | `setSceneNames` escribe `:@.@_Value` en `Scene` + `Name/EffectiveName` si existe |
| Tempo global | `LiveSet > MasterTrack > Tempo > Manual Value` + `AutomationTarget Id` → **REAL es `LiveSet > Tempo > Manual Value` (sibling de Tracks, no de MasterTrack)** | `100` (Manual) — descubierto Task 13: `Select-String "<Tempo>"` da `LiveSet/Tempo` |
| Scene tempo override | `Scene Id="i" > <Tempo><Manual Value="{{SC_TEMPO}}"/>` (no existe en template → crear tras `<LomId>`/antes de `</Scene>`) | inyecta `inject-arrangement.js:injectSceneTempos` |
| TimeSignature | `LiveSet > TimeSignature > TimeSignatures > RemoteableTimeSignature > Numerator/Denominator` | 4/4 |
| Track body by name | `LiveSet > Tracks > *[EffectiveName Value="<Mic Lead|Keys|...>"]` | `findTrackBody(xml,name)` busca `EffectiveName Value` y devuelve `{start,end}` del `<...Track>` |
| Slots order | `Track > DeviceChain > MainSequencer|FreezeSequencer > ClipSlotList > ClipSlot Id="0".."15"` | orden slot = escena index |
| Arrangement container | `Track > DeviceChain > MainSequencer > ClipTimeable > ArrangerAutomation > Events` | `<Events />` vacío (19 ocurrencias en template: 8 tracks ×2 sequencers + master?); Task 13 inyecta `<MidiClip>`/`<AudioClip>` clonando donor session clip con `Time="{{CUM_BEATS}}"` (fallback porque `<ClipEvent>` ausente en donors/template) |
| Locator container | `LiveSet > Locators > Locators` | 1 × `<Locator Id="2" Time="{{TIME}}" Name="{{LOC_NAME}}">` → Task 13 añade 1 por boundary (`Time = cumul beats`) |

### Task 13 — Arrangement container discovery (2026-09-25)

```powershell
Select-String -Path ableton/template.als -Pattern "ArrangerAutomation"  # 19 × <ArrangerAutomation><Events /></ArrangerAutomation>
Select-String -Path ableton/template.als -Pattern "ClipEvent"          # 0 (template vacío — esperado)
Select-String -Path ableton/template.als -Pattern "Locators"           # 2 tags, <Locators><Locators> + </Locators></Locators>
Select-String -Path ableton/template.als -Pattern "<Tempo>"            # 1 global: LiveSet/Tempo/Manual Value="100"
Select-String -Path ableton/donors/clip-event*.xml -Pattern "ClipEvent" # NOT FOUND → fallback Task 13: clonar <MidiClip>/<AudioClip> donor en ArrangerAutomation/Events con Time=cumulative
```
- Si `<ClipEvent` ausente (template vacío): usar `ableton/donors/midi-clip.xml` + `audio-clip.xml` como donors de arrangement (mismo contenido que session, `Time` = beats acumulados).
- `ableton/builder/inject-arrangement.js` provee `injectLocators`, `injectSceneTempos`, `injectArrangement` (IDs fresh desde 3000). Verificado: template sin `ClipEvent` → arranjo se rellena con clones session.

## Master (`<MasterTrack>` sin Id)

- `<Devices>` a 6 tabs: donor `Eq8 Id=10, Eq8 11, GlueCompressor 12,13, Limiter 14` → trasplantes `AutoFilter` (2ª donor pista 70) y `Echo` (1ª pista 73) renumerados antes de `</Devices>`.
- `AutoFilter <Cutoff><Manual Value="133.25">` (~18k log), `Echo <DryWet><Manual Value="0">`.

## Ids renumeración (regla dura, de Task 9)

- Globales (nunca duplicar): pista, Scene, Locator, AutomationTarget, device Id…
- INDEX_LIKE (nunca renumerar): ClipSlot, TrackSendHolder, AutomationLane, WarpMarker, MidiClip, AudioClip, FileRef, etc. — si `(nombre,id)` repetido DENTRO del clon = índice local → no renumerar.
- `NextPointeeId` ≥ maxId+1; `PointeeId Value` actualizado si clave `(nombre,id)` renumerada y no ambigua.

## Donor mapa pistas (Ids originales → roster)

| Id | Tipo | Nombre donor | → Roster |
|---|---|---|---|
| 95 | Midi | 1-Drum Kit 1 | **Perc** |
| 72 | Midi | 4 Three Op Bass | **Bass** |
| 96 | Audio | 10 Vocals 1 | **Mic Lead** (+ clon → Texture) |
| 93 | Audio | 11 Vocals 2 | **Mic Guest** |
| 98 | Audio | 12 Wavetable Pads | **Strings** (0 dev) |
| 78 | Midi | 15-A Hornet Pillow | **Keys** |
| 79 | Midi | 16-Velo-Rezzo Plucks | **Guitar** |
| 2 | Return | A-Reverb \| Compressor | **A-Reverb** |
| 3 | Return | B-Echo | **B-Delay** |
| 70,71,73,74,76,77,85,89,94 | — | borradas | (donor lesson cruft) |

## Comandos verificación (Task 10)

```powershell
node scripts/extract-donors.js "C:\Users\tom_w\Music\_Serato_\Program\Live\Resources\Core Library\Lessons\Sets\Live 10 Suite Empty.als"
node scripts/extract-donors.js "C:\Users\tom_w\Music\Proyectos\Zamba Samurai\Zamba Samurai 25 Mayo.als"
node scripts/extract-donors.js "C:\Users\tom_w\Music\Pistas\Metodo Mezcla 10\Jeckyl and Hyde Mezcla Project\Jeckyl and Hyde Mezcla.als"
# donors/midi-clip.xml debe contener <MidiClip + {{NOTES}}; audio-clip.xml <AudioClip + {{FILE_PATH}}; locator.xml {{LOC_NAME}}
node scripts/inspect-als.js ableton/template.als --json
npm test   # 33 tests (31 + 2 builder-als) debe dar 0 fail
node -e "import('./ableton/builder/als.js').then(m=>{import('node:zlib').then(z=>{import('node:fs').then(f=>{const s=m.parseAls(f.readFileSync('ableton/template.als')); m.setSceneNames(s,Array(16).fill('X')); console.log(m.buildAls(s).includes('Value=\"X\"'))})})})"
```

Validaciones: XML bien formado (fast-xml-parser), roster 8/16/2, 32 ClipSlot/pista, sin dups `(nombre,Id)` vs donor, PointeeId resueltos, sin `AudioOut/GroupTrack`, sends solo `{0.15,0.2,floor}`, master AutoFilter 133.25 + Echo 0, gzip roundtrip.

---
*Detalle previo Task 9 preservado arriba (estructura global, pista, master, Ids).*
