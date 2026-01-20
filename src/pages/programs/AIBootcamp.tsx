import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Zap, CheckCircle, ArrowRight } from "lucide-react";

const features = ["Live 3-day intensive training", "10+ AI tools covered hands-on", "Templates & workflows included", "Lifetime access to recordings", "Private community access", "Certificate of completion"];

const AIBootcamp = () => (
  <Layout>
    <section className="py-20 bg-gradient-hero">
      <div className="container-wide text-center text-primary-foreground">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent mb-6"><Zap size={16} /><span className="text-sm font-medium">Most Popular</span></div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">3 Day AI Bootcamp</h1>
        <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">Master AI tools in just 3 days. Learn to automate 80% of your repetitive tasks and reclaim your time.</p>
      </div>
    </section>
    <section className="py-20 bg-background">
      <div className="container-tight">
        <h2 className="text-2xl font-bold mb-6">What You'll Get</h2>
        <ul className="space-y-4 mb-8">{features.map((f) => (<li key={f} className="flex items-center gap-3"><CheckCircle className="text-accent" size={20} /><span>{f}</span></li>))}</ul>
        <Link to="/contact"><Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">Join the Next Bootcamp <ArrowRight className="ml-2" size={18} /></Button></Link>
      </div>
    </section>
  </Layout>
);

export default AIBootcamp;
