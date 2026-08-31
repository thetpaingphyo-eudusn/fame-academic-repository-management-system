const STOCK = {
    hero: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=1600&q=85',
    basket: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&w=900&q=85',
    redApple: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=900&q=85',
    greenApple: 'https://images.unsplash.com/photo-1587049352846-91a032f9ee42?auto=format&fit=crop&w=900&q=85',
    orchard: 'https://images.unsplash.com/photo-1548839140-29a7492471f4?auto=format&fit=crop&w=1600&q=85',
    produce: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85',
};

const PRO_BASE_CSS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap');
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: "DM Sans", system-ui, -apple-system, sans-serif;
  color: #292524;
  background: #fffbf7;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
img { max-width: 100%; display: block; }
h1, h2, h3 { font-family: "Fraunces", Georgia, serif; line-height: 1.15; }
a { color: inherit; text-decoration: none; }
button { font: inherit; cursor: pointer; }
`;

/** Undo JSON/Markdown escaping: \\n, \\", etc. */
function unescapeAiString(text) {
    if (!text) return '';
    let s = String(text);
    if (!/[\\][nrt"']/.test(s)) return s;
    return s
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
}

function isBadImageSrc(src) {
    const s = String(src || '').trim().toLowerCase();
    if (!s) return true;
    if (s.startsWith('data:')) return false;
    if (!/^https:\/\//i.test(s)) return true;
    if (/placeholder|placehold|dummyimage|picsum|via\.placeholder|example\.com|localhost|127\.0\.0\.1|\/images\//.test(s)) {
        return !/images\.unsplash\.com|images\.pexels\.com|cdn\./i.test(s);
    }
    return false;
}

function pickStockImage(alt, index, prompt, role = 'product') {
    const text = `${alt || ''} ${prompt || ''}`.toLowerCase();
    if (role === 'hero' || /hero|splash|banner|cover|orchard|farm/.test(text)) return STOCK.hero;
    if (/basket|ပုံး|crate|wooden/.test(text)) return STOCK.basket;
    if (/green/.test(text)) return STOCK.greenApple;
    if (/red/.test(text)) return STOCK.redApple;
    const pool = [STOCK.redApple, STOCK.greenApple, STOCK.basket, STOCK.produce];
    return pool[index % pool.length];
}

function extractAttrValues(attrs, name) {
    const values = [];
    const re = new RegExp(`\\b${name}\\s*=\\s*(?:\\\\)?"([^"]*?)(?:\\\\)?"`, 'gi');
    let m;
    while ((m = re.exec(attrs)) !== null) {
        values.push(m[1].replace(/\\/g, ''));
    }
    return values;
}

function stripAttr(attrs, name) {
    return attrs.replace(new RegExp(`\\s*\\b${name}\\s*=\\s*(?:\\\\)?"[^"]*(?:\\\\)?"`, 'gi'), '');
}

