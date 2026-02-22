export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">{children}</div>
    </main>
  );
}
