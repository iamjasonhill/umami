import { useApi } from '../useApi';
import usePagedQuery from '../usePagedQuery';
import useModified from '../useModified';

type CreateGoalPayload = {
  name: string;
  type: 'url' | 'event' | 'event-data';
  value: string;
  target?: number | null;
  operator?: string | null;
  property?: string | null;
  isActive?: boolean;
};

type UpdateGoalPayload = Partial<CreateGoalPayload> & { goalId: string };

export function useGoals(
  websiteId: string,
  filters: { search?: string; type?: string; isActive?: boolean } = {},
) {
  const { get, post, del, useQueryClient, useMutation } = useApi();
  const { modified, touch } = useModified(`goals:${websiteId}`);

  const queryResult = usePagedQuery({
    queryKey: ['goals', { websiteId, modified, ...filters }],
    queryFn: params =>
      get(`/websites/${websiteId}/goals`, {
        ...params,
        ...filters,
      }),
    enabled: !!websiteId,
  });

  const queryClient = useQueryClient();

  const invalidateGoals = () => {
    touch(`goals:${websiteId}`);
    queryClient.invalidateQueries({ queryKey: ['goals'] });
  };

  const createGoalMutation = useMutation({
    mutationFn: (payload: CreateGoalPayload) => post(`/websites/${websiteId}/goals`, payload),
    onSuccess: invalidateGoals,
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ goalId, ...payload }: UpdateGoalPayload) =>
      post(`/websites/${websiteId}/goals/${goalId}`, payload),
    onSuccess: invalidateGoals,
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: string) => del(`/websites/${websiteId}/goals/${goalId}`),
    onSuccess: invalidateGoals,
  });

  return {
    ...queryResult,
    createGoal: createGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
  };
}

export default useGoals;
