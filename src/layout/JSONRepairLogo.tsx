import React, { useEffect } from "react";
import localFont from "next/font/local";
import Link from "next/link";
import styled from "styled-components";

const monaSans = localFont({
  src: "../assets/fonts/Mona-Sans.woff2",
  variable: "--mona-sans",
  display: "swap",
  fallback: ["Futura, Helvetica, sans-serif", "Tahoma, Verdana, sans-serif"],
});

const StyledLogoWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StyledTitle = styled.span<{ fontSize: string }>`
  font-weight: 700;
  margin: 0;
  font-family: ${monaSans.style.fontFamily} !important;
  font-size: ${({ fontSize }) => fontSize};
  white-space: nowrap;
  z-index: 10;
  vertical-align: middle;
  color: inherit;
  letter-spacing: -0.02em;
`;

const StyledLogoIcon = styled.div<{ fontSize: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 0;
  transition: transform 0.2s ease;

  svg {
    display: block;
    width: 28px;
    height: 28px;
    filter: drop-shadow(0 2px 4px rgba(37, 99, 235, 0.2));
  }

  &:hover {
    transform: scale(1.05);
  }
`;

interface LogoProps extends React.ComponentPropsWithoutRef<"div"> {
  fontSize?: string;
  hideLogo?: boolean;
  hideText?: boolean;
}

export const JSONRepairLogo = ({
  fontSize = "1.2rem",
  hideText,
  hideLogo,
  ...props
}: LogoProps) => {
  const [isIframe, setIsIframe] = React.useState(false);

  useEffect(() => {
    setIsIframe(
      window !== undefined && window.location.href.includes("widget"),
    );
  }, []);

  return (
    <Link href="/" prefetch={false} target={isIframe ? "_blank" : "_self"}>
      <StyledLogoWrapper>
        {!hideLogo && (
          <StyledLogoIcon fontSize={fontSize}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "block", flexShrink: 0 }}
            >
              <rect width="64" height="64" rx="8" fill="#2563EB" />
              <path
                d="M20 20L32 16L44 20V44L32 48L20 44V20Z"
                stroke="white"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M26 28L32 26L38 28V36L32 38L26 36V28Z"
                stroke="white"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="32" cy="32" r="2" fill="white" />
              <path
                d="M32 20V16M32 48V52M20 32H16M44 32H48"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </StyledLogoIcon>
        )}
        {!hideText && (
          <StyledTitle fontSize={fontSize} {...props}>
            JSON REPAIR
          </StyledTitle>
        )}
      </StyledLogoWrapper>
    </Link>
  );
};
