import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Linkedin, ArrowRight } from "lucide-react";

export function FounderSection() {
  return (
    <section className="py-20 bg-secondary">
      <div className="container-wide">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image Placeholder */}
          <div className="relative order-2 lg:order-1">
            <div className="aspect-[4/5] rounded-2xl bg-gradient-hero overflow-hidden">
              <div className="w-full h-full flex items-center justify-center text-primary-foreground">
                <div className="text-center p-8">
                  <div className="w-32 h-32 rounded-full bg-accent/20 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-4xl font-bold text-accent">AP</span>
                  </div>
                  <p className="text-sm text-primary-foreground/60">
                    [Founder Photo Placeholder]
                  </p>
                </div>
              </div>
            </div>
            {/* Accent Card */}
            <div className="absolute -bottom-6 -right-6 lg:-right-12 bg-card p-6 rounded-xl shadow-xl max-w-xs">
              <div className="flex items-center gap-2 text-accent mb-2">
                <span className="text-2xl font-bold">10+</span>
                <span className="text-sm text-muted-foreground">Years Experience</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Building and scaling successful one-person businesses
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-6">
              <span className="text-sm font-medium">Meet the Founder</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Hi, I'm <span className="text-accent">Amit Patel</span>
            </h2>

            <p className="text-lg text-muted-foreground mb-6">
              Founder of Oneman Business™ and a passionate advocate for the solopreneur lifestyle.
            </p>

            <div className="space-y-4 text-muted-foreground mb-8">
              <p>
                After spending years in the corporate world, I discovered my true calling: helping others build profitable businesses that give them freedom—not just another job.
              </p>
              <p>
                I've helped 500+ solopreneurs across 15 countries automate their workflows, scale their income, and reclaim their time using the power of AI and proven systems.
              </p>
              <p>
                My mission is simple: <strong className="text-foreground">to prove that one person, with the right tools and strategies, can build something extraordinary.</strong>
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link to="/about">
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  Read My Full Story
                  <ArrowRight className="ml-2" size={16} />
                </Button>
              </Link>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <Linkedin className="mr-2" size={16} />
                  Connect on LinkedIn
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
