const escapeHtml = (value) =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const OFFLINE_ISSUE = (hasImage) =>
    hasImage
        ? {
              type: 'warning',
              title: 'Starter template',
              detail: 'FAME AI is temporarily unavailable. A starter layout with online photos was created — edit in the Code tab or try again later.',
          }
        : {
              type: 'tip',
              title: 'Starter template',
              detail: 'Edit the code in the Code tab and check the Preview.',
          };

const IMG = {
    hero: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=1400&q=80',
    basket1: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&w=700&q=80',
    basket2: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=700&q=80',
    basket3: 'https://images.unsplash.com/photo-1587049352846-91a032f9ee42?auto=format&fit=crop&w=700&q=80',
};

function isAppleShopPrompt(prompt) {
    return /apple|ပန်းသီး|fruit|basket|ပုံး|orchard|ဍောင်|farm|organic/i.test(String(prompt || ''));
}

function appleShopStarter(prompt, hasImage) {
    const title = escapeHtml(prompt.slice(0, 60) || 'Fresh Apples from Our Farm');
    const css = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Fraunces:wght@600;700&display=swap');
* { box-sizing: border-box; }
body { margin: 0; font-family: "DM Sans", system-ui, sans-serif; background: #fffbf7; color: #3f2e1f; }
.nav { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 24px; background: rgba(255,251,247,.96); backdrop-filter: blur(10px); border-bottom: 1px solid #fed7aa; box-shadow: 0 4px 20px rgba(124,45,18,.06); }
.logo { font-family: "Fraunces", serif; font-size: 1.35rem; font-weight: 700; color: #9a3412; }
.nav ul { display: flex; gap: 20px; list-style: none; margin: 0; padding: 0; }
.nav a { text-decoration: none; color: #57534e; font-weight: 600; }
.nav a:hover { color: #c2410c; }
.cart-btn { padding: 10px 18px; border: 0; border-radius: 12px; background: linear-gradient(135deg, #ea580c, #c2410c); color: #fff; font-weight: 700; cursor: pointer; }
.splash { position: relative; min-height: 420px; display: flex; align-items: center; justify-content: center; text-align: center; color: #fff; overflow: hidden; }
.splash img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.splash-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(40,15,8,.35), rgba(80,30,15,.75)); z-index: 1; }
.splash-content { position: relative; z-index: 2; padding: 48px 24px; max-width: 640px; }
.splash h1 { margin: 0 0 12px; font-family: "Fraunces", serif; font-size: clamp(2rem, 5vw, 3rem); text-shadow: 0 2px 16px rgba(0,0,0,.35); }
.splash p { margin: 0 0 20px; font-size: 1.1rem; opacity: .95; }
.trust { display: flex; flex-wrap: wrap; justify-content: center; gap: 28px; padding: 28px 20px; font-weight: 600; color: #78716c; }
.page { max-width: 1000px; margin: 0 auto; padding: 40px 20px 48px; }
.section-title { text-align: center; margin-bottom: 28px; }
.section-title h2 { margin: 0 0 8px; font-family: "Fraunces", serif; font-size: 1.85rem; color: #7c2d12; }
.section-title p { margin: 0; color: #78716c; }
.products { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
.product-card { background: #fff; border-radius: 18px; overflow: hidden; box-shadow: 0 12px 32px rgba(124,45,18,.09); border: 1px solid #fed7aa; transition: transform .2s; }
.product-card:hover { transform: translateY(-4px); }
.product-card img { width: 100%; height: 200px; object-fit: cover; display: block; }
.product-body { padding: 16px; }
.product-card h3 { margin: 0 0 8px; font-size: 1.15rem; }
.product-card p { margin: 0 0 8px; color: #78716c; font-size: .95rem; line-height: 1.5; }
.price { color: #c2410c; font-weight: 800; font-size: 1.2rem; margin: 0 0 14px !important; }
.btn { width: 100%; padding: 12px; border: 0; border-radius: 12px; background: linear-gradient(135deg, #ea580c, #c2410c); color: #fff; font-weight: 700; cursor: pointer; }
.btn:hover { filter: brightness(1.06); }
.footer { margin-top: 40px; text-align: center; color: #a8a29e; font-size: 14px; padding: 24px; background: #fef3e7; border-radius: 16px; }`;

    const html = `<header class="nav">
  <div class="logo">Fresh Orchard</div>
  <nav><ul><li><a href="#">Home</a></li><li><a href="#products">Products</a></li><li><a href="#">About</a></li><li><a href="#">Contact</a></li></ul></nav>
  <button type="button" class="cart-btn">Cart (0)</button>
</header>
<section class="splash">
  <img src="${IMG.hero}" alt="Apple orchard splash" referrerpolicy="no-referrer" loading="eager" />
  <div class="splash-overlay"></div>
  <div class="splash-content">
    <h1>${title}</h1>
    <p>Experience the taste of nature — farm fresh apples delivered to you.</p>
    <button type="button" class="btn" style="width:auto;padding:12px 28px;">Shop Now</button>
  </div>
</section>
<div class="trust"><span>🌿 Organic</span><span>🍎 Farm Fresh</span><span>🚚 Free Delivery Yangon</span></div>
<main class="page" id="products">
  <div class="section-title"><h2>Our Products</h2><p>Hand-picked apple baskets</p></div>
  <section class="products">
    <article class="product-card">
      <img src="${IMG.basket1}" alt="Rustic apple basket" referrerpolicy="no-referrer" loading="lazy" />
      <div class="product-body"><h3>Rustic Basket (2kg)</h3><p>Wooden basket filled with crisp apples.</p><p class="price">12,000 MMK</p><button type="button" class="btn">Add to Cart</button></div>
    </article>
    <article class="product-card">
      <img src="${IMG.basket2}" alt="Red apples" referrerpolicy="no-referrer" loading="lazy" />
      <div class="product-body"><h3>Premium Red (3kg)</h3><p>Sweet red apples, perfect for snacking.</p><p class="price">18,500 MMK</p><button type="button" class="btn">Add to Cart</button></div>
    </article>
    <article class="product-card">
      <img src="${IMG.basket3}" alt="Mixed apple basket" referrerpolicy="no-referrer" loading="lazy" />
      <div class="product-body"><h3>Family Mix (5kg)</h3><p>A delightful mix of our finest apples.</p><p class="price">28,000 MMK</p><button type="button" class="btn">Add to Cart</button></div>
    </article>
  </section>
  <p class="footer">© 2025 Fresh Orchard — Free delivery on orders over 30,000 MMK</p>
</main>`;

    return {
        language: 'html',
        files: [
            { name: 'index.html', content: html },
            { name: 'styles.css', content: css },
        ],
        preview: { html, css, javascript: '' },
        explanation: hasImage
            ? 'Apple shop starter with online splash and basket photos. FAME AI was offline — customize in the Code tab.'
            : 'Apple shop starter with Unsplash splash and basket images. Customize products in the Code tab.',
        issues: [OFFLINE_ISSUE(hasImage)],
    };
}

const sharedProductCss = `* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: linear-gradient(160deg, #f8fafc 0%, #eef2ff 100%); color: #1e293b; }
.page { max-width: 960px; margin: 0 auto; padding: 32px 20px 48px; }
.hero { text-align: center; margin-bottom: 32px; }
.badge { display: inline-block; padding: 4px 12px; border-radius: 999px; background: #e0e7ff; color: #4338ca; font-size: 12px; font-weight: 600; letter-spacing: 0.02em; }
h1 { margin: 14px 0 8px; font-size: clamp(1.75rem, 4vw, 2.25rem); line-height: 1.2; }
.subtitle { color: #64748b; margin: 0 auto; max-width: 520px; line-height: 1.5; }
.products { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.product-card { background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0; }
.product-img { height: 120px; border-radius: 12px; background: linear-gradient(135deg, #c7d2fe, #fbcfe8); margin-bottom: 12px; }
.product-card h2 { margin: 0 0 4px; font-size: 16px; }
.price { color: #4f46e5; font-weight: 700; margin: 0 0 12px; }
.btn { width: 100%; padding: 10px 14px; border: 0; border-radius: 10px; background: #4f46e5; color: #fff; font-weight: 600; cursor: pointer; }
.btn:hover { background: #4338ca; }
.footer { margin-top: 32px; text-align: center; color: #94a3b8; font-size: 13px; }`;

function htmlStarter(prompt, hasImage) {
    const title = escapeHtml(prompt.slice(0, 80) || 'Shop our collection');
    const subtitle = hasImage
        ? 'Starter product page — refine layout and colors in the Code tab.'
        : 'Starter product page — customize products, colors, and copy below.';

    const html = `<main class="page">
  <header class="hero">
    <p class="badge">New arrivals</p>
    <h1>${title}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
  </header>
  <section class="products">
    <article class="product-card">
      <div class="product-img" aria-hidden="true"></div>
      <h2>Classic Tee</h2>
      <p class="price">$24.99</p>
      <button type="button" class="btn">Add to cart</button>
    </article>
    <article class="product-card">
      <div class="product-img" aria-hidden="true"></div>
      <h2>Smart Watch</h2>
      <p class="price">$89.99</p>
      <button type="button" class="btn">Add to cart</button>
    </article>
    <article class="product-card">
      <div class="product-img" aria-hidden="true"></div>
      <h2>Wireless Buds</h2>
      <p class="price">$59.99</p>
      <button type="button" class="btn">Add to cart</button>
    </article>
  </section>
  <p class="footer">Free shipping on orders over $50</p>
</main>`;

    return {
        language: 'html',
        files: [
            { name: 'index.html', content: html },
            { name: 'styles.css', content: sharedProductCss },
        ],
        preview: { html, css: sharedProductCss, javascript: '' },
        explanation: hasImage
            ? 'Starter product page created. FAME AI was offline — edit the Code tab to match your design.'
            : 'Starter product page created. Edit HTML/CSS to match your idea.',
        issues: [OFFLINE_ISSUE(hasImage)],
    };
}

function reactStarter(prompt, hasImage) {
    const title = escapeHtml(prompt.slice(0, 60) || 'Shop');
    const jsx = `const products = [
  { name: 'Classic Tee', price: '$24.99' },
  { name: 'Smart Watch', price: '$89.99' },
  { name: 'Wireless Buds', price: '$59.99' },
];

export default function App() {
  return (
    <div className="app">
      <header className="hero">
        <span className="badge">New arrivals</span>
        <h1>${title}</h1>
        <p className="subtitle">Starter React shop — edit components and styles in the Code tab.</p>
      </header>
      <section className="grid">
        {products.map((p) => (
          <article key={p.name} className="card">
            <div className="thumb" />
            <h2>{p.name}</h2>
            <p className="price">{p.price}</p>
            <button type="button" className="btn">Add to cart</button>
          </article>
        ))}
      </section>
    </div>
  );
}`;

    const css = `.app { font-family: system-ui, sans-serif; padding: 24px; background: #f8fafc; min-height: 100vh; }
.hero { text-align: center; margin-bottom: 24px; }
.badge { background: #dbeafe; color: #1d4ed8; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.subtitle { color: #64748b; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
.card { background: white; padding: 16px; border-radius: 14px; box-shadow: 0 6px 24px rgba(0,0,0,.06); }
.thumb { height: 100px; border-radius: 10px; background: linear-gradient(135deg, #c7d2fe, #fbcfe8); margin-bottom: 10px; }
.price { color: #4f46e5; font-weight: 700; }
.btn { margin-top: 8px; width: 100%; padding: 10px; border: 0; border-radius: 8px; background: #2563eb; color: white; font-weight: 600; cursor: pointer; }`;

    const preview = htmlStarter(prompt, hasImage);
    return {
        language: 'react',
        files: [
            { name: 'App.jsx', content: jsx },
            { name: 'App.css', content: css },
        ],
        preview: preview.preview,
        explanation: 'React starter shop layout. Edit in the Code tab.',
        issues: [OFFLINE_ISSUE(hasImage)],
    };
}

function vueStarter(prompt, hasImage) {
    const title = escapeHtml(prompt.slice(0, 60) || 'Shop');
    const vue = `<template>
  <div class="app">
    <header class="hero">
      <span class="badge">New arrivals</span>
      <h1>${title}</h1>
      <p>Starter Vue shop — edit in the Code tab.</p>
    </header>
    <div class="grid">
      <article v-for="item in items" :key="item.name" class="card">
        <div class="thumb"></div>
        <h2>{{ item.name }}</h2>
        <p class="price">{{ item.price }}</p>
        <button type="button" class="btn">Add to cart</button>
      </article>
    </div>
  </div>
</template>

<script setup>
const items = [
  { name: 'Classic Tee', price: '$24.99' },
  { name: 'Smart Watch', price: '$89.99' },
];
</script>

<style scoped>
.app { font-family: system-ui, sans-serif; padding: 24px; background: #f8fafc; min-height: 100vh; }
.hero { text-align: center; margin-bottom: 20px; }
.badge { background: #d1fae5; color: #047857; padding: 4px 10px; border-radius: 999px; font-size: 12px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
.card { background: white; padding: 16px; border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,.06); }
.thumb { height: 90px; border-radius: 10px; background: linear-gradient(135deg, #a7f3d0, #bfdbfe); margin-bottom: 10px; }
.price { color: #059669; font-weight: 700; }
.btn { margin-top: 8px; width: 100%; padding: 8px; border: 0; border-radius: 8px; background: #10b981; color: white; font-weight: 600; cursor: pointer; }
</style>`;

    const preview = htmlStarter(prompt, hasImage);
    return {
        language: 'vue',
        files: [{ name: 'App.vue', content: vue }],
        preview: preview.preview,
        explanation: 'Vue starter shop layout. Edit in the Code tab.',
        issues: [OFFLINE_ISSUE(hasImage)],
    };
}

function tailwindStarter(prompt, hasImage) {
    const title = escapeHtml(prompt.slice(0, 60) || 'Shop collection');
    const html = `<div class="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 p-8">
  <div class="max-w-3xl mx-auto text-center mb-8">
    <span class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">New arrivals</span>
    <h1 class="mt-4 text-3xl font-bold text-slate-800">${title}</h1>
    <p class="mt-2 text-slate-500">Starter Tailwind shop — edit classes in the Code tab.</p>
  </div>
  <div class="max-w-3xl mx-auto grid sm:grid-cols-3 gap-4">
    <div class="bg-white rounded-2xl shadow p-4 text-center">
      <div class="h-24 rounded-xl bg-gradient-to-br from-indigo-200 to-pink-200 mb-3"></div>
      <h2 class="font-semibold">Classic Tee</h2>
      <p class="text-indigo-600 font-bold mt-1">$24.99</p>
      <button class="mt-3 w-full py-2 rounded-lg bg-indigo-600 text-white font-medium">Add to cart</button>
    </div>
    <div class="bg-white rounded-2xl shadow p-4 text-center">
      <div class="h-24 rounded-xl bg-gradient-to-br from-violet-200 to-sky-200 mb-3"></div>
      <h2 class="font-semibold">Smart Watch</h2>
      <p class="text-indigo-600 font-bold mt-1">$89.99</p>
      <button class="mt-3 w-full py-2 rounded-lg bg-indigo-600 text-white font-medium">Add to cart</button>
    </div>
    <div class="bg-white rounded-2xl shadow p-4 text-center">
      <div class="h-24 rounded-xl bg-gradient-to-br from-emerald-200 to-amber-200 mb-3"></div>
      <h2 class="font-semibold">Wireless Buds</h2>
      <p class="text-indigo-600 font-bold mt-1">$59.99</p>
      <button class="mt-3 w-full py-2 rounded-lg bg-indigo-600 text-white font-medium">Add to cart</button>
    </div>
  </div>
</div>`;

    const css = `@import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');`;

    return {
        language: 'tailwind',
        files: [
            { name: 'index.html', content: html },
            { name: 'styles.css', content: css },
        ],
        preview: { html, css, javascript: '' },
        explanation: 'Tailwind starter shop layout. Edit in the Code tab.',
        issues: [OFFLINE_ISSUE(hasImage)],
    };
}

function angularStarter(prompt, hasImage) {
    const title = escapeHtml(prompt.slice(0, 60) || 'Shop');
    const ts = `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: \`
    <main class="wrap">
      <header class="hero">
        <span class="badge">New arrivals</span>
        <h1>${title}</h1>
        <p>Starter Angular shop — edit in the Code tab.</p>
      </header>
      <section class="grid">
        <article class="card" *ngFor="let p of products">
          <div class="thumb"></div>
          <h2>{{ p.name }}</h2>
          <p class="price">{{ p.price }}</p>
          <button type="button" class="btn">Add to cart</button>
        </article>
      </section>
    </main>
  \`,
  styles: [\`
    .wrap { font-family: system-ui; padding: 24px; background: #f8fafc; min-height: 100vh; }
    .hero { text-align: center; margin-bottom: 20px; }
    .badge { background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 999px; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
    .card { background: white; padding: 16px; border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,.06); }
    .thumb { height: 90px; border-radius: 10px; background: linear-gradient(135deg, #c7d2fe, #fbcfe8); margin-bottom: 10px; }
    .price { color: #4f46e5; font-weight: 700; }
    .btn { margin-top: 8px; width: 100%; padding: 8px; border: 0; border-radius: 8px; background: #4f46e5; color: white; }
  \`]
})
export class AppComponent {
  products = [
    { name: 'Classic Tee', price: '$24.99' },
    { name: 'Smart Watch', price: '$89.99' },
  ];
}`;

    const preview = htmlStarter(prompt, hasImage);
    return {
        language: 'angular',
        files: [{ name: 'app.component.ts', content: ts }],
        preview: preview.preview,
        explanation: 'Angular starter shop layout. Edit in the Code tab.',
        issues: [OFFLINE_ISSUE(hasImage)],
    };
}

function buildLocalFallback({ prompt = '', language = 'html', hasImage = false }) {
    if (isAppleShopPrompt(prompt)) {
        return appleShopStarter(prompt, hasImage);
    }
    const map = {
        html: htmlStarter,
        react: reactStarter,
        vue: vueStarter,
        tailwind: tailwindStarter,
        angular: angularStarter,
    };
    const builder = map[language] || htmlStarter;
    return builder(prompt, hasImage);
}

module.exports = { buildLocalFallback, appleShopStarter, isAppleShopPrompt };
