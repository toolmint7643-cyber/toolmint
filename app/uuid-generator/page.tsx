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
          description="Generate a random UUID version 4 with the browser Web Crypto API, then copy it for use in your application."
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

        <section className="mt-10 grid gap-6 border-t border-slate-800 pt-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black text-white">What is a UUID v4?</h2>
            <p className="mt-3 leading-7 text-slate-300">
              A UUID is a 128-bit identifier commonly written as 32 hexadecimal
              characters separated by hyphens. This page uses the browser Web
              Crypto API&apos;s <code>crypto.randomUUID()</code> method to create a
              version 4 UUID. It is useful for database records, test fixtures
              and application objects when an identifier does not need to carry
              business meaning or sort by creation time.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">UUIDs are identifiers, not secrets</h2>
            <p className="mt-3 leading-7 text-slate-300">
              UUID collisions are designed to be extremely unlikely, but a UUID
              is not a password, access token or authorization check. Do not use
              a generated identifier alone to protect private data. Copy the
              value into the application that needs it and apply that system&apos;s
              own validation and access controls. Generation happens locally in
              the current browser page.
            </p>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
