import React, { useMemo, useState, useCallback } from "react";
import styled from "styled-components";
import {
  Table as MantineTable,
  ScrollArea,
  Text,
  Group,
  ActionIcon,
  Tooltip,
  TextInput,
  Button,
  Menu,
  Badge,
  Paper,
  Stack,
  Checkbox,
  Modal,
  Code,
  Box,
} from "@mantine/core";
import {
  VscChevronUp,
  VscChevronDown,
  VscSearch,
  VscClose,
  VscSettings,
  VscExport,
  VscEdit,
  VscCheck,
  VscClose as VscCloseIcon,
} from "react-icons/vsc";
import { FaTable } from "react-icons/fa";
import toast from "react-hot-toast";
import useJson from "../../../../store/useJson";
import useFile from "../../../../store/useFile";
import useConfig from "../../../../store/useConfig";

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.GRID_BG_COLOR};
  color: ${({ theme }) => theme.TEXT_NORMAL};
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 13px;
`;

const Toolbar = styled.div`
  padding: 8px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.SILVER_DARK};
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const StyledTable = styled(MantineTable)`
  & thead th {
    background: ${({ theme }) => theme.BACKGROUND_SECONDARY};
    color: ${({ theme }) => theme.TEXT_NORMAL};
    font-weight: 600;
    cursor: pointer;
    user-select: none;
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 2px solid ${({ theme }) => theme.SILVER_DARK};

    &:hover {
      background: ${({ theme }) => theme.BACKGROUND_TERTIARY};
    }
  }

  & tbody td {
    border-bottom: 1px solid ${({ theme }) => theme.SILVER_DARK};
    padding: 8px 12px;
  }

  & tbody tr {
    &:hover {
      background: ${({ theme }) => theme.BACKGROUND_SECONDARY};
    }
  }
`;

const EditableCell = styled.div<{ $isEditing: boolean }>`
  padding: 4px 8px;
  border-radius: 4px;
  cursor: ${({ $isEditing }) => ($isEditing ? "text" : "pointer")};
  min-height: 24px;
  display: flex;
  align-items: center;

  ${({ $isEditing, theme }) =>
    $isEditing &&
    `
    background: ${theme.BACKGROUND_TERTIARY};
    border: 1px solid ${theme.SILVER_DARK};
  `}

  &:hover {
    background: ${({ theme }) => theme.BACKGROUND_TERTIARY};
  }
`;

const NestedValue = styled(Code)`
  background: ${({ theme }) => theme.BACKGROUND_TERTIARY};
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.BACKGROUND_SECONDARY};
  }
`;

type SortConfig = {
  column: string;
  direction: "asc" | "desc";
} | null;

type FlattenMode = "flatten" | "inline";

