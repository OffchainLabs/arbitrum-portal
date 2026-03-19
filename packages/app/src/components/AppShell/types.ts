export type NavRoute = '/' | '/bridge' | '/earn' | '/projects' | '/build';

export interface NavLink {
  label: string;
  route: NavRoute;
  href: string;
  active?: boolean;
}
