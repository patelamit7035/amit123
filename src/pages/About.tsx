import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Linkedin } from "lucide-react";

const About = () => {
  return (
    <Layout>
      <section className="py-20 bg-gradient-hero">
        <div className="container-wide text-center text-primary-foreground">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About Amit Patel</h1>
          <p className="text-xl text-primary-foreground/80">Founder, Oneman Business™</p>
        </div>
      </section>
      <section className="py-20 bg-background">
        <div className="container-tight prose prose-lg max-w-none">
          <p className="text-lg text-muted-foreground mb-6">After spending over a decade in the corporate world, I discovered my true calling: helping others build profitable businesses that give them freedom—not just another job.</p>
          <p className="text-lg text-muted-foreground mb-6">I've helped 500+ solopreneurs across 15 countries automate their workflows, scale their income, and reclaim their time using the power of AI and proven systems.</p>
          <p className="text-lg text-muted-foreground mb-8">My mission is simple: to prove that one person, with the right tools and strategies, can build something extraordinary.</p>
          <div className="flex gap-4">
            <Link to="/contact"><Button className="bg-accent hover:bg-accent/90 text-accent-foreground">Book a Call <ArrowRight className="ml-2" size={16} /></Button></Link>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"><Button variant="outline"><Linkedin className="mr-2" size={16} />LinkedIn</Button></a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
