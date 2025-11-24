import { Card } from './Card';

export const FastWithdrawalAnnouncement = () => {
  return (
    <Card
      cardType="externalLink"
      href="https://docs.arbitrum.io/launch-orbit-chain/how-tos/fast-withdrawals"
      className="bg-[#B14091] px-9 py-9 text-lg hover:bg-[#982577] lg:text-xl"
      grainy
    >
      <div className="flex flex-col flex-nowrap gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="lg:w-3/4">
          <div className="text-base lg:text-2xl">
            Fast Withdrawals are now supported for Arbitrum chains and RaaS providers – withdraw in
            as fast as 15 minutes!
          </div>
        </div>

        <p className="text-xs underline decoration-dashed underline-offset-4">Learn More</p>
      </div>
    </Card>
  );
};
