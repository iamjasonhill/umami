import { z } from 'zod';
import { canUpdateWebsite, canViewWebsite } from '@/lib/auth';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { getWebsiteGoals, createGoal } from '@/queries';
import { GoalInput } from '@/queries/prisma/goal';

export const goalTypeParam = z.enum(['url', 'event', 'event-data']);
export const goalOperatorParam = z.enum(['count', 'sum', 'average']);

export const goalSchema = z
  .object({
    name: z.string().min(1).max(200),
    type: goalTypeParam,
    value: z.string().min(1).max(500),
    target: z.coerce.number().nullable().optional(),
    operator: goalOperatorParam.nullable().optional(),
    property: z.string().min(1).max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'event-data') {
      if (!data.operator) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'operator is required for event-data goals',
          path: ['operator'],
        });
      }

      if (!data.property) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'property is required for event-data goals',
          path: ['property'],
        });
      }
    }

    if (data.type !== 'event-data') {
      if (data.operator) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'operator is only supported for event-data goals',
          path: ['operator'],
        });
      }

      if (data.property) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'property is only supported for event-data goals',
          path: ['property'],
        });
      }
    }
  });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    search: z.string().optional(),
    page: z.coerce.number().min(1).optional(),
    pageSize: z.coerce.number().min(1).max(100).optional(),
    type: goalTypeParam.optional(),
    isActive: z.coerce.boolean().optional(),
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const { page, pageSize, search, type, isActive } = query;
  const results = await getWebsiteGoals(websiteId, {
    page,
    pageSize,
    search,
    type,
    isActive,
  });

  return json(results);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, body, error } = await parseRequest(request, goalSchema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canUpdateWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const goalPayload: GoalInput = {
    name: body.name,
    type: body.type,
    value: body.value,
    target: body.target ?? null,
    operator: body.operator ?? null,
    property: body.property ?? null,
    isActive: body.isActive ?? true,
  };

  const goal = await createGoal(websiteId, goalPayload);

  return json(goal);
}
