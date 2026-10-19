# Spec: Soup pilot — fine-tune guiones de Club Sincrónica (2026-10-10)

## Objetivo
Pilot mínimo para evaluar `MakazhanAlpamys/Soup` (8.5k★, one-YAML SFT, LoRA/QLoRA)
como capa de asistencia de escritura de guiones poéticos del short diario.
NO sustituye al Alquimista ni al gate `validate-astro.js`: el modelo propone,
el humano dispone.

## Por qué club-sincronica primero
- Corpus mayor: 71 pares `contexto.json` → `guion.md` en
  `club-sincronica/content/output/*/`.
- Mapeo limpio input→output (kin/sello/tono/lema/aspecto/fase → hook/puente/cuerpo/outro).
- Gate de calidad existente y reutilizable: `verify-guion.js`
  (sin placeholders, lema literal, kinName presente).

## Diseño de datos
- Script: `scripts/export-guiones-jsonl.cjs` (este repo, solo stdlib, `.cjs` porque la raíz es ESM).
- Formato: JSONL `alpaca` (`instruction` / `input` / `output`), UTF-8, un objeto por línea.
- `instruction` fija (ES): escribir el guion poético del short diario.
- `input`: fecha, kin + kinName, sello/tono/onda, lema canónico literal,
  fase lunar, aspecto del día, modo de contar.
- `output`: texto íntegro de `guion.md`.
- Filtros de calidad (los que NO pasan van a stderr y se excluyen):
  1. existen ambos archivos y no están vacíos;
  2. `norm(guion)` contiene `norm(lema)` (+ frase GAP si `isGap`),
     igual que `verify-guion.js:30-32` (`norm` = minúsculas + strip acentos);
  3. `guion` contiene el `kinName`.
- Salida: `data/soup-pilot/train.jsonl` (orden determinista por fecha).
  `val_split: 0.1` lo hace Soup, no se parte a mano.

## Config Soup (referencia, NO ejecutar aquí)
```yaml
base: meta-llama/Llama-3.1-8B-Instruct
task: sft
data:
  train: ./data/soup-pilot/train.jsonl
  format: alpaca
  val_split: 0.1
training:
  epochs: 3
  lr: 2e-5
  batch_size: auto
  lora: {r: 64, alpha: 16}
  quantization: 4bit
output: ./output/soup-pilot-guiones
```

## Restricciones de entorno (verificadas 2026-10-10)
- Esta máquina: Python 3.13.14 (Soup exige 3.10–3.12), sin `soup-cli`,
  sin `nvidia-smi` visible. Entrenar aquí NO es opción.
- Entrenamiento: Docker (`ghcr.io/makazhanalpamys/soup:latest` + `--gpus all`)
  o Colab T4 (`notebooks/proof-4gb.ipynb` como patrón de verificación).
- Evaluación del pilot: `soup eval` + gate propio (lema literal + `validate-astro`
  sobre una muestra) antes de usar un solo token en producción.

## Resultado del export (verificado 2026-10-10)
- `node scripts/export-guiones-jsonl.cjs` → **15/71 pares válidos**,
  `data/soup-pilot/train.jsonl` (15 líneas, schema alpaca uniforme, 41KB).
- 56 filtrados: placeholders de plantilla (lote Sep 24-30, patrón DNR #15),
  lema no literal o kinName ausente en guiones viejos (pre-gate).
- Los 14 del lote Oct 1-14 pasan (coherente con `verify-guion.js` 14/14) + 1 viejo.
- 15 pares es poco para SFT serio: el pilot sirve como smoke test del formato
  y del flujo Soup, NO como dataset final. El dataset real exige guiones nuevos
   validados por el gate (cada día de producción suma 1 par).

## Runbook Colab T4 (la máquina local NO puede entrenar, verificado 2026-10-10)
- Box local: sin Docker, GPU = Intel UHD 1GB, Python 3.13 → ni Docker ni
  CPU sirven (8B en CPU = experimental/inviable según docs de Soup).
- En Colab (GPU T4 gratuita), celdas:
  1. `!pip install "soup-cli[train]"` + `!soup doctor` (corte: ~4GB VRAM libre).
  2. Subir `data/soup-pilot/train.jsonl` + `data/soup-pilot/soup.yaml`
     (rutas relativas iguales: `./data/soup-pilot/train.jsonl`).
  3. `!soup train --config data/soup-pilot/soup.yaml`
     (`stream_layers: true` = capa BETA que hace viable 8B en 4GB;
     si falla por schema, quitar esa sola clave y reintentar).
  4. `!soup data inspect ./data/soup-pilot/train.jsonl` antes del train
     (stats del dataset) y `!soup eval benchmark` después.
- Gated both (licencia HF): Llama-3.1-8B-Instruct exige aceptar licencia +
  `huggingface-cli login` en la sesión Colab antes del train.
- Artefactos a traer de vuelta: `./output/soup-pilot-guiones/` (adapter LoRA)
  + log de `val loss` (v0.75 ya la expone) para decidir si el pilot escala.

## Próximos pasos
1. `soup init --template chat` + entrenar en Docker/Colab con el YAML de referencia.
2. Si el pilot convence: replicar patrón a pipeline-viral (12 guiones H) y
   recién entonces pensar en cancionero-rojo (corpus de 7, insuficiente hoy).
