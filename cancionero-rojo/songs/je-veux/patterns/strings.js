// strings.js — Je Veux (Am): pad por sección con cambios de acorde
export const code = `note("<a3 c4 e4> <g3 b3 d4> <f3 a3 c4> <c4 e4 g4> <e3 g#3 b3> <a3 c4 e4> <g3 b3 d4> <f3 a3 c4>").sound("sawtooth").gain(0.14).lpf(1800).slow(2)`;
export const cps = 0.5;
export const loopSec = 8;
export const sections = {
  Intro: { code: `note("<a3 c4 e4> <g3 b3 d4> <f3 a3 c4> <e3 g#3 b3>").sound("sawtooth").gain(0.12).lpf(1600).slow(2)` },
  Verse: { code: `note("<a3 c4 e4> <g3 b3 d4> <f3 a3 c4> <c4 e4 g4> <e3 g#3 b3> <a3 c4 e4> <g3 b3 d4> <f3 a3 c4>").sound("sawtooth").gain(0.13).lpf(1700).slow(2)` },
  Chorus: { code: `note("<a3 c4 e4> <g3 b3 d4> <f3 a3 c4> <f3 a3 c4> <e3 g#3 b3> <a3 c4 e4> <g3 b3 d4> <e3 g#3 b3>").sound("sawtooth").gain(0.16).lpf(2200)` },
  Outro: { code: `note("<a3 c4 e4> <g3 b3 d4> <f3 a3 c4> <e3 g#3 b3>").sound("sawtooth").gain(0.11).lpf(1500).slow(2)` }
};
