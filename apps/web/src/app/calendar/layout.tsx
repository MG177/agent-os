export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-route-layout">
      {children}
    </div>
  );
}
