import { Layout } from "@/components/layout/Layout";
import { CheckCircle } from "lucide-react";

const reasons = ["Proven Systems tested with 500+ clients", "Direct access to Amit, not anonymous coaches", "Practical AI focus with immediate results", "100% satisfaction guarantee on all programs"];

const WhyUs = () => (
  <Layout>
    <section className="py-20 bg-gradient-hero">
      <div className="container-wide text-center text-primary-foreground">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Why Oneman Business</h1>
        <p className="text-xl text-primary-foreground/80">What makes us different</p>
      </div>
    </section>
    <section className="py-20 bg-background">
      <div className="container-tight">
        <div className="space-y-6">
          {reasons.map((reason) => (
            <div key={reason} className="flex items-center gap-4 p-6 bg-card rounded-xl border border-border">
              <CheckCircle className="text-accent shrink-0" size={24} />
              <span className="text-lg text-foreground">{reason}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default WhyUs;
