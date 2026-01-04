import React from "react";
import { Menu, Flex, Text } from "@mantine/core";
// Lazy load json-schema-faker to avoid AMD module conflicts
// import { JSONSchemaFaker } from "json-schema-faker";
import { event as gaEvent } from "nextjs-google-analytics";
import toast from "react-hot-toast";
import { BsCheck2 } from "react-icons/bs";
import { CgChevronDown } from "react-icons/cg";
import { FaRandom } from "react-icons/fa";
import { MdFilterListAlt } from "react-icons/md";
import { SiJsonwebtokens } from "react-icons/si";
import {
  VscSearchFuzzy,
  VscJson,
  VscGroupByRefType,
  VscWordWrap,
  VscTerminalBash,
  VscWand,
  VscSymbolString,
  VscBook,
} from "react-icons/vsc";
import { jsonToContent } from "../../../lib/utils/jsonAdapter";
import useFile from "../../../store/useFile";
import useJson from "../../../store/useJson";
import useConfig from "../../../store/useConfig";
import { useModal } from "../../../store/useModal";
import { StyledToolElement } from "./styles";

export const ToolsMenu = () => {
  const setVisible = useModal((state) => state.setVisible);
  const getJson = useJson((state) => state.getJson);
  const setContents = useFile((state) => state.setContents);
  const getFormat = useFile((state) => state.getFormat);
  const wordWrapEnabled = useConfig((state) => state.wordWrapEnabled);
  const toggleWordWrap = useConfig((state) => state.toggleWordWrap);

  const randomizeData = async () => {
    try {
      // generate json schema
      const { run } = await import("json_typegen_wasm");
      const jsonSchema = run(
        "Root",
        getJson(),
        JSON.stringify({
          output_mode: "json_schema",
        }),
      );

      // Lazy load json-schema-faker to avoid AMD module conflicts
      const { JSONSchemaFaker } = await import("json-schema-faker");
      const randomJson = JSONSchemaFaker.generate(JSON.parse(jsonSchema));
      const contents = await jsonToContent(
        JSON.stringify(randomJson, null, 2),
        getFormat(),
      );
      setContents({ contents });

      gaEvent("randomize_data");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate mock data");
    }
  };

  return (
    <Menu shadow="md" withArrow>
      <Menu.Target>
        <StyledToolElement onClick={() => gaEvent("show_tools_menu")}>
          <Flex align="center" gap={3}>
            Tools <CgChevronDown />
          </Flex>
        </StyledToolElement>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          fz={12}
          leftSection={<VscSearchFuzzy />}
          onClick={() => {
            setVisible("JQModal", true);
            gaEvent("open_jq_modal");
          }}
        >
          JSON Query (jq)
        </Menu.Item>
        <Menu.Item
          fz={12}
          leftSection={<VscJson />}
          onClick={() => {
            setVisible("SchemaModal", true);
            gaEvent("open_schema_modal");
          }}
        >
          JSON Schema
        </Menu.Item>
        <Menu.Item
          fz={12}
          leftSection={<MdFilterListAlt />}
          onClick={() => {
            setVisible("JPathModal", true);
            gaEvent("open_json_path_modal");
          }}
        >
          JSON Path
        </Menu.Item>
        <Menu.Item
          fz={12}
          leftSection={<MdFilterListAlt />}
          onClick={() => {
            setVisible("FilterModal", true);
            gaEvent("open_filter_modal");
          }}
        >
          Filter Array
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          fz={12}
          leftSection={<SiJsonwebtokens />}
          onClick={() => {
            setVisible("JWTModal", true);
            gaEvent("open_jwt_modal");
          }}
        >
          Decode JWT
        </Menu.Item>
        <Menu.Item
          fz={12}
          leftSection={<VscSymbolString />}
          onClick={() => {
            setVisible("Base64Modal", true);
            gaEvent("open_base64_modal");
          }}
        >
          Base64 Encode/Decode
        </Menu.Item>
        <Menu.Item
          fz={12}
          leftSection={<VscTerminalBash />}
          onClick={() => {
            setVisible("CurlModal", true);
            gaEvent("open_curl_modal");
          }}
        >
          Import cURL
        </Menu.Item>
        <Menu.Item
          fz={12}
          leftSection={<VscWand />}
          onClick={() => {
            setVisible("GenerateCurlModal", true);
            gaEvent("open_generate_curl_modal");
          }}
        >
          Generate cURL from JSON
        </Menu.Item>
        <Menu.Item
          fz={12}
          leftSection={<VscGroupByRefType />}
          onClick={() => {
            setVisible("TypeModal", true);
            gaEvent("open_type_modal");
          }}
        >
          Generate Type
        </Menu.Item>
        <Menu.Item fz={12} leftSection={<FaRandom />} onClick={randomizeData}>
          Randomize Data
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          fz={12}
          leftSection={
            <Flex align="center" gap={4}>
              <BsCheck2 opacity={wordWrapEnabled ? 100 : 0} size={14} />
              <VscWordWrap size={14} />
            </Flex>
          }
          onClick={() => {
            toggleWordWrap(!wordWrapEnabled);
            gaEvent("toggle_word_wrap", {
              label: wordWrapEnabled ? "off" : "on",
            });
          }}
        >
          <Text size="xs">Word Wrap</Text>
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          fz={12}
          leftSection={<VscBook />}
          component="a"
          href="/features"
          target="_blank"
          onClick={() => {
            gaEvent("open_features_docs", { source: "tools_menu" });
          }}
        >
          Features & Docs
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
