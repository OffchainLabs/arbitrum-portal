import { NOVA_MAX_ETH_DEPOSIT_AMOUNT, NOVA_MINIMIZED_STATE_LINK } from '../../util/NovaUtils';
import { ExternalLink } from '../common/ExternalLink';
import { NoteBox } from '../common/NoteBox';

export const NovaMinimizedStateWarning = () => {
  return (
    <NoteBox variant="warning" className="mt-2">
      <div className="flex flex-col space-y-2 text-sm">
        <p>
          <b>Arbitrum Nova is in a minimized state.</b> Please bridge your funds to{' '}
          <b>Arbitrum One</b> instead.
        </p>

        <p>
          Deposits to Nova are limited to {NOVA_MAX_ETH_DEPOSIT_AMOUNT} ETH, which is enough to
          cover the gas needed to withdraw your funds. Withdrawals from Nova are unaffected.
        </p>

        <ExternalLink href={NOVA_MINIMIZED_STATE_LINK} className="underline">
          Learn more
        </ExternalLink>
      </div>
    </NoteBox>
  );
};
