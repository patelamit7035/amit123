import { Layout } from "@/components/layout/Layout";

const Refund = () => (
  <Layout>
    <section className="py-20 bg-gradient-hero"><div className="container-wide text-center text-primary-foreground"><h1 className="text-4xl md:text-5xl font-bold">Refund Policy</h1></div></section>
    <section className="py-20 bg-background">
      <div className="container-tight prose prose-lg max-w-none">
        <p className="text-muted-foreground">Last updated: January 2026</p>
        <h2 className="text-xl font-bold mt-8 mb-4">100% Satisfaction Guarantee</h2>
        <p className="text-muted-foreground">We stand behind our programs. If you're not completely satisfied within the first 14 days of purchase, we'll refund your investment—no questions asked.</p>
        <h2 className="text-xl font-bold mt-8 mb-4">Digital Products</h2>
        <p className="text-muted-foreground">All digital products are delivered instantly upon purchase. Refund requests must be made within 14 days.</p>
        <h2 className="text-xl font-bold mt-8 mb-4">Consulting Services</h2>
        <p className="text-muted-foreground">Consulting sessions can be rescheduled up to 24 hours in advance. Refunds are available for unused sessions.</p>
        <h2 className="text-xl font-bold mt-8 mb-4">How to Request a Refund</h2>
        <p className="text-muted-foreground">Email us at hello@onemanbusiness.com with your order details. Refunds are processed within 5-7 business days.</p>
      </div>
    </section>
  </Layout>
);

export default Refund;
