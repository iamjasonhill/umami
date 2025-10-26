import clickhouse from '@/lib/clickhouse';
import { EVENT_COLUMNS, EVENT_TYPE, FILTER_COLUMNS } from '@/lib/constants';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import { QueryFilters } from '@/lib/types';

export async function getPageviewMetrics(
  ...args: [
    websiteId: string,
    type: string,
    filters: QueryFilters,
    limit?: number | string,
    offset?: number | string,
  ]
) {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
  });
}

async function relationalQuery(
  websiteId: string,
  type: string,
  filters: QueryFilters,
  limit: number | string = 500,
  offset: number | string = 0,
) {
  const column = FILTER_COLUMNS[type] || type;
  const { rawQuery, parseFilters } = prisma;
  const { filterQuery, cohortQuery, joinSession, params } = await parseFilters(
    websiteId,
    {
      ...filters,
      eventType: column === 'event_name' ? EVENT_TYPE.customEvent : EVENT_TYPE.pageView,
    },
    { joinSession: true },
  );

  if (type === 'entry') {
    return rawQuery(
      `
      with first_touch as (
        select
          website_event.visit_id,
          min(website_event.created_at) as first_created_at
        from website_event
        ${cohortQuery}
        where website_event.website_id = {{websiteId::uuid}}
          and website_event.created_at between {{startDate}} and {{endDate}}
          and event_type = {{eventType}}
          ${filterQuery}
        group by website_event.visit_id
      )
      select
        website_event.url_path as x,
        count(distinct session.session_id) as y,
        count(distinct session.session_id) filter (where session.channel_first is not null) as y_channel,
        json_agg(session.channel_first) filter (where session.channel_first is not null) as channels
      from website_event
        inner join first_touch on first_touch.visit_id = website_event.visit_id
          and first_touch.first_created_at = website_event.created_at
        inner join session on session.session_id = website_event.session_id
      where website_event.website_id = {{websiteId::uuid}}
        and website_event.created_at between {{startDate}} and {{endDate}}
        and event_type = {{eventType}}
        ${filterQuery}
      group by website_event.url_path
      order by y desc
      limit ${limit}
      offset ${offset}
      
      `,
      params,
    );
  }

  let entryExitQuery = '';
  let excludeDomain = '';

  if (column === 'referrer_domain') {
    excludeDomain = `and website_event.referrer_domain != website_event.hostname
      and website_event.referrer_domain != ''`;
  }

  if (type === 'exit') {
    entryExitQuery = `
      join (
        select visit_id,
            max(created_at) target_created_at
        from website_event
        where website_event.website_id = {{websiteId::uuid}}
          and website_event.created_at between {{startDate}} and {{endDate}}
          and event_type = {{eventType}}
        group by visit_id
      ) x
      on x.visit_id = website_event.visit_id
          and x.target_created_at = website_event.created_at
    `;
  }

  return rawQuery(
    `
    select ${column} x,
      count(distinct website_event.session_id) as y
    from website_event
    ${cohortQuery}
    ${joinSession}
    ${entryExitQuery}
    where website_event.website_id = {{websiteId::uuid}}
      and website_event.created_at between {{startDate}} and {{endDate}}
      and event_type = {{eventType}}
      ${excludeDomain}
      ${filterQuery}
    group by 1
    order by 2 desc
    limit ${limit}
    offset ${offset}
    `,
    params,
  );
}

async function clickhouseQuery(
  websiteId: string,
  type: string,
  filters: QueryFilters,
  limit: number | string = 500,
  offset: number | string = 0,
): Promise<{ x: string; y: number }[]> {
  const column = FILTER_COLUMNS[type] || type;
  const { rawQuery, parseFilters } = clickhouse;
  const { filterQuery, cohortQuery, params } = await parseFilters(websiteId, {
    ...filters,
    eventType: column === 'event_name' ? EVENT_TYPE.customEvent : EVENT_TYPE.pageView,
  });

  let sql = '';
  let excludeDomain = '';

  if (EVENT_COLUMNS.some(item => Object.keys(filters).includes(item))) {
    let entryExitQuery = '';

    if (column === 'referrer_domain') {
      excludeDomain = `and referrer_domain != hostname and referrer_domain != ''`;
    }

    if (type === 'entry') {
      sql = `
        select
          website_event.url_path as x,
          uniq(session_id) as y,
          uniqIf(session_id, session.channel_first != '') as y_channel,
          groupArray(session.channel_first) as channels
        from website_event
        ${cohortQuery}
        any inner join (
          select visit_id, min(created_at) as first_created_at
          from website_event
          where website_id = {websiteId:UUID}
            and created_at between {startDate:DateTime64} and {endDate:DateTime64}
            and event_type = {eventType:UInt32}
          group by visit_id
        ) first_touch on first_touch.visit_id = website_event.visit_id and first_touch.first_created_at = website_event.created_at
        any inner join session on session.session_id = website_event.session_id
        where website_id = {websiteId:UUID}
          and created_at between {startDate:DateTime64} and {endDate:DateTime64}
          and event_type = {eventType:UInt32}
          ${filterQuery}
        group by x
        order by y desc
        limit ${limit}
        offset ${offset}
      `;
    } else {
      if (type === 'exit') {
        entryExitQuery = `
          JOIN (select visit_id,
              max(created_at) target_created_at
          from website_event
          where website_id = {websiteId:UUID}
            and created_at between {startDate:DateTime64} and {endDate:DateTime64}
            and event_type = {eventType:UInt32}
          group by visit_id) x
          ON x.visit_id = website_event.visit_id
              and x.target_created_at = website_event.created_at`;
      }

      sql = `
        select ${column} x, 
          uniq(website_event.session_id) as y
        from website_event
        ${cohortQuery}
        ${entryExitQuery}
        where website_id = {websiteId:UUID}
          and created_at between {startDate:DateTime64} and {endDate:DateTime64}
          and event_type = {eventType:UInt32}
          ${excludeDomain}
          ${filterQuery}
        group by x
        order by y desc
        limit ${limit}
        offset ${offset}
      `;
    }
  } else {
    let groupByQuery = '';
    let columnQuery = `arrayJoin(${column})`;

    if (column === 'referrer_domain') {
      excludeDomain = `and t != ''`;
    }

    if (type === 'entry') {
      columnQuery = `argMinMerge(entry_url)`;
    }

    if (type === 'exit') {
      columnQuery = `argMaxMerge(exit_url)`;
    }

    if (type === 'entry' || type === 'exit') {
      groupByQuery = 'group by s';
    }

    sql = `
    select g.t as x,
      uniq(s) as y
    from (
      select session_id s, 
        ${columnQuery} as t
      from website_event_stats_hourly website_event
      ${cohortQuery}
      where website_id = {websiteId:UUID}
        and created_at between {startDate:DateTime64} and {endDate:DateTime64}
        and event_type = {eventType:UInt32}
        ${excludeDomain}
        ${filterQuery}
      ${groupByQuery}) as g
    group by x
    order by y desc
    limit ${limit}
    offset ${offset}
    `;
  }

  return rawQuery(sql, params);
}
