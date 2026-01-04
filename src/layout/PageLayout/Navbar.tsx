import React from "react";
import Link from "next/link";
import { Button, Menu, type MenuItemProps, Text, Stack } from "@mantine/core";
import styled from "styled-components";
import { LuChevronDown } from "react-icons/lu";
import { JSONRepairLogo } from "../JSONRepairLogo";

const StyledNavbarWrapper = styled.div`
  z-index: 3;
  transition: background 0.2s ease-in-out;
`;

const StyledMenuItem = styled(Menu.Item)<MenuItemProps & any>`
  color: black;
  transition: all 0.2s ease;
  border-radius: 6px;
  margin: 2px 4px;

  &[data-hovered] {
    background-color: #f0f4f8;
    transform: translateX(2px);
  }
`;

const StyledNavbar = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 32px;
  background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  @media only screen and (max-width: 768px) {
    padding: 16px 24px;
  }
`;

const Left = styled.div`
  display: flex;
  align-items: center;
`;

const Right = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  white-space: nowrap;
`;

const Center = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  white-space: nowrap;
  justify-content: center;

  @media only screen and (max-width: 768px) {
    display: none;
  }
`;

export const Navbar = () => {
  return (
    <StyledNavbarWrapper className="navbar">
      <StyledNavbar>
        <Left>
          <JSONRepairLogo fontSize="1.2rem" hideLogo />
        </Left>
        <Center>
          <Button
            component={Link}
            prefetch={false}
            href="/features"
            variant="subtle"
            color="gray"
            size="md"
            radius="md"
            style={{
              fontWeight: 500,
              transition: "all 0.2s ease",
            }}
          >
            Features
          </Button>
          <Button
            component={Link}
            prefetch={false}
            href="/docs"
            variant="subtle"
            color="gray"
            size="md"
            radius="md"
            style={{
              fontWeight: 500,
              transition: "all 0.2s ease",
            }}
          >
            Embed
          </Button>
          <Menu withArrow shadow="md">
            <Menu.Target>
              <Button
                variant="subtle"
                color="gray"
                visibleFrom="sm"
                size="md"
                radius="md"
                rightSection={<LuChevronDown />}
                style={{
                  fontWeight: 500,
                  transition: "all 0.2s ease",
                }}
              >
                Tools
              </Button>
            </Menu.Target>
            <Menu.Dropdown maw={300} bg="white">
              <StyledMenuItem
                component={Link}
                prefetch={false}
                href="/converter/json-to-yaml"
              >
                <Stack gap="2">
                  <Text c="black" size="sm" fw={600}>
                    Converter
                  </Text>
                  <Text size="xs" c="gray.6" lineClamp={2}>
                    Convert JSON to YAML, CSV to JSON, YAML to XML, and more.
                  </Text>
                </Stack>
              </StyledMenuItem>
              <StyledMenuItem
                component={Link}
                prefetch={false}
                href="/type/json-to-rust"
              >
                <Stack gap="2">
                  <Text c="black" size="sm" fw={600}>
                    Generate Types
                  </Text>
                  <Text size="xs" c="gray.6" lineClamp={2}>
                    Generate TypeScript types, Golang structs, Rust, and more.
                  </Text>
                </Stack>
              </StyledMenuItem>
              <StyledMenuItem
                component={Link}
                prefetch={false}
                href="/tools/json-schema"
              >
                <Stack gap="2">
                  <Text c="black" size="sm" fw={600}>
                    JSON Schema
                  </Text>
                  <Text size="xs" c="gray.6" lineClamp={2}>
                    Generate JSON schema from JSON data.
                  </Text>
                  <Text size="xs" c="gray.6" lineClamp={2}>
                    Generate JSON data from JSON schema.
                  </Text>
                </Stack>
              </StyledMenuItem>
            </Menu.Dropdown>
          </Menu>
        </Center>
        <Right>
          <Button
            radius="md"
            component="a"
            color="#2563EB"
            href="/editor"
            visibleFrom="sm"
            size="md"
            style={{
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.2)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 4px 12px rgba(37, 99, 235, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 2px 8px rgba(37, 99, 235, 0.2)";
            }}
          >
            Editor
          </Button>
        </Right>
      </StyledNavbar>
    </StyledNavbarWrapper>
  );
};
