export default function NutritionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:overflow-hidden">{children}</div>
  );
}
