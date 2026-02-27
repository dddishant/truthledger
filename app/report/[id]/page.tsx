import { ReportView } from '@/components/report/report-view';

export default function ReportPage({ params }: { params: { id: string } }) {
  return <ReportView id={params.id} />;
}
