from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from cosechas.models import Cosecha
from cultivos.models import Lote, TipoCultivo
from fincas.models import Finca
from productores.models import Productor
from .models import DetalleVenta, PrecioProducto, Venta


class VentaModelTests(TestCase):
    def setUp(self):
        self.productor = Productor.objects.create(
            tipo_documento=Productor.TipoDocumento.CC,
            numero_documento="10000001",
            nombres="Ana",
            apellidos="Productora",
        )
        self.finca = Finca.objects.create(
            productor=self.productor,
            nombre="Finca La Esperanza",
            municipio="Apartadó",
            hectareas=Decimal("10.00"),
        )
        self.tipo_cultivo = TipoCultivo.objects.create(nombre="Banano")
        self.lote = Lote.objects.create(
            finca=self.finca,
            tipo_cultivo=self.tipo_cultivo,
            nombre="Lote 1",
            hectareas=Decimal("2.00"),
        )
        self.cosecha = Cosecha.objects.create(
            lote=self.lote,
            fecha_cosecha=date(2026, 10, 1),
            cantidad=Decimal("20.00"),
            unidad_medida=Cosecha.UnidadMedida.KILOGRAMOS,
        )
        self.usuario = get_user_model().objects.create_user(
            username="registro",
            password="test-password",
        )

    def test_total_de_venta_se_calcula_desde_las_lineas(self):
        venta = Venta.objects.create(
            productor=self.productor,
            fecha_venta=date(2026, 10, 15),
            registrada_por=self.usuario,
        )
        DetalleVenta.objects.create(
            venta=venta,
            cosecha=self.cosecha,
            cantidad=Decimal("3.25"),
            precio_unitario=Decimal("2000.00"),
        )
        DetalleVenta.objects.create(
            venta=venta,
            cosecha=self.cosecha,
            cantidad=Decimal("5.00"),
            precio_unitario=Decimal("1200.00"),
        )

        self.assertEqual(venta.total, Decimal("12500.00"))

    def test_detalle_obtiene_producto_y_unidad_desde_cosecha(self):
        venta = Venta.objects.create(
            productor=self.productor,
            fecha_venta=date(2026, 10, 15),
            registrada_por=self.usuario,
        )
        detalle = DetalleVenta.objects.create(
            venta=venta,
            cosecha=self.cosecha,
            cantidad=Decimal("1.00"),
            precio_unitario=Decimal("2000.00"),
        )

        self.assertEqual(detalle.nombre_producto, "Banano")
        self.assertEqual(detalle.unidad_medida, Cosecha.UnidadMedida.KILOGRAMOS)


