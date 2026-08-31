import React, { useEffect, useRef } from "react";

const COLORS = ["#8B5CF6", "#2563EB", "#06B6D4", "#F59E0B", "#F97316", "#EF4444", "#22D3EE"];
const LENS = 168;
const ZOOM = 1.75;

const FEATURES = [
  { label: "Repository", color: "#2563EB" },
  { label: "Grading", color: "#7C3AED" },
  { label: "Analytics", color: "#06B6D4" },
  { label: "Assistant", color: "#EA580C" },
];

const HeroCopy = () => (
  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-[min(68%,820px)] items-center justify-end px-8 sm:px-12 lg:flex lg:pr-16 xl:pr-24">
    <div className="w-full max-w-[620px]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7C3AED]">
        FAME Platform
      </p>
      <h1 className="mt-5 text-[40px] font-bold leading-[1.12] tracking-tight sm:text-[50px]">
        <span className="text-[#7C3AED]">Academic</span>
        <br />
        <span className="text-[#2563EB]">Repository</span>
        <br />
        <span className="text-[#06B6D4]">Management</span>
        <br />
        <span className="text-[#EA580C]">System</span>
      </h1>
      <p className="mt-6 max-w-[540px] text-[15px] leading-7 text-[#2563EB]/70">
        Submit projects, grade assignments, and track academic performance in one place.
      </p>
      <div className="mt-8 grid max-w-[540px] grid-cols-2 gap-3">
        {FEATURES.map((f) => (
          <div
            key={f.label}
            className="flex items-center gap-2.5 rounded-2xl border border-white/80 bg-white/45 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: f.color }} />
            <span className="text-sm font-semibold" style={{ color: f.color }}>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LoginPatternBg = () => {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const lensRef = useRef(null);
  const lensCanvasRef = useRef(null);
  const cloneRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const nodesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const lens = lensRef.current;
    const lensCanvas = lensCanvasRef.current;
    const clone = cloneRef.current;
    if (!canvas || !wrap || !lens || !lensCanvas || !clone) return;

    const ctx = canvas.getContext("2d");
    const lctx = lensCanvas.getContext("2d");
    let raf;

    const build = () => {
      const width = wrap.clientWidth || window.innerWidth;
      const height = wrap.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      lensCanvas.width = LENS * dpr;
      lensCanvas.height = LENS * dpr;
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const gap = 56;
      const nodes = [];
      const cols = Math.ceil(width / gap) + 2;
      const rows = Math.ceil(height / gap) + 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          nodes.push({
            ox: c * gap + (r % 2) * (gap * 0.5),
            oy: r * gap,
            x: c * gap,
            y: r * gap,
            color: COLORS[(r * 3 + c) % COLORS.length],
          });
        }
      }
      nodesRef.current = nodes;
      if (!mouse.current.tx) {
        mouse.current.tx = width * 0.32;
        mouse.current.ty = height * 0.45;
        mouse.current.x = mouse.current.tx;
        mouse.current.y = mouse.current.ty;
      }
    };

    const onMove = (e) => {
      const rect = wrap.getBoundingClientRect();
      mouse.current.tx = e.clientX - rect.left;
      mouse.current.ty = e.clientY - rect.top;
    };

    const tick = () => {
      const width = wrap.clientWidth || window.innerWidth;
      const height = wrap.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const m = mouse.current;
      m.x += (m.tx - m.x) * 0.1;
      m.y += (m.ty - m.y) * 0.1;

      ctx.clearRect(0, 0, width, height);
      const nodes = nodesRef.current;
      const radius = 140;

      nodes.forEach((n) => {
        const dx = m.x - n.ox;
        const dy = m.y - n.oy;
        const dist = Math.hypot(dx, dy) || 1;
        const pull = Math.max(0, 1 - dist / radius);
        n.x += (n.ox + (dx / dist) * pull * 22 - n.x) * 0.12;
        n.y += (n.oy + (dy / dist) * pull * 22 - n.y) * 0.12;
      });

      const maxLink = 78;
      ctx.lineCap = "round";
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist > maxLink) continue;
          ctx.globalAlpha = (1 - dist / maxLink) * 0.45;
          ctx.strokeStyle = a.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      nodes.forEach((n) => {
        const near = Math.max(0, 1 - Math.hypot(m.x - n.x, m.y - n.y) / radius);
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.6 + near * 2.2, 0, Math.PI * 2);
        ctx.fill();
      });

      const hide = m.x > width * 0.6;
      lens.style.opacity = hide ? "0" : "1";
      lens.style.transform = `translate(${m.x - LENS / 2}px, ${m.y - LENS / 2}px)`;

      const src = LENS / ZOOM;
      const sx = Math.max(0, m.x - src / 2) * dpr;
      const sy = Math.max(0, m.y - src / 2) * dpr;
      lctx.clearRect(0, 0, LENS, LENS);
      lctx.drawImage(canvas, sx, sy, src * dpr, src * dpr, 0, 0, LENS, LENS);

      clone.style.width = `${width}px`;
      clone.style.height = `${height}px`;
      clone.style.transform = `translate(${-m.x * ZOOM + LENS / 2}px, ${-m.y * ZOOM + LENS / 2}px) scale(${ZOOM})`;

      raf = requestAnimationFrame(tick);
    };

    build();
    const ro = new ResizeObserver(build);
    ro.observe(wrap);
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);

    return () => {
      ro.disconnect();
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 z-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <HeroCopy />

      <div
        ref={lensRef}
        className="pointer-events-none absolute left-0 top-0 z-20 overflow-hidden rounded-full opacity-0 transition-opacity duration-150"
        style={{
          width: LENS,
          height: LENS,
          border: "1.5px solid rgba(255,255,255,0.9)",
          boxShadow:
            "0 12px 40px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -10px 20px rgba(148,163,184,0.16)",
          background: "rgba(255,255,255,0.22)",
          backdropFilter: "blur(16px) saturate(170%)",
          WebkitBackdropFilter: "blur(16px) saturate(170%)",
        }}
      >
        <canvas ref={lensCanvasRef} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 overflow-hidden">
          <div ref={cloneRef} className="absolute left-0 top-0 origin-top-left">
            <HeroCopy />
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(155deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 36%, transparent 58%)",
          }}
        />
        <div className="pointer-events-none absolute inset-[7px] rounded-full border border-white/50" />
      </div>
    </div>
  );
};

export default LoginPatternBg;
