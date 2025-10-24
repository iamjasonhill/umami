import { z } from 'zod';
import { canViewWebsite } from '@/lib/auth';
import { unauthorized, json } from '@/lib/response';
import { parseRequest } from '@/lib/request';
import { getUTM } from '@/queries';
import { reportParms } from '@/lib/schema';

export async function POST(request: Request) {
  const schema = z.object({
    ...reportParms,
    filters: z
      .object({
        source: z.string().optional(),
        medium: z.string().optional(),
        campaign: z.string().optional(),
        content: z.string().optional(),
        term: z.string().optional(),
      })
      .optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const {
    websiteId,
    dateRange: { startDate, endDate, timezone },
    filters,
    limit,
  } = body;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const data = await getUTM(websiteId, {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    timezone,
    filters,
    limit: limit ?? 10,
  });

  return json(data);
}
