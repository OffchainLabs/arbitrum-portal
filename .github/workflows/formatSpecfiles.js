#!/usr/bin/env node

const tests = [];

// One matrix entry per testnode variant. Each job runs the full spec list
// (synpress.config.ts falls back to all of specfiles.json when TEST_FILE is
// unset), so the per-job testnode boot, app start, and chain setup are paid
// once per variant instead of once per spec.
const variants = [
  { type: 'regular', typeName: 'Regular', tag: 'l2' },
  { type: 'orbit-eth', typeName: 'with L3 (ETH)', tag: 'l3-eth' },
  { type: 'orbit-custom-6dec', typeName: 'with L3 (6 decimals custom)', tag: 'l3-custom-6' },
  { type: 'orbit-custom-18dec', typeName: 'with L3 (18 decimals custom)', tag: 'l3-custom-18' },
  { type: 'orbit-custom-20dec', typeName: 'with L3 (20 decimals custom)', tag: 'l3-custom-20' },
];

const testType = process.argv[2];
switch (testType) {
  case 'regular': {
    variants.forEach((variant) => {
      tests.push({ ...variant, recordVideo: false });
    });
    break;
  }
  case 'cctp': {
    // Running CCTP tests in parallel cause nonce issues, we're running the two tests sequentially
    tests.push({
      name: 'cctp',
      typeName: '',
      file: 'tests/e2e/specs/**/*Cctp.cy.{js,jsx,ts,tsx}',
      recordVideo: false,
      type: 'cctp',
    });
    break;
  }
}

console.log(JSON.stringify(tests));
