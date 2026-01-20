import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { ProblemSection } from "@/components/home/ProblemSection";
import { ProgramsSection } from "@/components/home/ProgramsSection";
import { WhyChooseSection } from "@/components/home/WhyChooseSection";
import { FounderSection } from "@/components/home/FounderSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { FeaturedProgramSection } from "@/components/home/FeaturedProgramSection";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <ProblemSection />
      <ProgramsSection />
      <WhyChooseSection />
      <FounderSection />
      <TestimonialsSection />
      <FeaturedProgramSection />
      <FAQSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
