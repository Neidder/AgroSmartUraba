from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, ValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from productores.models import Productor
from cultivos.models import TipoCultivo
from cosechas.models import Cosecha
from .models import DetalleVenta, PrecioProducto, Venta
from .serializers import PrecioProductoSerializer, VentaSerializer


class EsAdministrador(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "rol", None) == "ADMINISTRADOR"
        )


class FiltrosVentaSerializer(serializers.Serializer):
    desde = serializers.DateField(required=False)
    hasta = serializers.DateField(required=False)
    productor = serializers.PrimaryKeyRelatedField(
        queryset=Productor.objects.all(),
        required=False,
    )
    tipo_cultivo = serializers.PrimaryKeyRelatedField(
        queryset=TipoCultivo.objects.all(),
        required=False,
    )
    estado = serializers.ChoiceField(
        choices=Venta.Estado.choices,
        required=False,
    )

    def validate(self, attrs):
        desde = attrs.get("desde")
        hasta = attrs.get("hasta")

        if desde and hasta and desde > hasta:
            raise serializers.ValidationError(
                {"hasta": "La fecha final debe ser igual o posterior a la inicial."}
            )

        return attrs


class AnulacionVentaSerializer(serializers.Serializer):
    motivo = serializers.CharField(required=False, allow_blank=True)


class OpcionesVentaSerializer(serializers.Serializer):
    venta = serializers.PrimaryKeyRelatedField(
        queryset=Venta.objects.filter(estado=Venta.Estado.REGISTRADA),
        required=False,
    )
    fecha_venta = serializers.DateField(required=False)


