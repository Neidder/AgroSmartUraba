from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from fincas.models import Finca
from productores.models import Productor
from .models import Lote, TipoCultivo


class CultivosApiTests(APITestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(
            username="cultivos-user",
            password="test-pass",
        )
        self.productor = Productor.objects.create(
            tipo_documento=Productor.TipoDocumento.CC,
            numero_documento="10000005",
            nombres="Lucía",
            apellidos="Agricultora",
        )
        self.finca = Finca.objects.create(
            productor=self.productor,
            nombre="Finca La Unión",
            municipio="Apartadó",
            hectareas=Decimal("10.00"),
        )
        self.tipo_cultivo = TipoCultivo.objects.create(nombre="Banano")
        self.lote = Lote.objects.create(
            finca=self.finca,
            tipo_cultivo=self.tipo_cultivo,
            nombre="Lote Norte",
            hectareas=Decimal("3.00"),
        )
        self.tipos_url = reverse("tipo-cultivo-list")
        self.lotes_url = reverse("lote-list")
        self.client.force_authenticate(user=self.usuario)

    def datos_lote(self, **cambios):
        return {
            "finca": self.finca.pk,
            "tipo_cultivo": self.tipo_cultivo.pk,
            "nombre": "Lote Sur",
            "hectareas": "2.50",
            "fecha_siembra": "2026-01-15",
            "fecha_fin_estimada": "2026-12-15",
            "observaciones": "",
            "activo": True,
            **cambios,
        }

    def test_api_de_tipos_y_lotes_requiere_autenticacion(self):
        self.client.force_authenticate(user=None)

        respuestas = [
            self.client.get(self.tipos_url),
            self.client.get(self.lotes_url),
        ]

        for respuesta in respuestas:
            self.assertEqual(
                respuesta.status_code,
                status.HTTP_401_UNAUTHORIZED,
            )

    def test_puede_crear_tipo_de_cultivo(self):
        respuesta = self.client.post(
            self.tipos_url,
            {"nombre": "Cacao", "descripcion": "Cultivo de cacao", "activo": True},
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(respuesta.data["nombre"], "Cacao")

    def test_filtra_tipos_por_estado_y_busqueda(self):
        inactivo = TipoCultivo.objects.create(nombre="Cacao", activo=False)

        activos = self.client.get(self.tipos_url, {"activo": "true"})
        inactivos = self.client.get(self.tipos_url, {"activo": "false"})
        buscados = self.client.get(self.tipos_url, {"buscar": "caca"})

        self.assertEqual([item["id"] for item in activos.data], [self.tipo_cultivo.pk])
        self.assertEqual([item["id"] for item in inactivos.data], [inactivo.pk])
        self.assertEqual([item["id"] for item in buscados.data], [inactivo.pk])

    def test_puede_crear_y_consultar_lote_con_nombres_relacionados(self):
        respuesta = self.client.post(
            self.lotes_url,
            self.datos_lote(),
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(respuesta.data["nombre_finca"], "Finca La Unión")
        self.assertEqual(respuesta.data["nombre_tipo_cultivo"], "Banano")

    def test_rechaza_lote_si_excede_area_disponible_de_finca(self):
        respuesta = self.client.post(
            self.lotes_url,
            self.datos_lote(hectareas="7.01"),
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("hectareas", respuesta.data)

    def test_rechaza_asignacion_de_finca_o_tipo_inactivo(self):
        finca_inactiva = Finca.objects.create(
            productor=self.productor,
            nombre="Finca Inactiva",
            municipio="Carepa",
            hectareas=Decimal("8.00"),
            activa=False,
        )
        tipo_inactivo = TipoCultivo.objects.create(
            nombre="Cacao",
            activo=False,
        )

        for campo, valor in (
            ("finca", finca_inactiva.pk),
            ("tipo_cultivo", tipo_inactivo.pk),
        ):
            with self.subTest(campo=campo):
                respuesta = self.client.post(
                    self.lotes_url,
                    self.datos_lote(**{campo: valor}),
                    format="json",
                )

                self.assertEqual(
                    respuesta.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )
                self.assertIn(campo, respuesta.data)

    def test_rechaza_fecha_fin_anterior_a_siembra(self):
        respuesta = self.client.post(
            self.lotes_url,
            self.datos_lote(
                fecha_siembra="2026-05-01",
                fecha_fin_estimada="2026-04-30",
            ),
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("fecha_fin_estimada", respuesta.data)

    def test_filtra_lotes_por_estado_finca_tipo_y_busqueda(self):
        otro_tipo = TipoCultivo.objects.create(nombre="Cacao")
        inactivo = Lote.objects.create(
            finca=self.finca,
            tipo_cultivo=otro_tipo,
            nombre="Lote Inactivo",
            hectareas=Decimal("2.00"),
            activo=False,
        )

        filtros = (
            ({"activo": "true"}, [self.lote.pk]),
            ({"activo": "false"}, [inactivo.pk]),
            ({"finca": self.finca.pk}, [self.lote.pk, inactivo.pk]),
            ({"tipo_cultivo": otro_tipo.pk}, [inactivo.pk]),
            ({"buscar": "Unión"}, [self.lote.pk, inactivo.pk]),
        )

        for parametros, ids_esperados in filtros:
            with self.subTest(parametros=parametros):
                respuesta = self.client.get(self.lotes_url, parametros)
                self.assertEqual(
                    {item["id"] for item in respuesta.data},
                    set(ids_esperados),
                )

    def test_permite_editar_y_desactivar_lote_y_no_permite_borrarlo(self):
        url_lote = reverse("lote-detail", kwargs={"pk": self.lote.pk})

        editado = self.client.patch(
            url_lote,
            {"nombre": "Lote Actualizado"},
            format="json",
        )
        desactivado = self.client.patch(
            url_lote,
            {"activo": False},
            format="json",
        )
        borrado = self.client.delete(url_lote)

        self.assertEqual(editado.status_code, status.HTTP_200_OK)
        self.assertEqual(editado.data["nombre"], "Lote Actualizado")
        self.assertEqual(desactivado.status_code, status.HTTP_200_OK)
        self.assertFalse(desactivado.data["activo"])
        self.assertEqual(
            borrado.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertTrue(Lote.objects.filter(pk=self.lote.pk).exists())

    def test_no_permite_reactivar_lote_con_finca_inactiva(self):
        self.lote.activo = False
        self.lote.save(update_fields=["activo"])
        self.finca.activa = False
        self.finca.save(update_fields=["activa"])

        respuesta = self.client.patch(
            reverse("lote-detail", kwargs={"pk": self.lote.pk}),
            {"activo": True},
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("finca", respuesta.data)

    def test_no_permite_borrar_fisicamente_tipo_de_cultivo(self):
        respuesta = self.client.delete(
            reverse("tipo-cultivo-detail", kwargs={"pk": self.tipo_cultivo.pk}),
        )

        self.assertEqual(
            respuesta.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertTrue(
            TipoCultivo.objects.filter(pk=self.tipo_cultivo.pk).exists()
        )
