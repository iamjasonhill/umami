import prisma from '@/lib/prisma';
import { PageParams, PageResult } from '@/lib/types';
import { uuid } from '@/lib/crypto';

export type GoalInput = {
  name: string;
  type: 'url' | 'event' | 'event-data';
  value: string;
  target?: number | null;
  operator?: string | null;
  property?: string | null;
  isActive?: boolean;
};

export type GoalListParams = PageParams & {
  type?: GoalInput['type'];
  isActive?: boolean;
};

type GoalEntity = Awaited<ReturnType<typeof prisma.client.goal.create>>;
type GoalWhereInput = NonNullable<Parameters<typeof prisma.client.goal.findMany>[0]>['where'];

const GOAL_SEARCH_FIELDS = [{ name: 'contains' }, { value: 'contains' }];

export async function getWebsiteGoals(
  websiteId: string,
  params: GoalListParams = {},
): Promise<PageResult<GoalEntity[]>> {
  const { type, isActive, ...pageParams } = params;
  const where: GoalWhereInput = {
    websiteId,
    ...prisma.getSearchParameters(pageParams.search, GOAL_SEARCH_FIELDS),
  };

  if (typeof isActive === 'boolean') {
    where.isActive = isActive;
  }

  if (type) {
    where.type = type;
  }

  return prisma.pagedQuery(
    'goal',
    {
      where,
      orderBy: {
        createdAt: 'desc',
      },
    },
    pageParams,
  );
}

export async function getWebsiteGoal(
  websiteId: string,
  goalId: string,
): Promise<GoalEntity | null> {
  return prisma.client.goal.findFirst({
    where: {
      id: goalId,
      websiteId,
    },
  });
}

export async function createGoal(websiteId: string, data: GoalInput): Promise<GoalEntity> {
  return prisma.client.goal.create({
    data: {
      id: uuid(),
      websiteId,
      name: data.name,
      type: data.type,
      value: data.value,
      target: data.target ?? null,
      operator: data.operator ?? null,
      property: data.property ?? null,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updateGoal(goalId: string, data: Partial<GoalInput>): Promise<GoalEntity> {
  return prisma.client.goal.update({
    where: { id: goalId },
    data,
  });
}

export async function deleteGoal(goalId: string): Promise<GoalEntity> {
  return prisma.client.goal.delete({
    where: {
      id: goalId,
    },
  });
}

export async function getGoalsByIds(websiteId: string, goalIds: string[]): Promise<GoalEntity[]> {
  if (!goalIds?.length) {
    return [];
  }

  return prisma.client.goal.findMany({
    where: {
      id: { in: goalIds },
      websiteId,
    },
  });
}
