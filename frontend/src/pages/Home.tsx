import HeroSection from "../components/HeroSection";
import ProblemsSection from "../components/ProblemsSection";
import FeaturesSection from "../components/FeaturesSection";
import CtaBanner from "../components/CtaBanner";
import DbLogoSection from "../components/DbLogoSection";
import InteractiveGrid from "../components/InteractiveGrid";

interface Props {
  isAuthenticated: boolean;
}

export default function Home({ isAuthenticated }: Props) {
  return (
    <div className="home-page">
      <InteractiveGrid />
      <HeroSection isAuthenticated={isAuthenticated} />
      <DbLogoSection />
      <div className="home-scroll-hint">↓</div>
      <ProblemsSection />
      <FeaturesSection />
      <CtaBanner isAuthenticated={isAuthenticated} />
    </div>
  );
}
