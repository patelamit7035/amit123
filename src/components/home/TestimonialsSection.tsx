import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Digital Marketing Consultant",
    quote: "The 3 Day AI Bootcamp completely transformed how I work. I've saved 15+ hours every week on repetitive tasks. Amit's teaching style is incredibly practical.",
    rating: 5,
  },
  {
    name: "Rajesh Kumar",
    role: "Freelance Developer",
    quote: "The automation systems Amit built for my business are still running flawlessly after 8 months. Best investment I've made in my solo career.",
    rating: 5,
  },
  {
    name: "Ananya Desai",
    role: "Content Creator",
    quote: "I went from overwhelmed to organized in just one month of consulting. Amit helped me see my business from a completely new perspective.",
    rating: 5,
  },
  {
    name: "Vikram Singh",
    role: "SaaS Founder",
    quote: "The SaaS program gave me the exact roadmap I needed. Launched my product in 87 days and got my first paying customers within the first week!",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container-wide">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Our <span className="text-accent">Clients Say</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real stories from solopreneurs who've transformed their businesses with our programs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="p-6 lg:p-8 rounded-2xl bg-card border border-border hover:border-accent/30 transition-colors"
            >
              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-foreground mb-6 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-accent font-semibold">
                    {testimonial.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badge */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-secondary">
            <div className="flex -space-x-2">
              {["PS", "RK", "AD", "VS"].map((initials) => (
                <div
                  key={initials}
                  className="w-8 h-8 rounded-full bg-accent/20 border-2 border-background flex items-center justify-center"
                >
                  <span className="text-accent text-xs font-semibold">{initials}</span>
                </div>
              ))}
            </div>
            <span className="text-muted-foreground text-sm ml-2">
              Join <strong className="text-foreground">500+ satisfied clients</strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
