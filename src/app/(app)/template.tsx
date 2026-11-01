/** Re-mounts on every navigation inside the app, so each page eases in. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
