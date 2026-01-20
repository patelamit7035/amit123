import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-20 lg:py-32">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/50 rounded-full blur-3xl" />
      </div>

      <div className="container-wide relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="text-sm font-medium">Join 500+ Successful Solopreneurs</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6 animate-fade-in-up">
            Build, Automate & Scale Your{" "}
            <span className="text-accent">One-Person Business</span> with AI
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            Transform your business with proven systems, automation strategies, and personalized guidance from someone who's done it.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <Link to="/contact">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-accent px-8 py-6 text-lg">
                Book Your Free Strategy Call
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <Link to="/programs/ai-bootcamp">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 px-8 py-6 text-lg">
                <Play className="mr-2" size={20} />
                Explore Programs
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 pt-8 border-t border-primary-foreground/20 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 text-primary-foreground/60">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-foreground">500+</div>
                <div className="text-sm">Clients Served</div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-primary-foreground/20" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-foreground">15+</div>
                <div className="text-sm">Countries</div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-primary-foreground/20" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-foreground">2000+</div>
                <div className="text-sm">Hours Consulted</div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-primary-foreground/20" />
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">4.9★</div>
                <div className="text-sm">Client Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
