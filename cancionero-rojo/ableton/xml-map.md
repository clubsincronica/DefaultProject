# XML MAP — `template.als` y su donor (referencia para Task 10 / builder)

Fuente: `scripts/build-template.js` (genera `ableton/template.als`).
Donor (SOLO LECTURA): `C:\Users\tom_w\Music\_Serato_\Program\Live\Resources\Core Library\Lessons\Sets\Live 10 Suite Empty.als`
(Live 10 Suite = versión objetivo; gzip de 5.832.376 bytes → XML pretty-printed con `EOL=\n`,
143.880 líneas, `<NextPointeeId Value="173792">`, max `Id=` del donor = 165151).

Descomprimir para inspección: `node -e "require('fs').writeFileSync('donor.xml', require('zlib').gunzipSync(require('fs').readFileSync('<ruta>')).toString())"`.

## Estructura global (rutas Live 10)

```
<Ableton><LiveSet>
  <Tracks>                      ← 18 pistas, todas al MISMO nivel (no anidadas)
    <MidiTrack Id=…> <AudioTrack Id=…> <GroupTrack Id=…> <ReturnTrack Id=…>
  </Tracks>                     ← cierre a 2 tabs
  <MasterTrack>                 ← SIN atributo Id
  <PreHearTrack>
  <SceneNames><Scene Id Value="…">…</SceneNames>
  <Locators><Locators><Locator Id=…>
  <Tempo><TimeSignature>…       ← globales; donor tempo=100, timesig 4/4
  <NextPointeeId Value="…">     ← SIEMPRE ≥ maxId+1 tras renumerar
</LiveSet></Ableton>
```

- `Track.<N>` en rutas (sidechains, automation) = **Id de la pista**, no su índice.
- `<ArrangerAutomation><Events/>` del donor ya viene vacío (0 `ClipEvent`).

## Pista (`<AudioTrack|MidiTrack Id=…>`)

| Bloque | Ruta dentro de la pista | Notas |
|---|---|---|
| Nombre | `<Name><EffectiveName Value/><UserName Value/></Name>` | Live muestra UserName si no está vacío → cambiar **ambos**. `<EffectiveName>` también aparece en rack chains → reemplazar SOLO el 1º. |
| Grupo | `<TrackGroupId Value="85"/>` | 85 = "7 Vocals Group" (borrada) → forzar `-1`. |
| Output | `<AudioOutputRouting>` (`AudioOut/GroupTrack` para hijas de grupo) | Grupo→Master: `<Target Value="AudioOut/Master"/>` + Upper `Master` + Lower `""`. |
| Input (audio) | `<AudioInputRouting>` | Mono: `AudioIn/External/M0` + Lower `1` (canal 1); `M1` + `2`. Stereo: `S0` + `1/2`. Upper queda `Ext. In`. |
| Monitor | `<MonitoringEnum Value/>` ×2 (MainSequencer + FreezeSequencer) | **0=In, 1=Auto, 2=Off** (LOM `TrackMonitoringState`, docs cycling74). Donor default=1 (Auto). Mics → `0`. |
| Sends | `<TrackSendHolder Id="0|1">…<Manual Value/></TrackSendHolder>` | 2 por pista (A y B). Lineal 0..1; "silencio" del donor = `0.0003162277571` (floor 10^-3.5). El 1er `<Manual>` del holder es el valor del send. |
| Slots | `<DeviceChain><MainSequencer><ClipSlotList>` + `<FreezeSequencer><ClipSlotList>` | 7 slots/lista, `Id="0..6"` (índice local). Slot vacío: LomId / `<ClipSlot><Value/></ClipSlot>` / HasStop / NeedRefreeze. Ocupado: `<MidiClip|AudioClip>` dentro del `<Value>` anidado. `ClipSlotList` self-closing en returns/master/prehear → NO tocar. |
| Devices | `<DeviceChain><Devices>` (7 tabs dentro de pista) | Top-level: `\t{7}<Nombre Id=…>`. |
| Arrangement | `<MainSequencer><ClipTimeable><ArrangerAutomation>` | Vaciar `<Events>…</Events>` → `<Events />` (defensivo; Task 13 necesita vacío). |

34 `<ClipSlotList` en el donor = 30 reales (15 pistas × 2) + 4 self-closing.

## Escenas

`<Scene Id="35|37|38|39|40|42|43" Value="Scene N">` (7 escenas, 4/4 heredado).
Template: 16 escenas, `Value=""`, ids nuevos (`nextId()`) solo para las 8+ clonadas.

## Master (`<MasterTrack>`, sin Id)

- `<Devices>` a 6 tabs. Donor: `Eq8 Id=10, Eq8 Id=11, GlueCompressor 12, GlueCompressor 13, Limiter 14`.
- Trasplantes: `AutoFilter` (2ª ocurrencia del donor, pista borrada 70) y `Echo` (1ª, pista 73) →
  renumerados, dedent 1 tab, insertados antes de `</Devices>`.
- Parámetros seteados: `AutoFilter <Cutoff><Manual Value="133.25">` (~18 kHz en escala log del donor;
  rango 20..135) y `Echo <DryWet><Manual Value="0">` (default 0.1666, rango 0..1).
  `FilterType Manual=0` = Lowpass (default del donor, sin tocar).
- OJO: existen otros `<Cutoff>` en el archivo (Eq8/AutoFilter de pistas: Perc≈121.80, Keys con
  `<KeyMidi>`, etc.) — validar siempre dentro del bloque `<AutoFilter Id=…>` propio.

## Ids: renumeración (regla dura)

