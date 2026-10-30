from rest_framework.routers import DefaultRouter

from .views import PrecioProductoViewSet, VentaViewSet

router = DefaultRouter()
router.register("ventas", VentaViewSet, basename="ventas")
router.register("precios", PrecioProductoViewSet, basename="precio-producto")

urlpatterns = router.urls