function repairImgTag(rawAttrs, index, prompt) {
    let attrs = unescapeAiString(rawAttrs);

    const altValues = extractAttrValues(attrs, 'alt');
    const alt = altValues[0] || '';
    const srcValues = extractAttrValues(attrs, 'src').filter(Boolean);

    attrs = stripAttr(attrs, 'src');
    attrs = stripAttr(attrs, 'alt');
    attrs = stripAttr(attrs, 'referrerpolicy');
    attrs = stripAttr(attrs, 'loading');

    const validSrcs = srcValues.filter((s) => !isBadImageSrc(s));
    let bestSrc = validSrcs.length > 1 ? validSrcs[validSrcs.length - 1] : validSrcs[0];

    const inHero = /hero|splash|banner|orchard|cover/i.test(alt) || /class=["'][^"']*hero/i.test(attrs);
    if (!bestSrc) {
        bestSrc = pickStockImage(alt, index, prompt, inHero ? 'hero' : 'product');
    }

    const loading = inHero || index === 0 ? 'eager' : 'lazy';
    const safeAlt = alt.replace(/"/g, '&quot;');
    return `<img src="${bestSrc}" alt="${safeAlt}"${attrs} referrerpolicy="no-referrer" loading="${loading}">`;
}

function fixHtmlImages(html, prompt) {
    if (!html) return html;
    let idx = 0;
    const cleaned = unescapeAiString(html);
    return cleaned.replace(/<img\b([^>]*?)>/gi, (_full, attrs) => {
        const tag = repairImgTag(attrs, idx, prompt);
        idx += 1;
        return tag;
    });
}

function stripExternalAssetRefs(html) {
    if (!html) return html;
    return html
        .replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '')
        .replace(/<script[^>]*src=["'][^"']+["'][^>]*>\s*<\/script>/gi, '');
}

function pullCssFromFiles(files, html) {
    let css = '';
    const cssFile = (files || []).find((f) => /\.css$/i.test(f.name) || /style/i.test(f.name));
    if (cssFile) css = String(cssFile.content || '');
    if (!css && html) {
        const inline = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (inline) css = inline[1].trim();
    }
    return css;
}

const SHOP_LAYOUT_CSS = `
header, .sticky-nav {
  position: sticky; top: 0; z-index: 50;
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 24px; background: rgba(255,251,247,.96);
  backdrop-filter: blur(10px); border-bottom: 1px solid #fed7aa;
  box-shadow: 0 4px 24px rgba(124,45,18,.07);
}
.logo { font-family: "Fraunces", Georgia, serif; font-size: 1.4rem; font-weight: 700; color: #9a3412; }
nav ul, header ul { display: flex; flex-wrap: wrap; gap: 18px; list-style: none; margin: 0; padding: 0; }
nav a, header a { font-weight: 600; color: #57534e; transition: color .2s; }
nav a:hover, header a:hover { color: #c2410c; }
button, .cta, .add-to-cart, #shop-now, #cart-button {
  padding: 10px 20px; border: 0; border-radius: 12px;
  background: linear-gradient(135deg, #ea580c, #c2410c); color: #fff; font-weight: 700;
  box-shadow: 0 4px 14px rgba(194,65,12,.25); transition: transform .15s, filter .15s;
}
button:hover, .cta:hover, .add-to-cart:hover { filter: brightness(1.06); transform: translateY(-1px); }
main { max-width: 1100px; margin: 0 auto; padding: 0 20px 48px; }
.hero, section.hero {
  position: relative; min-height: 380px; display: flex; align-items: center; justify-content: center;
  overflow: hidden; text-align: center; color: #fff; margin: 0 -20px 40px; border-radius: 0 0 24px 24px;
}
.hero::before, section.hero::before {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(30,12,6,.35), rgba(80,30,15,.72)); z-index: 1;
}
.hero > img, section.hero > img {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;
}
.hero-overlay, .hero > div, section.hero > div:not(:has(img)) { position: relative; z-index: 2; padding: 40px 24px; max-width: 640px; }
.hero h1, section.hero h1 { font-size: clamp(2rem, 5vw, 3rem); margin: 0 0 12px; text-shadow: 0 2px 16px rgba(0,0,0,.3); }
.hero p, section.hero p { margin: 0 0 20px; font-size: 1.1rem; opacity: .95; }
.products, #products, section.products {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px;
  margin: 48px auto; max-width: 1100px; padding: 0 20px;
}
.products > h2, #products > h2, section.products > h2 {
  grid-column: 1 / -1; text-align: center; font-size: 1.85rem; color: #7c2d12; margin: 0 0 8px;
}
.product, .product-card, .products > div {
  background: #fff; border-radius: 18px; overflow: hidden;
  box-shadow: 0 12px 36px rgba(124,45,18,.09); border: 1px solid #fed7aa;
  transition: transform .2s, box-shadow .2s;
}
.product:hover, .product-card:hover, .products > div:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(124,45,18,.14); }
.product img, .product-card img, .products > div > img {
  width: 100%; height: 200px; object-fit: cover; display: block;
}
.product h3, .product-card h3, .products > div h3 { padding: 16px 16px 0; margin: 0; font-size: 1.15rem; }
.product p, .product-card p, .products > div p { padding: 0 16px; color: #78716c; margin: 8px 0; line-height: 1.5; }
.price, .product .price { color: #c2410c !important; font-weight: 800 !important; font-size: 1.2rem !important; }
.product button, .products > div button { margin: 12px 16px 16px; width: calc(100% - 32px); }
footer {
  text-align: center; padding: 36px 20px; color: #78716c;
  background: linear-gradient(180deg, #fffbf7, #fef3e7); margin-top: 48px; border-top: 1px solid #fed7aa;
}
body > img, main > img:not(.hero img):not(.product img) {
  max-width: 1100px; width: 100%; max-height: 340px; object-fit: cover;
  border-radius: 20px; margin: 24px auto; display: block; box-shadow: 0 12px 32px rgba(0,0,0,.12);
}
.trust, .features, [class*="trust"], [class*="feature"] {
  display: flex; flex-wrap: wrap; justify-content: center; gap: 24px;
  padding: 32px 20px; text-align: center; color: #57534e; font-weight: 600;
}
@media (max-width: 640px) {
  header, .sticky-nav { flex-direction: column; align-items: flex-start; }
  nav ul, header ul { flex-direction: column; gap: 8px; }
}
`;

function needsLayoutCss(css) {
    const t = String(css || '').trim();
    return t.length < 350 || !/display\s*:\s*(flex|grid)/i.test(t) || !/border-radius/i.test(t);
}

function syncFileContents(files, html, css, javascript) {
    return files.map((f) => {
        const name = f.name.toLowerCase();
        if (name.endsWith('.html') || name.includes('index.html')) return { ...f, content: html };
        if (name.endsWith('.css') || name.includes('style')) return { ...f, content: css };
        if (name.endsWith('.js') && !name.endsWith('.jsx')) return { ...f, content: javascript };
        return f;
    });
}

function scoreDesignQuality(html, css) {
    const cssText = String(css || '');
    const htmlText = String(html || '');
    let score = 0;
    if (cssText.length > 600) score += 2;
    if (/box-shadow|gradient|border-radius|clamp\(/i.test(cssText)) score += 2;
    if (/grid|flex|@media/i.test(cssText)) score += 1;
    if (/<nav|header|footer|section/i.test(htmlText)) score += 1;
    if ((htmlText.match(/<img/gi) || []).length >= 2) score += 1;
    return score;
}

function enhanceWebPreview({ html = '', css = '', javascript = '', files = [], prompt = '' }) {
    const rawHtml = unescapeAiString(html);
    let nextHtml = fixHtmlImages(rawHtml, prompt);
    nextHtml = stripExternalAssetRefs(nextHtml);

    if (nextHtml && /<html[\s>]/i.test(nextHtml)) {
        const bodyMatch = nextHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) nextHtml = bodyMatch[1].trim();
    }

    let nextCss = unescapeAiString(css) || pullCssFromFiles(files, rawHtml);
    let nextJs = unescapeAiString(javascript);
    const fixedImages = nextHtml !== rawHtml;
    const cssWasMissing = !String(css || '').trim() && !!nextCss;

    nextCss = `${PRO_BASE_CSS}\n${nextCss}`;
    if (needsLayoutCss(nextCss)) {
        nextCss = `${nextCss}\n${SHOP_LAYOUT_CSS}`;
    }

    const quality = scoreDesignQuality(nextHtml, nextCss);
    const tips = [];
    if (fixedImages || cssWasMissing || needsLayoutCss(css)) {
        tips.push({
            type: 'tip',
            title: 'Preview styled',
            detail: 'Layout CSS applied for Preview — external stylesheet links do not work inside iframe.',
        });
    }
    if (quality < 4) {
        tips.push({
            type: 'tip',
            title: 'Design tip',
            detail: 'Try: "modern premium landing page, sticky nav, hero overlay, 3 product cards with prices, warm palette, hover animations"',
        });
    }

    let nextFiles = syncFileContents(files, nextHtml, nextCss, nextJs);
    if (!nextFiles.some((f) => f.name.toLowerCase().includes('.css'))) {
        nextFiles.push({ name: 'styles.css', content: nextCss });
    }

    return {
        html: nextHtml,
        css: nextCss,
        javascript: nextJs,
        files: nextFiles,
        tips,
        enhanced: fixedImages || cssWasMissing || quality < 4,
    };
}

module.exports = { enhanceWebPreview, fixHtmlImages, unescapeAiString, scoreDesignQuality, STOCK };
