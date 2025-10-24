import { useContext } from 'react';
import { ReportContext } from '../[reportId]/Report';
import { CHART_COLORS, UTM_PARAMS } from '@/lib/constants';
import PieChart from '@/components/charts/PieChart';
import ListTable from '@/components/metrics/ListTable';
import MetricsBar from '@/components/metrics/MetricsBar';
import MetricCard from '@/components/metrics/MetricCard';
import styles from './UTMView.module.css';
import { useMessages } from '@/components/hooks';
import { formatLongNumber } from '@/lib/format';

export default function UTMView() {
  const { formatMessage, labels } = useMessages();
  const { report } = useContext(ReportContext);
  const { data } = report || {};

  if (!data) {
    return null;
  }

  const { totals, parameters } = data;

  if (!totals || !parameters) {
    return null;
  }

  const metrics = [
    {
      label: formatMessage(labels.views),
      value: totals.pageviews,
    },
    {
      label: formatMessage(labels.visits),
      value: totals.visits,
    },
    {
      label: formatMessage(labels.visitors),
      value: totals.visitors,
    },
  ];

  return (
    <div className={styles.container}>
      <MetricsBar>
        {metrics.map(({ label, value }) => (
          <MetricCard key={label} label={label} value={value} formatValue={formatLongNumber} />
        ))}
      </MetricsBar>
      {UTM_PARAMS.map(param => {
        const items = parameters?.[param] || [];
        const totalPageviews = items.reduce(
          (sum, { pageviews }) => sum + Number(pageviews || 0),
          0,
        );

        const chartData = {
          labels: items.map(({ name }) => name),
          datasets: [
            {
              data: items.map(({ pageviews }) => pageviews),
              backgroundColor: CHART_COLORS,
              borderWidth: 0,
            },
          ],
        };

        return (
          <div key={param} className={styles.row}>
            <div>
              <div className={styles.title}>{param.replace(/^utm_/, '')}</div>
              <ListTable
                metric={formatMessage(labels.views)}
                data={items.map(({ name, pageviews, percent }) => ({
                  x: name,
                  y: Number(pageviews || 0),
                  z: percent,
                }))}
              />
            </div>
            <div>
              <PieChart type="doughnut" data={chartData} />
            </div>
            <div className={styles.summary}>
              {formatMessage(labels.total)}: {formatLongNumber(totalPageviews)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
