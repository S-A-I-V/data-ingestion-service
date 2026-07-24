import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";

/**
 * AccordionItem — FAQ accordion with expand/collapse animation.
 */
interface Props {
  title: string;
  content: string;
  isOpen: boolean;
  onClick: () => void;
}

export default function AccordionItem({ title, content, isOpen, onClick }: Props) {
  return (
    <div className="border-t border-[#E5E5E0] first:border-t-0">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-[#20201D]"
      >
        <span className="text-[15px] font-medium text-[#404039]">{title}</span>
        <span className="shrink-0 text-[#6B6B66]">
          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-5 pr-8 text-sm leading-relaxed text-[#6B6B66]">{content}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
