
from rest_framework.routers import DefaultRouter
from .views import TipoCultivoViewSet, LoteViewSet

router = DefaultRouter()

router.register(
    r"tipos-cultivo",
    TipoCultivoViewSet,
    basename="tipo-cultivo",
)

router.register(
    r"lotes",
    LoteViewSet,
    basename="lote",
)

urlpatterns = router.urls
