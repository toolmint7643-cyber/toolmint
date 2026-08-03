"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type SchemaType =
  | "website"
  | "organization"
  | "article"
  | "faq"
  | "breadcrumb"
  | "product";

const schemaTypes: { value: SchemaType; label: string }[] = [
  { value: "website", label: "Website" },
  { value: "organization", label: "Organization" },
  { value: "article", label: "Article" },
  { value: "faq", label: "FAQ" },
  { value: "breadcrumb", label: "Breadcrumb" },
  { value: "product", label: "Product" },
];

function clean(value: string) {
  return value.trim();
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildSchema(
  schemaType: SchemaType,
  siteName: string,
  siteUrl: string,
  title: string,
  description: string,
  imageUrl: string,
  authorName: string,
  datePublished: string,
  organizationName: string,
  logoUrl: string,
  faqInput: string,
  breadcrumbInput: string,
  productName: string,
  price: string,
  currency: string,
  availability: string
) {
  const safeSiteName = clean(siteName) || "ToolMint";
  const safeSiteUrl = clean(siteUrl) || "https://toolmint.com";
  const safeTitle = clean(title) || "Free Online Tools";
  const safeDescription =
    clean(description) ||
    "Free online developer, SEO, image, PDF and productivity tools.";
  const safeImageUrl = clean(imageUrl) || `${safeSiteUrl}/og-image.png`;

  if (schemaType === "website") {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: safeSiteName,
      url: safeSiteUrl,
      description: safeDescription,
      potentialAction: {
        "@type": "SearchAction",
        target: `${safeSiteUrl}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    };
  }

  if (schemaType === "organization") {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: clean(organizationName) || safeSiteName,
      url: safeSiteUrl,
      logo: clean(logoUrl) || safeImageUrl,
      description: safeDescription,
    };
  }

  if (schemaType === "article") {
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: safeTitle,
      description: safeDescription,
      image: safeImageUrl,
      author: {
        "@type": "Person",
        name: clean(authorName) || "ToolMint Team",
      },
      publisher: {
        "@type": "Organization",
        name: clean(organizationName) || safeSiteName,
        logo: {
          "@type": "ImageObject",
          url: clean(logoUrl) || safeImageUrl,
        },
      },
      datePublished: clean(datePublished) || new Date().toISOString().slice(0, 10),
      mainEntityOfPage: safeSiteUrl,
    };
  }

  if (schemaType === "faq") {
    const lines = splitLines(faqInput);
    const questions = [];

    for (let index = 0; index < lines.length; index += 2) {
      questions.push({
        "@type": "Question",
        name: lines[index] || `Question ${index + 1}`,
        acceptedAnswer: {
          "@type": "Answer",
          text: lines[index + 1] || "Answer goes here.",
        },
      });
    }

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: questions,
    };
  }

  if (schemaType === "breadcrumb") {
    const items = splitLines(breadcrumbInput);

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => {
        const [name, url] = item.split("|").map((part) => part.trim());

        return {
          "@type": "ListItem",
          position: index + 1,
          name: name || `Page ${index + 1}`,
          item: url || safeSiteUrl,
        };
      }),
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: clean(productName) || safeTitle,
    image: safeImageUrl,
    description: safeDescription,
    brand: {
      "@type": "Brand",
      name: clean(organizationName) || safeSiteName,
    },
    offers: {
      "@type": "Offer",
      url: safeSiteUrl,
      priceCurrency: clean(currency) || "USD",
      price: clean(price) || "0",
      availability: `https://schema.org/${availability}`,
    },
  };
}

export default function SchemaMarkupGeneratorPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [schemaType, setSchemaType] = useState<SchemaType>("website");
  const [siteName, setSiteName] = useState("ToolMint");
  const [siteUrl, setSiteUrl] = useState("https://toolmint.com");
  const [title, setTitle] = useState("ToolMint - Free Online Tools");
  const [description, setDescription] = useState(
    "Free online developer, SEO, text, image, PDF and calculator tools."
  );
  const [imageUrl, setImageUrl] = useState("https://toolmint.com/og-image.png");
  const [authorName, setAuthorName] = useState("ToolMint Team");
  const [datePublished, setDatePublished] = useState(today);
  const [organizationName, setOrganizationName] = useState("ToolMint");
  const [logoUrl, setLogoUrl] = useState("https://toolmint.com/logo.png");
  const [faqInput, setFaqInput] = useState(
    "What is ToolMint?\nToolMint is a free online tools website.\nIs ToolMint free?\nYes, ToolMint tools are free to use."
  );
  const [breadcrumbInput, setBreadcrumbInput] = useState(
    "Home | https://toolmint.com\nSEO Tools | https://toolmint.com/#seo\nSchema Markup Generator | https://toolmint.com/schema-markup-generator"
  );
  const [productName, setProductName] = useState("ToolMint Premium Tool");
  const [price, setPrice] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [availability, setAvailability] = useState("InStock");

  const schemaObject = useMemo(
    () =>
      buildSchema(
        schemaType,
        siteName,
        siteUrl,
        title,
        description,
        imageUrl,
        authorName,
        datePublished,
        organizationName,
        logoUrl,
        faqInput,
        breadcrumbInput,
        productName,
        price,
        currency,
        availability
      ),
    [
      schemaType,
      siteName,
      siteUrl,
      title,
      description,
      imageUrl,
      authorName,
      datePublished,
      organizationName,
      logoUrl,
      faqInput,
      breadcrumbInput,
      productName,
      price,
      currency,
      availability,
    ]
  );

  const schemaJson = useMemo(
    () => JSON.stringify(schemaObject, null, 2),
    [schemaObject]
  );

  const scriptTag = `<script type="application/ld+json">
${schemaJson}
</script>`;

  const copySchema = async () => {
    await navigator.clipboard.writeText(scriptTag);
    alert("Schema markup copied!");
  };

  const copyJsonOnly = async () => {
    await navigator.clipboard.writeText(schemaJson);
    alert("JSON-LD copied!");
  };

  const loadSample = () => {
    setSchemaType("website");
    setSiteName("ToolMint");
    setSiteUrl("https://toolmint.com");
    setTitle("ToolMint - Free Online Tools");
    setDescription("Free online developer, SEO, text, image, PDF and calculator tools.");
    setImageUrl("https://toolmint.com/og-image.png");
    setAuthorName("ToolMint Team");
    setDatePublished(today);
    setOrganizationName("ToolMint");
    setLogoUrl("https://toolmint.com/logo.png");
    setFaqInput(
      "What is ToolMint?\nToolMint is a free online tools website.\nIs ToolMint free?\nYes, ToolMint tools are free to use."
    );
    setBreadcrumbInput(
      "Home | https://toolmint.com\nSEO Tools | https://toolmint.com/#seo\nSchema Markup Generator | https://toolmint.com/schema-markup-generator"
    );
    setProductName("ToolMint Premium Tool");
    setPrice("0");
    setCurrency("USD");
    setAvailability("InStock");
  };

  const resetTool = () => {
    setSchemaType("website");
    setSiteName("");
    setSiteUrl("");
    setTitle("");
    setDescription("");
    setImageUrl("");
    setAuthorName("");
    setDatePublished(today);
    setOrganizationName("");
    setLogoUrl("");
    setFaqInput("");
    setBreadcrumbInput("");
    setProductName("");
    setPrice("");
    setCurrency("USD");
    setAvailability("InStock");
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🧩 Schema Markup Generator"
          description="Generate SEO-friendly JSON-LD structured data for Website, Organization, Article, FAQ, Breadcrumb and Product schema."
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  ⚙️ Schema Details
                </h2>
                <p className="text-slate-300">
                  Choose a schema type and fill the important fields to generate
                  JSON-LD markup.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Schema Type
                </span>
                <select
                  value={schemaType}
                  onChange={(event) => setSchemaType(event.target.value as SchemaType)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                >
                  {schemaTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Site Name
                  </span>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(event) => setSiteName(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Site/Page URL
                  </span>
                  <input
                    type="url"
                    value={siteUrl}
                    onChange={(event) => setSiteUrl(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Title / Headline
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Description
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-[110px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Image URL
                  </span>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Organization Name
                  </span>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  />
                </label>
              </div>

              {(schemaType === "organization" || schemaType === "article") && (
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Logo URL
                  </span>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(event) => setLogoUrl(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  />
                </label>
              )}

              {schemaType === "article" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block font-semibold text-slate-200">
                      Author Name
                    </span>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(event) => setAuthorName(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block font-semibold text-slate-200">
                      Date Published
                    </span>
                    <input
                      type="date"
                      value={datePublished}
                      onChange={(event) => setDatePublished(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                    />
                  </label>
                </div>
              )}

              {schemaType === "faq" && (
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    FAQ Questions and Answers
                  </span>
                  <textarea
                    value={faqInput}
                    onChange={(event) => setFaqInput(event.target.value)}
                    className="min-h-[190px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none transition focus:border-blue-500"
                    placeholder={"Question one\nAnswer one\nQuestion two\nAnswer two"}
                  />
                </label>
              )}

              {schemaType === "breadcrumb" && (
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Breadcrumb Items
                  </span>
                  <textarea
                    value={breadcrumbInput}
                    onChange={(event) => setBreadcrumbInput(event.target.value)}
                    className="min-h-[190px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none transition focus:border-blue-500"
                    placeholder={"Home | https://example.com\nBlog | https://example.com/blog"}
                  />
                </label>
              )}

              {schemaType === "product" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block font-semibold text-slate-200">
                      Product Name
                    </span>
                    <input
                      type="text"
                      value={productName}
                      onChange={(event) => setProductName(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block font-semibold text-slate-200">
                      Price
                    </span>
                    <input
                      type="text"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block font-semibold text-slate-200">
                      Currency
                    </span>
                    <input
                      type="text"
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block font-semibold text-slate-200">
                      Availability
                    </span>
                    <select
                      value={availability}
                      onChange={(event) => setAvailability(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                    >
                      <option value="InStock">InStock</option>
                      <option value="OutOfStock">OutOfStock</option>
                      <option value="PreOrder">PreOrder</option>
                      <option value="LimitedAvailability">LimitedAvailability</option>
                    </select>
                  </label>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <Button onClick={copySchema}>📋 Copy Script</Button>
                <Button onClick={copyJsonOnly}>🧩 Copy JSON</Button>
                <Button onClick={loadSample}>✨ Sample</Button>
                <Button onClick={resetTool} variant="secondary">
                  🔄 Reset
                </Button>
              </div>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  🧾 JSON-LD Output
                </h2>
                <p className="text-slate-300">
                  Copy the script tag and paste it inside your page head or body.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <p className="text-sm text-slate-300">Selected Schema</p>
                <p className="mt-1 text-3xl font-bold text-emerald-300">
                  {schemaTypes.find((item) => item.value === schemaType)?.label}
                </p>
              </div>

              <pre className="min-h-[560px] max-w-full overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                {scriptTag}
              </pre>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              🔍 SEO Usage
            </h2>
            <p className="text-slate-300">
              Structured data helps search engines understand your page content
              and can support rich result eligibility.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Practice
            </h2>
            <p className="text-slate-300">
              Add only schema that matches visible page content. Keep names,
              URLs, images and dates accurate.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              Schema markup does not guarantee rich results. Validate generated
              JSON-LD with Google Rich Results Test before publishing.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}