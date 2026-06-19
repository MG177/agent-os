export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-route-layout overflow-hidden">{children}</div>
  );
}
