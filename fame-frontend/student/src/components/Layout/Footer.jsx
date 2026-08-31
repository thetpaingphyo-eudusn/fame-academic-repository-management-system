import React from "react";
import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-white/80 backdrop-blur-sm border-t border-emerald-100 py-4 mt-auto">
      <div className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-gray-400 text-xs">
          <div className="flex items-center gap-2">
            <img src="/fame-logo.png" alt="FAME" className="w-4 h-4 object-contain" />
            <span>© 2026 FAME - Student Learning Portal</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-emerald-500 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-emerald-500 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-emerald-500 transition-colors">Help Center</a>
            <a href="#" className="hover:text-emerald-500 transition-colors">Contact Support</a>
          </div>
          <div className="flex items-center gap-1">
            Made with <Heart size={10} className="text-rose-400 animate-pulse" /> for students
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;