import Image from "next/image";
import NavBar from "../components/layout/navbar"; // Adjust path if needed

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <main className="p-8">
        <h1 className="text-4xl font-bold mb-4">SLComply.ai</h1>
        <p className="text-lg">
          A Sellafield Ltd and PA Consulting solution to accelerate from weeks to
          minutes the analysis of legislative and regulatory documents.
        </p>
        <p className="mt-4">
          This pilot currently focuses on documents within Remediation only. For
          more information please contact Edwin Matthews.
        </p>
      </main>
    </div>
  );
}
