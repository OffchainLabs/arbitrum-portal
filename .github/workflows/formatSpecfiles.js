#!/usr/bin/env node
const specFiles = require('../../packages/arb-token-bridge-ui/tests/e2e/specfiles.json');

const tests = [];

// Map variant type to testnode image tag
const tagMap = {
  'regular': 'l2',
  'orbit-eth': 'l3-eth',
  'orbit-custom-6dec': 'l3-custom-6',
  'orbit-custom-18dec': 'l3-custom-18',
  'orbit-custom-20dec': 'l3-custom-20',
};

const testType = process.argv[2];
switch (testType) {
  case 'regular': {
    specFiles.forEach((spec) => {
      tests.push({
        ...spec,
        type: 'regular',
        typeName: '',
        tag: tagMap['regular'],
      });
      tests.push({
        ...spec,
        type: 'orbit-eth',
        typeName: 'with L3 (ETH)',
        tag: tagMap['orbit-eth'],
      });
      tests.push({
        ...spec,
        type: 'orbit-custom-6dec',
        typeName: 'with L3 (6 decimals custom)',
        tag: tagMap['orbit-custom-6dec'],
      });
      tests.push({
        ...spec,
        type: 'orbit-custom-18dec',
        typeName: 'with L3 (18 decimals custom)',
        tag: tagMap['orbit-custom-18dec'],
      });
      tests.push({
        ...spec,
        type: 'orbit-custom-20dec',
        typeName: 'with L3 (20 decimals custom)',
        tag: tagMap['orbit-custom-20dec'],
      });
    });
    break;
  }
  case 'cctp': {
    // Running CCTP tests in parallel cause nonce issues, we're running the two tests sequentially
    tests.push({
      name: 'cctp',
      typeName: '',
      file: '*Cctp.spec.ts',
      recordVideo: false,
      type: 'cctp',
    });
    break;
  }
}

console.log(JSON.stringify(tests));
