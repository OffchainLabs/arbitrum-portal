import { gql } from '@apollo/client';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { getCctpSubgraphClient } from '../ServerSubgraphUtils';

// missing from unpinned indexers due to https://github.com/graphprotocol/graph-node/issues/6683
const transactionHash = '0x77894001ee62c0b245e6e9c3b35fcdc79e917ce352b20a0b2ec49e8d916734c2';

describe('getCctpSubgraphClient', () => {
  it('returns the transfer missing from unpinned indexers', async () => {
    const { data } = await getCctpSubgraphClient(ChainId.Ethereum).query({
      query: gql`
        {
          messageSents(where: { transactionHash: "${transactionHash}" }) {
            id
            transactionHash
          }
        }
      `,
    });

    expect(data.messageSents).toHaveLength(1);
    expect(data.messageSents[0].transactionHash).toEqual(transactionHash);
  });
});
