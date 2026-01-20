import { CheckCircle, Target, Lightbulb, HeartHandshake } from "lucide-react";

const benefits = [
  {
    icon: Target,
    title: "Proven Systems",
    description: "Battle-tested frameworks that have helped 500+ solopreneurs achieve their goals.",
  },
  {
    icon: Lightbulb,
    title: "Practical AI Focus",
    description: "No fluff—just actionable AI strategies you can implement immediately.",
  },
  {
    icon: HeartHandshake,
    title: "Personal Touch",
    description: "Work directly with Amit, not a team of anonymous coaches.",
  },
  {
    icon: CheckCircle,
    title: "Results Guaranteed",
    description: "100% satisfaction guarantee on all programs. Your success is our priority.",
  },
];

export function WhyChooseSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container-wide">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Why Solopreneurs Choose{" "}
              <span className="text-accent">Oneman Business</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              We're not just another coaching program. We're your partner in building a business that gives you freedom, income, and impact—without the burnout.
            </p>

            <div className="space-y-6">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <benefit.icon className="text-accent" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="aspect-square rounded-2xl bg-gradient-hero p-8 flex items-center justify-center">
              <div className="text-center text-primary-foreground">
                <div className="text-6xl font-bold mb-2">97%</div>
                <div className="text-xl font-medium mb-2">Success Rate</div>
                <p className="text-primary-foreground/80 text-sm">
                  of our clients achieve their primary business goal within 6 months
                </p>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-accent/30 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
