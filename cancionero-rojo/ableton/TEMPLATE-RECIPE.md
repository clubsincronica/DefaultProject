# TEMPLATE RECIPE — construir template.als (una vez, ~30 min)

1. Live 10 → File > New Live Set. Preferences:
   - Link/MIDI: en MIDI Ports de **Xone K2** y **APC mini**: Track ON, Remote ON, Input OFF.
2. Create 8 tracks, nombres EXACTOS (View > Rename, F2):
   - Audio: `Mic Lead` (Input: Ext. In 1 / channels 1-2→1), `Mic Guest` (Ext. In 2)
     → Input Monitoring: **In** en ambos.
   - MIDI: `Keys`, `Guitar`, `Bass`, `Perc`
   - Audio: `Strings`, `Texture`
3. Instrumentos (Swap Device al final; decidir por oído — cualquier cambio luego es manual):
   - Keys: Electric (preset "Closet") o Sampler con piano
   - Guitar: Tension (preset plucked) o Sampler
   - Bass: Analog (bass preset) u Operator
   - Perc: Collision (marimba/perc) — mapeo: C1=bombo, D1=caja, F#1=hihat (GM-ish)
   - Strings: Wavetable (preset saw ensemble) — polifonía alta
   - Texture: Simpler en modo Classic con un sample ambiental de User Library
4. Mic Lead/Mic Guest devices: `Channel EQ` + `Compressor`, y Sends A=15 (Reverb), B=15 (Delay).
5. Returns: crear `A-Reverb` (Reverb, size Grande) y `B-Delay` (Delay, sync 1/4).
6. Master: `Auto Filter` (Lowpass, freq 18k) + `Echo` (dry/wet 0%). Para builds: barrer Auto Filter freq con el knob.
7. Strings y Texture: Sends A=20.
8. Session View: crear 16 escenas (Cmd+I? Scene Insert → 16), dejar nombres vacíos.
9. Guardar COMO: cancionero-rojo/ableton/template.als
10. MIDI Map mode (Cmd+M):
    - Xone K2 **L1**: knobs 1-3 → Mic Lead [Low/Mid/High] de Channel EQ; knobs 4-6 → Mic Guest [Low/Mid/High]
    - Xone K2 **L2**: knob1 → Mic Lead Send A, knob2 → Mic Lead Send B, knob3/4 → Mic Guest A/B, knob5 → Master Auto Filter Freq, knob6 → Auto Filter Res
    - Xone K2 **L3**: knob1 → Echo Time, knob2 → Echo Feedback, knob3 → Strings Send A, knobs 4-6 libres
    - APC mini: faders 1-8 → vol de Mic Lead, Mic Guest, Keys, Guitar, Bass, Perc, Strings, Texture (en ese orden); fader 9 → Master; scene buttons 1-8 → Scene Launch 1-8; botones clip grid → libres
    - **Capas L1/L2/L3 del K2**: si el K2 no envía capas sin script, usar los 18 knobs físicos: priorizar L1 (EQ mics) y mapear el resto en la fila libre. Ajustar durante la sesión de mapeo con el controller delante.
11. Escuchar: gritar en el micro (Input In) → comprueba que suena con FX; mover APC fader → volumen.
