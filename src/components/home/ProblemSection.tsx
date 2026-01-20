import { AlertCircle, Clock, TrendingDown, Users } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Working 60+ Hours a Week",
    description: "You're doing everything yourself and there's never enough time to grow.",
  },
  {
    icon: TrendingDown,
    title: "Inconsistent Revenue",
    description: "Feast or famine cycles make it impossible to plan for the future.",
  },
  {
    icon: Users,
    title: "No Systems in Place",
    description: "Every task feels like you're starting from scratch without proper processes.",
  },
  {
    icon: AlertCircle,
    title: "Tech Overwhelm",
    description: "New tools and AI seem promising but you don't know where to start.",
  },
];

export function ProblemSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container-wide">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Sound Familiar?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            If you're a solopreneur struggling with these challenges, you're not alone. These are the exact problems we help solve.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, index) => (
            <div
              key={problem.title}
              className="group p-6 rounded-xl bg-card border border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                <problem.icon className="text-destructive group-hover:text-accent transition-colors" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {problem.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
