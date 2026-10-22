
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import UsuarioViewSet, iniciar_sesion

router = DefaultRouter()
router.register("usuarios", UsuarioViewSet, basename="usuarios")

urlpatterns = [
    path("login/", iniciar_sesion, name="iniciar_sesion"),
]

urlpatterns += router.urls
