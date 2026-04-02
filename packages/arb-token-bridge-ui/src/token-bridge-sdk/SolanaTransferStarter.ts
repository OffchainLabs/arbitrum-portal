import type {
  SendTransactionResult,
  SignerHandle,
  SolanaSendTransactionInput,
} from '../wallet/types';

type SolanaTransferProps = {
  signer: SignerHandle;
  serializedTransaction: string;
};

export class SolanaTransferStarter {
  public async transfer({
    signer,
    serializedTransaction,
  }: SolanaTransferProps): Promise<SendTransactionResult> {
    if (signer.ecosystem !== 'solana') {
      throw new Error('Invalid signer: expected a Solana signer.');
    }

    const input: SolanaSendTransactionInput = {
      ecosystem: 'solana',
      serializedTransaction,
    };

    return signer.sendTransaction(input);
  }
}
