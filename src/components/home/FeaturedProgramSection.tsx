import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, CheckCircle } from "lucide-react";

const features = [
  "Live 3-day intensive training",
  "10+ AI tools covered hands-on",
  "Templates & workflows included",
  "Lifetime access to recordings",
  "Private community access",
  "Certificate of completion",
];

export function FeaturedProgramSection() {
  return (
    <section className="py-20 bg-gradient-hero relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-20 w-64 h-64 bg-accent rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-20 w-80 h-80 bg-accent/50 rounded-full blur-3xl" />
      </div>

      <div className="container-wide relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent mb-6">
              <Zap size={16} />
              <span className="text-sm font-medium">Featured Program</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              3 Day AI Bootcamp
            </h2>

            <p className="text-xl text-primary-foreground/80 mb-8">
              Master the AI tools that will save you 15+ hours every week. This intensive bootcamp is your shortcut to becoming an AI-powered solopreneur.
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-primary-foreground/90">
                  <CheckCircle className="text-accent shrink-0" size={18} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-4">
              <Link to="/programs/ai-bootcamp">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-accent">
                  Join the Next Bootcamp
                  <ArrowRight className="ml-2" size={18} />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  Have Questions?
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-video rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 p-8 flex items-center justify-center">
              <div className="text-center text-primary-foreground">
                <div className="w-20 h-20 rounded-full bg-accent/20 mx-auto mb-4 flex items-center justify-center">
                  <Zap className="text-accent" size={40} />
                </div>
                <p className="text-sm text-primary-foreground/60">
                  [Program Preview Video Placeholder]
                </p>
              </div>
            </div>

            {/* Floating Card */}
            <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-accent font-bold text-lg">3</span>
                </div>
                <div>
                  <div className="font-semibold text-foreground">Days Only</div>
                  <div className="text-sm text-muted-foreground">Transform Your Workflow</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
