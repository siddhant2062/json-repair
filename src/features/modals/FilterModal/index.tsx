import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Stack,
  Modal,
  Button,
  Text,
  Group,
  TextInput,
  Select,
  Checkbox,
  Paper,
  Badge,
  Divider,
  ActionIcon,
  Card,
  Box,
  Tooltip,
  Progress,
  Collapse,
  ScrollArea,
} from "@mantine/core";
import { event as gaEvent } from "nextjs-google-analytics";
import { toast } from "react-hot-toast";
import {
  FaPlus,
  FaTrash,
  FaDownload,
  FaEye,
  FaFilter,
  FaTimes,
  FaCheck,
  FaSort,
  FaList,
  FaChevronDown,
  FaChevronUp,
  FaSearch,
} from "react-icons/fa";
import { MdFilterListAlt, MdInfoOutline } from "react-icons/md";
import {
  filterArray,
  getAllKeysFromArray,
  getKeyStatistics,
  getArrayFromContent,
  isJsonArray,
  type FilterCondition,
  type FilterQuery,
  type FilterOperator,
  type FilterLogic,
  type SortConfig,
  type PickConfig,
} from "../../../lib/utils/filterEngine";
import useFile from "../../../store/useFile";
const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "equals", label: "Equals (=)" },
  { value: "notEquals", label: "Not Equals (!=)" },
  { value: "contains", label: "Contains" },
  { value: "notContains", label: "Not Contains" },
  { value: "startsWith", label: "Starts With" },
  { value: "endsWith", label: "Ends With" },
  { value: "greaterThan", label: "Greater Than (>)" },
  { value: "lessThan", label: "Less Than (<)" },
  { value: "greaterOrEqual", label: "Greater or Equal (>=)" },
  { value: "lessOrEqual", label: "Less or Equal (<=)" },
  { value: "exists", label: "Exists" },
  { value: "notExists", label: "Not Exists" },
];

