import React from "react";
import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-white/80 backdrop-blur-sm border-t border-blue-100 py-4 mt-auto">
      <div className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-gray-400 text-xs">
          <div className="flex items-center gap-2">
            <img src="/fame-logo.png" alt="FAME" className="w-4 h-4 object-contain" />
            <span>© 2026 FAME - Teacher Portal</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-blue-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Terms</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Help</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-1">
            Made with <Heart size={10} className="text-rose-400" /> for teachers
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer