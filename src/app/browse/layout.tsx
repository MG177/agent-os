export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-route-layout md:overflow-hidden">{children}</div>
  );
}
