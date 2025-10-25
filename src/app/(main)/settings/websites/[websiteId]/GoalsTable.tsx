'use client';

import { Key, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dropdown,
  Flexbox,
  GridColumn,
  GridTable,
  Icon,
  Icons,
  Item,
  Modal,
  ModalTrigger,
  Text,
  TextField,
  useToasts,
} from 'react-basics';
import DataTable from '@/components/common/DataTable';
import { useMessages } from '@/components/hooks';
import { useGoals } from '@/components/hooks/queries/useGoals';
import { GoalInput } from '@/queries/prisma/goal';
import { formatNumber } from '@/lib/format';

type GoalRecord = GoalInput & { id: string };

type GoalFormState = Omit<GoalInput, 'target'> & { target: string; isActive: boolean };

const DEFAULT_GOAL: GoalInput = {
  name: '',
  type: 'url',
  value: '',
  target: null,
  operator: null,
  property: null,
  isActive: true,
};

export function GoalsTable({ websiteId }: { websiteId: string }) {
  const { formatMessage, labels, messages } = useMessages();
  const goalsQuery = useGoals(websiteId);
  const { params, setParams, createGoal, updateGoal, deleteGoal } = goalsQuery;
  const { showToast } = useToasts();

  const filterParams = params as typeof params & { type?: string; isActive?: boolean };
  const typeValue = (typeof filterParams?.type === 'string' ? filterParams.type : null) ?? 'all';
  const statusValue = useMemo(() => {
    if (typeof filterParams?.isActive === 'boolean') {
      return filterParams.isActive ? 'active' : 'archived';
    }

    return 'all';
  }, [filterParams?.isActive]);

  const formatType = (type: GoalRecord['type']) => {
    switch (type) {
      case 'event':
        return formatMessage(labels.event);
      case 'event-data':
        return formatMessage(labels.eventData);
      default:
        return formatMessage(labels.url);
    }
  };

  const handleTypeChange = (key: Key) => {
    const value = key?.toString();

    setParams(current => ({
      ...(current as typeof params & { type?: string }),
      type: value === 'all' ? undefined : value,
      page: 1,
    }));
  };

  const handleStatusChange = (key: Key) => {
    const value = key?.toString();

    setParams(current => ({
      ...(current as typeof params & { isActive?: boolean }),
      isActive: value === 'all' ? undefined : value === 'active',
      page: 1,
    }));
  };

  const handleDelete = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
      showToast({ message: formatMessage(messages.saved), variant: 'success' });
    } catch (error: any) {
      showToast({ message: error?.message || formatMessage(messages.error), variant: 'danger' });
    }
  };

  const handleSave = async (goal: GoalInput, goalId?: string) => {
    const payload: GoalInput = {
      name: goal.name,
      type: goal.type,
      value: goal.value,
      operator: goal.type === 'event-data' ? goal.operator ?? 'count' : null,
      property: goal.type === 'event-data' ? goal.property ?? null : null,
      target: goal.target ?? null,
      isActive: goal.isActive ?? true,
    };

    try {
      if (goalId) {
        await updateGoal({ goalId, ...payload });
      } else {
        await createGoal(payload);
      }

      showToast({ message: formatMessage(messages.saved), variant: 'success' });
    } catch (error: any) {
      showToast({ message: error?.message || formatMessage(messages.error), variant: 'danger' });
    }
  };

  const renderTarget = (value: GoalRecord['target']) => {
    if (value === null || value === undefined) {
      return '-';
    }

    const numeric = typeof value === 'string' ? Number(value) : value;

    return Number.isFinite(numeric) ? formatNumber(numeric as number) : '-';
  };

  const toGoalInput = (goal: Partial<GoalRecord>): GoalInput => {
    const rawTarget = goal.target;
    let parsedTarget: number | null = null;

    if (typeof rawTarget === 'number') {
      parsedTarget = Number.isFinite(rawTarget) ? rawTarget : null;
    }

    return {
      name: goal.name ?? '',
      type: goal.type ?? 'url',
      value: goal.value ?? '',
      operator: goal.operator ?? null,
      property: goal.property ?? null,
      target: parsedTarget,
      isActive: goal.isActive ?? true,
    };
  };

  return (
    <Flexbox direction="column" gap={16}>
      <Flexbox justifyContent="space-between" alignItems="center" wrap="wrap" gap={10}>
        <Flexbox gap={10} alignItems="center" wrap="wrap">
          <Dropdown
            value={typeValue}
            renderValue={key =>
              key === 'all'
                ? formatMessage(labels.all)
                : formatType(key.toString() as GoalRecord['type'])
            }
            onChange={handleTypeChange}
          >
            <Item key="all">{formatMessage(labels.all)}</Item>
            <Item key="url">{formatType('url')}</Item>
            <Item key="event">{formatType('event')}</Item>
            <Item key="event-data">{formatType('event-data')}</Item>
          </Dropdown>
          <Dropdown
            value={statusValue}
            renderValue={key => {
              switch (key) {
                case 'active':
                  return formatMessage(labels.active);
                case 'archived':
                  return formatMessage(labels.archived);
                default:
                  return formatMessage(labels.all);
              }
            }}
            onChange={handleStatusChange}
          >
            <Item key="all">{formatMessage(labels.all)}</Item>
            <Item key="active">{formatMessage(labels.active)}</Item>
            <Item key="archived">{formatMessage(labels.archived)}</Item>
          </Dropdown>
        </Flexbox>
        <ModalTrigger>
          <Button variant="primary" data-test="button-add-goal">
            <Icon>
              <Icons.Plus />
            </Icon>
            <Text>{formatMessage(labels.addGoal)}</Text>
          </Button>
          <Modal title={formatMessage(labels.addGoal)}>
            {(close: () => void) => (
              <GoalForm
                initialValues={{ ...DEFAULT_GOAL }}
                onCancel={close}
                onSubmit={async payload => {
                  await handleSave(payload);
                  close();
                }}
              />
            )}
          </Modal>
        </ModalTrigger>
      </Flexbox>

      <DataTable
        queryResult={goalsQuery}
        allowSearch={true}
        renderEmpty={() => <Text>{formatMessage(messages.noDataAvailable)}</Text>}
      >
        {({ data }) => (
          <GridTable data={data as GoalRecord[]}>
            <GridColumn name="name" label={formatMessage(labels.name)} />
            <GridColumn name="type" label={formatMessage(labels.type)}>
              {(row: GoalRecord) => formatType(row.type)}
            </GridColumn>
            <GridColumn name="value" label={formatMessage(labels.value)} />
            <GridColumn name="operator" label={formatMessage(labels.operator)}>
              {(row: GoalRecord) => row.operator ?? '-'}
            </GridColumn>
            <GridColumn name="property" label={formatMessage(labels.property)}>
              {(row: GoalRecord) => row.property ?? '-'}
            </GridColumn>
            <GridColumn name="target" label={formatMessage(labels.goalTarget)}>
              {(row: GoalRecord) => renderTarget(row.target)}
            </GridColumn>
            <GridColumn name="status" label={formatMessage(labels.status)}>
              {(row: GoalRecord) =>
                row.isActive ? formatMessage(labels.active) : formatMessage(labels.archived)
              }
            </GridColumn>
            <GridColumn name="actions" label=" " alignment="end">
              {(row: GoalRecord) => (
                <Flexbox gap={8} justifyContent="end">
                  <ModalTrigger>
                    <Button size="sm" variant="secondary">
                      <Icon>
                        <Icons.Edit />
                      </Icon>
                    </Button>
                    <Modal title={formatMessage(labels.editGoal)}>
                      {(close: () => void) => (
                        <GoalForm
                          initialValues={toGoalInput(row)}
                          onCancel={close}
                          onSubmit={async payload => {
                            await handleSave(payload, row.id);
                            close();
                          }}
                        />
                      )}
                    </Modal>
                  </ModalTrigger>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDelete(row.id)}
                    data-test="button-delete-goal"
                  >
                    <Icon>
                      <Icons.Trash />
                    </Icon>
                  </Button>
                </Flexbox>
              )}
            </GridColumn>
          </GridTable>
        )}
      </DataTable>
    </Flexbox>
  );
}

