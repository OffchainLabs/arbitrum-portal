# End-to-end tests

## Folder structure

These folders hold end-to-end tests and supporting files for the Playwright Test Runner, using the
[Synpress](https://github.com/Synthetixio/synpress) MetaMask plugin.

- [specs](specs) holds the actual test files, [read more](https://playwright.dev/docs/writing-tests)
- [support](support) holds the network configs and the shared page actions used by the specs
- [globalSetup.ts](globalSetup.ts) runs once before all tests and does the on-chain prep (token
  deployment, funding, approvals)
- [fixtures.ts](fixtures.ts) holds the MetaMask browser context and the `e2eEnv` fixture available to
  every test
- [e2eConfig.ts](e2eConfig.ts) reads and writes the config `globalSetup.ts` passes to the specs

## `playwright.config.ts` file

You can configure project options in the [../../../playwright.config.ts](../../../playwright.config.ts)
file, see [Playwright configuration doc](https://playwright.dev/docs/test-configuration).

## Running the tests

A local Nitro test node and the bridge app must be running. See
[E2E Tests](../../../../../DEVELOPMENT.md#e2e-tests) in `DEVELOPMENT.md` for the one-time setup.

```bash
pnpm start                                  # http://localhost:3000

# in another terminal:
pnpm test:e2e                               # whole suite
pnpm test:e2e login                         # a single spec (filter by filename)
pnpm test:e2e:orbit                         # orbit (L3 ETH) variant
pnpm test:e2e:orbit:custom-gas-token        # orbit custom-gas-token variant
```

## More information

- [https://github.com/microsoft/playwright](https://github.com/microsoft/playwright)
- [https://playwright.dev/docs/intro](https://playwright.dev/docs/intro)
- [Writing your first Playwright test](https://playwright.dev/docs/writing-tests)
