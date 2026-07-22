import sharp from "sharp";
import fs from "fs";
import path from "path";

/*
  One-off asset optimizer. Resizes oversized rasters to display-appropriate
  dimensions and re-encodes to WebP (alpha preserved). Prints a rename map
  (old -> new) so code/CSS references can be updated. Run: node scripts/optimize-images.mjs
*/

// per-path policy: width = max width (never upscales), q = webp quality,
// inPlace keeps the same filename+format (for assets already WebP), out
// overrides the output filename.
const JOBS = [
  // skills cards (raw <img>, shown <=380px, has fine text) -> crisp webp
  { glob: "public/skills", ext: /\.png$/, width: 1000, q: 86 },
  // services carousel cards (raw <img>, text) -> webp
  { glob: "public/services", ext: /\.png$/, width: 720, q: 86 },
  // project covers (photos) -> webp
  { file: "public/projects/dropby-cover.jpg", width: 1100, q: 80 },
  { file: "public/projects/futurepreneurs-cover.png", width: 1100, q: 80 },
  { file: "public/projects/gravitas-cover.png", width: 1100, q: 80 },
  { file: "public/projects/layover-cover.png", width: 1100, q: 80 },
  { file: "public/projects/riviera-cover.png", width: 1100, q: 80 },
  // project + brand logos (hard edges/text) -> high-q webp
  { glob: "public/projects", ext: /-logo\.png$/, width: 640, q: 90 },
  { file: "public/logos/goi.png", width: 1600, q: 90, out: "public/logos/goi.webp" },
  { file: "public/logos/kpmg.png", width: 640, q: 92 },
  { file: "public/logos/elevation-capital.png", width: 1200, q: 92 },
  { file: "public/logos/education/dav.png", width: 512, q: 90 },
  { file: "public/logos/education/vit.png", width: 512, q: 90 },
  { file: "public/logos/education/ibm.png", width: 640, q: 90 },
  { file: "public/logos/education/bishop-scott.png", width: 400, q: 90 },
  // about
  { file: "public/about/portrait.png", width: 900, q: 82 },
  { file: "public/about/banner-bg.png.png", width: 1600, q: 78, out: "public/about/banner-bg.webp" },
  // textures / backgrounds
  { file: "public/purple_ice_background.png", width: 700, q: 74, out: "public/purple_ice_background.webp" },
  { file: "public/projects/mike-tyson-bg.webp", width: 1920, q: 74, inPlace: true },
];

function expand(job) {
  if (job.file) return [{ ...job, src: job.file }];
  if (job.glob) {
    return fs
      .readdirSync(job.glob)
      .filter((n) => job.ext.test(n))
      .map((n) => ({ ...job, src: path.join(job.glob, n) }));
  }
  return [];
}

const rename = [];
let before = 0,
  after = 0;

for (const raw of JOBS.flatMap(expand)) {
  const src = raw.src;
  if (!fs.existsSync(src)) {
    console.log("SKIP (missing):", src);
    continue;
  }
  const srcSize = fs.statSync(src).size;
  before += srcSize;

  const out =
    raw.out ?? (raw.inPlace ? src : src.replace(/\.(png|jpe?g)$/i, ".webp"));

  const buf = fs.readFileSync(src); // read first so in-place overwrite is safe
  let pipe = sharp(buf).resize({ width: raw.width, withoutEnlargement: true });
  pipe = pipe.webp({ quality: raw.q, effort: 6, alphaQuality: 100 });
  const data = await pipe.toBuffer();
  fs.writeFileSync(out, data);
  after += data.length;

  const norm = (p) => "/" + path.relative("public", p).replace(/\\/g, "/");
  if (out !== src) {
    fs.unlinkSync(src);
    rename.push([norm(src), norm(out)]);
  }
  console.log(
    `${(srcSize / 1024).toFixed(0).padStart(5)}KB -> ${(data.length / 1024).toFixed(0).padStart(4)}KB   ${norm(src)}${out !== src ? "  =>  " + norm(out) : "  (in place)"}`
  );
}

console.log("\n=== RENAME MAP (old -> new) ===");
for (const [o, n] of rename) console.log(`${o}\t${n}`);
console.log(
  `\nTOTAL: ${(before / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB  (saved ${(((before - after) / before) * 100).toFixed(1)}%)`
);
