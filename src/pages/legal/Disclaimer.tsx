import { Layout } from "@/components/layout/Layout";

const Disclaimer = () => (
  <Layout>
    <section className="py-20 bg-gradient-hero"><div className="container-wide text-center text-primary-foreground"><h1 className="text-4xl md:text-5xl font-bold">Disclaimer</h1></div></section>
    <section className="py-20 bg-background">
      <div className="container-tight prose prose-lg max-w-none">
        <p className="text-muted-foreground">Last updated: January 2026</p>
        <h2 className="text-xl font-bold mt-8 mb-4">Earnings Disclaimer</h2>
        <p className="text-muted-foreground">Results vary based on individual effort, business niche, and market conditions. We do not guarantee specific income or results. Testimonials represent individual experiences and are not typical results.</p>
        <h2 className="text-xl font-bold mt-8 mb-4">Professional Advice Disclaimer</h2>
        <p className="text-muted-foreground">Our programs provide general business education and should not be considered legal, financial, or professional advice. Consult appropriate professionals for specific guidance.</p>
        <h2 className="text-xl font-bold mt-8 mb-4">Third-Party Tools</h2>
        <p className="text-muted-foreground">We recommend various third-party tools and services. We are not responsible for their performance, pricing changes, or availability.</p>
        <h2 className="text-xl font-bold mt-8 mb-4">Trademark Notice</h2>
        <p className="text-muted-foreground">Oneman Business™ is a registered trademark. All rights reserved.</p>
      </div>
    </section>
  </Layout>
);

export default Disclaimer;