function createFormState(goal: GoalInput): GoalFormState {
  return {
    name: goal.name,
    type: goal.type,
    value: goal.value,
    operator: goal.operator,
    property: goal.property,
    isActive: goal.isActive ?? true,
    target: goal.target === null || goal.target === undefined ? '' : goal.target.toString(),
  };
}

function GoalForm({
  initialValues,
  onSubmit,
  onCancel,
}: {
  initialValues: GoalInput;
  onSubmit: (goal: GoalInput) => Promise<void> | void;
  onCancel: () => void;
}) {
  const { formatMessage, labels } = useMessages();
  const [values, setValues] = useState<GoalFormState>(createFormState(initialValues));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setValues(createFormState(initialValues));
  }, [initialValues]);

  const handleChange = (field: keyof GoalFormState, value: any) => {
    setValues(previous => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async () => {
    const trimmedName = values.name.trim();
    const trimmedValue = values.value.trim();
    const isEventData = values.type === 'event-data';
    const trimmedProperty = values.property?.toString().trim() || '';

    if (!trimmedName || !trimmedValue) {
      return;
    }

    if (isEventData && !trimmedProperty) {
      return;
    }

    const targetValue = values.target.trim();
    const numericTarget = targetValue === '' ? null : Number(targetValue);
    const payload: GoalInput = {
      name: trimmedName,
      type: values.type,
      value: trimmedValue,
      operator: isEventData ? values.operator?.toString() || 'count' : null,
      property: isEventData ? trimmedProperty : null,
      target: Number.isFinite(numericTarget) ? numericTarget : null,
      isActive: values.isActive,
    };

    setIsSubmitting(true);

    try {
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEventData = values.type === 'event-data';
  const statusKey: Key = values.isActive ? 'active' : 'archived';
  const disableSave =
    isSubmitting ||
    !values.name.trim() ||
    !values.value.trim() ||
    (isEventData && !(values.property ?? '').toString().trim());

  return (
    <Flexbox direction="column" gap={16} style={{ width: 360, padding: 8 }}>
      <Flexbox direction="column" gap={10}>
        <label>{formatMessage(labels.name)}</label>
        <TextField
          value={values.name}
          onChange={event => handleChange('name', event.target.value)}
          autoFocus
        />
      </Flexbox>
      <Flexbox direction="column" gap={10}>
        <label>{formatMessage(labels.type)}</label>
        <Dropdown
          value={values.type}
          onChange={key => {
            const nextType = key.toString() as GoalInput['type'];
            handleChange('type', nextType);

            if (nextType !== 'event-data') {
              handleChange('operator', null);
              handleChange('property', null);
            }
          }}
        >
          <Item key="url">{formatMessage(labels.url)}</Item>
          <Item key="event">{formatMessage(labels.event)}</Item>
          <Item key="event-data">{formatMessage(labels.eventData)}</Item>
        </Dropdown>
      </Flexbox>
      <Flexbox direction="column" gap={10}>
        <label>{formatMessage(labels.value)}</label>
        <TextField
          value={values.value}
          onChange={event => handleChange('value', event.target.value)}
        />
      </Flexbox>
      {isEventData && (
        <>
          <Flexbox direction="column" gap={10}>
            <label>{formatMessage(labels.operator)}</label>
            <Dropdown
              value={values.operator ?? 'count'}
              onChange={key => handleChange('operator', key.toString())}
            >
              <Item key="count">{formatMessage(labels.count)}</Item>
              <Item key="sum">{formatMessage(labels.sum)}</Item>
              <Item key="average">{formatMessage(labels.average)}</Item>
            </Dropdown>
          </Flexbox>
          <Flexbox direction="column" gap={10}>
            <label>{formatMessage(labels.property)}</label>
            <TextField
              value={values.property ?? ''}
              onChange={event => handleChange('property', event.target.value)}
            />
          </Flexbox>
        </>
      )}
      <Flexbox direction="column" gap={10}>
        <label>{formatMessage(labels.goalTarget)}</label>
        <TextField
          value={values.target}
          onChange={event => handleChange('target', event.target.value)}
        />
      </Flexbox>
      <Flexbox direction="column" gap={10}>
        <label>{formatMessage(labels.status)}</label>
        <Dropdown value={statusKey} onChange={key => handleChange('isActive', key === 'active')}>
          <Item key="active">{formatMessage(labels.active)}</Item>
          <Item key="archived">{formatMessage(labels.archived)}</Item>
        </Dropdown>
      </Flexbox>
      <Flexbox justifyContent="end" gap={10}>
        <Button variant="secondary" onClick={onCancel}>
          {formatMessage(labels.cancel)}
        </Button>
        <Button variant="primary" disabled={disableSave} onClick={handleSubmit}>
          {formatMessage(labels.save)}
        </Button>
      </Flexbox>
    </Flexbox>
  );
}

export default GoalsTable;
