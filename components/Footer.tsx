export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 mt-20">
      <div className="max-w-6xl mx-auto px-4 py-6 text-center text-slate-400">
        © {new Date().getFullYear()} ToolMint • Built with ❤️ using Next.js
      </div>
    </footer>
  );
}