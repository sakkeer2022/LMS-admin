import { Card } from "./Card";
import { Typography } from "./Typography";
export function ExtensionPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <Typography tone="muted">STARTER EXTENSION</Typography>
      <Typography variant="h1">{title}</Typography>
      <Typography>{description}</Typography>
      <Typography tone="muted">
        Integration scaffold · no simulated records or successful transactions.
      </Typography>
    </Card>
  );
}
