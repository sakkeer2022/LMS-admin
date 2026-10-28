"use client";
import { Typography } from './Typography';

export function FormError({ message }: { message?: string; }) {
  return (
    <div className="ui-form-error" role="alert" aria-atomic="true">
      {message && <Typography tone="danger">{message}</Typography>}
    </div>
  );
}
