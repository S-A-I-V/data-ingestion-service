import { motion } from "framer-motion";
import HeroSection from "../components/HeroSection";
import ProblemsSection from "../components/ProblemsSection";

export default function Home() {
  return (
    <div className="home-page">
      <div className="home-grain" />
      <HeroSection />
      <motion.div
        className="home-scroll-hint"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        ↓
      </motion.div>
      <ProblemsSection />
    </div>
  );
}
