const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');

function load(file, modules = {}, env = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  vm.runInNewContext(code, {
    exports, require: name => modules[name] || {}, URL, process: { env }, console
  });
  return exports;
}
const config = load('app/i18n/config.ts');
function setup(env = { NEXT_PUBLIC_BASE_URL: 'https://zclaude.com/' }) {
  const seo = load('app/lib/seo.ts', { '@/i18n/config': config }, env);
  const modules = {
    '@/i18n/config': config, '@/lib/seo': seo,
    'next-intl/server': { getTranslations: async () => key => key }
  };
  return { seo, page: path => load(`app/[locale]/${path}`, modules) };
}

test('canonical URLs follow actual public routing for every locale', () => {
  const { seo } = setup();
  for (const locale of config.locales) {
    assert.equal(seo.getPageAlternates(locale).canonical,
      `https://zclaude.com${locale === 'en' ? '' : '/' + locale}`);
    for (const path of ['/privacy', '/terms']) {
      const metadata = seo.getPageAlternates(locale, path);
      assert.equal(metadata.canonical, `https://zclaude.com/${locale}${path}`);
      for (const language of config.locales)
        assert.equal(metadata.languages[language], `https://zclaude.com/${language}${path}`);
    }
  }
});
test('site URL supports CUSTOM_DOMAIN, normalizes slashes, and retains local fallback', () => {
  assert.equal(setup({ CUSTOM_DOMAIN: 'zclaude.com///' }).seo.getSiteBaseUrl(), 'https://zclaude.com');
  assert.equal(setup({}).seo.getSiteBaseUrl(), 'http://localhost:3000');
});
test('shared layout does not leak homepage canonical, hreflang, or og:url to children', async () => {
  const metadata = await setup().page('layout.tsx').generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
  assert.equal(metadata.alternates, undefined);
  assert.equal(metadata.openGraph.url, undefined);
});
test('home, privacy and terms export page-specific canonical and Open Graph URLs', async () => {
  const { page } = setup();
  for (const locale of config.locales) {
    for (const route of ['', 'privacy/', 'terms/']) {
      const metadata = await page(route + 'page.tsx').generateMetadata({ params: Promise.resolve({ locale }) });
      const path = route ? '/' + route.slice(0, -1) : '';
      const expected = `https://zclaude.com${!path && locale === 'en' ? '' : '/' + locale}${path}`;
      assert.equal(metadata.alternates.canonical, expected);
      assert.equal(metadata.openGraph.url, expected);
    }
  }
});
test('English-only about content keeps its English canonical', async () => {
  const metadata = await setup().page('about/page.tsx').generateMetadata();
  assert.equal(metadata.alternates.canonical, 'https://zclaude.com/en/about');
});
