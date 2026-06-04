const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const parser = new Parser({
  customFields: { item: ['description', 'content:encoded', 'summary'] },
  timeout: 15000
});

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'news-sources.json'), 'utf-8'));
const postsDir = path.join(__dirname, 'source', '_posts');

function slugify(text) {
  return text
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

function loadExistingUrls() {
  const urls = new Set();
  if (!fs.existsSync(postsDir)) return urls;
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
    const match = content.match(/^source_url:\s*(.+)$/m);
    if (match) urls.add(match[1].trim());
  }
  return urls;
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

function generateMarkdown(item, source) {
  const title = (item.title || '无标题').replace(/"/g, '\\"');
  const date = item.isoDate ? new Date(item.isoDate).toISOString().replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19);
  // Prefer full HTML content, then plain text summary
  const fullContent = item['content:encoded'] || item.content || item.description || '';
  const plainSummary = item.contentSnippet || item.summary || stripHtml(item.content || item.description || '');

  // Use full HTML if it's substantially longer than the snippet
  const bodyContent = fullContent.length > plainSummary.length * 1.5 ? fullContent : fullContent || plainSummary;
  const link = item.link || '';
  const tags = [source.name];
  if (item.categories) {
    const catNames = item.categories.slice(0, 3).map(c =>
      typeof c === 'string' ? c : (c._ || c.name || c.$ || c.label || '')
    ).filter(Boolean);
    tags.push(...catNames);
  }

  const tagStr = tags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(', ');

  const frontMatter = [
    '---',
    `title: "${title}"`,
    `date: ${date}`,
    `categories: [${source.category}]`,
    `tags: [${tagStr}]`,
    `source_url: ${link}`,
    `source_name: ${source.name}`,
    '---'
  ].join('\n');

  const body = [
    '',
    `> 原文链接：[${link}](${link})`,
    '',
    bodyContent
  ].join('\n');

  return frontMatter + body;
}

async function fetchRSS(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const items = (feed.items || []).slice(0, config.maxPerSource);
    return items.map(item => ({ item, source, type: 'rss' }));
  } catch (e) {
    console.error(`  [ERROR] ${source.name}: ${e.message}`);
    return [];
  }
}

async function main() {
  console.log('开始抓取新闻...\n');
  const existingUrls = loadExistingUrls();
  let totalNew = 0;

  for (const source of config.sources) {
    console.log(`[${source.name}] 抓取中...`);
    let results = [];
    if (source.type === 'rss') {
      results = await fetchRSS(source);
    }
    let newCount = 0;
    for (const { item } of results) {
      if (existingUrls.has(item.link)) continue;
      if (!item.link) continue;
      const markdown = generateMarkdown(item, source);
      const filename = `${slugify(item.title || 'untitled')}.md`;
      const filepath = path.join(postsDir, filename);
      if (fs.existsSync(filepath)) continue;
      fs.writeFileSync(filepath, markdown, 'utf-8');
      existingUrls.add(item.link);
      newCount++;
      console.log(`  + ${item.title}`);
    }
    console.log(`  => ${newCount} 条新内容\n`);
    totalNew += newCount;
  }

  console.log(`完成！共新增 ${totalNew} 条新闻。`);
  if (totalNew > 0) {
    console.log('运行 hexo generate 构建站点。');
  }
}

main().catch(e => { console.error(e); process.exit(1); });