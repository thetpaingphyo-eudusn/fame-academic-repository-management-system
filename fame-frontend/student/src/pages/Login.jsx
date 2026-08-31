import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginPatternBg from "../components/LoginPatternBg";
import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedStudentEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      if (rememberMe) {
        localStorage.setItem("rememberedStudentEmail", email);
      } else {
        localStorage.removeItem("rememberedStudentEmail");
      }
      navigate("/dashboard");
    } else {
      setError(result.message || "Login failed. Please check your credentials.");
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white">
      <LoginPatternBg />
      <div className="relative z-30 min-h-screen flex items-center justify-end p-4 sm:p-8 lg:pr-16 xl:pr-24">
        <div className="w-full max-w-[400px] rounded-3xl border border-white/80 bg-white/55 backdrop-blur-2xl shadow-[0_20px_50px_rgba(15,23,42,0.12)] px-7 py-8 sm:px-8 sm:py-9">
          <div className="text-center mb-7">
            <img src="/fame-logo.png?v=2" alt="FAME" className="w-20 h-20 object-contain mx-auto mb-4 drop-shadow" />
            <p className="inline-block text-xs font-semibold text-[#6b4eff] bg-[#ece8ff]/80 border border-[#d8d0ff] px-3 py-1 rounded-full">
              Student Portal
            </p>
            <h2 className="mt-4 text-xl font-semibold text-[#2a2f4a]">Welcome Back</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600">
              <AlertCircle size={16} className="shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#3a3f5c] mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 bg-white/70 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7c5cff]/35 focus:border-[#7c5cff] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#3a3f5c] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 bg-white/70 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7c5cff]/35 focus:border-[#7c5cff] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 bg-white text-[#6b4eff] focus:ring-[#7c5cff]"
                />
                <span className="text-sm text-gray-500">Remember me</span>
              </label>
              <button type="button" className="text-sm text-[#6b4eff] font-medium hover:text-[#5538e0]">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#6b4eff] hover:bg-[#5a3ef0] shadow-[0_8px_24px_rgba(107,78,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
