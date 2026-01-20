import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Who are these programs designed for?",
    answer: "Our programs are specifically designed for solopreneurs, freelancers, consultants, and small business owners who want to leverage AI and automation to scale their business without hiring a team. Whether you're just starting out or looking to optimize an existing business, we have a program for you.",
  },
  {
    question: "Do I need technical skills to benefit from these programs?",
    answer: "Not at all! Our programs are designed to be accessible to everyone, regardless of technical background. We focus on practical, hands-on learning with step-by-step guidance. If you can use email and basic software, you can master these tools.",
  },
  {
    question: "What's the time commitment required?",
    answer: "It varies by program. The 3 Day AI Bootcamp requires 3-4 hours per day for 3 days. Consulting sessions are typically 1 hour per week. The SaaS program requires about 10-15 hours per week. We respect your time and focus on efficiency.",
  },
  {
    question: "Is there a refund policy?",
    answer: "Yes! We offer a 100% satisfaction guarantee on all our programs. If you're not completely satisfied within the first 14 days, we'll refund your investment—no questions asked. Your success is our priority.",
  },
  {
    question: "How is this different from other coaching programs?",
    answer: "Unlike generic business coaching, we focus specifically on AI-powered automation for solopreneurs. You work directly with Amit, not a team of coaches. Our systems are battle-tested with 500+ clients, and we provide ongoing support long after the program ends.",
  },
  {
    question: "Can I get a free consultation before deciding?",
    answer: "Absolutely! We offer a free 30-minute strategy call where we discuss your business challenges and goals. This helps us recommend the right program for your situation and ensures we're a good fit for each other.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20 bg-secondary">
      <div className="container-wide">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Frequently Asked <span className="text-accent">Questions</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Got questions? We've got answers. If you don't find what you're looking for, feel free to reach out.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-accent/50"
              >
                <AccordionTrigger className="text-left text-foreground hover:text-accent hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
