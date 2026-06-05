// Pexels Wallpaper Fetcher — outputs source/_data/wallpapers.json
// Requires PEXELS_API_KEY env var (free: https://www.pexels.com/api/)
// Usage: PEXELS_API_KEY=xxx node fetch-pexels.js

var https = require('https');
var fs = require('fs');
var path = require('path');

var API_KEY = process.env.PEXELS_API_KEY;
if (!API_KEY) {
  console.error('请设置 PEXELS_API_KEY 环境变量');
  console.error('免费注册: https://www.pexels.com/api/');
  process.exit(1);
}

var outFile = path.join(__dirname, 'source', '_data', 'wallpapers.json');
var postsDir = path.join(__dirname, 'source', '_posts');

var searchQueries = [
  'nature landscape 4k',
  'mountains wallpaper',
  'ocean beach sunset',
  'city skyline night',
  'forest trees path',
  'space galaxy stars',
  'flowers garden',
  'architecture modern',
  'anime scenery',
  'wildlife animals'
];

function searchPexels(query, page) {
  return new Promise(function (resolve) {
    var encoded = encodeURIComponent(query);
    var url = 'https://api.pexels.com/v1/search?query=' + encoded + '&per_page=80&page=' + page + '&orientation=landscape&size=large';
    https.get(url, { headers: { Authorization: API_KEY } }, function (res) {
      var data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        try { resolve(JSON.parse(data).photos || []); }
        catch (e) { resolve([]); }
      });
    }).on('error', function () { resolve([]); });
  });
}

function delay(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

function loadExisting() {
  if (!fs.existsSync(outFile)) return [];
  try { return JSON.parse(fs.readFileSync(outFile, 'utf-8')); }
  catch (e) { return []; }
}

async function main() {
  console.log('从 Pexels 抓取壁纸数据...\n');

  var existing = loadExisting();
  var existingUrls = new Set(existing.map(function (x) { return x.url; }));
  var allPhotos = existing.slice();

  for (var q = 0; q < searchQueries.length; q++) {
    var query = searchQueries[q];
    process.stdout.write('  [' + query + ']');

    for (var page = 1; page <= 2; page++) {
      var photos = await searchPexels(query, page);
      for (var i = 0; i < photos.length; i++) {
        var p = photos[i];
        var imgUrl = p.src.original || p.src.large2x || p.src.large;
        if (existingUrls.has(imgUrl)) continue;

        allPhotos.push({
          title: p.alt || p.photographer + ' photo',
          url: imgUrl,
          photographer: p.photographer,
          photographer_url: p.photographer_url,
          width: p.width,
          height: p.height
        });
        existingUrls.add(imgUrl);
      }
      await delay(300);
    }
    console.log(' ' + allPhotos.length + ' 张');
    await delay(500);
  }

  // Ensure _data dir exists
  var dataDir = path.join(__dirname, 'source', '_data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(outFile, JSON.stringify(allPhotos, null, 2), 'utf-8');
  console.log('\n已写入 ' + outFile + ' (' + allPhotos.length + ' 张)');
}

main().catch(function (e) { console.error(e); process.exit(1); });
