
from rest_framework.routers import DefaultRouter
from .views import ProductorViewSet

router = DefaultRouter()
router.register(r"productores", ProductorViewSet, basename="productor")

urlpatterns = router.urls
