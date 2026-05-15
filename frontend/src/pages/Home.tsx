import HeroSection from "../components/HeroSection";
import ProblemsSection from "../components/ProblemsSection";
import CtaBanner from "../components/CtaBanner";
import DbLogoSection from "../components/DbLogoSection";

interface Props {
  isAuthenticated: boolean;
}

export default function Home({ isAuthenticated }: Props) {
  return (
    <div className="home-page">
      <div className="home-grain" />
      <HeroSection isAuthenticated={isAuthenticated} />
      <DbLogoSection />
      <div className="home-scroll-hint">↓</div>
      <ProblemsSection />
      <CtaBanner isAuthenticated={isAuthenticated} />
    </div>
  );
}
