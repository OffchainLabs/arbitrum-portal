import { Sortable } from './types';

export function sortByRank(a: Sortable, b: Sortable) {
  // both objects have rank, so sort them by rank
  if (a.rank && b.rank) {
    return a.rank - b.rank;
  }

  // only object A has rank, so rank A higher
  if (a.rank) {
    return -1;
  }

  // only object B has rank, so rank B higher
  if (b.rank) {
    return 1;
  }

  // neither object has rank, so sort them by title
  return a.title.localeCompare(b.title);
}
