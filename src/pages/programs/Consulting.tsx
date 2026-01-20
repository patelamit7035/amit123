import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { MessageSquare, CheckCircle, ArrowRight } from "lucide-react";

const features = ["Weekly 1-on-1 calls", "Personalized strategy roadmap", "Direct access via messaging", "Accountability check-ins"];

const Consulting = () => (
  <Layout>
    <section className="py-20 bg-gradient-hero">
      <div className="container-wide text-center text-primary-foreground">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent mb-6"><MessageSquare size={16} /></div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Personalized Business Consulting</h1>
        <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">1-on-1 strategic guidance tailored to your unique goals and challenges.</p>
      </div>
    </section>
    <section className="py-20 bg-background">
      <div className="container-tight">
        <h2 className="text-2xl font-bold mb-6">What's Included</h2>
        <ul className="space-y-4 mb-8">{features.map((f) => (<li key={f} className="flex items-center gap-3"><CheckCircle className="text-accent" size={20} /><span>{f}</span></li>))}</ul>
        <Link to="/contact"><Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">Apply for Consulting <ArrowRight className="ml-2" size={18} /></Button></Link>
      </div>
    </section>
  </Layout>
);

export default Consulting;
