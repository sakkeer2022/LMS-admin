import { EmptyState } from "@/components/layout/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="This admin page does not exist. Choose a destination from the sidebar."
    />
  );
}
