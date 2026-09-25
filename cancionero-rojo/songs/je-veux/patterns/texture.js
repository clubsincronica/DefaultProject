// texture.js — Je Veux bossa ambient bed (brush/shaker haze + slow sine pad)
export const code = `stack(s("brown:1").gain(0.07).lpf(900).slow(2), note("<a2 e3> <g2 d3> <f2 c3> <e2 b2>").sound("sine").gain(0.09).lpf(1200).slow(4))`;
export const cps = 0.5;
export const loopSec = 8;
export const sections = {
  Intro: { code: `stack(s("brown:1").gain(0.05).lpf(800).slow(2), note("<a2 e3> <g2 d3> <f2 c3> <e2 b2>").sound("sine").gain(0.07).lpf(1000).slow(4))` },
  Chorus: { code: `stack(s("brown:1").gain(0.08).lpf(1000).slow(2), note("<a2 e3> <g2 d3> <f2 c3> <e2 b2> <g2 d3> <a2 e3>").sound("sine").gain(0.11).lpf(1400).slow(4))` }
};
