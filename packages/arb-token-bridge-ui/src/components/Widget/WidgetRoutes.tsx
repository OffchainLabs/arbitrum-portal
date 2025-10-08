import { useArbQueryParams } from '../../hooks/useArbQueryParams';
import { Routes } from '../TransferPanel/Routes/Routes';

export const WidgetRoutes = () => {
  const [{ amount }] = useArbQueryParams();

  if (!amount || isNaN(Number(amount)) || Number(amount) === 0) {
    return (
      <div className="flex min-h-[100px] flex-grow text-xs">
        Please enter a valid amount to get route options.
      </div>
    );
  }

  return (
    <div className="flex flex-grow flex-col gap-3 overflow-y-auto overflow-x-hidden min-[850px]:max-h-[170px] max-h-unset max-[850px]:mb-[130px]">
      <Routes />
    </div>
  );
};
