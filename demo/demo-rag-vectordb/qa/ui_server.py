from app.config import Settings
from app.main import create_app
from tests.fakes import FakeGateway

gateway = FakeGateway()
gateway.delay = 0.02
app = create_app(Settings(database_url='postgresql+psycopg://viva@127.0.0.1:55433/viva_preview', gemini_api_key='test-double-only', _env_file=None), gateway)
