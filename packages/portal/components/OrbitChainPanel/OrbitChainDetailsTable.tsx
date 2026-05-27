import { ArrowTopRightOnSquareIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { ORBIT_RAAS_CONFIG } from '@/common/orbitChains';
import { OrbitChain } from '@/common/types';

import { Card } from '../Card';
import { ExternalLink } from '../ExternalLink';

const getRaasProviderLink = (deployerTeam: string | null) => {
  if (!deployerTeam) return null;

  return ORBIT_RAAS_CONFIG.find(
    (raas) => raas.title.trim().toLowerCase() === deployerTeam.trim().toLowerCase(),
  )?.link;
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text.toString());
};

type TableData = {
  key: string;
  title: string;
  value: any;
  link?: string | null | undefined;
  copy?: boolean;
  onClick?: (data: { value: any }) => void;
}[];

const Table = ({ id, data }: { id: string; data: TableData }) => {
  const [showCopied, setShowCopied] = useState<string | boolean>(false);

  useEffect(() => {
    const hideCopyTimeout = setTimeout(() => {
      if (showCopied !== false) {
        setShowCopied(false);
      }
    }, 3000);

    return () => {
      clearTimeout(hideCopyTimeout);
    };
  }, [showCopied]);

  return (
    <div className="box-content overflow-hidden rounded-md border border-[#5B5B5B]">
      {data.map((row, index) => {
        if (!row.value || row.value === null || row.value === undefined) return null;

        const isActionable = row.link || row.copy;

        const Element = row.link ? ExternalLink : 'div';
        const hrefAttr = row.link ? { href: row.link } : {};

        return (
          <Element
            key={`${id}-${index}`}
            className={twMerge(
              'group col-span-4 grid grid-cols-4',
              isActionable && 'cursor-pointer',
            )}
            onClick={() => {
              row.onClick?.(row.value);
              if (row.copy) {
                setShowCopied(row.key);
              }
            }}
            {...hrefAttr}
          >
            <div
              className={twMerge(
                'col-span-1 border border-[#5B5B5B]/30 bg-[#3b3b3b] p-2',
                isActionable && 'group-hover:bg-[#595959]',
              )}
            >
              {row.title}
            </div>

            <div
              className={twMerge(
                'relative col-span-3 flex items-center justify-between border border-[#5B5B5B]/30 bg-[#313131] p-2',
                isActionable && 'group-hover:bg-[#464646]',
              )}
            >
              {row.value}
              {row.copy && (
                <div className="flex items-center gap-4">
                  {showCopied === row.key && (
                    <div className="absolute right-8 z-10 bg-[#313131] p-2 px-2 text-xs group-hover:bg-[#464646]">
                      Copied to clipboard!
                    </div>
                  )}
                  <DocumentDuplicateIcon className="align-center bottom-6 right-4 hidden h-4 w-4 justify-center group-hover:flex" />
                </div>
              )}
              {row.link && (
                <ArrowTopRightOnSquareIcon className="align-center bottom-6 right-4 hidden h-3 w-3 justify-center group-hover:flex" />
              )}
            </div>
          </Element>
        );
      })}
    </div>
  );
};

const generateOrbitTable1Data = (orbitChain: OrbitChain) => {
  // if no value coming from DB, then don't show the table
  const showTable = !!(
    orbitChain.chain.tokenAddress ||
    orbitChain.chain.gasFee ||
    orbitChain.chain.blockExplorerUrl
  );

  if (!showTable) return [];

  return [
    {
      key: 'token',
      title: 'Native Token',
      value: orbitChain.chain.token,
      link: orbitChain.chain.tokenAddress,
    },

    {
      key: 'blockExplorerUrl',
      title: 'Block Explorer URL',
      value: orbitChain.chain.blockExplorerUrl,
      link: orbitChain.chain.blockExplorerUrl,
    },
    {
      key: 'deployerTeam',
      title: 'Rollup-as-a-Service Provider',
      value: orbitChain.chain.deployerTeam,
      link: getRaasProviderLink(orbitChain.chain.deployerTeam),
    },
    {
      key: 'rpcUrl',
      title: 'RPC URL',
      value: orbitChain.chain.rpcUrl,
      copy: true,
      onClick: () => {
        if (orbitChain.chain.rpcUrl) {
          copyToClipboard(orbitChain.chain.rpcUrl.toString());
        }
      },
    },
    {
      key: 'chainId',
      title: 'Chain ID',
      value: orbitChain.chain.chainId,
      copy: true,
      onClick: () => {
        if (orbitChain.chain.chainId) {
          copyToClipboard(orbitChain.chain.chainId.toString());
        }
      },
    },
  ];
};

const generateOrbitTable2Data = (orbitChain: OrbitChain) => {
  // if no value coming from DB, then don't show the table
  const showTable = !!(
    orbitChain.chain.parentChain ||
    orbitChain.chain.layer ||
    orbitChain.chain.gasFee
  );

  if (!showTable) return [];

  return [
    {
      key: 'parentChain',
      title: 'Parent Chain',
      value: orbitChain.chain.parentChain,
    },
    {
      key: 'layer',
      title: 'Layer',
      value: orbitChain.chain.layer,
    },
    {
      key: 'gasFee',
      title: 'Approx Gas Fee',
      value: orbitChain.chain.gasFee,
    },
  ];
};

export const OrbitChainDetailsTable = ({ orbitChain }: { orbitChain: OrbitChain }) => {
  const table1Data = useMemo(() => generateOrbitTable1Data(orbitChain), [orbitChain]);

  const table2Data = useMemo(() => generateOrbitTable2Data(orbitChain), [orbitChain]);

  if (table1Data.length === 0 && table2Data.length === 0) return null;

  return (
    <Card className="col-span-4 p-6">
      <div className="text-xl">Chain Info</div>
      <br />

      {table1Data.length > 0 && (
        <>
          <div className="box-content overflow-hidden rounded-md border border-[#5B5B5B]">
            <Table id="table1" data={table1Data} />
          </div>
          <br />
        </>
      )}

      {table2Data.length > 0 && (
        <div className="box-content overflow-hidden rounded-md border border-[#5B5B5B]">
          <Table id="table2" data={table2Data} />
        </div>
      )}
    </Card>
  );
};
