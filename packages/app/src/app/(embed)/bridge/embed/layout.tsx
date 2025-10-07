import '@rainbow-me/rainbowkit/styles.css';
import { PropsWithChildren } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';

export default function EmbedLayout(props: PropsWithChildren) {
  return <div className="bg-widget-background">{props.children}</div>;
}
