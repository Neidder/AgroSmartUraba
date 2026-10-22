
from rest_framework.routers import DefaultRouter
from .views import CostoProduccionViewSet, PerdidaAgricolaViewSet

router = DefaultRouter()

router.register(
    "costos-produccion",
    CostoProduccionViewSet,
    basename="costos-produccion"
)

router.register(
    "perdidas-agricolas",
    PerdidaAgricolaViewSet,
    basename="perdidas-agricolas"
)

urlpatterns = router.urls
