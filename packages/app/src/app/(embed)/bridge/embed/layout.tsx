import '@rainbow-me/rainbowkit/styles.css';
import { PropsWithChildren } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';

import { ArbitrumNavigation } from '../../../../components/ArbitrumNavigation';
import '../../../../styles/bridge.css';

export default function EmbedLayout(props: PropsWithChildren) {
  return (
    <ArbitrumNavigation>
      <div className="bg-widget-background bridge-wrapper h-screen">{props.children}</div>
    </ArbitrumNavigation>
  );
}
