import { useState } from 'react';

import { Checkbox } from '../../common/Checkbox';
import { ExternalLink } from '../../common/ExternalLink';

export function USDCDepositConfirmationDialogCheckbox({
  onChange,
}: {
  onChange: (checked: boolean) => void;
}) {
  const [checked, setChecked] = useState(false);
  const externalLinkClassnames = 'arb-hover underline';

  function linksOnClickHandler(event: React.MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
  }

  return (
    <Checkbox
      label={
        <span className="select-none font-light">
          I understand <span className="font-medium">USDC.e</span> is different from{' '}
          <span className="font-medium">USDC</span>.{' '}
          <ExternalLink
            className={externalLinkClassnames}
            href="https://arbitrumfoundation.medium.com/usdc-to-come-natively-to-arbitrum-f751a30e3d83"
            onClick={linksOnClickHandler}
          >
            Learn more
          </ExternalLink>
          .
        </span>
      }
      checked={checked}
      onChange={(isChecked) => {
        onChange(isChecked);
        setChecked(isChecked);
      }}
    />
  );
}
