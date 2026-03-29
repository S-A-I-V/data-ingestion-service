import HeroSection from "../components/HeroSection";
import ProblemsSection from "../components/ProblemsSection";
import CtaBanner from "../components/CtaBanner";

export default function Home() {
  return (
    <div className="home-page">
      <div className="home-grain" />
      <HeroSection />
      <div className="home-scroll-hint">↓</div>
      <ProblemsSection />
      <CtaBanner />
    </div>
  );
}
