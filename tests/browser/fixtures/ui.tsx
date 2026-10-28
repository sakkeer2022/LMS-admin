import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "../../../src/components/ui/Button";
import { Modal, type ModalPlacement } from "../../../src/components/ui/Modal";
import { Tabs } from "../../../src/components/ui/Tabs";
import { Accordion } from "../../../src/components/ui/Accordion";
import { Checkbox } from "../../../src/components/ui/Checkbox";
import { Label } from "../../../src/components/ui/Label";
// import "../../../src/app/globals.css";
// import "../../../src/components/ui/ui.css";
import { Typography } from '../../../src/components/ui/Typography';

function Fixture() {
  const [placement, setPlacement] = useState<ModalPlacement>();
  const [dismiss, setDismiss] = useState(true);
  return (
    <>
      <Button>Background action</Button>
      <Label>
        <Checkbox
          checked={dismiss}
          onChange={(e) => setDismiss(e.target.checked)}
        />
        Dismiss on backdrop
      </Label>
      {(["center", "left", "right", "top", "bottom"] as const).map((p) => (
        <Button key={p} onClick={() => setPlacement(p)}>
          Open {p}
        </Button>
      ))}
      <Modal
        open={!!placement}
        title="Test dialog"
        placement={placement}
        dismissOnBackdrop={dismiss}
        onClose={() => setPlacement(undefined)}
      >
        <Button>Inside action</Button>
      </Modal>
      <Tabs
        label="Example tabs"
        items={[
          { id: "first", label: "First", content: "First panel" },
          {
            id: "disabled",
            label: "Disabled",
            content: "Disabled panel",
            disabled: true,
          },
          { id: "last", label: "Last", content: "Last panel" },
        ]}
      />
      <Accordion summary="More information">
        <Typography>Accordion content</Typography>
      </Accordion>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
