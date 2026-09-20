from .fraud import router as fraud_router
from .url import router as url_router
from .media import router as media_router
from .analysis import router as analysis_router

__all__ = ["fraud_router", "url_router", "media_router", "analysis_router"]
