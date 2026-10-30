from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from productores.models import Productor
from cultivos.models import Lote, TipoCultivo
from .models import Finca


class FincaApiTests(APITestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(
            username="fincas-user",
            password="test-password",
        )
        self.productor = Productor.objects.create(
            tipo_documento=Productor.TipoDocumento.CC,
            numero_documento="10000003",
            nombres="María",
            apellidos="Productora",
        )
        self.finca = Finca.objects.create(
            productor=self.productor,
            nombre="Finca La Esperanza",
            municipio="Apartadó",
            hectareas=Decimal("12.50"),
        )
        self.url = reverse("finca-list")
        self.client.force_authenticate(user=self.usuario)

    def datos_finca(self, **cambios):
        return {
            "productor": self.productor.pk,
            "nombre": "Finca El Porvenir",
            "municipio": "Carepa",
            "vereda": "El Reposo",
            "direccion": "Vía principal",
            "hectareas": "8.75",
            "observaciones": "",
            "activa": True,
            **cambios,
        }

    def test_usuario_autenticado_puede_consultar_y_crear_finca(self):
        listado = self.client.get(self.url)
        creada = self.client.post(
            self.url,
            self.datos_finca(),
            format="json",
        )

        self.assertEqual(listado.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listado.data), 1)
        self.assertEqual(creada.status_code, status.HTTP_201_CREATED)
        self.assertEqual(creada.data["hectareas"], "8.75")
        self.assertEqual(creada.data["nombre_productor"], "María Productora")

    def test_api_requiere_autenticacion(self):
        self.client.force_authenticate(user=None)

        respuesta = self.client.get(self.url)

        self.assertEqual(
            respuesta.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_rechaza_hectareas_cero_o_negativas(self):
        for hectareas in ("0", "-1.50"):
            with self.subTest(hectareas=hectareas):
                respuesta = self.client.post(
                    self.url,
                    self.datos_finca(hectareas=hectareas),
                    format="json",
                )

                self.assertEqual(
                    respuesta.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )
                self.assertIn("hectareas", respuesta.data)

    def test_rechaza_productor_inactivo_al_asignar_finca(self):
        inactivo = Productor.objects.create(
            tipo_documento=Productor.TipoDocumento.CC,
            numero_documento="10000004",
            nombres="Pedro",
            apellidos="Inactivo",
            activo=False,
        )

        respuesta = self.client.post(
            self.url,
            self.datos_finca(productor=inactivo.pk),
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("productor", respuesta.data)

    def test_filtra_por_estado_y_productor(self):
        inactiva = Finca.objects.create(
            productor=self.productor,
            nombre="Finca Inactiva",
            municipio="Chigorodó",
            hectareas=Decimal("3.00"),
            activa=False,
        )

        activas = self.client.get(self.url, {"activa": "true"})
        inactivas = self.client.get(self.url, {"activa": "false"})
        por_productor = self.client.get(
            self.url,
            {"productor": self.productor.pk},
        )

        self.assertEqual([finca["id"] for finca in activas.data], [self.finca.pk])
        self.assertEqual(
            [finca["id"] for finca in inactivas.data],
            [inactiva.pk],
        )
        self.assertEqual(len(por_productor.data), 2)

    def test_permite_editar_y_desactivar_finca(self):
        url_finca = reverse("finca-detail", kwargs={"pk": self.finca.pk})

        editada = self.client.patch(
            url_finca,
            {"nombre": "Finca Actualizada"},
            format="json",
        )
        desactivada = self.client.patch(
            url_finca,
            {"activa": False},
            format="json",
        )

        self.assertEqual(editada.status_code, status.HTTP_200_OK)
        self.assertEqual(editada.data["nombre"], "Finca Actualizada")
        self.assertEqual(desactivada.status_code, status.HTTP_200_OK)
        self.assertFalse(desactivada.data["activa"])

    def test_no_permite_borrado_fisico(self):
        respuesta = self.client.delete(
            reverse("finca-detail", kwargs={"pk": self.finca.pk}),
        )

        self.assertEqual(
            respuesta.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertTrue(Finca.objects.filter(pk=self.finca.pk).exists())

    def test_no_permite_reducir_area_por_debajo_de_lotes_activos(self):
        tipo_cultivo = TipoCultivo.objects.create(nombre="Banano")
        Lote.objects.create(
            finca=self.finca,
            tipo_cultivo=tipo_cultivo,
            nombre="Lote de prueba",
            hectareas=Decimal("3.00"),
        )

        respuesta = self.client.patch(
            reverse("finca-detail", kwargs={"pk": self.finca.pk}),
            {"hectareas": "2.99"},
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("hectareas", respuesta.data)
