import { useArbQueryParams } from '../../hooks/useArbQueryParams';
import { Routes } from '../TransferPanel/Routes/Routes';

export const WidgetRoutes = () => {
  const [{ amount }] = useArbQueryParams();

  if (!amount || isNaN(Number(amount)) || Number(amount) === 0) {
    return (
      <div className="flex min-h-[100px] grow text-xs">
        Please enter a valid amount to get route options.
      </div>
    );
  }

  return (
    <div className="max-h-unset flex grow flex-col gap-3 overflow-x-hidden overflow-y-auto max-[850px]:mb-[130px] min-[850px]:max-h-[170px]">
      <Routes />
    </div>
  );
};
