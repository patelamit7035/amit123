import { Layout } from "@/components/layout/Layout";

const Privacy = () => (
  <Layout>
    <section className="py-20 bg-gradient-hero"><div className="container-wide text-center text-primary-foreground"><h1 className="text-4xl md:text-5xl font-bold">Privacy Policy</h1></div></section>
    <section className="py-20 bg-background">
      <div className="container-tight prose prose-lg max-w-none">
        <p className="text-muted-foreground">Last updated: January 2026</p>
        <h2 className="text-xl font-bold mt-8 mb-4">1. Information We Collect</h2>
        <p className="text-muted-foreground">We collect information you provide directly, including name, email, phone number, and payment information when you purchase our programs or book consultations.</p>
        <h2 className="text-xl font-bold mt-8 mb-4">2. How We Use Your Information</h2>
        <p className="text-muted-foreground">We use your information to deliver our services, process payments, send program updates, and improve our offerings.</p>
        <h2 className="text-xl font-bold mt-8 mb-4">3. Data Security</h2>
        <p className="text-muted-foreground">We implement industry-standard security measures to protect your personal information.</p>
        <h2 className="text-xl font-bold mt-8 mb-4">4. Contact Us</h2>
        <p className="text-muted-foreground">For privacy-related inquiries, contact us at hello@onemanbusiness.com</p>
      </div>
    </section>
  </Layout>
);

export default Privacy;
