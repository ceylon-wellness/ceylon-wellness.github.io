from pathlib import Path
import shutil, sys

root = Path(__file__).resolve().parent
repo = Path.cwd()
app = repo / 'src' / 'App.tsx'
if not app.is_file() or not (repo / 'package.json').is_file():
    sys.exit('ERROR: Run this script from your Ceylon Wellness repository root (where package.json exists).')
source = app.read_text(encoding='utf-8')
old = '<Route path="/about" element={wrap(<Simple lang={lang} title="Founder-managed. Human-centred."/>)}/>'
new = '<Route path="/about" element={wrap(<AboutPage lang={lang}/>)}/>'
if old not in source and new not in source:
    sys.exit('STOP: About route differs from expected. No files changed. Send current src/App.tsx for a safe update.')
if new not in source:
    if source.count(old) != 1:
        sys.exit('STOP: Unexpected route count. No files changed.')
    source = "import AboutPage from './AboutPage';\n" + source.replace(old, new, 1)
    backup = app.with_suffix('.tsx.about-backup')
    if backup.exists():
        sys.exit('STOP: Existing backup detected. No files changed. Contact me before proceeding.')
    shutil.copy2(app, backup)
    app.write_text(source, encoding='utf-8')
for name in ('AboutPage.tsx','AboutPage.css'):
    shutil.copy2(root / 'src' / name, repo / 'src' / name)
print('SUCCESS: About page installed. App.tsx original saved as src/App.tsx.about-backup')
print('NEXT: npm run build')
