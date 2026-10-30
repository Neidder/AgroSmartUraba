from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from cultivos.models import Lote, TipoCultivo
from fincas.models import Finca
from productores.models import Productor
from ventas.models import DetalleVenta, Venta
from .models import Cosecha


class CosechaApiTests(APITestCase):
    def setUp(self):
        self.usuario = get_user_model().objects.create_user(
            username="cosecha-user",
            password="test-pass",
        )
        productor = Productor.objects.create(
            tipo_documento=Productor.TipoDocumento.CC,
            numero_documento="10000007",
            nombres="Elena",
            apellidos="Agricultora",
        )
        self.finca = Finca.objects.create(
            productor=productor,
            nombre="Finca La Palma",
            municipio="Apartadó",
            hectareas=Decimal("10.00"),
        )
        self.tipo_cultivo = TipoCultivo.objects.create(nombre="Banano")
        self.otro_tipo = TipoCultivo.objects.create(nombre="Plátano")
        self.lote = Lote.objects.create(
            finca=self.finca,
            tipo_cultivo=self.tipo_cultivo,
            nombre="Lote Norte",
            hectareas=Decimal("4.00"),
        )
        self.otro_lote = Lote.objects.create(
            finca=self.finca,
            tipo_cultivo=self.otro_tipo,
            nombre="Lote Sur",
            hectareas=Decimal("3.00"),
        )
        self.cosecha = Cosecha.objects.create(
            lote=self.lote,
            fecha_cosecha=timezone.localdate() - timedelta(days=2),
            cantidad=Decimal("100.00"),
            unidad_medida=Cosecha.UnidadMedida.KILOGRAMOS,
            observaciones="Cosecha de prueba",
        )
        self.url = reverse("cosecha-list")
        self.client.force_authenticate(user=self.usuario)

    def datos_cosecha(self, **cambios):
        return {
            "lote": self.lote.pk,
            "fecha_cosecha": timezone.localdate().isoformat(),
            "cantidad": "25.50",
            "unidad_medida": Cosecha.UnidadMedida.KILOGRAMOS,
            "observaciones": "Cosecha de prueba",
            **cambios,
        }

    def crear_venta(self, cantidad, estado=Venta.Estado.REGISTRADA):
        venta = Venta.objects.create(
            productor=self.finca.productor,
            fecha_venta=timezone.localdate(),
            registrada_por=self.usuario,
            estado=estado,
        )
        DetalleVenta.objects.create(
            venta=venta,
            cosecha=self.cosecha,
            cantidad=Decimal(cantidad),
            precio_unitario=Decimal("2000.00"),
        )
        return venta

    def test_api_requiere_autenticacion(self):
        self.client.force_authenticate(user=None)

        respuesta = self.client.get(self.url)

        self.assertEqual(
            respuesta.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_crea_cosecha_y_devuelve_datos_de_lote_y_unidad(self):
        respuesta = self.client.post(
            self.url,
            self.datos_cosecha(),
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(respuesta.data["nombre_lote"], "Lote Norte")
        self.assertEqual(respuesta.data["nombre_tipo_cultivo"], "Banano")
        self.assertEqual(respuesta.data["unidad_medida_display"], "Kilogramos")

    def test_rechaza_cantidad_no_positiva_y_fecha_futura(self):
        cantidad_cero = self.client.post(
            self.url,
            self.datos_cosecha(cantidad="0"),
            format="json",
        )
        fecha_futura = self.client.post(
            self.url,
            self.datos_cosecha(
                fecha_cosecha=(timezone.localdate() + timedelta(days=1)).isoformat(),
            ),
            format="json",
        )

        self.assertEqual(cantidad_cero.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cantidad", cantidad_cero.data)
        self.assertEqual(fecha_futura.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("fecha_cosecha", fecha_futura.data)

    def test_no_permite_crear_cosecha_en_lote_inactivo(self):
        self.lote.activo = False
        self.lote.save(update_fields=["activo"])

        respuesta = self.client.post(
            self.url,
            self.datos_cosecha(),
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("lote", respuesta.data)

    def test_filtra_por_lote_unidad_fechas_y_busqueda(self):
        otra = Cosecha.objects.create(
            lote=self.otro_lote,
            fecha_cosecha=timezone.localdate() - timedelta(days=5),
            cantidad=Decimal("40.00"),
            unidad_medida=Cosecha.UnidadMedida.CAJAS,
        )
        filtros = (
            ({"lote": self.lote.pk}, {self.cosecha.pk}),
            (
                {"unidad_medida": Cosecha.UnidadMedida.CAJAS},
                {otra.pk},
            ),
            (
                {
                    "desde": (timezone.localdate() - timedelta(days=3)).isoformat(),
                    "hasta": timezone.localdate().isoformat(),
                },
                {self.cosecha.pk},
            ),
            ({"buscar": "Banano"}, {self.cosecha.pk}),
            ({"buscar": "Finca La Palma"}, {self.cosecha.pk, otra.pk}),
            ({"fecha_cosecha": self.cosecha.fecha_cosecha.isoformat()}, {self.cosecha.pk}),
        )

        for parametros, ids_esperados in filtros:
            with self.subTest(parametros=parametros):
                respuesta = self.client.get(self.url, parametros)
                self.assertEqual(
                    {item["id"] for item in respuesta.data},
                    ids_esperados,
                )

    def test_rechaza_rango_de_fechas_invertido(self):
        respuesta = self.client.get(
            self.url,
            {
                "desde": timezone.localdate().isoformat(),
                "hasta": (
                    timezone.localdate() - timedelta(days=1)
                ).isoformat(),
            },
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("hasta", respuesta.data)

    def test_edita_cosecha_y_no_permite_reducir_lo_vendido_vigente(self):
        self.crear_venta("60.00")
        url_cosecha = reverse(
            "cosecha-detail",
            kwargs={"pk": self.cosecha.pk},
        )

        cantidad_insuficiente = self.client.patch(
            url_cosecha,
            {"cantidad": "59.99"},
            format="json",
        )
        cantidad_valida = self.client.patch(
            url_cosecha,
            {"cantidad": "80.00"},
            format="json",
        )

        self.assertEqual(
            cantidad_insuficiente.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("cantidad", cantidad_insuficiente.data)
        self.assertEqual(cantidad_valida.status_code, status.HTTP_200_OK)
        self.assertEqual(cantidad_valida.data["cantidad"], "80.00")

    def test_ventas_anuladas_no_limitaran_reduccion_de_cantidad(self):
        self.crear_venta("80.00", estado=Venta.Estado.ANULADA)
        respuesta = self.client.patch(
            reverse("cosecha-detail", kwargs={"pk": self.cosecha.pk}),
            {"cantidad": "20.00"},
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data["cantidad"], "20.00")

    def test_no_permite_cambiar_lote_o_unidad_si_tiene_ventas(self):
        self.crear_venta("10.00")
        url_cosecha = reverse(
            "cosecha-detail",
            kwargs={"pk": self.cosecha.pk},
        )

        cambio_lote = self.client.patch(
            url_cosecha,
            {"lote": self.otro_lote.pk},
            format="json",
        )
        cambio_unidad = self.client.patch(
            url_cosecha,
            {"unidad_medida": Cosecha.UnidadMedida.CAJAS},
            format="json",
        )

        self.assertEqual(cambio_lote.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("lote", cambio_lote.data)
        self.assertEqual(
            cambio_unidad.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("unidad_medida", cambio_unidad.data)

    def test_no_permite_borrar_fisicamente_una_cosecha(self):
        respuesta = self.client.delete(
            reverse("cosecha-detail", kwargs={"pk": self.cosecha.pk}),
        )

        self.assertEqual(
            respuesta.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertTrue(Cosecha.objects.filter(pk=self.cosecha.pk).exists())
