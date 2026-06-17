export async function fetchAllPages<T, R>(
  fetchFn: (params: Record<string, unknown>) => Promise<R>,
  params: Record<string, unknown> = {},
  dataKey: keyof R,
  limit: number = 50,
): Promise<T[]> {
  let page = 1;
  let totalPages = 1;
  const allData: T[] = [];

  try {
    do {
      const response = (await fetchFn({ ...params, page, limit })) as Record<
        string,
        unknown
      >;
      const items = response[dataKey as string] as T[];

      if (Array.isArray(items)) {
        allData.push(...items);
      }

      const pagination = response.pagination as
        | { totalPages: number; pages?: number }
        | undefined;
      totalPages = pagination?.totalPages ?? pagination?.pages ?? 1;
      page += 1;
    } while (page <= totalPages);
  } catch (error) {
    console.error(`Error in fetchAllPages for key ${String(dataKey)}:`, error);
    throw error;
  }

  const uniqueById = new Map<string, T>();
  allData.forEach((item) => {
    const itemWithId = item as T & { _id?: string };
    if (itemWithId && itemWithId._id) {
      uniqueById.set(itemWithId._id, item);
    }
  });

  return uniqueById.size > 0 ? Array.from(uniqueById.values()) : allData;
}
