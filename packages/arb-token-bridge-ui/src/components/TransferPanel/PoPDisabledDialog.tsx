import React from 'react';

import { ExternalLink } from '@/components/ExternalLink';

import { Dialog, DialogProps } from '../common/Dialog';

export const PoPDisabledDialog = (props: DialogProps) => {
  return (
    <Dialog
      {...props}
      title="Proof of Play Not Supported"
      actionButtonTitle="Close"
      isFooterHidden
      isOpen={props.isOpen}
      onClose={() => {
        props.onClose(false);
      }}
    >
      <div className="flex flex-col space-y-4 py-4">
        <p>
          The chains Proof of Play Apex and Proof of Play Boss have been deprecated.
          <br />
          Please{' '}
          <ExternalLink
            className="underline"
            href="https://proofofplay.helpshift.com/hc/en/3-shiba-story-go/contact-us/"
          >
            contact the Proof of Play team
          </ExternalLink>{' '}
          directly for withdrawal support.
        </p>
      </div>
    </Dialog>
  );
};
