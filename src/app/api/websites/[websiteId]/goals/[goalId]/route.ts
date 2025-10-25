import { z } from 'zod';
import { canDeleteWebsite, canUpdateWebsite, canViewWebsite } from '@/lib/auth';
import { parseRequest } from '@/lib/request';
import { json, notFound, ok, unauthorized } from '@/lib/response';
import { deleteGoal, getWebsiteGoal, updateGoal } from '@/queries';
import { goalSchema, goalTypeParam, goalOperatorParam } from '../route';

const goalUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: goalTypeParam.optional(),
  value: z.string().min(1).max(500).optional(),
  target: z.coerce.number().nullable().optional(),
  operator: goalOperatorParam.nullable().optional(),
  property: z.string().min(1).max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string; goalId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId, goalId } = await params;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const goal = await getWebsiteGoal(websiteId, goalId);

  if (!goal) {
    return notFound();
  }

  return json(goal);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string; goalId: string }> },
) {
  const { auth, body, error } = await parseRequest(request, goalUpdateSchema);

  if (error) {
    return error();
  }

  const { websiteId, goalId } = await params;

  if (!(await canUpdateWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const existing = await getWebsiteGoal(websiteId, goalId);

  if (!existing) {
    return notFound();
  }

  const merged = {
    name: body?.name ?? existing.name,
    type: body?.type ?? existing.type,
    value: body?.value ?? existing.value,
    target:
      body?.target !== undefined
        ? body.target
        : existing.target !== null
        ? Number(existing.target)
        : null,
    operator:
      body && Object.prototype.hasOwnProperty.call(body, 'operator')
        ? body.operator
        : existing.operator,
    property:
      body && Object.prototype.hasOwnProperty.call(body, 'property')
        ? body.property
        : existing.property,
    isActive:
      body && Object.prototype.hasOwnProperty.call(body, 'isActive')
        ? body.isActive
        : existing.isActive,
  } as const;

  goalSchema.parse(merged);

  const updatePayload: Record<string, unknown> = {};

  if (body && Object.prototype.hasOwnProperty.call(body, 'name')) {
    updatePayload.name = body.name;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'type')) {
    updatePayload.type = body.type;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'value')) {
    updatePayload.value = body.value;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'target')) {
    updatePayload.target = body.target;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'operator')) {
    updatePayload.operator = body.operator;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'property')) {
    updatePayload.property = body.property;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'isActive')) {
    updatePayload.isActive = body.isActive;
  }

  const updatedGoal = await updateGoal(goalId, updatePayload as any);

  return json(updatedGoal);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ websiteId: string; goalId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId, goalId } = await params;

  if (!(await canDeleteWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const goal = await getWebsiteGoal(websiteId, goalId);

  if (!goal) {
    return notFound();
  }

  await deleteGoal(goalId);

  return ok();
}
