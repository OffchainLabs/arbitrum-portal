export type SearchParamsProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};
