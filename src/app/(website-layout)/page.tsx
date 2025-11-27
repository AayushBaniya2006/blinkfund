import Features from "@/components/tailark/features-2";
import ContentSection from "@/components/tailark/content-2";
import StatsSection from "@/components/tailark/stats";
import WallOfLoveSection from "@/components/tailark/testimonials";
import FAQs from "@/components/tailark/faqs";
import CallToAction from "@/components/tailark/call-to-action";
import { LogoCloud } from "@/components/tailark/logo-cloud";
import MonthlyAnnualPricing from "@/components/website/monthly-annual-pricing";
import HeroSection from "@/components/tailark/hero-section";

export default function WebsiteHomepage() {
  return (
    <>
      <HeroSection />
      <LogoCloud />
      <Features />
      <ContentSection />
      <StatsSection />
      <MonthlyAnnualPricing />
      <WallOfLoveSection />
      <FAQs />
      <CallToAction />
    </>
  );
}
