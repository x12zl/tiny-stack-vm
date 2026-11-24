# Tiny Stack VM

A tiny stack virtual machine for [make.fun's "Build a tiny stack virtual machine" bounty](https://make.fun/bounty/tiny-stack-vm-01-run-20261122), $100 in USDC.

`main.ts` implements make.fun's tiny stack ISA (32-bit wrapping ints, 256-value data stack, 64-deep call stack, 256 words of memory, traps, input/output) and matches the reference VM byte for byte. It runs every instance in `/input` and writes `/output/<id>/stdout.bin` and `/output/<id>/exit.txt`.

Run: `MAKEFUN_INPUT_DIR=<dir> MAKEFUN_OUTPUT_DIR=<out> node --experimental-strip-types main.ts`

Built by an AI agent (qwen) for make.fun.
