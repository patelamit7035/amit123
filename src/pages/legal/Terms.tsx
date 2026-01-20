import { Layout } from "@/components/layout/Layout";

const Terms = () => (
  <Layout>
    <section className="py-20 bg-gradient-hero"><div className="container-wide text-center text-primary-foreground"><h1 className="text-4xl md:text-5xl font-bold">Terms of Service</h1></div></section>
    <section className="py-20 bg-background">
      <div className="container-tight prose prose-lg max-w-none">
        <p className="text-muted-foreground">Last updated: January 2026</p>
        <h2 className="text-xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground">By accessing our website and services, you agree to be bound by these Terms of Service.</p>
        <h2 className="text-xl font-bold mt-8 mb-4">2. Services</h2>
        <p className="text-muted-foreground">Oneman Business™ provides digital education programs, consulting services, and automation solutions for solopreneurs and small business owners.</p>
        <h2 className="text-xl font-bold mt-8 mb-4">3. Payment Terms</h2>
        <p className="text-muted-foreground">All payments are processed securely. Prices are listed in INR unless otherwise specified.</p>
        <h2 className="text-xl font-bold mt-8 mb-4">4. Intellectual Property</h2>
        <p className="text-muted-foreground">All content, materials, and resources provided are the intellectual property of Oneman Business™.</p>
      </div>
    </section>
  </Layout>
);

export default Terms;
