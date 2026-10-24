

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    UsuarioViewSet,
    iniciar_sesion,
    solicitar_acceso,
    solicitar_recuperacion,
    restablecer_contrasena,
)

router = DefaultRouter()
router.register("usuarios", UsuarioViewSet, basename="usuarios")

urlpatterns = [
    path("login/", iniciar_sesion, name="iniciar_sesion"),
    path("solicitar-acceso/", solicitar_acceso, name="solicitar_acceso"),
    path(
        "recuperar-contrasena/",
        solicitar_recuperacion,
        name="solicitar_recuperacion",
    ),
    path(
        "restablecer-contrasena/",
        restablecer_contrasena,
        name="restablecer_contrasena",
    ),
]

urlpatterns += router.urls

