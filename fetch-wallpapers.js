// Bing Wallpaper Fetcher — pulls daily wallpapers from Bing
// Usage: node fetch-wallpapers.js

var https = require('https');
var fs = require('fs');
var path = require('path');

var postsDir = path.join(__dirname, 'source', '_posts');

function delay(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function fetchBing(idx) {
  return new Promise(function (resolve) {
    var url = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=' + idx + '&n=8&mkt=zh-CN';
    https.get(url, function (res) {
      var data = '';
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () {
        try {
          resolve(JSON.parse(data).images || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', function () { resolve([]); });
  });
}

function slugify(text) {
  return text
    .replace(/[<>:"/\\|?*%]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

function parseDate(dateStr) {
  if (!dateStr || dateStr.length < 8) return dateStr;
  var y = dateStr.substring(0, 4);
  var m = dateStr.substring(4, 6);
  var d = dateStr.substring(6, 8);
  return y + '-' + m + '-' + d;
}

function loadExistingUrls() {
  var urls = new Set();
  if (!fs.existsSync(postsDir)) return urls;
  var files = fs.readdirSync(postsDir).filter(function (f) { return f.endsWith('.md'); });
  files.forEach(function (file) {
    var content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
    var re = /https:\/\/www\.bing\.com\/[^\s)\]]+/g;
    var match;
    while ((match = re.exec(content)) !== null) {
      var url = match[0];
      if (url.indexOf('1920x1080') !== -1) urls.add(url);
    }
  });
  return urls;
}

async function main() {
  console.log('开始抓取 Bing 每日壁纸...\n');

  var existingUrls = loadExistingUrls();
  var allImages = [];
  var idx = 0;
  var maxRequests = 150; // up to 1200 days back
  var emptyStreak = 0;
  var totalFetched = 0;

  while (idx < maxRequests) {
    var images = await fetchBing(idx);
    if (images.length === 0) {
      emptyStreak++;
      if (emptyStreak > 5) break;
      idx++;
      continue;
    }
    emptyStreak = 0;

    for (var i = 0; i < images.length; i++) {
      var img = images[i];
      var imageUrl = 'https://www.bing.com' + img.url;
      if (existingUrls.has(imageUrl)) continue;

      allImages.push({
        title: img.copyright || img.title || 'Bing 每日壁纸',
        url: imageUrl,
        date: parseDate(img.fullstartdate || img.startdate),
        copyright: img.copyright || ''
      });
      existingUrls.add(imageUrl);
    }

    totalFetched += images.length;
    process.stdout.write('\r  已抓取 ' + totalFetched + ' 张，idx=' + idx + '，新图片 ' + allImages.length + ' 张     ');
    idx++;
    await delay(100);
  }
  console.log('\n');

  if (allImages.length === 0) {
    console.log('无新壁纸，所有已是最新。');
    return;
  }

  // Group by date
  var grouped = {};
  allImages.forEach(function (img) {
    if (!grouped[img.date]) grouped[img.date] = [];
    grouped[img.date].push(img);
  });

  var dates = Object.keys(grouped).sort().reverse();
  var newPosts = 0;
  var updatedPosts = 0;

  for (var d = 0; d < dates.length; d++) {
    var date = dates[d];
    var items = grouped[date];
    var imageUrls = items.map(function (item) { return item.url; });
    var title = items[0].copyright || 'Bing 每日壁纸';
    var safeTitle = title.replace(/"/g, '\\"').substring(0, 80);

    var filename = slugify('bing-' + date) + '.md';
    var filepath = path.join(postsDir, filename);

    if (!fs.existsSync(filepath)) {
      var isoDate = date + ' 08:00:00';
      var tags = ['Bing', '壁纸', '风景', '每日壁纸'];

      var frontMatter = [
        '---',
        'title: "' + safeTitle + '"',
        'date: ' + isoDate,
        'categories: [风景]',
        'tags: ["Bing", "壁纸", "风景", "每日壁纸"]',
        'source_url: ' + imageUrls[0],
        'source_name: Bing',
        '---'
      ].join('\n');

      var body = ['', '> Bing 每日壁纸 · ' + date, '', '## 预览', ''];
      imageUrls.forEach(function (url) {
        body.push('![' + safeTitle + '](' + url + ')');
        body.push('');
      });
      body.push('## 下载链接');
      body.push('');
      imageUrls.forEach(function (url, i) {
        body.push('- [下载壁纸 ' + (i + 1) + '](' + url + ')');
      });

      fs.writeFileSync(filepath, frontMatter + body.join('\n'), 'utf-8');
      newPosts++;
      console.log('  + ' + filename + ' (' + imageUrls.length + ' 张)');
    } else {
      var content = fs.readFileSync(filepath, 'utf-8');
      var existingUrlSet = new Set();
      var re = /https:\/\/www\.bing\.com\/\S+/g;
      var m;
      while ((m = re.exec(content)) !== null) existingUrlSet.add(m[0]);

      var newUrls = imageUrls.filter(function (url) {
        return !existingUrlSet.has(url);
      });
      if (newUrls.length === 0) continue;

      var insertAt = content.indexOf('## 下载链接');
      var newImageBlock = '';
      newUrls.forEach(function (url) {
        newImageBlock += '\n![' + safeTitle + '](' + url + ')\n';
      });
      var existingLinkCount = (content.match(/- \[下载壁纸 \d+\]/g) || []).length;
      var newLinkBlock = '';
      newUrls.forEach(function (url, i) {
        newLinkBlock += '- [下载壁纸 ' + (existingLinkCount + i + 1) + '](' + url + ')\n';
      });

      var updatedContent = content.substring(0, insertAt) + newImageBlock + content.substring(insertAt);
      updatedContent = updatedContent.trimEnd() + '\n' + newLinkBlock;
      fs.writeFileSync(filepath, updatedContent, 'utf-8');
      updatedPosts++;
      console.log('  ~ ' + filename + ' (+' + newUrls.length + ' 张)');
    }
  }

  console.log('\n完成！新建 ' + newPosts + ' 篇，更新 ' + updatedPosts + ' 篇，共新增 ' + allImages.length + ' 张壁纸。');
  if (newPosts > 0 || updatedPosts > 0) {
    console.log('运行 hexo generate 构建站点。');
  }
}

main().catch(function (e) { console.error(e); process.exit(1); });
