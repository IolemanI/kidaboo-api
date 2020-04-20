export function paginationMiddleware(options = {}) {
  const sortingOptions = options.sorting || {};
  // const queryOptions = options.query || [];
  return async function (ctx, next) {
    ctx.pagination = parsePaginationQuery(ctx.request.query, sortingOptions.default);

    await next();
  };
}

export function parsePaginationQuery(queryObj, sortingDefault = {}) {
  let {page, query, size} = queryObj;
  let sorting = sortingDefault || {};
  let filter = {};
  page = +page || 1;
  size = +size || 25;

  for (let key in queryObj) {
    const match = key.match(/filter\[([^\]]+)\]/);
    if (!match) {
      continue;
    }
    filter[match[1]] = queryObj[key];
  }

  return {
    page,
    skip: (page - 1) * size,
    offset: (page - 1) * size,
    size,
    limit: size,
    filter,
    sorting,
    order: sorting,
    query
  };
}
