import { EntityWorkspace } from '@/components/entity/entity-workspace';

export default function EntityPage({ params }: { params: { id: string } }) {
  return <EntityWorkspace id={params.id} />;
}
