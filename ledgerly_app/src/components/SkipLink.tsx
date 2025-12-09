/**
 * Skip Link Component - Improves keyboard navigation accessibility
 * Allows keyboard users to skip directly to main content
 */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[1000] focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold focus:shadow-lg"
      style={{
        backgroundColor: "var(--accent-primary)",
        color: "var(--text-inverse)",
      }}
    >
      Skip to main content
    </a>
  );
}
