export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Blog has its own full-bleed layout — override the parent /ayden padding
  return (
    <div className="-mx-6 -my-10 sm:-mx-10">
      {children}
    </div>
  );
}
