import clickhouse from '@/lib/clickhouse';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';

const UTM_COLUMNS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

type UTMColumn = (typeof UTM_COLUMNS)[number];

type UTMFilters = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
};

interface UTMQueryFilters {
  startDate: Date;
  endDate: Date;
  timezone?: string;
  filters?: UTMFilters;
  limit?: number;
}

interface UTMTotals {
  pageviews: number;
  visitors: number;
  visits: number;
}

interface UTMMetricRow {
  name: string;
  pageviews: number;
  visitors: number;
  visits: number;
  percent: number;
}

interface UTMQueryResult {
  totals: UTMTotals;
  parameters: Record<UTMColumn, UTMMetricRow[]>;
}

export async function getUTM(websiteId: string, filters: UTMQueryFilters): Promise<UTMQueryResult> {
  return runQuery({
    [PRISMA]: () => relationalQuery(websiteId, filters),
    [CLICKHOUSE]: () => clickhouseQuery(websiteId, filters),
  });
}

function getFilterValue(column: UTMColumn, filters?: UTMFilters) {
  if (!filters) {
    return undefined;
  }

  switch (column) {
    case 'utm_source':
      return filters.source;
    case 'utm_medium':
      return filters.medium;
    case 'utm_campaign':
      return filters.campaign;
    case 'utm_content':
      return filters.content;
    case 'utm_term':
      return filters.term;
    default:
      return undefined;
  }
}

function mapRow(row: any, totalPageviews: number): UTMMetricRow {
  const pageviews = Number(row?.pageviews ?? 0);
  const visitors = Number(row?.visitors ?? 0);
  const visits = Number(row?.visits ?? 0);
  const percent = totalPageviews > 0 ? (pageviews / totalPageviews) * 100 : 0;

  return {
    name: row?.name ?? '',
    pageviews,
    visitors,
    visits,
    percent,
  };
}

async function relationalQuery(
  websiteId: string,
  filters: UTMQueryFilters,
): Promise<UTMQueryResult> {
  const { startDate, endDate, filters: utmFilters, limit = 10 } = filters;
  const { rawQuery } = prisma;

  const params: Record<string, any> = {
    websiteId,
    startDate,
    endDate,
    limit,
  };

  const staticConditions = [
    'website_id = {{websiteId::uuid}}',
    'created_at between {{startDate}} and {{endDate}}',
    'event_type = 1',
  ];

  const totals = await rawQuery(
    `
    select
      count(*) as "pageviews",
      count(distinct session_id) as "visitors",
      count(distinct visit_id) as "visits"
    from website_event
    where ${staticConditions.join('\n      and ')}
    ${buildFilterConditions(params, utmFilters).join('\n      and ')}
    `,
    params,
  ).then(result => ({
    pageviews: Number(result?.[0]?.pageviews ?? 0),
    visitors: Number(result?.[0]?.visitors ?? 0),
    visits: Number(result?.[0]?.visits ?? 0),
  }));

  const parameters = await Promise.all(
    UTM_COLUMNS.map(async column => {
      const columnFilters = buildFilterConditions(params, utmFilters, column);

      const rows = (await rawQuery(
        `
        select
          ${column} as name,
          count(*) as "pageviews",
          count(distinct session_id) as "visitors",
          count(distinct visit_id) as "visits"
        from website_event
        where ${staticConditions.join('\n          and ')}
          and coalesce(${column}, '') != ''
        ${columnFilters.length ? `and ${columnFilters.join('\n          and ')}` : ''}
        group by 1
        order by "pageviews" desc
        limit {{limit::int}}
        `,
        params,
      )) as any[];

      const totalPageviews = totals.pageviews || 0;
      const key = column as UTMColumn;

      return [key, rows.map(row => mapRow(row, totalPageviews))] as [UTMColumn, UTMMetricRow[]];
    }),
  );

  return {
    totals,
    parameters: Object.fromEntries(parameters) as Record<UTMColumn, UTMMetricRow[]>,
  };
}

async function clickhouseQuery(
  websiteId: string,
  filters: UTMQueryFilters,
): Promise<UTMQueryResult> {
  const { startDate, endDate, filters: utmFilters, limit = 10 } = filters;
  const { rawQuery } = clickhouse;

  const params: Record<string, any> = {
    websiteId,
    startDate,
    endDate,
    limit,
  };

  const staticConditions = [
    'website_id = {websiteId:UUID}',
    'created_at between {startDate:DateTime64} and {endDate:DateTime64}',
    'event_type = 1',
  ];

  const totals = await rawQuery(
    `
    select
      count(*) as pageviews,
      uniqExact(session_id) as visitors,
      uniqExact(visit_id) as visits
    from website_event
    where ${staticConditions.join('\n      and ')}
    ${buildClickhouseFilterConditions(params, utmFilters).join('\n      and ')}
    `,
    params,
  ).then(result => ({
    pageviews: Number(result?.[0]?.pageviews ?? 0),
    visitors: Number(result?.[0]?.visitors ?? 0),
    visits: Number(result?.[0]?.visits ?? 0),
  }));

  const parameters = await Promise.all(
    UTM_COLUMNS.map(async column => {
      const columnFilters = buildClickhouseFilterConditions(params, utmFilters, column);

      const rows = (await rawQuery(
        `
        select
          ${column} as name,
          count(*) as pageviews,
          uniqExact(session_id) as visitors,
          uniqExact(visit_id) as visits
        from website_event
        where ${staticConditions.join('\n          and ')}
          and ${column} != ''
        ${columnFilters.length ? `and ${columnFilters.join('\n          and ')}` : ''}
        group by 1
        order by pageviews desc
        limit {limit:UInt32}
        `,
        params,
      )) as any[];

      const totalPageviews = totals.pageviews || 0;
      const key = column as UTMColumn;

      return [key, rows.map(row => mapRow(row, totalPageviews))] as [UTMColumn, UTMMetricRow[]];
    }),
  );

  return {
    totals,
    parameters: Object.fromEntries(parameters) as Record<UTMColumn, UTMMetricRow[]>,
  };
}

function buildFilterConditions(
  params: Record<string, any>,
  filters?: UTMFilters,
  excludeColumn?: UTMColumn,
) {
  const conditions: string[] = [];

  if (!filters) {
    return conditions;
  }

  UTM_COLUMNS.forEach(column => {
    if (column === excludeColumn) {
      return;
    }

    const value = getFilterValue(column, filters);

    if (value) {
      const paramKey = `${column.replace('utm_', '')}Filter`;
      params[paramKey] = value;
      conditions.push(`${column} = {{${paramKey}::text}}`);
    }
  });

  return conditions;
}

function buildClickhouseFilterConditions(
  params: Record<string, any>,
  filters?: UTMFilters,
  excludeColumn?: UTMColumn,
) {
  const conditions: string[] = [];

  if (!filters) {
    return conditions;
  }

  UTM_COLUMNS.forEach(column => {
    if (column === excludeColumn) {
      return;
    }

    const value = getFilterValue(column, filters);

    if (value) {
      const paramKey = `${column.replace('utm_', '')}Filter`;
      params[paramKey] = value;
      conditions.push(`${column} = {${paramKey}:String}`);
    }
  });

  return conditions;
}
