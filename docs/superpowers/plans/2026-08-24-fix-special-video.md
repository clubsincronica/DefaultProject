# Plan de correccion video especial 2026-08-27

## Problemas reportados
1. Simbolos Â: en overlay (mojibake)
2. Carta astral detras de Cartouche
3. Glifos offset en oraculo
4. Sin frame de aspecto
5. Transcripcion: 'Pisces'/'Pisis' debe ser 'Piscis'
6. Frames reusados, no nuevos
7. Musica estridente y loop continuo

## Soluciones propuestas
1. Corregir mojibake en frames.js: Â· -> ·
2. Revisar capas de renderizado en cartouche
3. Ajustar offsets de glifos en oraculo
4. Insertar frame de aspecto Mercury Virgo-Piscis
5. Corregir transcripcion con sed
6. Regenerar frames con correcciones
7. Mejorar patron musical Strudel
