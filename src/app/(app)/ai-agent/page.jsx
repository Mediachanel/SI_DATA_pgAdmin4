"use client";

import PageHeader from "@/components/layout/PageHeader";
import InternalAiChat from "@/components/ai/InternalAiChat";

export default function AiAgentPage() {
  return (
    <>
      <PageHeader
        title="AI SI SDMK"
        description="Chat internal melalui n8n workflow agent dengan tool database, verification guard, dan audit log."
        breadcrumbs={[{ label: "AI SI SDMK" }]}
      />
      <InternalAiChat />
    </>
  );
}