- **Globales (nunca duplicar)**: pista, Scene, Locator, AutomationTarget, ModulationTarget,
  Volume/Transposition/GrainSize/Flux/SampleOffsetModulationTarget, ControllerTargets.N, device Id.
- **INDEX_LIKE (nunca renumerar)**: ClipSlot, AutomationLane, TrackSendHolder, GroupTrackSlot,
  SendPreBool, WarpMarker, AutomationEnvelope, ClipEnvelope, FloatEvent/BoolEvent, EnumEvent,
  KeyTrack, DrumBranch, InstrumentBranch, MultiSamplePart, RemoteableTimeSignature, MidiClip,
  AudioClip, RelativePathElement, FilePresetRef, AbletonDefaultPresetRef, SourceContext, Groove…
- Los device Id son por-pista (el donor ya tiene cross-track dups p.ej. `Eq8`), pero la validación
  exige: **renumerar clone id N ssi el mismo nombre ya tiene id N fuera del clon** → N→fresh
  (maxId+1..) aplicado a defs + `<PointeeId Value="N">` del clon.
- Caso especial: `(nombre, id)` repetido DENTRO del clon (p.ej. dos `<FileRef Id="0">` en la misma
  pista) ⇒ ese id es índice local para ese nombre → NO renumerar (si no, se crea dup nuevo).
- `PointeeId` dentro de pistas roster: sin ambigüedad (cada id → un solo nombre); AutoFilter/Echo
  clonados no llevan PointeeId.
- `NextPointeeId` del donor (173792) ya cubre los ~209 ids frescos → sin tocar, pero el script
  lo sube si hace falta.

## Donor: mapa de pistas (Ids)

| Id | Tipo | Nombre donor | → Roster |
|---|---|---|---|
| 95 | Midi | 1-Drum Kit 1 | **Perc** (DrumRack natural) |
| 70 | Midi | 2-Drum Kit 2 | borrada (fuente AutoFilter trasplant) |
| 71 | Midi | 3-Oxi Bass Rack | borrada |
| 72 | Midi | 4 Three Op Bass | **Bass** |
| 73 | Midi | 5-Deep in Dark | borrada (fuente Echo trasplant) |
| 74 | Midi | 6 Crossover Syn Bass | borrada |
| 85 | Group | 7 Vocals Group | borrada |
| 94 | Midi | 8-Vocals Slice | borrada |
| 89 | Midi | 9-Vocals Slice | borrada |
| 96 | Audio | 10 Vocals 1 | **Mic Lead** (+ clon → **Texture**) |
| 93 | Audio | 11 Vocals 2 | **Mic Guest** |
| 98 | Audio | 12 Wavetable Pads | **Strings** (0 devices: es pista stem) |
| 76 | Midi | 13-Sidechain Pad | borrada |
| 77 | Midi | 14-Sidechain Pad | borrada |
| 78 | Midi | 15-A Hornet Pillow | **Keys** |
| 79 | Midi | 16-Velo-Rezzo Plucks | **Guitar** |
| 2 | Return | A-Reverb \| Compressor | **A-Reverb** |
| 3 | Return | B-Echo | **B-Delay** |

Devices retenidos por pista (donor): Mic Lead←96 `StereoGain+FilterEQ3`; Mic Guest←93
`Eq8+Compressor2`; Keys←78 rack `InstrumentGroupDevice(+Operator)+MidiVelocity+MidiChord+MidiArpeggiator`;
Guitar←79 `InstrumentGroupDevice+InstrumentVector`; Bass←72 (2 dev); Perc←95 DrumRack (8 dev);
Strings←98 **sin devices**; Texture←clon de 96 (2 dev).

## Desviaciones de la receta (spec punto 9 — decisiones ya tomadas)

- **Strings/Texture NO llevan instrumento**: son pistas de audio para stems (pipeline). La receta
  paso 3 ("Wavetable/Simpler") estaba mal — bug de plan corregido en el brief. `Strings` llega con
  0 devices y `Texture` con la chain de voz del donor (StereoGain+FilterEQ3) — swap manual si se
  quiere.
- **Mics FX**: donor trae `Eq8+Compressor2` (Mic Guest) / `StereoGain+FilterEQ3` (Mic Lead) en vez
  de `Channel EQ + Compressor` de la receta → el usuario puede swappear por oído (Step 7).
- **Instrumentos MIDI**: stand-ins del donor (Operator/DrumRack/Vector/rack) en vez de
  Electric/Tension/Analog/Collision → swap por oído.
- **Sends**: receta "A=15, B=15 / A=20" leídos como **porcentaje → 0.15 / 0.20** (lineal 0..1 del
  XML). Cualquier send no listado en la receta se silencia al floor del donor (borra cruft de la
  lección).
- **Returns**: `A-Reverb` conserva `Reverb+Compressor2` (sidechain de `Track.95`=Perc, que se
  conserva ✓); `B-Delay` conserva `Echo`.
- Locators: donor trae 1 locator vacío (`Time=0`) — inofensivo, se queda.

## Comandos de verificación

```powershell
node scripts/build-template.js            # regenera + valida (no escribe si falla)
node scripts/inspect-als.js ableton/template.als --json
npm test                                   # 31 tests; el test de template debe correr (no skip)
```

Validaciones internas del script: XML bien formado (fast-xml-parser), roster exacto 8 pistas/16
escenas/2 returns, 32 ClipSlot/pista, sin dups `(nombre,Id)` nuevos vs donor, todo `PointeeId`
resuelto, sin `AudioOut/GroupTrack` ni `TrackGroupId=85`, mics M0/M1+monitor In, sends solo
{0.15, 0.2, floor}, master con AutoFilter 133.25 + Echo 0, gzip round-trip.
