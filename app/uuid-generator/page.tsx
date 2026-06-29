"use client";

import { useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

export default function UUIDGeneratorPage() {
  const [uuid, setUuid] = useState("");

  const generateUUID = () => {
    setUuid(crypto.randomUUID());
  };

  const copyUUID = async () => {
    if (!uuid) return;

    await navigator.clipboard.writeText(uuid);
    alert("✅ UUID Copied");
  };

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">

        <PageTitle
          title="UUID Generator"
          description="Generate random UUID v4 instantly."
        />

        <ToolCard>

          <div className="space-y-6">

            <input
              type="text"
              value={uuid}
              readOnly
              placeholder="Your UUID will appear here..."
              className="w-full rounded-xl bg-slate-800 border border-slate-700 p-4 text-lg outline-none"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              <Button onClick={generateUUID}>
                Generate UUID
              </Button>

              <Button
                onClick={copyUUID}
                variant="success"
              >
                Copy UUID
              </Button>

            </div>

          </div>

        </ToolCard>

      </main>

      <Footer />
    </>
  );
}