class VentaApiTests(APITestCase):
    def setUp(self):
        self.productor = Productor.objects.create(
            tipo_documento=Productor.TipoDocumento.CC,
            numero_documento="10000002",
            nombres="Luis",
            apellidos="Agricultor",
        )
        self.finca = Finca.objects.create(
            productor=self.productor,
            nombre="Finca El Progreso",
            municipio="Carepa",
            hectareas=Decimal("8.00"),
        )
        self.tipo_cultivo = TipoCultivo.objects.create(nombre="Plátano")
        self.lote = Lote.objects.create(
            finca=self.finca,
            tipo_cultivo=self.tipo_cultivo,
            nombre="Lote A",
            hectareas=Decimal("3.00"),
        )
        self.cosecha = Cosecha.objects.create(
            lote=self.lote,
            fecha_cosecha=date(2026, 10, 1),
            cantidad=Decimal("10.00"),
            unidad_medida=Cosecha.UnidadMedida.KILOGRAMOS,
        )
        self.usuario = get_user_model().objects.create_user(
            username="vendedor",
            password="test-password",
        )
        self.client.force_authenticate(user=self.usuario)
        self.administrador = get_user_model().objects.create_user(
            username="admin-ventas",
            password="prueba-segura-123",
            rol="ADMINISTRADOR",
        )
        self.tarifa = PrecioProducto.objects.create(
            tipo_cultivo=self.tipo_cultivo,
            unidad_medida=Cosecha.UnidadMedida.KILOGRAMOS,
            precio_unitario=Decimal("2500.00"),
            vigente_desde=date(2026, 10, 1),
            registrado_por=self.administrador,
        )
        self.url = reverse("ventas-list")
        self.datos_venta = {
            "productor": self.productor.pk,
            "fecha_venta": "2026-10-15",
            "comprador_nombre": "Mercado local",
            "detalles": [
                {
                    "cosecha": self.cosecha.pk,
                    "cantidad": "3.00",
                    "precio_unitario": "2500.00",
                }
            ],
        }

    def test_usuario_autenticado_puede_registrar_venta_y_ver_total(self):
        respuesta = self.client.post(
            self.url,
            self.datos_venta,
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(respuesta.data["total"], "7500.00")
        self.assertEqual(respuesta.data["estado"], Venta.Estado.REGISTRADA)
        self.assertEqual(respuesta.data["registrada_por"], self.usuario.pk)
        self.assertEqual(
            respuesta.data["detalles"][0]["precio_unitario"],
            "2500.00",
        )
        self.assertEqual(
            respuesta.data["detalles"][0]["precio_aplicado"],
            self.tarifa.pk,
        )

    def test_no_permite_vender_mas_de_lo_cosechado(self):
        datos = {
            **self.datos_venta,
            "detalles": [
                {
                    "cosecha": self.cosecha.pk,
                    "cantidad": "10.01",
                    "precio_unitario": "2500.00",
                }
            ],
        }

        respuesta = self.client.post(self.url, datos, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detalles", respuesta.data)

    def test_editar_venta_recalcula_total_y_restaura_disponibilidad(self):
        crear = self.client.post(
            self.url,
            self.datos_venta,
            format="json",
        )
        self.assertEqual(crear.status_code, status.HTTP_201_CREATED)
        url_venta = reverse("ventas-detail", kwargs={"pk": crear.data["id"]})
        opciones = self.client.get(
            reverse("ventas-opciones"),
            {"venta": crear.data["id"]},
        )
        self.assertEqual(
            opciones.data["cosechas"][0]["cantidad_disponible"],
            "10.00",
        )

        respuesta = self.client.put(
            url_venta,
            {
                **self.datos_venta,
                "detalles": [
                    {
                        "cosecha": self.cosecha.pk,
                        "cantidad": "4.00",
                        "precio_unitario": "3000.00",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data["total"], "10000.00")

    def test_no_permite_borrar_una_venta_sin_anularla(self):
        crear = self.client.post(
            self.url,
            self.datos_venta,
            format="json",
        )
        self.assertEqual(crear.status_code, status.HTTP_201_CREATED)

        respuesta = self.client.delete(
            reverse("ventas-detail", kwargs={"pk": crear.data["id"]}),
        )

        self.assertEqual(
            respuesta.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertTrue(
            Venta.objects.filter(
                pk=crear.data["id"],
                estado=Venta.Estado.REGISTRADA,
            ).exists()
        )

    def test_anular_venta_la_excluye_del_reporte_y_libera_cantidad(self):
        crear = self.client.post(
            self.url,
            {
                **self.datos_venta,
                "detalles": [
                    {
                        "cosecha": self.cosecha.pk,
                        "cantidad": "10.00",
                        "precio_unitario": "2500.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(crear.status_code, status.HTTP_201_CREATED)

        anular = self.client.post(
            reverse("ventas-anular", kwargs={"pk": crear.data["id"]}),
            {"motivo": "Registro de prueba"},
            format="json",
        )
        self.assertEqual(anular.status_code, status.HTTP_200_OK)
        self.assertEqual(anular.data["estado"], Venta.Estado.ANULADA)

        reporte = self.client.get(reverse("ventas-reporte-ingresos"))
        self.assertEqual(reporte.status_code, status.HTTP_200_OK)
        self.assertEqual(reporte.data["cantidad_ventas"], 0)
        self.assertEqual(reporte.data["total_ingresos"], "0.00")

        nueva_venta = self.client.post(
            self.url,
            {
                **self.datos_venta,
                "detalles": [
                    {
                        "cosecha": self.cosecha.pk,
                        "cantidad": "10.00",
                        "precio_unitario": "2500.00",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(nueva_venta.status_code, status.HTTP_201_CREATED)

    def test_endpoint_requiere_autenticacion(self):
        self.client.force_authenticate(user=None)

        respuesta = self.client.get(self.url)

        self.assertEqual(
            respuesta.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_opciones_muestra_cosecha_y_cantidad_disponible(self):
        respuesta = self.client.get(reverse("ventas-opciones"))

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(len(respuesta.data["productores"]), 1)
        self.assertEqual(len(respuesta.data["cosechas"]), 1)
        self.assertEqual(
            respuesta.data["cosechas"][0]["cantidad_disponible"],
            "10.00",
        )
        self.assertEqual(
            respuesta.data["cosechas"][0]["precio_unitario"],
            "2500.00",
        )

    def test_usuario_no_administrador_no_puede_crear_tarifas(self):
        respuesta = self.client.post(
            reverse("precio-producto-list"),
            {
                "tipo_cultivo": self.tipo_cultivo.pk,
                "unidad_medida": Cosecha.UnidadMedida.KILOGRAMOS,
                "precio_unitario": "3100.00",
                "vigente_desde": "2026-10-20",
            },
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)

    def test_administrador_puede_crear_tarifa(self):
        self.client.force_authenticate(user=self.administrador)

        respuesta = self.client.post(
            reverse("precio-producto-list"),
            {
                "tipo_cultivo": self.tipo_cultivo.pk,
                "unidad_medida": Cosecha.UnidadMedida.KILOGRAMOS,
                "precio_unitario": "3100.00",
                "vigente_desde": "2026-10-20",
            },
            format="json",
        )

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(respuesta.data["registrado_por"], self.administrador.pk)

    def test_toma_tarifa_vigente_para_la_fecha_de_venta(self):
        PrecioProducto.objects.create(
            tipo_cultivo=self.tipo_cultivo,
            unidad_medida=Cosecha.UnidadMedida.KILOGRAMOS,
            precio_unitario=Decimal("3200.00"),
            vigente_desde=date(2026, 10, 10),
            registrado_por=self.administrador,
        )
        datos = {
            **self.datos_venta,
            "detalles": [
                {
                    "cosecha": self.cosecha.pk,
                    "cantidad": "2.00",
                    "precio_unitario": "1.00",
                }
            ],
        }

        respuesta = self.client.post(self.url, datos, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(respuesta.data["total"], "6400.00")
        self.assertEqual(
            respuesta.data["detalles"][0]["precio_unitario"],
            "3200.00",
        )

    def test_rechaza_venta_si_no_hay_tarifa_vigente(self):
        cosecha_toneladas = Cosecha.objects.create(
            lote=self.lote,
            fecha_cosecha=date(2026, 10, 1),
            cantidad=Decimal("10.00"),
            unidad_medida=Cosecha.UnidadMedida.TONELADAS,
        )
        datos = {
            **self.datos_venta,
            "detalles": [
                {
                    "cosecha": cosecha_toneladas.pk,
                    "cantidad": "1.00",
                }
            ],
        }

        respuesta = self.client.post(self.url, datos, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("tarifa vigente", str(respuesta.data).lower())

    def test_editar_venta_conserva_el_precio_historico(self):
        crear = self.client.post(self.url, self.datos_venta, format="json")
        self.assertEqual(crear.status_code, status.HTTP_201_CREATED)
        PrecioProducto.objects.create(
            tipo_cultivo=self.tipo_cultivo,
            unidad_medida=Cosecha.UnidadMedida.KILOGRAMOS,
            precio_unitario=Decimal("4000.00"),
            vigente_desde=date(2026, 10, 20),
            registrado_por=self.administrador,
        )

        editar = self.client.put(
            reverse("ventas-detail", kwargs={"pk": crear.data["id"]}),
            {
                **self.datos_venta,
                "comprador_nombre": "Comprador actualizado",
                "detalles": [
                    {
                        "cosecha": self.cosecha.pk,
                        "cantidad": "4.00",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(editar.status_code, status.HTTP_200_OK)
        self.assertEqual(editar.data["total"], "10000.00")
        self.assertEqual(
            editar.data["detalles"][0]["precio_aplicado"],
            self.tarifa.pk,
        )

    def test_tarifas_se_separan_por_unidad(self):
        cosecha_cajas = Cosecha.objects.create(
            lote=self.lote,
            fecha_cosecha=date(2026, 10, 1),
            cantidad=Decimal("5.00"),
            unidad_medida=Cosecha.UnidadMedida.CAJAS,
        )
        tarifa_caja = PrecioProducto.objects.create(
            tipo_cultivo=self.tipo_cultivo,
            unidad_medida=Cosecha.UnidadMedida.CAJAS,
            precio_unitario=Decimal("18000.00"),
            vigente_desde=date(2026, 10, 1),
            registrado_por=self.administrador,
        )
        datos = {
            **self.datos_venta,
            "detalles": [
                {
                    "cosecha": cosecha_cajas.pk,
                    "cantidad": "2.00",
                    "precio_unitario": "10.00",
                }
            ],
        }

        respuesta = self.client.post(self.url, datos, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(respuesta.data["total"], "36000.00")
        self.assertEqual(
            respuesta.data["detalles"][0]["precio_aplicado"],
            tarifa_caja.pk,
        )
