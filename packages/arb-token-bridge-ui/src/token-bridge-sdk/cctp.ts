import { Config, simulateContract, writeContract } from '@wagmi/core';

import { CCTPSupportedChainId } from '../state/cctpState';
import { ChainId } from '../types/ChainId';
import { Address } from '../util/AddressUtils';
import { MessageTransmitterAbi } from '../util/cctp/MessageTransmitterAbi';

type Contracts = {
  targetChainId: CCTPSupportedChainId;
  messageTransmitterContractAddress: Address;
  attestationApiUrl: string;
};

const contracts: Record<CCTPSupportedChainId, Contracts> = {
  [ChainId.Ethereum]: {
    targetChainId: ChainId.ArbitrumOne,
    messageTransmitterContractAddress: '0xc30362313fbba5cf9163f0bb16a0e01f01a896ca',
    attestationApiUrl: 'https://iris-api.circle.com/v1',
  },
  [ChainId.Sepolia]: {
    targetChainId: ChainId.ArbitrumSepolia,
    messageTransmitterContractAddress: '0xacf1ceef35caac005e15888ddb8a3515c41b4872',
    attestationApiUrl: 'https://iris-api-sandbox.circle.com/v1',
  },
  [ChainId.ArbitrumOne]: {
    targetChainId: ChainId.Ethereum,
    messageTransmitterContractAddress: '0x0a992d191deec32afe36203ad87d7d289a738f81',
    attestationApiUrl: 'https://iris-api.circle.com/v1',
  },
  [ChainId.ArbitrumSepolia]: {
    targetChainId: ChainId.Sepolia,
    messageTransmitterContractAddress: '0x7865fafc2db2093669d92c0f33aeef291086befd',
    attestationApiUrl: 'https://iris-api-sandbox.circle.com/v1',
  },
};

export type AttestationResponse =
  | {
      attestation: Address;
      status: 'complete';
    }
  | {
      attestation: null;
      status: 'pending_confirmations';
    };

export function getCctpContracts({ sourceChainId }: { sourceChainId?: ChainId }) {
  if (!sourceChainId) {
    return contracts[ChainId.Ethereum];
  }
  return contracts[sourceChainId as CCTPSupportedChainId] || contracts[ChainId.Ethereum];
}

export const getCctpUtils = ({ sourceChainId }: { sourceChainId?: number }) => {
  const { targetChainId, attestationApiUrl, messageTransmitterContractAddress } = getCctpContracts({
    sourceChainId,
  });

  const fetchAttestation = async (attestationHash: Address) => {
    const response = await fetch(`${attestationApiUrl}/attestations/${attestationHash}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });

    const attestationResponse: AttestationResponse = await response.json();
    return attestationResponse;
  };

  const waitForAttestation = async (attestationHash: Address) => {
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const attestation = await fetchAttestation(attestationHash);
      if (attestation.status === 'complete') {
        return attestation.attestation;
      }

      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 30_000));
    }
  };

  const receiveMessage = async ({
    messageBytes,
    attestation,
    wagmiConfig,
  }: {
    messageBytes: Address;
    attestation: Address;
    wagmiConfig: Config;
  }) => {
    const { request } = await simulateContract(wagmiConfig, {
      address: messageTransmitterContractAddress,
      abi: MessageTransmitterAbi,
      functionName: 'receiveMessage',
      chainId: targetChainId,
      args: [messageBytes, attestation],
    });
    const txHash = await writeContract(wagmiConfig, request);
    return { hash: txHash };
  };

  return {
    receiveMessage,
    fetchAttestation,
    waitForAttestation,
  };
};
