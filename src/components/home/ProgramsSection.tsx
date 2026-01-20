import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Settings, MessageSquare, Rocket } from "lucide-react";

const programs = [
  {
    icon: Zap,
    title: "3 Day AI Bootcamp",
    description: "Master AI tools in just 3 days. Learn to automate 80% of your repetitive tasks and reclaim your time.",
    href: "/programs/ai-bootcamp",
    highlight: "Most Popular",
    features: ["Live hands-on training", "AI tool templates", "Lifetime access"],
  },
  {
    icon: Settings,
    title: "Automate Entire Business",
    description: "Custom automation systems designed specifically for your business that work while you sleep.",
    href: "/programs/automation",
    highlight: null,
    features: ["Custom workflows", "Tool integration", "Ongoing support"],
  },
  {
    icon: MessageSquare,
    title: "Personalized Consulting",
    description: "1-on-1 strategic guidance tailored to your unique goals and challenges.",
    href: "/programs/consulting",
    highlight: null,
    features: ["Weekly calls", "Strategy roadmap", "Direct access"],
  },
  {
    icon: Rocket,
    title: "Start Your SaaS Business",
    description: "From idea to paying customers in 90 days - a complete roadmap for launching your SaaS.",
    href: "/programs/saas",
    highlight: "New",
    features: ["Full curriculum", "Tech stack guidance", "Launch support"],
  },
];

export function ProgramsSection() {
  return (
    <section className="py-20 bg-secondary">
      <div className="container-wide">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Programs That <span className="text-accent">Transform</span> Your Business
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the path that fits your goals. Each program is designed to deliver real, measurable results.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {programs.map((program, index) => (
            <div
              key={program.title}
              className="group relative p-6 lg:p-8 rounded-2xl bg-card border border-border hover:border-accent/50 hover:shadow-xl transition-all duration-300"
            >
              {program.highlight && (
                <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                  {program.highlight}
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <program.icon size={28} className="text-accent group-hover:text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-accent transition-colors">
                    {program.title}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {program.description}
                  </p>
                  <ul className="flex flex-wrap gap-2 mb-6">
                    {program.features.map((feature) => (
                      <li
                        key={feature}
                        className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
                      >
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link to={program.href}>
                    <Button variant="outline" className="group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-accent transition-colors">
                      Learn More
                      <ArrowRight className="ml-2" size={16} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
