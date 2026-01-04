import React from "react";
import Link from "next/link";
import { Anchor, Container, Divider, Flex, Stack, Text } from "@mantine/core";
import { JSONRepairLogo } from "../JSONRepairLogo";

export const Footer = () => {
  return (
    <Container
      w="100%"
      mt={80}
      px={60}
      pb="xl"
      bg="linear-gradient(180deg, #0F172A 0%, #1E293B 100%)"
      fluid
    >
      <Divider color="rgba(255, 255, 255, 0.1)" mb="xl" mx={-60} />
      <Flex justify="space-between">
        <Stack gap={4} visibleFrom="sm">
          <JSONRepairLogo hideLogo />
        </Stack>
        <Flex gap={60} visibleFrom="sm">
          <Stack gap="xs">
            <Text fz="sm" c="white">
              Resources
            </Text>
            <Anchor
              component={Link}
              prefetch={false}
              fz="sm"
              c="gray.5"
              href="/#faq"
            >
              FAQ
            </Anchor>
            <Anchor
              component={Link}
              prefetch={false}
              fz="sm"
              c="gray.5"
              href="/features"
            >
              Features
            </Anchor>
            <Anchor
              component={Link}
              prefetch={false}
              fz="sm"
              c="gray.5"
              href="/docs"
            >
              Docs
            </Anchor>
          </Stack>
        </Flex>
      </Flex>
      <Flex gap="xl">
        <Anchor
          component={Link}
          prefetch={false}
          fz="sm"
          c="dimmed"
          href="/legal/terms"
        >
          <Text fz="sm" c="dimmed">
            Terms
          </Text>
        </Anchor>
        <Anchor
          component={Link}
          prefetch={false}
          fz="sm"
          c="dimmed"
          href="/legal/privacy"
        >
          <Text fz="sm" c="dimmed">
            Privacy
          </Text>
        </Anchor>
      </Flex>
    </Container>
  );
};
