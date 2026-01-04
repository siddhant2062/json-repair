import React from "react";
import {
  Container,
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Badge,
  Code,
  Divider,
  List,
  Anchor,
  Tabs,
  Box,
  Alert,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import { NextSeo } from "next-seo";
import styled from "styled-components";
import { SEO } from "../constants/seo";
import Layout from "../layout/PageLayout";
import {
  MdFilterListAlt,
  MdInfoOutline,
  MdCheckCircle,
  MdArrowForward,
} from "react-icons/md";

const StyledFeatureSection = styled(Paper)`
  margin-bottom: 2rem;
  padding: 2rem;
`;

const StyledCodeBlock = styled(Box)`
  margin: 1rem 0;
  border-radius: 8px;
  overflow: hidden;
`;

const StyledExampleCard = styled(Paper)`
  padding: 1.5rem;
  background: ${({ theme }) =>
    theme.colorScheme === "dark" ? "#1a1a1a" : "#f8f9fa"};
  border-left: 4px solid #2563eb;
  margin: 1rem 0;
`;

const Features = () => {
  return (
    <Layout>
      <NextSeo
        {...SEO}
        title="Features Guide - JSON Repair"
        description="Comprehensive guide to all features in JSON Repair tool."
      />
      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <Box>
            <Title order={1} mb="md">
              Features Guide
            </Title>
            <Text size="lg" c="dimmed">
              Learn how to use all the powerful features of JSON Repair. Each
              feature includes examples, use cases, and step-by-step instructions.
            </Text>
          </Box>

          <Divider />

          {/* Filter Array Feature */}
          <StyledFeatureSection shadow="sm" radius="md" withBorder>
            <Group mb="lg" align="center">
              <MdFilterListAlt size={32} color="#2563eb" />
              <Box>
                <Title order={2}>Filter Array</Title>
                <Text c="dimmed" size="sm">
                  Advanced filtering for JSON arrays with multiple conditions,
                  sorting, and field selection
                </Text>
              </Box>
            </Group>

            <Tabs defaultValue="overview">
              <Tabs.List>
                <Tabs.Tab value="overview">Overview</Tabs.Tab>
                <Tabs.Tab value="how-to">How to Use</Tabs.Tab>
                <Tabs.Tab value="examples">Examples</Tabs.Tab>
                <Tabs.Tab value="features">All Features</Tabs.Tab>
              </Tabs.List>

              {/* Overview Tab */}
              <Tabs.Panel value="overview" pt="lg">
                <Stack gap="md">
                  <Text>
                    The <strong>Filter Array</strong> feature allows you to
                    filter JSON arrays based on complex conditions, sort results,
                    and select specific fields. It's perfect for analyzing large
                    datasets, extracting specific records, and transforming data.
                  </Text>

                  <Alert icon={<MdInfoOutline />} title="When to Use" color="blue">
                    <List>
                      <List.Item>
                        Filtering large JSON arrays to find specific records
                      </List.Item>
                      <List.Item>
                        Extracting data based on multiple conditions
                      </List.Item>
                      <List.Item>
                        Sorting and organizing array data
                      </List.Item>
                      <List.Item>
                        Selecting only the fields you need from each object
                      </List.Item>
                    </List>
                  </Alert>

                  <Group>
                    <Badge color="blue" size="lg">
                      Available in Toolbar
                    </Badge>
                    <Badge color="green" size="lg">
                      Works with Nested JSON
                    </Badge>
                    <Badge color="purple" size="lg">
                      Export Filtered Results
                    </Badge>
                  </Group>
                </Stack>
              </Tabs.Panel>

              {/* How to Use Tab */}
              <Tabs.Panel value="how-to" pt="lg">
                <Stack gap="lg">
                  <Title order={3}>Accessing Filter Array</Title>
                  <List spacing="md">
                    <List.Item icon={<MdCheckCircle color="#2563eb" />}>
                      <strong>From Toolbar:</strong> When you have a JSON array
                      in the editor, a <Code>Filter</Code> button automatically
                      appears in the toolbar next to Format and Repair buttons.
                    </List.Item>
                    <List.Item icon={<MdCheckCircle color="#2563eb" />}>
                      <strong>From Tools Menu:</strong> Click on{" "}
                      <Code>Tools</Code> in the toolbar, then select{" "}
                      <Code>Filter Array</Code> from the dropdown menu.
                    </List.Item>
                  </List>

                  <Divider />

                  <Title order={3}>Step-by-Step Guide</Title>
                  <Stack gap="md">
                    <Box>
                      <Text fw={600} mb="xs">
                        Step 1: Prepare Your JSON Array
                      </Text>
                      <Text size="sm" c="dimmed">
                        Make sure your JSON content is a valid array. The filter
                        feature only works with JSON arrays (not objects).
                      </Text>
                    </Box>

                    <Box>
                      <Text fw={600} mb="xs">
                        Step 2: Open Filter Modal
                      </Text>
                      <Text size="sm" c="dimmed">
                        Click the Filter button in the toolbar or access it from
                        the Tools menu. The modal will show all available keys
                        from your array.
                      </Text>
                    </Box>

                    <Box>
                      <Text fw={600} mb="xs">
                        Step 3: Build Your Filter Conditions
                      </Text>
                      <Text size="sm" c="dimmed" mb="xs">
                        Add one or more conditions:
                      </Text>
                      <List size="sm" spacing="xs">
                        <List.Item>
                          <strong>Filter by Key:</strong> Show objects that have
                          (or don't have) a specific key
                        </List.Item>
                        <List.Item>
                          <strong>Filter by Key-Value:</strong> Match objects
                          where a key equals, contains, or matches a value
                        </List.Item>
                        <List.Item>
                          <strong>Filter by Multiple Keys:</strong> Objects that
                          have all (or any) of the specified keys
                        </List.Item>
                      </List>
                    </Box>

                    <Box>
                      <Text fw={600} mb="xs">
                        Step 4: Set Logic (AND/OR)
                      </Text>
                      <Text size="sm" c="dimmed">
                        Choose how multiple conditions should be combined:
                        <Code>AND</Code> (all conditions must match) or{" "}
                        <Code>OR</Code> (any condition can match).
                      </Text>
                    </Box>

                    <Box>
                      <Text fw={600} mb="xs">
                        Step 5: Preview Results
                      </Text>
                      <Text size="sm" c="dimmed">
                        Click <Code>Preview</Code> to see how many objects match
                        your filter without applying it. The preview shows
                        total, matched, and unmatched counts.
                      </Text>
                    </Box>

                    <Box>
                      <Text fw={600} mb="xs">
                        Step 6: Apply Filter
                      </Text>
                      <Text size="sm" c="dimmed">
                        Click <Code>Apply Filter</Code> to filter your array.
                        The editor will show only the matching objects.
                      </Text>
                    </Box>
                  </Stack>
                </Stack>
              </Tabs.Panel>

              {/* Examples Tab */}
              <Tabs.Panel value="examples" pt="lg">
                <Stack gap="lg">
                  <Title order={3}>Example 1: Filter by Key</Title>
                  <Text>
                    Find all objects that have a specific key (e.g., objects with
                    an "email" field).
                  </Text>

                  <StyledCodeBlock>
                    <CodeHighlight
                      language="json"
                      code={`[
  { "id": 1, "name": "John", "email": "john@example.com" },
  { "id": 2, "name": "Jane" },
  { "id": 3, "name": "Bob", "email": "bob@example.com" }
]`}
                    />
                  </StyledCodeBlock>

                  <StyledExampleCard>
                    <Text fw={600} mb="xs">
                      Filter Configuration:
                    </Text>
                    <List size="sm" spacing="xs">
                      <List.Item>
                        <strong>Filter Type:</strong> Filter by Key
                      </List.Item>
                      <List.Item>
                        <strong>Key Name:</strong> email
                      </List.Item>
                      <List.Item>
                        <strong>Operator:</strong> Exists
                      </List.Item>
                    </List>
                    <Text mt="md" fw={600}>
                      Result: 2 objects (John and Bob)
                    </Text>
                  </StyledExampleCard>

                  <Divider />

                  <Title order={3}>Example 2: Filter by Key-Value</Title>
                  <Text>
                    Find objects where a field matches a specific value (e.g.,
                    all users in "NYC").
                  </Text>

                  <StyledCodeBlock>
                    <CodeHighlight
                      language="json"
                      code={`[
  { "name": "John", "city": "NYC", "role": "developer" },
  { "name": "Jane", "city": "LA", "role": "designer" },
  { "name": "Bob", "city": "NYC", "role": "manager" }
]`}
                    />
                  </StyledCodeBlock>

                  <StyledExampleCard>
                    <Text fw={600} mb="xs">
                      Filter Configuration:
                    </Text>
                    <List size="sm" spacing="xs">
                      <List.Item>
                        <strong>Filter Type:</strong> Filter by Key-Value
                      </List.Item>
                      <List.Item>
                        <strong>Key Name:</strong> city
                      </List.Item>
                      <List.Item>
                        <strong>Operator:</strong> Equals (=)
                      </List.Item>
                      <List.Item>
                        <strong>Value:</strong> NYC
                      </List.Item>
                    </List>
                    <Text mt="md" fw={600}>
                      Result: 2 objects (John and Bob)
                    </Text>
                  </StyledExampleCard>

                  <Divider />

                  <Title order={3}>Example 3: Multiple Conditions with AND</Title>
                  <Text>
                    Find objects that match multiple conditions (e.g., users in
                    NYC AND with role "developer").
                  </Text>

                  <StyledExampleCard>
                    <Text fw={600} mb="xs">
                      Filter Configuration:
                    </Text>
                    <List size="sm" spacing="xs">
                      <List.Item>
                        <strong>Condition 1:</strong> city = "NYC"
                      </List.Item>
                      <List.Item>
                        <strong>Condition 2:</strong> role = "developer"
                      </List.Item>
                      <List.Item>
                        <strong>Logic:</strong> AND (both must match)
                      </List.Item>
                    </List>
                    <Text mt="md" fw={600}>
                      Result: 1 object (John)
                    </Text>
                  </StyledExampleCard>

                  <Divider />

                  <Title order={3}>Example 4: Nested Key Filtering</Title>
                  <Text>
                    Filter by nested object properties using dot notation (e.g.,
                    <Code>address.city</Code>).
                  </Text>

                  <StyledCodeBlock>
                    <CodeHighlight
                      language="json"
                      code={`[
  {
    "name": "John",
    "address": { "city": "NYC", "zip": "10001" }
  },
  {
    "name": "Jane",
    "address": { "city": "LA", "zip": "90001" }
  }
]`}
                    />
                  </StyledCodeBlock>

                  <StyledExampleCard>
                    <Text fw={600} mb="xs">
                      Filter Configuration:
                    </Text>
                    <List size="sm" spacing="xs">
                      <List.Item>
                        <strong>Key Name:</strong> address.city
                      </List.Item>
                      <List.Item>
                        <strong>Operator:</strong> Equals (=)
                      </List.Item>
                      <List.Item>
                        <strong>Value:</strong> NYC
                      </List.Item>
                    </List>
                    <Text mt="md" fw={600}>
                      Result: 1 object (John)
                    </Text>
                  </StyledExampleCard>

                  <Divider />

                  <Title order={3}>Example 5: Sorting Results</Title>
                  <Text>
                    After filtering, sort the results by any field in ascending or
                    descending order.
                  </Text>

                  <StyledExampleCard>
                    <Text fw={600} mb="xs">
                      Sort Configuration:
                    </Text>
                    <List size="sm" spacing="xs">
                      <List.Item>
                        <strong>Sort Key:</strong> name
                      </List.Item>
                      <List.Item>
                        <strong>Order:</strong> Ascending (A-Z)
                      </List.Item>
                    </List>
                    <Text mt="md" size="sm" c="dimmed">
                      Results will be sorted alphabetically by name
                    </Text>
                  </StyledExampleCard>

                  <Divider />

                  <Title order={3}>Example 6: Field Selection (Pick)</Title>
                  <Text>
                    Select only specific fields from each object in the filtered
                    results.
                  </Text>

                  <StyledExampleCard>
                    <Text fw={600} mb="xs">
                      Pick Configuration:
                    </Text>
                    <List size="sm" spacing="xs">
                      <List.Item>
                        <strong>Selected Fields:</strong> name, email
                      </List.Item>
                    </List>
                    <Text mt="md" size="sm" c="dimmed">
                      Only name and email fields will be included in the output
                    </Text>
                  </StyledExampleCard>
                </Stack>
              </Tabs.Panel>

              {/* All Features Tab */}
              <Tabs.Panel value="features" pt="lg">
                <Stack gap="md">
                  <Title order={3}>Available Operators</Title>
                  <Group>
                    <Badge>Equals (=)</Badge>
                    <Badge>Not Equals (!=)</Badge>
                    <Badge>Contains</Badge>
                    <Badge>Not Contains</Badge>
                    <Badge>Starts With</Badge>
                    <Badge>Ends With</Badge>
                    <Badge>Greater Than (&gt;)</Badge>
                    <Badge>Less Than (&lt;)</Badge>
                    <Badge>Greater or Equal (&gt;=)</Badge>
                    <Badge>Less or Equal (&lt;=)</Badge>
                    <Badge>Exists</Badge>
                    <Badge>Not Exists</Badge>
                  </Group>

                  <Divider />

                  <Title order={3}>Filter Types</Title>
                  <List spacing="sm">
                    <List.Item>
                      <strong>Filter by Key:</strong> Check if a key exists or
                      doesn't exist in objects
                    </List.Item>
                    <List.Item>
                      <strong>Filter by Key-Value:</strong> Match objects based
                      on a key-value pair with various operators
                    </List.Item>
                    <List.Item>
                      <strong>Filter by Multiple Keys:</strong> Objects that
                      have all or any of the specified keys
                    </List.Item>
                  </List>

                  <Divider />

                  <Title order={3}>Advanced Features</Title>
                  <List spacing="sm">
                    <List.Item>
                      <strong>Invert Filter:</strong> Show objects that DON'T
                      match the condition
                    </List.Item>
                    <List.Item>
                      <strong>Nested Key Support:</strong> Filter by nested
                      properties using dot notation (e.g.,{" "}
                      <Code>address.city</Code>)
                    </List.Item>
                    <List.Item>
                      <strong>Sort Results:</strong> Sort filtered array by any
                      field in ascending or descending order
                    </List.Item>
                    <List.Item>
                      <strong>Field Selection:</strong> Pick only specific fields
                      to include in the output
                    </List.Item>
                    <List.Item>
                      <strong>Export Filtered JSON:</strong> Download the
                      filtered results as a JSON file
                    </List.Item>
                    <List.Item>
                      <strong>Clear Filter:</strong> Restore the original array
                      and remove all filters
                    </List.Item>
                  </List>

                  <Divider />

                  <Title order={3}>Tips & Best Practices</Title>
                  <List spacing="sm">
                    <List.Item>
                      Use <Code>Preview</Code> before applying to see how many
                      objects will match
                    </List.Item>
                    <List.Item>
                      For large arrays, use specific conditions to reduce
                      processing time
                    </List.Item>
                    <List.Item>
                      Combine sorting and field selection for clean, organized
                      output
                    </List.Item>
                    <List.Item>
                      Export filtered results to save your work
                    </List.Item>
                    <List.Item>
                      Use <Code>Clear Filter</Code> to restore original data
                      anytime
                    </List.Item>
                  </List>
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </StyledFeatureSection>

          {/* Placeholder for future features */}
          <Paper p="md" radius="md" withBorder bg="gray.0">
            <Group>
              <MdArrowForward size={24} color="#2563eb" />
              <Box>
                <Text fw={600}>More Features Coming Soon</Text>
                <Text size="sm" c="dimmed">
                  Documentation for Table Mode, Undo/Redo, and other features
                  will be added here.
                </Text>
              </Box>
            </Group>
          </Paper>
        </Stack>
      </Container>
    </Layout>
  );
};

export default Features;

