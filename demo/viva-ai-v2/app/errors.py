class AppError(Exception):
    """A safe error that can be shown to the user, without SDK secrets or SQL."""

    def __init__(self, message: str, status: int = 400, code: str = "invalid_request"):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code
