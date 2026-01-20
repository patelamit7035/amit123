import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 bg-background">
      <div className="container-wide">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-6">
            <Calendar size={16} />
            <span className="text-sm font-medium">Limited Spots Available</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Ready to Transform Your <span className="text-accent">One-Person Business</span>?
          </h2>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Book a free 30-minute strategy call with Amit. No pressure, no sales pitch—just an honest conversation about your business and how we might be able to help.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/contact">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-accent px-8 py-6 text-lg">
                Book Your Free Strategy Call
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            ✓ Free 30-minute call &nbsp; ✓ No obligation &nbsp; ✓ Personalized advice
          </p>
        </div>
      </div>
    </section>
  );
}
