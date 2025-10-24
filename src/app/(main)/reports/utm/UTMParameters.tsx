import { useContext } from 'react';
import { useMessages } from '@/components/hooks';
import { Form, FormButtons, FormRow, FormInput, SubmitButton, TextField } from 'react-basics';
import { ReportContext } from '../[reportId]/Report';
import BaseParameters from '../[reportId]/BaseParameters';

export function UTMParameters() {
  const { report, runReport, isRunning } = useContext(ReportContext);
  const { formatMessage, labels } = useMessages();

  const { id, parameters } = report || {};
  const { websiteId, dateRange, filters = {}, limit = 10 } = parameters || {};
  const queryDisabled = !websiteId || !dateRange;

  const handleSubmit = (data: any, e: any) => {
    e.stopPropagation();
    e.preventDefault();

    if (!queryDisabled) {
      runReport(data);
    }
  };

  return (
    <Form values={{ ...parameters, filters, limit }} onSubmit={handleSubmit} preventSubmit={true}>
      <BaseParameters showDateSelect={true} allowWebsiteSelect={!id} />
      <FormRow label={formatMessage(labels.filters)}>
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          <FormInput name="filters.source">
            <TextField placeholder={formatMessage(labels.source)} />
          </FormInput>
          <FormInput name="filters.medium">
            <TextField placeholder={formatMessage(labels.medium)} />
          </FormInput>
          <FormInput name="filters.campaign">
            <TextField placeholder={formatMessage(labels.campaigns)} />
          </FormInput>
          <FormInput name="filters.content">
            <TextField placeholder={formatMessage(labels.content)} />
          </FormInput>
          <FormInput name="filters.term">
            <TextField placeholder={formatMessage(labels.terms)} />
          </FormInput>
          <FormInput
            name="limit"
            rules={{
              required: true,
              pattern: {
                value: /^[0-9]+$/,
                message: formatMessage(labels.required),
              },
              validate: (value: string) => {
                const num = Number(value);
                return num >= 1 && num <= 100 ? true : false;
              },
            }}
          >
            <TextField placeholder={formatMessage(labels.limit)} />
          </FormInput>
        </div>
      </FormRow>
      <FormButtons>
        <SubmitButton variant="primary" disabled={queryDisabled} isLoading={isRunning}>
          {formatMessage(labels.runQuery)}
        </SubmitButton>
      </FormButtons>
    </Form>
  );
}

export default UTMParameters;
