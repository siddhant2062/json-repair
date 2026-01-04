import type { NextSeoProps } from "next-seo";

export const SEO: NextSeoProps = {
  title:
    "JSON Repair | Online JSON Viewer - Transform your data into interactive graphs",
  description:
    "JSON Repair is a tool for visualizing into graphs, analyzing, editing, formatting, querying, transforming and validating JSON, CSV, YAML, XML, and more.",
  themeColor: "#36393E",
  openGraph: {
    type: "website",
    images: [
      {
        url: "/assets/json-repair.png", // Update with your own image
        width: 1200,
        height: 627,
      },
    ],
  },
  twitter: {
    cardType: "summary_large_image",
  },
  additionalLinkTags: [
    {
      rel: "manifest",
      href: "/manifest.json",
    },
  ],
};
