import React from "react";
import { Accordion, Code, FocusTrap, Group, Modal } from "@mantine/core";

const ExternalMode = () => {
  const [isExternal, setExternal] = React.useState(false);

  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_EXTERNAL_MODE === "false") {
      if (typeof window !== "undefined") {
        if (window.location.pathname.includes("widget"))
          return setExternal(false);
        // External mode detection can be configured via environment variable
        return setExternal(false);
      }
    }
  }, []);

  if (!isExternal) return null;

  return (
    <Modal
      title="Information"
      opened={isExternal}
      onClose={() => setExternal(false)}
      centered
      size="lg"
    >
      <FocusTrap.InitialFocus />
      <Group>
        <Accordion variant="separated" w="100%">
          <Accordion.Item value="1">
            <Accordion.Control>
              How can I change the file size limit?
            </Accordion.Control>
            <Accordion.Panel>
              The main reason for the file size limit is to prevent performance
              issues. You can increase the limit by setting{" "}
              <Code>NEXT_PUBLIC_NODE_LIMIT</Code> in your <Code>.env</Code>{" "}
              file.
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="2">
            <Accordion.Control>
              How can I stop this dialog from appearing?
            </Accordion.Control>
            <Accordion.Panel>
              You can disable this dialog by setting{" "}
              <Code>NEXT_PUBLIC_DISABLE_EXTERNAL_MODE</Code> to{" "}
              <Code>true</Code> in your <Code>.env.development</Code> file.
              <br />
              <br />
              If you want to re-enable it, simply remove or set the value to{" "}
              <Code>false</Code>.
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="3">
            <Accordion.Control>What are the license terms?</Accordion.Control>
            <Accordion.Panel>
              This application is licensed under the Apache License, Version
              2.0. See the LICENSE.md file for details.
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Group>
    </Modal>
  );
};

export default ExternalMode;
