export type NavRoute = '/' | '/bridge' | '/projects' | '/build';

export interface NavLink {
  label: string;
  route: NavRoute;
  active?: boolean;
}