class PrecioProductoViewSet(viewsets.ModelViewSet):
    serializer_class = PrecioProductoSerializer
    queryset = PrecioProducto.objects.select_related(
        "tipo_cultivo",
        "registrado_por",
    )
    http_method_names = ["get", "post", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [EsAdministrador()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(registrado_por=self.request.user)


class VentaViewSet(viewsets.ModelViewSet):
    serializer_class = VentaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Venta.objects.select_related(
                "productor",
                "registrada_por",
                "anulada_por",
            )
            .prefetch_related(
                "detalles__cosecha__lote__tipo_cultivo",
            )
            .all()
        )

    def ventas_filtradas(self):
        filtros = FiltrosVentaSerializer(data=self.request.query_params)
        filtros.is_valid(raise_exception=True)
        valores = filtros.validated_data
        queryset = self.get_queryset()

        if "desde" in valores:
            queryset = queryset.filter(fecha_venta__gte=valores["desde"])
        if "hasta" in valores:
            queryset = queryset.filter(fecha_venta__lte=valores["hasta"])
        if "productor" in valores:
            queryset = queryset.filter(productor=valores["productor"])
        if "estado" in valores:
            queryset = queryset.filter(estado=valores["estado"])
        if "tipo_cultivo" in valores:
            queryset = queryset.filter(
                detalles__cosecha__lote__tipo_cultivo=valores["tipo_cultivo"]
            ).distinct()

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.ventas_filtradas()
        pagina = self.paginate_queryset(queryset)
        if pagina is not None:
            serializer = self.get_serializer(pagina, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(registrada_por=self.request.user)

    def destroy(self, request, *args, **kwargs):
        self.get_object()
        raise MethodNotAllowed(
            "DELETE",
            "Las ventas se deben anular para conservar su historial.",
        )

    @action(detail=False, methods=["get"])
    def opciones(self, request):
        serializer = OpcionesVentaSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        venta = serializer.validated_data.get("venta")
        fecha_venta = serializer.validated_data.get(
            "fecha_venta",
            timezone.localdate(),
        )

        productores = Productor.objects.filter(activo=True).order_by(
            "nombres",
            "apellidos",
        )
        cosechas = Cosecha.objects.select_related(
            "lote__finca__productor",
            "lote__tipo_cultivo",
        ).filter(
            lote__activo=True,
            lote__finca__activa=True,
            lote__finca__productor__activo=True,
            lote__tipo_cultivo__activo=True,
        )
        ventas_existentes = DetalleVenta.objects.filter(
            venta__estado=Venta.Estado.REGISTRADA,
        )
        if venta:
            ventas_existentes = ventas_existentes.exclude(venta=venta)
        cantidades_vendidas = {
            fila["cosecha_id"]: fila["cantidad_vendida"]
            for fila in ventas_existentes.values("cosecha_id").annotate(
                cantidad_vendida=Sum("cantidad")
            )
        }

        opciones_cosecha = []
        tarifas = PrecioProducto.objects.filter(
            tipo_cultivo_id__in={
                cosecha.lote.tipo_cultivo_id for cosecha in cosechas
            },
            vigente_desde__lte=fecha_venta,
        ).order_by(
            "tipo_cultivo_id",
            "unidad_medida",
            "-vigente_desde",
            "-id",
        )
        precios_por_clave = {}
        for tarifa in tarifas:
            clave = (tarifa.tipo_cultivo_id, tarifa.unidad_medida)
            if clave not in precios_por_clave:
                precios_por_clave[clave] = tarifa

        for cosecha in cosechas:
            disponible = cosecha.cantidad - cantidades_vendidas.get(
                cosecha.pk,
                Decimal("0.00"),
            )
            if disponible <= 0:
                continue

            tarifa = precios_por_clave.get(
                (cosecha.lote.tipo_cultivo_id, cosecha.unidad_medida)
            )
            productor = cosecha.lote.finca.productor
            opciones_cosecha.append(
                {
                    "id": cosecha.pk,
                    "productor": productor.pk,
                    "tipo_cultivo": cosecha.lote.tipo_cultivo.pk,
                    "nombre_producto": cosecha.lote.tipo_cultivo.nombre,
                    "lote": cosecha.lote.pk,
                    "nombre_lote": cosecha.lote.nombre,
                    "fecha_cosecha": cosecha.fecha_cosecha,
                    "cantidad_cosechada": f"{cosecha.cantidad:.2f}",
                    "cantidad_disponible": f"{disponible:.2f}",
                    "unidad_medida": cosecha.unidad_medida,
                    "unidad_medida_display": cosecha.get_unidad_medida_display(),
                    "precio_catalogo_id": tarifa.pk if tarifa else None,
                    "precio_unitario": (
                        f"{tarifa.precio_unitario:.2f}" if tarifa else None
                    ),
                }
            )

        return Response(
            {
                "productores": [
                    {
                        "id": productor.pk,
                        "nombre": (
                            f"{productor.nombres} {productor.apellidos}".strip()
                        ),
                        "numero_documento": productor.numero_documento,
                    }
                    for productor in productores
                ],
                "cosechas": opciones_cosecha,
            }
        )

    @action(detail=True, methods=["post"])
    def anular(self, request, pk=None):
        motivo_serializer = AnulacionVentaSerializer(data=request.data)
        motivo_serializer.is_valid(raise_exception=True)
        motivo = motivo_serializer.validated_data.get("motivo", "").strip()

        with transaction.atomic():
            venta = get_object_or_404(
                Venta.objects.select_for_update(),
                pk=pk,
            )
            self.check_object_permissions(request, venta)

            if venta.estado == Venta.Estado.ANULADA:
                raise ValidationError(
                    {"estado": "La venta ya se encuentra anulada."}
                )

            venta.estado = Venta.Estado.ANULADA
            venta.motivo_anulacion = motivo
            venta.anulada_por = request.user
            venta.fecha_anulacion = timezone.now()
            venta.save(
                update_fields=[
                    "estado",
                    "motivo_anulacion",
                    "anulada_por",
                    "fecha_anulacion",
                    "fecha_actualizacion",
                ]
            )

        return Response(self.get_serializer(venta).data)

    @action(
        detail=False,
        methods=["get"],
        url_path="reporte-ingresos",
    )
    def reporte_ingresos(self, request):
        ventas = list(
            self.ventas_filtradas().filter(
                estado=Venta.Estado.REGISTRADA,
            )
        )

        total_ingresos = sum(
            (venta.total for venta in ventas),
            Decimal("0.00"),
        )
        ingresos_por_productor = defaultdict(lambda: Decimal("0.00"))
        ingresos_por_producto = defaultdict(
            lambda: {
                "cantidad": Decimal("0.00"),
                "ingresos": Decimal("0.00"),
            }
        )
        nombres_productores = {}
        nombres_productos = {}

        for venta in ventas:
            nombre_productor = (
                f"{venta.productor.nombres} {venta.productor.apellidos}".strip()
            )
            ingresos_por_productor[venta.productor_id] += venta.total
            nombres_productores[venta.productor_id] = nombre_productor

            for detalle in venta.detalles.all():
                tipo_cultivo = detalle.cosecha.lote.tipo_cultivo
                llave_producto = (
                    tipo_cultivo.pk,
                    detalle.cosecha.unidad_medida,
                )
                ingresos_por_producto[llave_producto]["cantidad"] += (
                    detalle.cantidad
                )
                ingresos_por_producto[llave_producto]["ingresos"] += (
                    detalle.cantidad_precio
                )
                nombres_productos[llave_producto] = tipo_cultivo.nombre

        return Response(
            {
                "cantidad_ventas": len(ventas),
                "total_ingresos": self.formatear_monto(total_ingresos),
                "por_productor": [
                    {
                        "productor_id": productor_id,
                        "productor": nombres_productores[productor_id],
                        "ingresos": self.formatear_monto(ingresos),
                    }
                    for productor_id, ingresos in ingresos_por_productor.items()
                ],
                "por_producto": [
                    {
                        "tipo_cultivo_id": tipo_id,
                        "producto": nombres_productos[(tipo_id, unidad)],
                        "unidad_medida": unidad,
                        "cantidad": f"{datos['cantidad']:.2f}",
                        "ingresos": self.formatear_monto(datos["ingresos"]),
                    }
                    for (tipo_id, unidad), datos in ingresos_por_producto.items()
                ],
            }
        )

    @staticmethod
    def formatear_monto(monto):
        return f"{monto.quantize(Decimal('0.01')):.2f}"
