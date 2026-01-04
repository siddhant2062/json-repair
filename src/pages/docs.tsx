import React from "react";
import { Group, Paper, Stack, Text, Title } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import styled from "styled-components";
import { NextSeo } from "next-seo";
import { SEO } from "../constants/seo";
import Layout from "../layout/PageLayout";

const StyledFrame = styled.iframe`
  border: none;
  width: 80%;
  flex: 500px;
  margin: 3% auto;
`;

const StyledContentBody = styled.div`
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 15px;
  line-height: 1.8;
  overflow-x: auto;
`;

const StyledHighlight = styled.span<{ $link?: boolean; $alert?: boolean }>`
  display: inline-block;
  text-align: left;
  color: ${({ theme, $link, $alert }) =>
    $alert ? theme.DANGER : $link ? theme.BLURPLE : theme.TEXT_POSITIVE};
  background: ${({ theme }) => theme.BACKGROUND_TERTIARY};
  border-radius: 4px;
  font-weight: 500;
  padding: 2px 4px;
  font-size: 14px;
  margin: ${({ $alert }) => ($alert ? "8px 0" : "1px")};
`;

const Docs = () => {
  return (
    <Layout>
      <NextSeo
        {...SEO}
        title="Documentation - JSON Repair"
        description="Integrate JSON Repair widgets into your website."
      />
      <Stack mx="auto" maw="90%">
        <Group mb="lg" mt={40}>
          <Title order={1} c="dark">
            Embed
          </Title>
        </Group>
        <Paper bg="white" c="black" p="md" radius="md" withBorder>
          <Title mb="sm" order={3} c="dark">
            # Fetching from URL
          </Title>
          <StyledContentBody>
            <Text>
              By adding{" "}
              <StyledHighlight>
                ?json=https://catfact.ninja/fact
              </StyledHighlight>{" "}
              query at the end of iframe src you will be able to fetch from URL
              at widgets without additional scripts. This applies to editor page
              as well.
            </Text>

            <StyledFrame title="Example" src="/widget" loading="eager" />
          </StyledContentBody>
        </Paper>
        <Paper bg="white" c="black" p="md" radius="md" withBorder>
          <Title mb="sm" order={3} c="dark">
            # Communicating with API
          </Title>
          <Title order={4}>◼︎ Post Message to Embed</Title>
          <StyledContentBody>
            <Text>
              Communicating with the embed is possible with{" "}
              <StyledHighlight
                as="a"
                href="https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage"
                $link
              >
                MessagePort
              </StyledHighlight>
              , you should pass an object consist of &quot;json&quot; and
              &quot;options&quot; key where json is a string and options is an
              object that may contain the following:
              <CodeHighlight
                w={500}
                language="json"
                code={
                  '{\n  theme: "light" | "dark",\n  direction: "TOP" | "RIGHT" | "DOWN" | "LEFT"\n}'
                }
                withCopyButton={false}
              />
            </Text>

            <StyledFrame
              scrolling="no"
              title="Example"
              src="/widget"
              loading="lazy"
            />
          </StyledContentBody>
        </Paper>
        <Paper bg="white" c="black" p="md" radius="md" withBorder>
          <Title order={4}>◼︎ On Page Load</Title>
          <StyledContentBody>
            <Text>
              <Text>
                ⚠️ <b>Important!</b> - iframe should be defined before the
                script tag
              </Text>
              <Text>
                ⚠️ <b>Note</b> - Widget is not loaded immediately with the
                parent page. The widget sends its <b>id</b> attribute so you can
                listen for it as in the example below to ensure its loaded and
                ready to listen for messages.
              </Text>
            </Text>
            <StyledFrame title="Example" src="/widget" loading="lazy" />
          </StyledContentBody>
        </Paper>
      </Stack>
    </Layout>
  );
};

export default Docs;