export const TableView = () => {
  const json = useJson((state) => state.json);
  const setContents = useFile((state) => state.setContents);
  const darkmodeEnabled = useConfig((state) => state.darkmodeEnabled);
  const getParsedJson = useJson((state) => state.getParsedJson);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [flattenMode, setFlattenMode] = useState<FlattenMode>("flatten");
  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    column: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showNestedModal, setShowNestedModal] = useState<{
    value: any;
    path: string;
  } | null>(null);

  // Parse JSON and check if it's an array
  const parsedData = useMemo(() => {
    try {
      const parsed = getParsedJson();
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }, [json, getParsedJson]);

  // Get all unique keys from array (including nested)
  const allKeys = useMemo(() => {
    if (!parsedData) return [];

    const keysSet = new Set<string>();

    parsedData.forEach((item) => {
      if (typeof item === "object" && item !== null) {
        const collectKeys = (obj: any, prefix: string = "") => {
          Object.keys(obj).forEach((key) => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            keysSet.add(fullKey);

            if (
              typeof obj[key] === "object" &&
              obj[key] !== null &&
              !Array.isArray(obj[key])
            ) {
              collectKeys(obj[key], fullKey);
            }
          });
        };
        collectKeys(item);
      }
    });

    return Array.from(keysSet).sort();
  }, [parsedData]);

  // Flatten nested objects based on mode
  const flattenObject = useCallback(
    (obj: any, prefix: string = ""): Record<string, any> => {
      if (flattenMode === "inline") {
        // Inline mode: show nested objects as JSON strings
        const result: Record<string, any> = {};
        Object.keys(obj).forEach((key) => {
          const value = obj[key];
          if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            result[key] = value; // Keep as object for inline display
          } else {
            result[key] = value;
          }
        });
        return result;
      } else {
        // Flatten mode: expand nested keys with dot notation
        const result: Record<string, any> = {};
        Object.keys(obj).forEach((key) => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          const value = obj[key];

          if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            Object.assign(result, flattenObject(value, fullKey));
          } else {
            result[fullKey] = value;
          }
        });
        return result;
      }
    },
    [flattenMode],
  );

  // Transform array to table rows
  const tableData = useMemo(() => {
    if (!parsedData) return [];

    return parsedData.map((item, index) => {
      if (typeof item === "object" && item !== null) {
        return {
          _index: index,
          _original: item,
          ...flattenObject(item),
        };
      }
      return { _index: index, _original: item, value: item };
    });
  }, [parsedData, flattenObject]);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return tableData;

    const query = searchQuery.toLowerCase();
    return tableData.filter((row) => {
      return Object.values(row).some((value) => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      });
    });
  }, [tableData, searchQuery]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.column];
      const bValue = b[sortConfig.column];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Get columns to display (top-level keys only for now, or all if flatten mode)
  const displayColumns = useMemo(() => {
    if (flattenMode === "flatten") {
      return allKeys;
    } else {
      // Inline mode: show only top-level keys
      const topLevelKeys = new Set<string>();
      parsedData?.forEach((item) => {
        if (typeof item === "object" && item !== null) {
          Object.keys(item).forEach((key) => topLevelKeys.add(key));
        }
      });
      return Array.from(topLevelKeys).sort();
    }
  }, [allKeys, flattenMode, parsedData]);

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortConfig?.column === column) {
      if (sortConfig.direction === "asc") {
        setSortConfig({ column, direction: "desc" });
      } else {
        setSortConfig(null);
      }
    } else {
      setSortConfig({ column, direction: "asc" });
    }
  };

  // Handle cell edit
  const handleCellEdit = (rowIndex: number, column: string, currentValue: any) => {
    setEditingCell({ rowIndex, column });
    setEditValue(
      typeof currentValue === "object"
        ? JSON.stringify(currentValue, null, 2)
        : String(currentValue ?? ""),
    );
  };

  // Save cell edit
  const saveCellEdit = () => {
    if (!editingCell || !parsedData) return;

    try {
      const newData = [...parsedData];
      const row = newData[editingCell.rowIndex];

      // Parse edit value
      let newValue: any = editValue;
      try {
        // Try to parse as JSON
        newValue = JSON.parse(editValue);
      } catch {
        // If not JSON, try to infer type
        if (editValue === "true" || editValue === "false") {
          newValue = editValue === "true";
        } else if (!isNaN(Number(editValue)) && editValue.trim() !== "") {
          newValue = Number(editValue);
        } else {
          newValue = editValue;
        }
      }

      // Update value in nested path
      if (flattenMode === "flatten" && editingCell.column.includes(".")) {
        const pathParts = editingCell.column.split(".");
        let target: any = row;
        for (let i = 0; i < pathParts.length - 1; i++) {
          target = target[pathParts[i]];
        }
        target[pathParts[pathParts.length - 1]] = newValue;
      } else {
        row[editingCell.column] = newValue;
      }

      // Update JSON
      const updatedJson = JSON.stringify(newData, null, 2);
      setContents({ contents: updatedJson, hasChanges: true });

      toast.success("Cell updated");
      setEditingCell(null);
      setEditValue("");
    } catch (error) {
      toast.error("Failed to update cell");
    }
  };

  // Cancel cell edit
  const cancelCellEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  // Format cell value for display
  const formatCellValue = (value: any): React.ReactNode => {
    if (value === null) return <Text c="dimmed">null</Text>;
    if (value === undefined) return <Text c="dimmed">undefined</Text>;
    if (typeof value === "boolean")
      return <Badge color={value ? "green" : "red"}>{String(value)}</Badge>;
    if (typeof value === "number") return <Text>{value}</Text>;
    if (typeof value === "object") {
      return (
        <NestedValue
          onClick={() => setShowNestedModal({ value, path: "" })}
        >
          {Array.isArray(value) ? `[${value.length} items]` : `{${Object.keys(value).length} keys}`}
        </NestedValue>
      );
    }
    return <Text>{String(value)}</Text>;
  };

  // Export to CSV
  const handleExport = () => {
    if (!sortedData.length) {
      toast.error("No data to export");
      return;
    }

    const headers = displayColumns;
    const csvRows = [
      headers.join(","),
      ...sortedData.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (value === null || value === undefined) return "";
            if (typeof value === "object") return JSON.stringify(value);
            return String(value).replace(/"/g, '""');
          })
          .map((v) => `"${v}"`)
          .join(","),
      ),
    ];

    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `table-export-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Exported to CSV");
  };

  if (!parsedData) {
    return (
      <Container>
        <Paper p="xl" style={{ textAlign: "center", margin: "auto" }}>
          <FaTable size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Text fw={600} size="lg" mb="xs">
            Table Mode
          </Text>
          <Text c="dimmed" size="sm">
            Table mode is only available for JSON arrays.
            <br />
            Please provide a JSON array to use this view.
          </Text>
        </Paper>
      </Container>
    );
  }

  return (
    <Container>
      {/* Toolbar */}
      <Toolbar>
        <Group gap="xs" style={{ flex: 1 }}>
          <FaTable size={16} />
          <Text fw={600} size="sm">
            Table View
          </Text>
          <Badge variant="light" size="sm">
            {sortedData.length} rows
          </Badge>
          {displayColumns.length > 0 && (
            <Badge variant="light" size="sm">
              {displayColumns.length} columns
            </Badge>
          )}
        </Group>

        <Group gap="xs">
          <TextInput
            placeholder="Search..."
            leftSection={<VscSearch size={14} />}
            rightSection={
              searchQuery && (
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={() => setSearchQuery("")}
                >
                  <VscClose size={12} />
                </ActionIcon>
              )
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="xs"
            style={{ width: 200 }}
          />

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Tooltip label="Table Settings">
                <ActionIcon variant="subtle">
                  <VscSettings size={16} />
                </ActionIcon>
              </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Flatten Mode</Menu.Label>
              <Menu.Item
                onClick={() => setFlattenMode("flatten")}
                rightSection={flattenMode === "flatten" ? <VscCheck /> : null}
              >
                Flatten Nested
              </Menu.Item>
              <Menu.Item
                onClick={() => setFlattenMode("inline")}
                rightSection={flattenMode === "inline" ? <VscCheck /> : null}
              >
                Inline Nested
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<VscExport size={14} />}
                onClick={handleExport}
              >
                Export to CSV
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Toolbar>

      {/* Table */}
      <ScrollArea style={{ flex: 1 }}>
        {displayColumns.length === 0 ? (
          <Paper p="xl" style={{ textAlign: "center", marginTop: 100 }}>
            <Text c="dimmed">No columns to display</Text>
          </Paper>
        ) : (
          <StyledTable highlightOnHover striped>
            <MantineTable.Thead>
              <MantineTable.Tr>
                {displayColumns.map((column) => (
                  <MantineTable.Th
                    key={column}
                    onClick={() => handleSort(column)}
                  >
                    <Group gap="xs" justify="space-between">
                      <Text size="sm" fw={600}>
                        {column}
                      </Text>
                      {sortConfig?.column === column && (
                        <ActionIcon size="xs" variant="subtle">
                          {sortConfig.direction === "asc" ? (
                            <VscChevronUp size={12} />
                          ) : (
                            <VscChevronDown size={12} />
                          )}
                        </ActionIcon>
                      )}
                    </Group>
                  </MantineTable.Th>
                ))}
              </MantineTable.Tr>
            </MantineTable.Thead>
            <MantineTable.Tbody>
              {sortedData.map((row, rowIndex) => (
                <MantineTable.Tr key={row._index}>
                  {displayColumns.map((column) => {
                    const isEditing =
                      editingCell?.rowIndex === rowIndex &&
                      editingCell?.column === column;
                    const cellValue = row[column];

                    return (
                      <MantineTable.Td key={column}>
                        {isEditing ? (
                          <Group gap="xs">
                            <TextInput
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  saveCellEdit();
                                } else if (e.key === "Escape") {
                                  cancelCellEdit();
                                }
                              }}
                              autoFocus
                              size="xs"
                              style={{ flex: 1 }}
                            />
                            <ActionIcon
                              color="green"
                              size="sm"
                              onClick={saveCellEdit}
                            >
                              <VscCheck size={14} />
                            </ActionIcon>
                            <ActionIcon
                              color="red"
                              size="sm"
                              onClick={cancelCellEdit}
                            >
                              <VscCloseIcon size={14} />
                            </ActionIcon>
                          </Group>
                        ) : (
                          <EditableCell
                            $isEditing={false}
                            onDoubleClick={() =>
                              handleCellEdit(rowIndex, column, cellValue)
                            }
                          >
                            {formatCellValue(cellValue)}
                          </EditableCell>
                        )}
                      </MantineTable.Td>
                    );
                  })}
                </MantineTable.Tr>
              ))}
            </MantineTable.Tbody>
          </StyledTable>
        )}
      </ScrollArea>

      {/* Nested Value Modal */}
      <Modal
        opened={!!showNestedModal}
        onClose={() => setShowNestedModal(null)}
        title="Nested Object"
        size="lg"
        centered
      >
        {showNestedModal && (
          <Stack>
            <Code block style={{ maxHeight: 400, overflow: "auto" }}>
              {JSON.stringify(showNestedModal.value, null, 2)}
            </Code>
            <Group justify="flex-end">
              <Button
                variant="light"
                onClick={() => {
                  if (showNestedModal.value) {
                    navigator.clipboard.writeText(
                      JSON.stringify(showNestedModal.value, null, 2),
                    );
                    toast.success("Copied to clipboard");
                  }
                }}
              >
                Copy JSON
              </Button>
              <Button onClick={() => setShowNestedModal(null)}>Close</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
};


