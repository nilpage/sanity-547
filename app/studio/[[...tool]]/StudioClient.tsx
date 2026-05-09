"use client";

import dynamic from "next/dynamic";

import config from "../../../sanity.config";

const NextStudio = dynamic(
  () => import("next-sanity/studio").then((m) => m.NextStudio),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "system-ui, sans-serif",
          color: "#666",
        }}
      >
        Studio wird geladen…
      </div>
    ),
  },
);

export default function StudioClient() {
  return <NextStudio config={config} />;
}
