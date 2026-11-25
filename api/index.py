import importlib.util
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_APP = ROOT_DIR / "backend" / "app.py"

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(BACKEND_APP.parent) not in sys.path:
    sys.path.insert(0, str(BACKEND_APP.parent))

spec = importlib.util.spec_from_file_location("agroagua_backend_app", BACKEND_APP)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

app = module.app
