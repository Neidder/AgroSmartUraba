from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class UsuarioPermissionTests(APITestCase):
    def setUp(self):
        self.url = reverse("usuarios-list")
        self.usuario_model = get_user_model()

    def test_administrador_con_rol_puede_administrar_usuarios(self):
        administrador = self.usuario_model.objects.create_user(
            username="admin",
            password="test-password",
            rol="ADMINISTRADOR",
            is_staff=False,
        )
        self.client.force_authenticate(user=administrador)

        respuesta = self.client.get(self.url)

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)

    def test_trabajador_no_puede_administrar_usuarios_aunque_sea_staff(self):
        trabajador = self.usuario_model.objects.create_user(
            username="trabajador",
            password="test-password",
            rol="TRABAJADOR",
            is_staff=True,
        )
        self.client.force_authenticate(user=trabajador)

        respuesta = self.client.get(self.url)

        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)

    def test_usuario_anonimo_no_puede_administrar_usuarios(self):
        respuesta = self.client.get(self.url)

        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)
