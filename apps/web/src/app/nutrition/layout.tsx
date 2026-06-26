export default function NutritionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-route-layout md:overflow-hidden">{children}</div>
  );
}
