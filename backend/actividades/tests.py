from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from cultivos.models import Lote, TipoCultivo
from fincas.models import Finca
from productores.models import Productor
from .models import Actividad


class ActividadApiTests(APITestCase):
    def setUp(self):
        usuario_modelo = get_user_model()
        self.usuario = usuario_modelo.objects.create_user(
            username="actividad-user",
            password="test-pass",
            first_name="Ana",
            last_name="Responsable",
        )
        self.otro_usuario = usuario_modelo.objects.create_user(
            username="otro-user",
            password="test-pass",
        )
        productor = Productor.objects.create(
            tipo_documento=Productor.TipoDocumento.CC,
            numero_documento="10000006",
            nombres="Carlos",
            apellidos="Productor",
        )
        finca = Finca.objects.create(
            productor=productor,
            nombre="Finca El Roble",
            municipio="Apartadó",
            hectareas=Decimal("10.00"),
        )
        tipo_cultivo = TipoCultivo.objects.create(nombre="Banano")
        self.lote = Lote.objects.create(
            finca=finca,
            tipo_cultivo=tipo_cultivo,
            nombre="Lote A",
            hectareas=Decimal("4.00"),
        )
        self.actividad = Actividad.objects.create(
            lote=self.lote,
            responsable=self.usuario,
            tipo=Actividad.TipoActividad.RIEGO,
            descripcion="Riego semanal",
            fecha_actividad=date(2026, 10, 15),
            costo=Decimal("15000.00"),
        )
        self.url = reverse("actividad-list")
        self.client.force_authenticate(user=self.usuario)

    def datos_actividad(self, **cambios):
        return {
            "lote": self.lote.pk,
            "tipo": Actividad.TipoActividad.FERTILIZACION,
            "descripcion": "Aplicación de abono",
            "fecha_actividad": "2026-10-20",
            "costo": "25000.00",
            "observaciones": "Registro de prueba",
            "activo": True,
            **cambios,
        }

    def test_api_requiere_autenticacion(self):
        self.client.force_authenticate(user=None)

        respuesta = self.client.get(self.url)

        self.assertEqual(
            respuesta.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_crea_actividad_asignando_el_usuario_autenticado(self):
        respuesta = self.client.post(
            self.url,
            self.datos_actividad(responsable=self.otro_usuario.pk),
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(respuesta.data["responsable"], self.usuario.pk)
        self.assertEqual(respuesta.data["nombre_responsable"], "Ana Responsable")
        self.assertEqual(respuesta.data["nombre_lote"], "Lote A")
        self.assertEqual(respuesta.data["tipo_display"], "Fertilización")

    def test_rechaza_costo_negativo_y_lote_inactivo(self):
        costo_negativo = self.client.post(
            self.url,
            self.datos_actividad(costo="-0.01"),
            format="json",
        )
        self.lote.activo = False
        self.lote.save(update_fields=["activo"])
        lote_inactivo = self.client.post(
            self.url,
            self.datos_actividad(),
            format="json",
        )

        self.assertEqual(costo_negativo.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("costo", costo_negativo.data)
        self.assertEqual(lote_inactivo.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("lote", lote_inactivo.data)

    def test_filtra_por_lote_tipo_estado_fechas_y_busqueda(self):
        archivada = Actividad.objects.create(
            lote=self.lote,
            responsable=self.otro_usuario,
            tipo=Actividad.TipoActividad.RIEGO,
            descripcion="Riego archivado",
            fecha_actividad=date(2026, 10, 10),
            activo=False,
        )
        self.assertTrue(self.actividad.activo)
        self.assertEqual(
            set(Actividad.objects.values_list("id", flat=True)),
            {self.actividad.pk, archivada.pk},
        )
        filtros = (
            ({"lote": self.lote.pk}, {self.actividad.pk, archivada.pk}),
            (
                {"tipo": Actividad.TipoActividad.RIEGO},
                {self.actividad.pk, archivada.pk},
            ),
            ({"activo": "true"}, {self.actividad.pk}),
            ({"activo": "false"}, {archivada.pk}),
            ({"desde": "2026-10-14", "hasta": "2026-10-16"}, {self.actividad.pk}),
            ({"buscar": "semanal"}, {self.actividad.pk}),
            ({"buscar": "Ana"}, {self.actividad.pk}),
        )

        for parametros, ids_esperados in filtros:
            with self.subTest(parametros=parametros):
                respuesta = self.client.get(self.url, parametros)
                self.assertEqual(
                    {item["id"] for item in respuesta.data},
                    ids_esperados,
                    msg=respuesta.data,
                )

    def test_rechaza_rango_de_fechas_invertido(self):
        respuesta = self.client.get(
            self.url,
            {"desde": "2026-10-20", "hasta": "2026-10-10"},
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("hasta", respuesta.data)

    def test_edita_archiva_y_reactiva_actividad_sin_borrarla(self):
        url_actividad = reverse(
            "actividad-detail",
            kwargs={"pk": self.actividad.pk},
        )

        editada = self.client.patch(
            url_actividad,
            {"descripcion": "Riego actualizado"},
            format="json",
        )
        archivada = self.client.patch(
            url_actividad,
            {"activo": False},
            format="json",
        )
        reactivada = self.client.patch(
            url_actividad,
            {"activo": True},
            format="json",
        )
        borrada = self.client.delete(url_actividad)

        self.assertEqual(editada.status_code, status.HTTP_200_OK, editada.data)
        self.assertEqual(editada.data["descripcion"], "Riego actualizado")
        self.assertEqual(archivada.status_code, status.HTTP_200_OK)
        self.assertFalse(archivada.data["activo"])
        self.assertEqual(reactivada.status_code, status.HTTP_200_OK)
        self.assertTrue(reactivada.data["activo"])
        self.assertEqual(
            borrada.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertTrue(Actividad.objects.filter(pk=self.actividad.pk).exists())
