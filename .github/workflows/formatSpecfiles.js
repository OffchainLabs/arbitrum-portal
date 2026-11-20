#!/usr/bin/env node
// Builds the e2e job matrix: one job per shard in specfiles.json per testnode variant.
// Shards marked regularOnly read Ethereum/Sepolia history rather than the testnode, so they
// run once, against the L2 variant.
const shards = require('../../packages/arb-token-bridge-ui/tests/e2e/specfiles.json');

const variants = [
  { type: 'regular', typeName: '', tag: 'l2' },
  { type: 'orbit-eth', typeName: 'with L3 (ETH)', tag: 'l3-eth' },
  { type: 'orbit-custom-6dec', typeName: 'with L3 (6 decimals custom)', tag: 'l3-custom-6' },
  { type: 'orbit-custom-18dec', typeName: 'with L3 (18 decimals custom)', tag: 'l3-custom-18' },
  { type: 'orbit-custom-20dec', typeName: 'with L3 (20 decimals custom)', tag: 'l3-custom-20' },
];

const tests = [];

const testType = process.argv[2];
switch (testType) {
  case 'regular': {
    shards.forEach(({ regularOnly, ...shard }) => {
      variants
        .filter((variant) => !regularOnly || variant.type === 'regular')
        .forEach((variant) => tests.push({ ...shard, grep: shard.grep ?? '', ...variant }));
    });
    break;
  }
}

console.log(JSON.stringify(tests));
