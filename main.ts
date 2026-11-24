import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const IN = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const SM = 256, CM = 64, MW = 256, SL = 1e6, OM = 65536, te = new TextEncoder();
const IMM = new Uint8Array(256), POPS = new Uint8Array(256), PUSH = new Uint8Array(256), OK = new Uint8Array(256);
const def = (b: number, i = 0, p = 0, q = 0) => { OK[b] = 1; IMM[b] = i; POPS[b] = p; PUSH[b] = q; };
def(0x00); def(0x01, 1, 0, 1); def(0x02, 4, 0, 1); def(0x03, 0, 1, 0); def(0x04, 0, 1, 2); def(0x05, 0, 2, 2);
def(0x06, 0, 2, 3); def(0x07, 0, 3, 3); def(0x10, 0, 2, 1); def(0x11, 0, 2, 1); def(0x12, 0, 2, 1); def(0x13, 0, 2, 1);
def(0x14, 0, 2, 1); def(0x15, 0, 2, 1); def(0x16, 0, 2, 1); def(0x17, 0, 1, 1); def(0x18, 0, 2, 1); def(0x19, 0, 2, 1);
def(0x1a, 0, 2, 1); def(0x1b, 0, 1, 1); def(0x1c, 0, 2, 1); def(0x1d, 0, 2, 1); def(0x1e, 0, 2, 1); def(0x20, 0, 2, 1);
def(0x21, 0, 2, 1); def(0x22, 0, 2, 1); def(0x30, 2); def(0x31, 2, 1, 0); def(0x32, 2, 1, 0); def(0x33, 2); def(0x34);
def(0x40, 0, 1, 1); def(0x41, 0, 2, 0); def(0x50, 0, 1, 0); def(0x51, 0, 1, 0); def(0x52, 0, 0, 1); def(0x53, 0, 1, 0);

export function run(P: Uint8Array, input: Uint8Array) {
  const n = P.length, D = new Int32Array(SM), C = new Int32Array(CM), M = new Int32Array(MW), out = new Uint8Array(OM);
  let sp = 0, csp = 0, olen = 0, ip = 0, pc = 0, steps = 0;
  const done = (exit: number) => ({ stdout: out.slice(0, olen), exit });
  const trap = (c: number) => done(c);
  for (;;) {
    if (steps === SL) return trap(10);
    if (pc < 0 || pc >= n) return trap(9);
    const op = P[pc];
    if (!OK[op]) return trap(5);
    const imm = IMM[op];
    if (pc + imm >= n) return trap(9);
    steps++;
    const next = pc + 1 + imm, pops = POPS[op], pushes = PUSH[op];
    if (sp < pops) return trap(2);
    if (sp - pops + pushes > SM) return trap(3);
    pc = next;
    switch (op) {
      case 0x00: return done(0);
      case 0x01: D[sp++] = (P[next - 1] << 24) >> 24; break;
      case 0x02: D[sp++] = P[next - 4] | (P[next - 3] << 8) | (P[next - 2] << 16) | (P[next - 1] << 24); break;
      case 0x03: sp--; break;
      case 0x04: D[sp] = D[sp - 1]; sp++; break;
      case 0x05: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 0x06: D[sp] = D[sp - 2]; sp++; break;
      case 0x07: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break;
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: {
        const b = D[sp - 1], a = D[sp - 2];
        let r: number;
        if (op > 0x12 && op < 0x17 && b === 0) return trap(4);
        switch (op) {
          case 0x10: r = (a + b) | 0; break;
          case 0x11: r = (a - b) | 0; break;
          case 0x12: r = Math.imul(a, b); break;
          case 0x13: r = a === -2147483648 && b === -1 ? a : (a / b) | 0; break;
          case 0x14: r = b === -1 ? 0 : a % b | 0; break;
          case 0x15: r = Math.floor((a >>> 0) / (b >>> 0)) | 0; break;
          case 0x16: r = (a >>> 0) % (b >>> 0) | 0; break;
          case 0x18: r = a & b; break;
          case 0x19: r = a | b; break;
          case 0x1a: r = a ^ b; break;
          case 0x1c: r = a << (b & 31); break;
          case 0x1d: r = a >> (b & 31); break;
          case 0x1e: r = (a >>> (b & 31)) | 0; break;
          case 0x20: r = a === b ? 1 : 0; break;
          case 0x21: r = a < b ? 1 : 0; break;
          default: r = a >>> 0 < b >>> 0 ? 1 : 0;
        }
        sp -= 2; D[sp++] = r; break;
      }
      case 0x30: case 0x31: case 0x32: {
        const rel = ((P[next - 2] | (P[next - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) { const v = D[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
        if (take) pc = next + rel;
        break;
      }
      case 0x33:
        if (csp === CM) return trap(7);
        C[csp++] = next; pc = P[next - 2] | (P[next - 1] << 8); break;
      case 0x34:
        if (csp === 0) return trap(8);
        pc = C[--csp]; break;
      case 0x40: {
        const addr = D[sp - 1];
        if (addr < 0 || addr >= MW) return trap(6);
        D[sp - 1] = M[addr]; break;
      }
      case 0x41: {
        const addr = D[sp - 1], v = D[sp - 2];
        if (addr < 0 || addr >= MW) return trap(6);
        sp -= 2; M[addr] = v; break;
      }
      case 0x50: {
        const bytes = te.encode(String(D[sp - 1]));
        if (olen + bytes.length > OM) return trap(11);
        sp--; out.set(bytes, olen); olen += bytes.length; break;
      }
      case 0x51:
        if (olen + 1 > OM) return trap(11);
        out[olen++] = D[--sp] & 255; break;
      case 0x52: D[sp++] = ip < input.length ? input[ip++] : -1; break;
      case 0x53: return done(D[--sp] & 255);
    }
  }
}

for (const id of readdirSync(IN).sort()) {
  const dir = join(IN, id);
  const r = run(readFileSync(join(dir, 'program.bin')), readFileSync(join(dir, 'input.bin')));
  const od = join(OUT, id);
  mkdirSync(od, { recursive: true });
  writeFileSync(join(od, 'stdout.bin'), r.stdout);
  writeFileSync(join(od, 'exit.txt'), String(r.exit) + '\n');
}
