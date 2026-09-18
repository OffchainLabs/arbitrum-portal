export async function getEvmWalletConfig() {
  return (await import('../../util/wagmi/setup')).wagmiConfig;
}