export const FilterModal = ({ opened, onClose }: ModalProps) => {
  const contents = useFile((state) => state.contents);
  const setContents = useFile((state) => state.setContents);
  const originalContents = useFile((state) => state.originalContents);
  const isFiltered = useFile((state) => state.isFiltered);
  const setOriginalContents = useFile((state) => state.setOriginalContents);
  const setIsFiltered = useFile((state) => state.setIsFiltered);

  const [conditions, setConditions] = React.useState<FilterCondition[]>([
    {
      id: "1",
      type: "key",
      key: "",
      operator: "exists",
      invert: false,
    },
  ]);
  const [logic, setLogic] = React.useState<FilterLogic>("AND");
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    field: undefined,
    direction: undefined,
  });
  const [pickConfig, setPickConfig] = React.useState<PickConfig>({
    fields: undefined,
  });
  const [selectedFields, setSelectedFields] = React.useState<string[]>([]);
  const [previewResult, setPreviewResult] = React.useState<{
    total: number;
    matched: number;
    unmatched: number;
    preview?: any[];
  } | null>(null);
  const [availableKeys, setAvailableKeys] = React.useState<string[]>([]);
  const [keyStats, setKeyStats] = React.useState<Record<string, number>>({});
  const [showPreview, setShowPreview] = React.useState(false);
  const [keysSectionOpen, setKeysSectionOpen] = React.useState(false);
  const [keySearchQuery, setKeySearchQuery] = React.useState("");

  // Initialize: Check if content is array and get available keys (including nested)
  React.useEffect(() => {
    if (opened && contents) {
      const array = getArrayFromContent(contents);
      if (array) {
        const keys = getAllKeysFromArray(array, true); // Include nested keys
        const stats = getKeyStatistics(array, true); // Include nested keys
        setAvailableKeys(keys);
        setKeyStats(stats);
      } else {
        setAvailableKeys([]);
        setKeyStats({});
      }
    }
  }, [opened, contents]);

  // Update preview when conditions, sort, or pick change
  React.useEffect(() => {
    if (opened) {
      const sourceContent = originalContents || contents;
      const array = getArrayFromContent(sourceContent);
      if (array) {
        const query: FilterQuery = {
          conditions,
          logic,
          sort: sortConfig.field && sortConfig.direction ? sortConfig : undefined,
          pick: pickConfig.fields && pickConfig.fields.length > 0 ? pickConfig : undefined,
        };
        const result = filterArray(array, query);
        setPreviewResult({
          total: result.totalCount,
          matched: result.matchedCount,
          unmatched: result.unmatchedCount,
          preview: result.filtered.slice(0, 10), // Show first 10 for preview
        });
      }
    }
  }, [conditions, logic, sortConfig, pickConfig, opened, contents, originalContents]);

  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: Date.now().toString(),
      type: "key",
      key: "",
      operator: "exists",
      invert: false,
    };
    setConditions([...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((c) => c.id !== id));
    } else {
      toast.error("At least one condition is required");
    }
  };

  const updateCondition = (
    id: string,
    updates: Partial<FilterCondition>,
  ) => {
    setConditions(
      conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };

  const handleApplyFilter = () => {
    const sourceContent = originalContents || contents;
    const array = getArrayFromContent(sourceContent);
    if (!array) {
      toast.error("Content is not a JSON array");
      return;
    }

    if (!isFiltered && !originalContents) {
      setOriginalContents(contents);
    }

    const query: FilterQuery = {
      conditions,
      logic,
      sort: sortConfig.field && sortConfig.direction ? sortConfig : undefined,
      pick: pickConfig.fields && pickConfig.fields.length > 0 ? pickConfig : undefined,
    };
    const result = filterArray(array, query);

    if (result.matchedCount === 0) {
      toast.error("No objects match the filter criteria");
      return;
    }

    const filteredJson = JSON.stringify(result.filtered, null, 2);
    setContents({ contents: filteredJson });
    setIsFiltered(true);

    gaEvent("apply_array_filter", {
      conditions: conditions.length.toString(),
      matched: result.matchedCount.toString(),
      total: result.totalCount.toString(),
      sorted: sortConfig.field ? "yes" : "no",
      picked: pickConfig.fields?.length ? "yes" : "no",
    });

    toast.success(
      `Filter applied: ${result.matchedCount} of ${result.totalCount} objects`,
    );
    onClose();
  };

  const handleClearFilter = () => {
    if (originalContents) {
      setContents({ contents: originalContents });
      setOriginalContents(null);
      setIsFiltered(false);
      toast.success("Filter cleared");
      onClose();
    } else {
      toast.error("No filter to clear");
    }
  };

  const handleExport = () => {
    const sourceContent = originalContents || contents;
    const array = getArrayFromContent(sourceContent);
    if (!array) {
      toast.error("Content is not a JSON array");
      return;
    }

    const query: FilterQuery = {
      conditions,
      logic,
      sort: sortConfig.field && sortConfig.direction ? sortConfig : undefined,
      pick: pickConfig.fields && pickConfig.fields.length > 0 ? pickConfig : undefined,
    };
    const result = filterArray(array, query);

    const filteredJson = JSON.stringify(result.filtered, null, 2);
    const blob = new Blob([filteredJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `filtered-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Filtered JSON exported");
    gaEvent("export_filtered_json");
  };

  const handlePreview = () => {
    const sourceContent = originalContents || contents;
    const array = getArrayFromContent(sourceContent);
    if (!array) {
      toast.error("Content is not a JSON array");
      return;
    }

    const query: FilterQuery = { conditions, logic };
    const result = filterArray(array, query);
    const previewJson = JSON.stringify(result.filtered, null, 2);

    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(
        `<pre style="padding: 20px; font-family: monospace; background: #1e1e1e; color: #d4d4d4;">${previewJson}</pre>`,
      );
    }
  };

  if (!isJsonArray(contents)) {
    return (
      <Modal
        title={
          <Group gap="xs">
            <MdFilterListAlt size={20} />
            <Text fw={600}>Filter JSON Array</Text>
          </Group>
        }
        size="lg"
        opened={opened}
        onClose={onClose}
        centered
      >
        <Stack gap="md">
          <Paper p="md" withBorder bg="red.0" c="red.9">
            <Group gap="xs">
              <MdInfoOutline size={20} />
              <Text fw={500} fz="sm">
                Invalid Content Type
              </Text>
            </Group>
            <Text fz="sm" mt="xs">
              Current content is not a JSON array. Please provide a JSON array
              to use the filter feature.
            </Text>
          </Paper>
          <Group justify="flex-end">
            <Button onClick={onClose}>Close</Button>
          </Group>
        </Stack>
      </Modal>
    );
  }

  const matchPercentage =
    previewResult && previewResult.total > 0
      ? Math.round((previewResult.matched / previewResult.total) * 100)
      : 0;

  return (
    <Modal
      title={
        <Group gap="xs">
          <MdFilterListAlt size={20} />
          <Text fw={600}>Filter JSON Array</Text>
          {isFiltered && (
            <Badge color="blue" variant="light" size="sm">
              Filter Active
            </Badge>
          )}
        </Group>
      }
      size="xl"
      opened={opened}
      onClose={onClose}
      centered
    >
      <Stack gap="lg">
        {/* Available Keys Section - Collapsible with Search */}
        {availableKeys.length > 0 && (
          <Paper p="md" withBorder radius="md">
            <Group
              justify="space-between"
              style={{ cursor: "pointer" }}
              onClick={() => setKeysSectionOpen(!keysSectionOpen)}
            >
              <Group gap="xs">
                <FaFilter size={14} />
                <Text fw={600} fz="sm">
                  Available Keys
                </Text>
                <Badge variant="light" size="sm">
                  {availableKeys.length}
                </Badge>
              </Group>
              <Group gap="xs">
                <Text fz="xs" c="dimmed">
                  Click to use in filter
                </Text>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setKeysSectionOpen(!keysSectionOpen);
                  }}
                >
                  {keysSectionOpen ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </ActionIcon>
              </Group>
            </Group>
            <Collapse in={keysSectionOpen}>
              <Box mt="md">
                {/* Search Input */}
                <TextInput
                  placeholder="Search keys..."
                  leftSection={<FaSearch size={14} />}
                  value={keySearchQuery}
                  onChange={(e) => setKeySearchQuery(e.target.value)}
                  mb="sm"
                  size="sm"
                />
                {/* Grouped Keys */}
                <ScrollArea h={availableKeys.length > 20 ? 200 : undefined}>
                  <Group gap="xs" style={{ flexWrap: "wrap" }}>
                    {availableKeys
                      .filter((key) =>
                        keySearchQuery
                          ? key.toLowerCase().includes(keySearchQuery.toLowerCase())
                          : true,
                      )
                      .map((key) => (
                        <Badge
                          key={key}
                          variant="light"
                          size="sm"
                          style={{ cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (conditions.length > 0) {
                              updateCondition(conditions[0].id, { key });
                              setKeySearchQuery("");
                            }
                          }}
                        >
                          {key}
                          <Text component="span" fz="xs" ml={4} c="dimmed">
                            ({keyStats[key] || 0})
                          </Text>
                        </Badge>
                      ))}
                  </Group>
                  {availableKeys.filter((key) =>
                    keySearchQuery
                      ? key.toLowerCase().includes(keySearchQuery.toLowerCase())
                      : true,
                  ).length === 0 && (
                    <Text fz="sm" c="dimmed" ta="center" py="md">
                      No keys found matching "{keySearchQuery}"
                    </Text>
                  )}
                </ScrollArea>
              </Box>
            </Collapse>
          </Paper>
        )}

        {/* Logic Selector */}
        <Paper p="md" withBorder radius="md" bg="gray.0">
          <Group justify="space-between" align="center">
            <Box>
              <Text fw={600} fz="sm" mb={4}>
                Filter Logic
              </Text>
              <Text fz="xs" c="dimmed">
                How multiple conditions should be combined
              </Text>
            </Box>
            <Select
              value={logic}
              onChange={(value) => setLogic(value as FilterLogic)}
              data={[
                {
                  value: "AND",
                  label: "AND - All conditions must match",
                },
                {
                  value: "OR",
                  label: "OR - Any condition can match",
                },
              ]}
              style={{ width: 280 }}
            />
          </Group>
        </Paper>

        {/* Conditions Section */}
        <Box>
          <Group justify="space-between" mb="md">
            <Box>
              <Text fw={600} fz="sm" mb={4}>
                Filter Conditions
              </Text>
              <Text fz="xs" c="dimmed">
                Define rules to filter your array
              </Text>
            </Box>
            <Button
              leftSection={<FaPlus size={12} />}
              size="sm"
              variant="light"
              onClick={addCondition}
            >
              Add Condition
            </Button>
          </Group>

          <Stack gap="md">
            {conditions.map((condition, index) => (
              <Card key={condition.id} p="md" withBorder radius="md" style={{ transition: "all 0.2s ease" }}>
                <Stack gap="md">
                  {/* Condition Header */}
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      <Badge variant="dot" size="lg">
                        Condition {index + 1}
                      </Badge>
                      {condition.invert && (
                        <Badge color="orange" variant="light" size="sm">
                          Inverted
                        </Badge>
                      )}
                    </Group>
                    <Group gap="xs">
                      <Tooltip label="Invert this condition">
                        <Checkbox
                          label="Invert"
                          checked={condition.invert}
                          onChange={(e) =>
                            updateCondition(condition.id, {
                              invert: e.currentTarget.checked,
                            })
                          }
                        />
                      </Tooltip>
                      {conditions.length > 1 && (
                        <Tooltip label="Remove condition">
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => removeCondition(condition.id)}
                          >
                            <FaTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Group>

                  {/* Filter Type */}
                  <Select
                    label="Filter Type"
                    placeholder="Select filter type"
                    value={condition.type}
                    onChange={(value) =>
                      updateCondition(condition.id, {
                        type: value as FilterCondition["type"],
                      })
                    }
                    data={[
                      { value: "key", label: "Filter by Key" },
                      {
                        value: "keyValue",
                        label: "Filter by Key-Value",
                      },
                      {
                        value: "multipleKeys",
                        label: "Filter by Multiple Keys",
                      },
                    ]}
                  />

                  {/* Key Filter */}
                  {condition.type === "key" && (
                    <TextInput
                      label="Key Name"
                      placeholder="Enter or select key name"
                      value={condition.key || ""}
                      onChange={(e) =>
                        updateCondition(condition.id, { key: e.target.value })
                      }
                      list="keys-list"
                      description="Objects with this key will be included"
                      error={
                        !condition.key || condition.key.trim() === ""
                          ? "Key name is required"
                          : undefined
                      }
                      required
                    />
                  )}

                  {/* Key-Value Filter */}
                  {condition.type === "keyValue" && (
                    <Stack gap="sm">
                      <TextInput
                        label="Key Name"
                        placeholder="Enter or select key name"
                        value={condition.key || ""}
                        onChange={(e) =>
                          updateCondition(condition.id, {
                            key: e.target.value,
                          })
                        }
                        list="keys-list"
                        error={
                          !condition.key || condition.key.trim() === ""
                            ? "Key name is required"
                            : undefined
                        }
                        required
                      />
                      <Stack gap="sm">
                        <Select
                          label="Operator"
                          placeholder="Select operator"
                          value={condition.operator || "equals"}
                          onChange={(value) =>
                            updateCondition(condition.id, {
                              operator: value as FilterOperator,
                            })
                          }
                          data={OPERATORS}
                        />
                        {condition.operator !== "exists" &&
                          condition.operator !== "notExists" && (
                            <TextInput
                              label="Value"
                              placeholder="Enter value to match"
                              value={condition.value || ""}
                              onChange={(e) =>
                                updateCondition(condition.id, {
                                  value: e.target.value,
                                })
                              }
                              error={
                                !condition.value || condition.value.trim() === ""
                                  ? "Value is required for this operator"
                                  : undefined
                              }
                              required
                            />
                          )}
                      </Stack>
                    </Stack>
                  )}

                  {/* Multiple Keys Filter */}
                  {condition.type === "multipleKeys" && (
                    <TextInput
                      label="Keys (comma-separated)"
                      placeholder="e.g., city, role, age"
                      value={condition.keys?.join(", ") || ""}
                      onChange={(e) =>
                        updateCondition(condition.id, {
                          keys: e.target.value
                            .split(",")
                            .map((k) => k.trim())
                            .filter((k) => k.length > 0),
                        })
                      }
                      description="Objects must have all specified keys"
                    />
                  )}
                </Stack>
              </Card>
            ))}
          </Stack>
        </Box>

        {/* Datalist for autocomplete */}
        <datalist id="keys-list">
          {availableKeys.map((key) => (
            <option key={key} value={key} />
          ))}
        </datalist>

        {/* Sort Section */}
        <Paper p="md" withBorder radius="md" bg="gray.0">
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <FaSort size={16} />
                <Text fw={600} fz="sm">
                  Sort Results
                </Text>
              </Group>
              <Checkbox
                label="Enable sorting"
                checked={!!(sortConfig.field && sortConfig.direction)}
                onChange={(e) => {
                  if (e.currentTarget.checked) {
                    setSortConfig({ field: availableKeys[0] || "", direction: "asc" });
                  } else {
                    setSortConfig({ field: undefined, direction: undefined });
                  }
                }}
              />
            </Group>
            {sortConfig.field && sortConfig.direction && (
              <Group grow>
                <Select
                  label="Sort By Field"
                  placeholder="Select field to sort by"
                  value={sortConfig.field}
                  onChange={(value) =>
                    setSortConfig({ ...sortConfig, field: value || undefined })
                  }
                  data={availableKeys.map((key) => ({
                    value: key,
                    label: key,
                  }))}
                  searchable
                />
                <Select
                  label="Direction"
                  value={sortConfig.direction}
                  onChange={(value) =>
                    setSortConfig({
                      ...sortConfig,
                      direction: (value as "asc" | "desc") || undefined,
                    })
                  }
                  data={[
                    { value: "asc", label: "Ascending (A-Z)" },
                    { value: "desc", label: "Descending (Z-A)" },
                  ]}
                />
              </Group>
            )}
          </Stack>
        </Paper>

        {/* Field Selection (Pick) Section */}
        <Paper p="md" withBorder radius="md" bg="gray.0">
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <FaList size={16} />
                <Text fw={600} fz="sm">
                  Select Fields (Pick)
                </Text>
              </Group>
              <Checkbox
                label="Enable field selection"
                checked={selectedFields.length > 0}
                onChange={(e) => {
                  if (!e.currentTarget.checked) {
                    setSelectedFields([]);
                    setPickConfig({ fields: undefined });
                  }
                }}
              />
            </Group>
            {selectedFields.length > 0 && (
              <Box>
                <Text fz="xs" c="dimmed" mb="xs">
                  Selected fields will be included in the filtered results
                </Text>
                <Group gap="xs" style={{ flexWrap: "wrap" }} mb="sm">
                  {selectedFields.map((field) => (
                    <Badge
                      key={field}
                      variant="light"
                      size="md"
                      rightSection={
                        <ActionIcon
                          size="xs"
                          color="red"
                          variant="transparent"
                          onClick={() => {
                            const newFields = selectedFields.filter((f) => f !== field);
                            setSelectedFields(newFields);
                            setPickConfig({
                              fields: newFields.length > 0 ? newFields : undefined,
                            });
                          }}
                        >
                          <FaTimes size={10} />
                        </ActionIcon>
                      }
                    >
                      {field}
                    </Badge>
                  ))}
                </Group>
              </Box>
            )}
            <Select
              label="Add Field"
              placeholder="Select field to include"
              value={null}
              onChange={(value) => {
                if (value && !selectedFields.includes(value)) {
                  const newFields = [...selectedFields, value];
                  setSelectedFields(newFields);
                  setPickConfig({ fields: newFields });
                }
              }}
              data={availableKeys
                .filter((key) => !selectedFields.includes(key))
                .map((key) => ({
                  value: key,
                  label: key,
                }))}
              searchable
              clearable
            />
          </Stack>
        </Paper>

        {/* Preview Section */}
        {previewResult && (
          <Paper p="md" withBorder radius="md" style={{ background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)" }}>
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <FaEye size={16} />
                  <Text fw={600} fz="sm">
                    Preview Results
                  </Text>
                </Group>
                <Badge
                  color={previewResult.matched > 0 ? "green" : "red"}
                  variant="light"
                  size="lg"
                >
                  {previewResult.matched} / {previewResult.total}
                </Badge>
              </Group>

              <Progress
                value={matchPercentage}
                color={previewResult.matched > 0 ? "blue" : "gray"}
                size="lg"
                radius="xl"
                mt="xs"
              />

              <Group gap="md" mt="xs">
                <Box style={{ flex: 1 }}>
                  <Text fz="xs" c="dimmed" mb={4}>
                    Total Objects
                  </Text>
                  <Text fw={600} fz="lg">
                    {previewResult.total}
                  </Text>
                </Box>
                <Box style={{ flex: 1 }}>
                  <Text fz="xs" c="dimmed" mb={4}>
                    Matched
                  </Text>
                  <Text fw={600} fz="lg" c="green">
                    {previewResult.matched}
                  </Text>
                </Box>
                <Box style={{ flex: 1 }}>
                  <Text fz="xs" c="dimmed" mb={4}>
                    Unmatched
                  </Text>
                  <Text fw={600} fz="lg" c="red">
                    {previewResult.unmatched}
                  </Text>
                </Box>
              </Group>

              {previewResult.matched > 0 && (
                <>
                  <Text fz="xs" c="dimmed" mt="xs">
                    {previewResult.matched} of {previewResult.total} objects will
                    be shown after applying filter
                  </Text>
                  {previewResult.preview && previewResult.preview.length > 0 && (
                    <Box mt="sm">
                      <Group justify="space-between" mb="xs">
                        <Text fz="xs" fw={500} c="dimmed">
                          Preview (first {Math.min(previewResult.preview.length, 10)} items)
                        </Text>
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => setShowPreview(!showPreview)}
                        >
                          {showPreview ? "Hide" : "Show"} Preview
                        </Button>
                      </Group>
                      {showPreview && (
                        <Paper
                          p="sm"
                          withBorder
                          radius="sm"
                          style={{
                            maxHeight: "300px",
                            overflow: "auto",
                            backgroundColor: "#1e1e1e",
                            fontFamily: "monospace",
                          }}
                        >
                          <pre
                            style={{
                              margin: 0,
                              color: "#d4d4d4",
                              fontSize: "12px",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {JSON.stringify(previewResult.preview, null, 2)}
                          </pre>
                        </Paper>
                      )}
                    </Box>
                  )}
                </>
              )}
            </Stack>
          </Paper>
        )}

        <Divider />

        {/* Action Buttons */}
        <Group justify="space-between">
          <Group>
            <Tooltip label="Preview filtered JSON in new window">
              <Button
                leftSection={<FaEye size={14} />}
                variant="light"
                onClick={handlePreview}
                disabled={!previewResult || previewResult.matched === 0}
              >
                Preview
              </Button>
            </Tooltip>
            <Tooltip label="Download filtered JSON as file">
              <Button
                leftSection={<FaDownload size={14} />}
                variant="light"
                onClick={handleExport}
                disabled={!previewResult || previewResult.matched === 0}
              >
                Export
              </Button>
            </Tooltip>
          </Group>
          <Group>
            {isFiltered && (
              <Button
                leftSection={<FaTimes size={14} />}
                variant="outline"
                color="red"
                onClick={handleClearFilter}
              >
                Clear Filter
              </Button>
            )}
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button
              leftSection={<FaCheck size={14} />}
              onClick={handleApplyFilter}
              disabled={!previewResult || previewResult.matched === 0}
            >
              Apply Filter
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};
