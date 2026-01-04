import React, { useEffect, useState } from "react";
import { Anchor, Flex, Button, ActionIcon } from "@mantine/core";
import { useSessionStorage } from "@mantine/hooks";
import { MdClose } from "react-icons/md";

export const BANNER_HEIGHT =
  process.env.NEXT_PUBLIC_DISABLE_EXTERNAL_MODE === "true" ? "0px" : "40px";

const BANNER_LIST: string[] = [];

export const Banner = () => {
  const ROTATION_INTERVAL = 6000; // ms between label changes
  const FADE_DURATION = 500; // ms for fade transition

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useSessionStorage({
    key: "banner_dismissed",
    defaultValue: false,
  });

  useEffect(() => {
    if (dismissed) return;

    let fadeTimeout: ReturnType<typeof setTimeout> | undefined;
    const intervalId = setInterval(() => {
      setVisible(false);
      fadeTimeout = setTimeout(() => {
        setIndex((i) => (i + 1) % BANNER_LIST.length);
        setVisible(true);
      }, FADE_DURATION);
    }, ROTATION_INTERVAL);

    return () => {
      clearInterval(intervalId);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, [dismissed]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
  };

  if (dismissed) return null;

  if (BANNER_LIST.length === 0) return null;

  return (
    <Anchor href="#" underline="never" style={{ position: "relative" }}>
      <Flex
        h={BANNER_HEIGHT}
        justify="center"
        align="center"
        fw="500"
        gap="xs"
        style={{
          background: "linear-gradient(90deg, #FF75B7 0%, #FED761 100%)",
          color: "black",
        }}
      >
        <span
          style={{
            transition: `opacity ${FADE_DURATION}ms ease`,
            opacity: visible ? 1 : 0,
            willChange: "opacity",
            display: "inline-block",
          }}
        >
          {BANNER_LIST[index]}{" "}
        </span>
        <Button size="xs" color="gray">
          Try now
        </Button>
        <ActionIcon
          onClick={handleDismiss}
          size="sm"
          variant="transparent"
          style={{
            position: "absolute",
            right: "8px",
            color: "black",
          }}
          aria-label="Close banner"
        >
          <MdClose size={18} />
        </ActionIcon>
      </Flex>
    </Anchor>
  );
};
