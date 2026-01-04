import React, { useState } from "react";
import styled from "styled-components";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Button,
  Textarea,
  Group,
  Text,
  SegmentedControl,
  CopyButton,
  ActionIcon,
  Tooltip,
  Badge,
  Stack,
} from "@mantine/core";
import {
  VscArrowSwap,
  VscCopy,
  VscCheck,
  VscTrash,
  VscSymbolString,
} from "react-icons/vsc";
import toast from "react-hot-toast";

const StyledModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const StyledTextareaWrapper = styled.div`
  position: relative;
`;

const StyledLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const StyledStats = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const StyledActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 12px 0;
  border-top: 1px solid ${({ theme }) => theme.SILVER_DARK};
  border-bottom: 1px solid ${({ theme }) => theme.SILVER_DARK};
`;

const StyledQuickActions = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

export const Base64Modal = ({ opened, onClose }: ModalProps) => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [error, setError] = useState<string | null>(null);

  const handleEncode = () => {
    try {
      setError(null);
      const encoded = btoa(unescape(encodeURIComponent(input)));
      setOutput(encoded);
      toast.success("Encoded to Base64");
    } catch (e) {
      setError("Failed to encode. Please check your input.");
      toast.error("Encoding failed");
    }
  };

  const handleDecode = () => {
    try {
      setError(null);
      const decoded = decodeURIComponent(escape(atob(input)));
      setOutput(decoded);
      toast.success("Decoded from Base64");
    } catch (e) {
      setError("Invalid Base64 string. Please check your input.");
      toast.error("Decoding failed - invalid Base64");
    }
  };

  const handleTransform = () => {
    if (mode === "encode") {
      handleEncode();
    } else {
      handleDecode();
    }
  };

  const handleSwap = () => {
    setInput(output);
    setOutput("");
    setError(null);
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setError(null);
  };

  // URL-safe Base64 variants
  const handleEncodeUrlSafe = () => {
    try {
      setError(null);
      const encoded = btoa(unescape(encodeURIComponent(input)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      setOutput(encoded);
      toast.success("Encoded to URL-safe Base64");
    } catch (e) {
      setError("Failed to encode. Please check your input.");
      toast.error("Encoding failed");
    }
  };

  const handleDecodeUrlSafe = () => {
    try {
      setError(null);
      let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
      // Add padding if needed
      while (base64.length % 4) {
        base64 += "=";
      }
      const decoded = decodeURIComponent(escape(atob(base64)));
      setOutput(decoded);
      toast.success("Decoded from URL-safe Base64");
    } catch (e) {
      setError("Invalid URL-safe Base64 string.");
      toast.error("Decoding failed");
    }
  };

  const inputLength = input.length;
  const outputLength = output.length;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <VscSymbolString size={18} />
          <Text fw={600}>Base64 Encoder / Decoder</Text>
        </Group>
      }
      size="lg"
      centered
    >
      <StyledModalContent>
        {/* Mode Selection */}
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as "encode" | "decode")}
          data={[
            { value: "encode", label: "Encode" },
            { value: "decode", label: "Decode" },
          ]}
          fullWidth
        />

        {/* Input */}
        <StyledTextareaWrapper>
          <StyledLabel>
            <Text size="sm" fw={500}>
              {mode === "encode" ? "Text to Encode" : "Base64 to Decode"}
            </Text>
            <StyledStats>
              <Badge size="xs" variant="light">
                {inputLength} chars
              </Badge>
              <Tooltip label="Clear input">
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={() => setInput("")}
                >
                  <VscTrash size={12} />
                </ActionIcon>
              </Tooltip>
            </StyledStats>
          </StyledLabel>
          <Textarea
            placeholder={
              mode === "encode"
                ? "Enter text to encode..."
                : "Enter Base64 string to decode..."
            }
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            minRows={5}
            maxRows={10}
            autosize
            styles={{
              input: {
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "13px",
              },
            }}
          />
        </StyledTextareaWrapper>

        {/* Action Buttons */}
        <StyledActions>
          <Button
            variant="filled"
            onClick={handleTransform}
            leftSection={<VscSymbolString size={14} />}
          >
            {mode === "encode" ? "Encode" : "Decode"}
          </Button>
          <Tooltip label="Swap input and output">
            <ActionIcon
              variant="light"
              size="lg"
              onClick={handleSwap}
              disabled={!output}
            >
              <VscArrowSwap size={16} />
            </ActionIcon>
          </Tooltip>
          <Button variant="subtle" color="red" onClick={handleClear}>
            Clear All
          </Button>
        </StyledActions>

        {/* Quick Actions */}
        <Stack gap="xs">
          <Text size="xs" c="dimmed">
            Quick Actions:
          </Text>
          <StyledQuickActions>
            <Button
              size="xs"
              variant="light"
              onClick={handleEncodeUrlSafe}
              disabled={!input || mode === "decode"}
            >
              URL-Safe Encode
            </Button>
            <Button
              size="xs"
              variant="light"
              onClick={handleDecodeUrlSafe}
              disabled={!input || mode === "encode"}
            >
              URL-Safe Decode
            </Button>
          </StyledQuickActions>
        </Stack>

        {/* Output */}
        <StyledTextareaWrapper>
          <StyledLabel>
            <Text size="sm" fw={500}>
              Result
            </Text>
            <StyledStats>
              <Badge size="xs" variant="light" color={error ? "red" : "blue"}>
                {outputLength} chars
              </Badge>
              <CopyButton value={output}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? "Copied!" : "Copy result"}>
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color={copied ? "green" : "gray"}
                      onClick={copy}
                      disabled={!output}
                    >
                      {copied ? <VscCheck size={12} /> : <VscCopy size={12} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </StyledStats>
          </StyledLabel>
          <Textarea
            placeholder="Result will appear here..."
            value={error || output}
            readOnly
            minRows={5}
            maxRows={10}
            autosize
            error={!!error}
            styles={{
              input: {
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "13px",
                color: error ? "#f87171" : undefined,
              },
            }}
          />
        </StyledTextareaWrapper>

        {/* Footer */}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Close
          </Button>
        </Group>
      </StyledModalContent>
    </Modal>
  );
};

export default Base64Modal;
