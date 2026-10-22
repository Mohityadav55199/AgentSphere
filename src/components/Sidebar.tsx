import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  children?: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle, children }) => {
  // Close sidebar on escape key press on mobile
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && window.innerWidth < 768) toggle();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, toggle]);

  return (
    <>
      {/* Sidebar Panel */}
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : -260,
          width: isOpen ? 260 : 0,
        }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className={`fixed top-0 left-0 z-30 h-screen overflow-hidden border-r border-gray-200/80 bg-white md:sticky dark:border-gray-800/80 dark:bg-gray-900 ${
          isOpen ? "flex flex-col" : "hidden md:flex md:flex-col"
        }`}
      >
        <div className="flex h-full w-[260px] flex-col overflow-hidden">{children}</div>
      </motion.aside>

      {/* Overlay Background - Only show on mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-xs md:hidden"
            onClick={toggle}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
