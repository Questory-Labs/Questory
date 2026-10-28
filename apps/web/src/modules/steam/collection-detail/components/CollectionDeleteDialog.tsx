import { Button, Dialog } from "@questorylabs/ui";

export const CollectionDeleteDialog = ({
  open,
  name,
  busy,
  failed,
  onClose,
  onConfirm,
}: {
  open: boolean;
  name: string;
  busy: boolean;
  failed: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <Dialog open={open} onClose={onClose} title={`Delete ${name}?`}>
    <p className="text-sm text-[var(--muted)]">
      The list is removed. The games stay in your library.
    </p>
    {failed ? (
      <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
        Could not delete this collection.
      </p>
    ) : null}
    <div className="mt-5 flex justify-end gap-2">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="danger" onClick={onConfirm} disabled={busy}>
        {busy ? "Deleting…" : "Delete"}
      </Button>
    </div>
  </Dialog>
);
