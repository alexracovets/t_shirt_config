import { ChildrenType } from "@types";
import "@styles/globals.css";

export default function RootLayout({ children }: ChildrenType) {
  return (
    <html lang="en" className={`h-full antialiased`}>
      <body className="h-full flex flex-col">{children}</body>
    </html>
  );
}
