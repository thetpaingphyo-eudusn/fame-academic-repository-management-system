import React from "react";
import { Home, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-32 h-32 mx-auto bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mb-6">
          <Search size={48} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">404</h1>
        <p className="text-xl text-gray-600 mb-4">Page Not Found</p>
        <p className="text-gray-500 mb-6">The page you are looking for doesn't exist or has been moved.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all flex items-center gap-2 mx-auto"
        >
          <Home size={18} /> Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;