import { PathnameEnum } from '../constants';

export function isBridgeBuyOrSubpages(pathname: string) {
  return pathname === PathnameEnum.BUY || pathname.startsWith(`${PathnameEnum.BUY}/`);
}
export function isEmbeddedBridgeBuyOrSubpages(pathname: string) {
  return pathname === PathnameEnum.EMBED_BUY || pathname.startsWith(`${PathnameEnum.EMBED_BUY}/`);
}
