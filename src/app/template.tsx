/** Re-mounted on every navigation, so each page plays its entrance (see .page-enter in globals.css). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
