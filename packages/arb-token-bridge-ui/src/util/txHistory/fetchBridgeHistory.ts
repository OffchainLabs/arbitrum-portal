import { assertOk, getAPIBaseUrl, getCurrentExperimentsQueryParam, sanitizeQueryParams } from '..';

type BridgeHistoryRoute = 'deposits' | 'withdrawals' | 'eth-deposits-custom-destination';

export type BridgeHistoryQuery = {
  sender?: string;
  receiver?: string;
  fromBlock: number;
  toBlock?: number;
  l2ChainId: number;
  pageSize: number;
  pageNumber: number;
  searchString: string;
};

export async function fetchBridgeHistory<T>({
  route,
  query,
}: {
  route: BridgeHistoryRoute;
  query: BridgeHistoryQuery;
}): Promise<T[]> {
  const { sender, receiver, fromBlock, toBlock, l2ChainId, pageSize, pageNumber, searchString } =
    query;

  if (pageSize === 0) {
    return [];
  }

  const urlParams = new URLSearchParams(
    sanitizeQueryParams({
      sender,
      receiver,
      fromBlock,
      toBlock,
      l2ChainId,
      pageSize,
      page: pageNumber,
      search: searchString,
      experiments: getCurrentExperimentsQueryParam(),
    }),
  );

  const path = `/api/${route}`;
  const response = await fetch(`${getAPIBaseUrl()}${path}?${urlParams}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  await assertOk(response, `[fetchBridgeHistory] ${path}`);

  return (await response.json()).data;
}
