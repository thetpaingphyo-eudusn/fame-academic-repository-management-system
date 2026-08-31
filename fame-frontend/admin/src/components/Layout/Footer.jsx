import React from "react";
import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-100 py-4">
      <div className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-gray-400 text-xs">
          <div className="flex items-center gap-2">
            <img src="/fame-logo.png" alt="FAME" className="w-4 h-4 object-contain" />
            <span>© 2026 FAME - Academic Project Repository</span>
          </div>
          <div className="flex gap-4 sm:gap-6">
            <a href="#" className="hover:text-gray-600 transition-colors">About</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Help</a>
          </div>
          <div className="flex items-center gap-1">
            <span>Made with</span>
            <Heart size={10} className="text-red-400" />
            <span>React</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer