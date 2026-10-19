#!/usr/bin/env node
// Render the fastfetch logo set: text files into ~/.config/fastfetch/logos/ (or $1),
// a preview script beside them, and build/logos.json for the logo sheet page.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const E = require(path.join(root, 'emberfield.js'));
const outDir = process.argv[2] || path.join(os.homedir(), '.config', 'fastfetch', 'logos');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ember-masks-'));

// Masks: SVG shapes from masks/, letters drawn with a bold font. All become 8-bit PGMs.
function mask(name) {
  const out = path.join(tmp, name + '.pgm');
  if (fs.existsSync(out)) return out;
  if (name.startsWith('letter-')) {
    execFileSync('magick', ['-size', '360x360', 'xc:black', '-fill', 'white', '-font', 'DejaVu-Sans-Bold',
      '-pointsize', '380', '-gravity', 'center', '-annotate', '+0+18', name.slice(7).toUpperCase(), '-depth', '8', out]);
  } else {
    execFileSync('magick', ['-background', 'black', path.join(root, 'masks', name + '.svg'), '-colorspace', 'gray', '-depth', '8', out]);
  }
  return out;
}

const FIELD = 'ember1:s4821,f1.8,o3,v2,w0.6,p24,l260,e1,g0';   // texture used inside shapes
const R = {
  ring: 'ember1:s77,f1.2,o4,v3,w1,p30,l400,e0.45,g0.5,ccrimson,mring',
  spiral: 'ember1:s926625,f1.2,o4,v3,w1,p30,l400,e0.45,g0.5,ccrimson,mring',
  core: 'ember1:s486062,f1.6,o3,v2,w1.2,p40,l420,e1.1,g0.5,cbloodline,mcore',
};
const shaped = (shape, pal) => FIELD + ',c' + pal + ',mscatter';
const LOGOS = [
  // group, id, name, recipe, rows, mask, wallpaper thumbnail it came from
  ['abstract', 'swirl-ring', 'Swirl ring', R.ring, 18, null, 'ring-of-fire'],
  ['abstract', 'swirl-spiral', 'Swirl spiral', R.spiral, 18, null, 'crown'],
  ['abstract', 'swirl-core', 'Swirl core', R.core, 18, null, 'heart'],
  ['shaped', 'flame', 'Flame', shaped('flame', 'crimson'), 18, 'flame'],
  ['shaped', 'letter-k', 'Letter K', shaped('k', 'crimson'), 18, 'letter-k'],
  ['shaped', 'heart', 'Heart', shaped('heart', 'crimson'), 18, 'heart'],
  ['shaped', 'moon', 'Moon', shaped('moon', 'crimson'), 18, 'moon'],
  ['shaped', 'flame-gruvbox', 'Flame · Gruvbox', shaped('flame', 'gruvbox'), 18, 'flame'],
  ['shaped', 'letter-k-catppuccin', 'Letter K · Catppuccin', shaped('k', 'catppuccin'), 18, 'letter-k'],
  ['shaped', 'heart-rosepine', 'Heart · Rosé Pine', shaped('heart', 'rosepine'), 18, 'heart'],
  ['shaped', 'moon-nord', 'Moon · Nord', shaped('moon', 'nord'), 18, 'moon'],
  ['mid', 'flame-mid', 'Flame', shaped('flame', 'crimson'), 12, 'flame'],
  ['mid', 'letter-k-mid', 'Letter K', shaped('k', 'crimson'), 12, 'letter-k'],
  ['mid', 'skull-mid', 'Skull', shaped('skull', 'crimson'), 12, 'skull'],
  ['mid', 'cat-mid', 'Cat', shaped('cat', 'crimson'), 12, 'cat'],
  ['mid', 'star-mid', 'Star', shaped('star', 'crimson'), 12, 'star'],
  ['mid', 'bolt-mid', 'Lightning', shaped('bolt', 'crimson'), 12, 'bolt'],
  ['mid', 'spade-mid', 'Spade', shaped('spade', 'crimson'), 12, 'spade'],
  ['mid', 'diamond-mid', 'Diamond', shaped('diamond', 'crimson'), 12, 'diamond'],
  ['mid', 'skull-dracula-mid', 'Skull · Dracula', shaped('skull', 'dracula'), 12, 'skull'],
  ['mid', 'cat-catppuccin-mid', 'Cat · Catppuccin', shaped('cat', 'catppuccin'), 12, 'cat'],
  ['mid', 'star-tokyonight-mid', 'Star · Tokyo Night', shaped('star', 'tokyonight'), 12, 'star'],
  ['mid', 'bolt-gruvbox-mid', 'Lightning · Gruvbox', shaped('bolt', 'gruvbox'), 12, 'bolt'],
  ['small', 'flame-small', 'Flame', shaped('flame', 'crimson'), 6, 'flame'],
  ['small', 'letter-k-small', 'Letter K', shaped('k', 'crimson'), 6, 'letter-k'],
  ['small', 'heart-small', 'Heart', shaped('heart', 'crimson'), 6, 'heart'],
  ['small', 'moon-small', 'Moon', shaped('moon', 'crimson'), 6, 'moon'],
  ['small', 'swirl-ring-small', 'Swirl ring', R.ring, 6, null],
  ['small', 'swirl-spiral-small', 'Swirl spiral', R.spiral, 6, null],
];

fs.mkdirSync(outDir, { recursive: true });
const sheet = [], preview = [];
for (const [group, id, name, recipe, rows, m, thumb] of LOGOS) {
  const file = path.join(outDir, id + '.txt');
  const args = [recipe, '--rows', String(rows), '--out', file];
  if (m) args.push('--mask', mask(m));
  const msg = execFileSync(path.join(root, 'bin', 'ember-ascii'), args).toString();
  const colors = [...msg.matchAll(/"\d": "([\d;]+)"/g)].map(x => x[1]);
  sheet.push({ group, id, name, rows, recipe, thumb: thumb || null, text: fs.readFileSync(file, 'utf8'),
    colors: colors.map(c => '#' + c.split(';').slice(2).map(n => (+n).toString(16).padStart(2, '0')).join('')) });
  preview.push(`  [${id}]="${colors.map((c, i) => `--logo-color-${i + 1} '${c}'`).join(' ')}"`);
}

fs.writeFileSync(path.join(outDir, 'preview'), `#!/usr/bin/env bash
# Show fastfetch with Ember Field logos.  Usage: preview [name ...]   (no name = all)
cd "$(dirname "$0")"
declare -A C=(
${preview.join('\n')}
)
names=("$@"); [ \${#names[@]} -eq 0 ] && names=(${LOGOS.map(l => l[1]).join(' ')})
for n in "\${names[@]}"; do
  [ -n "\${C[$n]}" ] || { echo "unknown logo: $n (choose from: \${!C[*]})"; continue; }
  echo -e "\\n\\e[90m── $n ──────────────────────────────\\e[0m"
  eval fastfetch --logo-type file --logo "\\"$PWD/$n.txt\\"" \${C[$n]}
done
`, { mode: 0o755 });

fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'build', 'logos.json'), JSON.stringify(sheet));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${LOGOS.length} logos -> ${outDir}`);
