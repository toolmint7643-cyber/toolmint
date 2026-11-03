export type Guide = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingTime: string;
  primaryTool: {
    label: string;
    href: string;
  };
  relatedTools: {
    label: string;
    href: string;
  }[];
  sections: {
    title: string;
    body: string;
  }[];
  checklist: string[];
};

export const guides: Guide[] = [
  {
    slug: "compress-pdf-online",
    title: "How to Compress PDF Online Without Losing Useful Quality",
    description:
      "Learn how PDF compression works, when to use preserve-quality mode, when image compression helps and how to check the final file.",
    category: "PDF",
    readingTime: "5 min read",
    primaryTool: {
      label: "Open PDF Compressor",
      href: "/pdf-compressor",
    },
    relatedTools: [
      { label: "PDF Validator", href: "/pdf-validator" },
      { label: "PDF Metadata Remover", href: "/pdf-metadata-remover" },
      { label: "PDF Page Size Converter", href: "/pdf-page-size-converter" },
    ],
    sections: [
      {
        title: "Choose the right compression mode",
        body: "A text-heavy or vector PDF is already efficient, so preserve-quality mode is usually the safer first choice. Image compression is better for scanned files, image-heavy documents and large PDFs where searchability is less important.",
      },
      {
        title: "Check the output size honestly",
        body: "A compressed file is not guaranteed to be smaller. Some small PDFs can become larger after rasterization because every page is rebuilt as an image. Always compare original bytes, output bytes and visual quality before sharing.",
      },
      {
        title: "Verify the final PDF",
        body: "Open the downloaded PDF and check page count, text quality, images, links and readability. For important files, run a PDF validator after compression.",
      },
      {
        title: "Keep an untouched source copy",
        body: "Save the original before comparing compression modes, especially for signed, archival or client documents. A rebuilt or image-based PDF can change text selection, links, forms, accessibility structure or other interactive features. Choose the least destructive mode that meets the file-size requirement, then inspect representative pages at normal and enlarged zoom. If the result is larger or less readable, use the original rather than assuming the word compressed guarantees a better file.",
      },
    ],
    checklist: [
      "Use preserve-quality mode first for text-heavy PDFs",
      "Use image compression for scanned or image-heavy PDFs",
      "Check whether the output is actually smaller",
      "Open the final PDF before sending it",
    ],
  },
  {
    slug: "convert-pdf-to-jpg",
    title: "How to Convert PDF to JPG Online",
    description:
      "Convert PDF pages into JPG images, choose the right quality settings and download selected pages or a ZIP file.",
    category: "PDF",
    readingTime: "4 min read",
    primaryTool: {
      label: "Open PDF to JPG Converter",
      href: "/pdf-to-jpg",
    },
    relatedTools: [
      { label: "PDF to PNG Converter", href: "/pdf-to-png" },
      { label: "PDF to Image Converter", href: "/pdf-to-image-converter" },
      { label: "Image Compressor", href: "/image-compressor" },
    ],
    sections: [
      {
        title: "Use JPG for smaller image files",
        body: "JPG is usually best for photos, scans and visual pages where a smaller file size matters. It uses lossy compression, so very small quality values can make text and fine details look blurry.",
      },
      {
        title: "Select only the pages you need",
        body: "If you only need a few PDF pages as images, export a page range instead of the full document. This saves time, storage and download size.",
      },
      {
        title: "Choose quality based on use",
        body: "Use higher quality for printing or professional sharing. Use balanced or smaller settings for web uploads, thumbnails and quick previews.",
      },
      {
        title: "Check dimensions and page orientation",
        body: "PDF pages can have different dimensions or landscape orientation. Review each exported image instead of assuming every page has the same shape. A higher rendering resolution creates more pixels and can improve small text, but it also takes more memory and produces larger files. For a screen preview, a moderate setting is usually adequate; for print, test a page with the smallest text before exporting the entire document.",
      },
    ],
    checklist: [
      "Pick the page range before converting",
      "Use higher quality for print",
      "Use lower quality for quick web previews",
      "Download all images as ZIP when exporting many pages",
    ],
  },
  {
    slug: "image-compressor-guide",
    title: "How to Compress Images for Web and Sharing",
    description:
      "Reduce image file size for websites, forms, email and social sharing while keeping the image clear enough for real use.",
    category: "Image",
    readingTime: "4 min read",
    primaryTool: {
      label: "Open Image Compressor",
      href: "/image-compressor",
    },
    relatedTools: [
      { label: "Image Resizer", href: "/image-resizer" },
      { label: "Image Converter", href: "/image-converter" },
      { label: "WEBP Converter", href: "/webp-converter" },
    ],
    sections: [
      {
        title: "Resize before compressing",
        body: "Huge image dimensions are often the main reason a file is heavy. Resize images to the actual display size first, then compress for a better balance of quality and file size.",
      },
      {
        title: "Pick the right output format",
        body: "JPG is good for photos, PNG is better for transparency and sharp graphics, and WebP often gives smaller files for modern websites.",
      },
      {
        title: "Preview before downloading",
        body: "Compression settings can affect text, edges and small details. Always preview the output image and compare it with the original.",
      },
      {
        title: "Balance file size with visible detail",
        body: "Use the image for its real destination: a large print needs more pixels than a small website thumbnail. Compression quality and image dimensions work together, so reduce oversized dimensions before lowering quality aggressively. Compare fine text, faces, gradients and sharp edges at the intended display size. If an image contains transparency, verify that the chosen output format preserves it; some formats replace transparent areas with a solid background. Keep the original when the compressed copy is not clear enough.",
      },
    ],
    checklist: [
      "Resize large images before compression",
      "Use JPG for photos",
      "Use PNG for transparency",
      "Use WebP for modern web pages",
    ],
  },
  {
    slug: "json-formatter-guide",
    title: "How to Format and Validate JSON Online",
    description:
      "Use JSON formatting, validation and minification tools to clean API responses, config files and structured data safely.",
    category: "Developer",
    readingTime: "4 min read",
    primaryTool: {
      label: "Open JSON Formatter",
      href: "/json-formatter",
    },
    relatedTools: [
      { label: "JSON Validator", href: "/json-validator" },
      { label: "JSON Minifier", href: "/json-minifier" },
      { label: "URL Encoder / Decoder", href: "/url-encoder-decoder" },
    ],
    sections: [
      {
        title: "Format JSON for readability",
        body: "Formatted JSON is easier to scan, review and debug. It helps reveal nested objects, arrays and incorrect structure when working with APIs or config data.",
      },
      {
        title: "Validate before using",
        body: "JSON must use double quotes around keys and strings, cannot contain trailing commas and must follow strict syntax rules. Validate before copying data into code or tools.",
      },
      {
        title: "Minify only when needed",
        body: "Minified JSON is useful for smaller payloads, but harder to read. Keep a readable version for editing and a minified version for deployment if needed.",
      },
    ],
    checklist: [
      "Format JSON before reviewing it",
      "Validate syntax before using it",
      "Minify only after editing is complete",
      "Never paste secrets into untrusted tools",
    ],
  },
  {
    slug: "seo-meta-tags-guide",
    title: "How to Write Better SEO Meta Tags",
    description:
      "Learn how title tags, meta descriptions, Open Graph tags and SERP previews work together for better search and sharing snippets.",
    category: "SEO",
    readingTime: "5 min read",
    primaryTool: {
      label: "Open SEO Meta Tag Generator",
      href: "/seo-meta-tag-generator",
    },
    relatedTools: [
      { label: "Google SERP Preview", href: "/google-serp-preview-generator" },
      { label: "Meta Description Generator", href: "/meta-description-generator" },
      { label: "Open Graph Preview", href: "/open-graph-preview-generator" },
    ],
    sections: [
      {
        title: "Start with a clear title tag",
        body: "A strong title tag should describe the page clearly, include the main topic and avoid keyword stuffing. It should make sense to both users and search engines.",
      },
      {
        title: "Use meta descriptions as preview copy",
        body: "Meta descriptions do not guarantee rankings, but they can improve how a page looks in search results. Write them like concise page summaries with a useful reason to click.",
      },
      {
        title: "Do not forget social previews",
        body: "Open Graph and Twitter tags help pages look better when shared. Include title, description, URL and an image that matches the page topic.",
      },
    ],
    checklist: [
      "Keep the title clear and specific",
      "Write a useful meta description",
      "Preview desktop and mobile snippets",
      "Add Open Graph tags for sharing",
    ],
  },
];

export function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
