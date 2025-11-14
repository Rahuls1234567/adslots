import sys, subprocess, importlib
pkg = 'pypdf'
try:
    importlib.import_module(pkg)
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', pkg])
from pypdf import PdfReader
reader = PdfReader('ro.pdf')
with open('ro_extracted.txt', 'w', encoding='utf-8') as f:
    for page in reader.pages:
        text = page.extract_text() or ''
        f.write(text)
        f.write('\n')
print('OK')
