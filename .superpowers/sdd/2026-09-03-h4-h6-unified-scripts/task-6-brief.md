# Task 6: Update Pipeline State Documentation

**Files:**
- Modify: `PIPELINE-STATE.md` (root)

**Interfaces:**
- Consumes: All block data from kin-data.js
- Produces: Updated documentation with H4-H6 plans

## Steps

- [ ] **Step 1: Add H4-H6 section to PIPELINE-STATE.md**

```markdown
## Pipeline Viral — H4-H6 Plan

### H4 (Kins 13-16) — Sep 8-11, 2026
- **Central Date:** 2026-09-09 (Miércoles)
- **Publication:** Viernes Sep 11
- **Kins:**
  - Kin 13: Caminante del Cielo Cósmico Rojo — Coplas de camino
  - Kin 14: Mago Magnético Blanco — Encantamiento
  - Kin 15: Águila Lunar Azul — Oda al vuelo
  - Kin 16: Guerrero Eléctrico Amarillo — Romance marcial
- **Drone:** 141.27 Hz (Garganta, Mercury)
- **Wavespell:** Dragón (Rojo), positions 13-16

### H5 (Kins 17-20) — Sep 12-15, 2026
- **Central Date:** 2026-09-13 (Miércoles)
- **Publication:** Miércoles Sep 16
- **Kins:**
  - Kin 17: Tierra Autoexistente Roja — Poema-piedra
  - Kin 18: Espejo Entonado Blanco — Acertijo espejado
  - Kin 19: Tormenta Rítmica Azul — Anti-soneto
  - Kin 20: Sol Resonante Amarillo — Letrilla luminosa
- **Drone:** 172.06 Hz (Corona, Platonic Year)
- **Wavespell:** Mago (Blanco), positions 4-7

### H6 (Kins 21-24) — Sep 16-19, 2026
- **Central Date:** 2026-09-17 (Miércoles)
- **Publication:** Viernes Sep 18
- **Kins:**
  - Kin 21: Dragón Galáctico Rojo — Haiku con agua
  - Kin 22: Viento Solar Blanco — Verso que se lleva
  - Kin 23: Noche Planetaria Azul — Soneto oscuro
  - Kin 24: Semilla Espectral Amarilla — Copla de siembra
- **Drone:** 141.27 Hz (Garganta, Mercury)
- **Wavespell:** Mago (Blanco), positions 8-11

### Energy Arc
- H1-H4: Onda Dragón (Rojo) — Nacimiento → Vitalidad → Corazón → Visión
- H5-H6: Onda Mago (Blanco) — Reflexión → Renacimiento
- H6 mirrors H1 at higher octaves (same seals, different tones)
```

- [ ] **Step 2: Commit**

```bash
git add PIPELINE-STATE.md
git commit -m "docs: add H4-H6 plan to pipeline state"
```

## Global Constraints

- Windows PowerShell 5.1, Node v22, FFmpeg 8.1.2
- All voice content in Spanish, "Alquimista Resiliente" voice
- Lemas must match tzolkin.js output exactly (no manual edits)
- Drone frequencies from chakra-freq.js (Hans Cousto Cosmic Octave)
- Act durations: Act 1=44s, Acts 2-5=126s each, Act 6=52s (total 600s)
- Publication schedule: Lun/Mié/Vie (covers 3-day windows)
