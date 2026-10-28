from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from rest_framework import serializers

from cosechas.models import Cosecha
from .models import DetalleVenta, Venta


def validar_disponibilidad(detalles, productor, venta=None, bloquear=False):
    ids_cosechas = [detalle["cosecha"].pk for detalle in detalles]

    if len(ids_cosechas) != len(set(ids_cosechas)):
        raise serializers.ValidationError(
            {"detalles": "No repitas una cosecha en la misma venta."}
        )

    cosechas_query = Cosecha.objects.filter(pk__in=ids_cosechas).select_related(
        "lote__finca",
        "lote__tipo_cultivo",
    )
    if bloquear:
        cosechas_query = cosechas_query.select_for_update()

    cosechas = {cosecha.pk: cosecha for cosecha in cosechas_query}
    ventas_existentes = DetalleVenta.objects.filter(
        cosecha_id__in=ids_cosechas,
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

    errores = []
    for detalle in detalles:
        cosecha = cosechas.get(detalle["cosecha"].pk)
        if cosecha is None:
            errores.append("Una de las cosechas seleccionadas ya no existe.")
            continue

        if cosecha.lote.finca.productor_id != productor.pk:
            errores.append(
                f"La cosecha {cosecha.pk} no pertenece al productor seleccionado."
            )
            continue

        disponible = cosecha.cantidad - cantidades_vendidas.get(
            cosecha.pk,
            Decimal("0.00"),
        )
        if detalle["cantidad"] > disponible:
            errores.append(
                f"La cantidad disponible para {cosecha.lote.tipo_cultivo.nombre} "
                f"es {disponible} {cosecha.get_unidad_medida_display()}."
            )

    if errores:
        raise serializers.ValidationError({"detalles": errores})


class DetalleVentaSerializer(serializers.ModelSerializer):
    nombre_producto = serializers.CharField(
        source="cosecha.lote.tipo_cultivo.nombre",
        read_only=True,
    )
    nombre_lote = serializers.CharField(
        source="cosecha.lote.nombre",
        read_only=True,
    )
    unidad_medida = serializers.CharField(
        source="cosecha.get_unidad_medida_display",
        read_only=True,
    )
    subtotal = serializers.DecimalField(
        source="cantidad_precio",
        max_digits=24,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = DetalleVenta
        fields = [
            "id",
            "cosecha",
            "nombre_producto",
            "nombre_lote",
            "unidad_medida",
            "cantidad",
            "precio_unitario",
            "subtotal",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "cantidad": {
                "min_value": Decimal("0.01"),
                "max_digits": 12,
                "decimal_places": 2,
            },
            "precio_unitario": {
                "min_value": Decimal("0.01"),
                "max_digits": 12,
                "decimal_places": 2,
            },
        }


class VentaSerializer(serializers.ModelSerializer):
    detalles = DetalleVentaSerializer(many=True)
    total = serializers.DecimalField(
        max_digits=24,
        decimal_places=2,
        read_only=True,
    )
    nombre_productor = serializers.SerializerMethodField()

    class Meta:
        model = Venta
        fields = [
            "id",
            "productor",
            "nombre_productor",
            "fecha_venta",
            "comprador_nombre",
            "comprador_documento",
            "comprador_contacto",
            "estado",
            "motivo_anulacion",
            "fecha_anulacion",
            "registrada_por",
            "anulada_por",
            "fecha_creacion",
            "fecha_actualizacion",
            "detalles",
            "total",
        ]
        read_only_fields = [
            "id",
            "estado",
            "motivo_anulacion",
            "fecha_anulacion",
            "registrada_por",
            "anulada_por",
            "fecha_creacion",
            "fecha_actualizacion",
        ]

    def get_nombre_productor(self, venta):
        return f"{venta.productor.nombres} {venta.productor.apellidos}".strip()

    def validate(self, attrs):
        if self.instance and self.instance.estado == Venta.Estado.ANULADA:
            raise serializers.ValidationError(
                "No se puede editar una venta anulada."
            )

        productor = attrs.get(
            "productor",
            self.instance.productor if self.instance else None,
        )
        detalles = attrs.get("detalles")

        if detalles is None and self.instance:
            detalles = [
                {"cosecha": detalle.cosecha, "cantidad": detalle.cantidad}
                for detalle in self.instance.detalles.all()
            ]

        if not detalles:
            raise serializers.ValidationError(
                {"detalles": "Agrega al menos un producto a la venta."}
            )

        if productor is None:
            raise serializers.ValidationError(
                {"productor": "Selecciona el productor de origen."}
            )

        if not productor.activo:
            raise serializers.ValidationError(
                {"productor": "No se pueden registrar ventas de un productor inactivo."}
            )

        validar_disponibilidad(detalles, productor, venta=self.instance)
        return attrs

    def create(self, validated_data):
        detalles = validated_data.pop("detalles")
        productor = validated_data["productor"]

        with transaction.atomic():
            validar_disponibilidad(
                detalles,
                productor,
                bloquear=True,
            )
            venta = Venta.objects.create(**validated_data)
            DetalleVenta.objects.bulk_create(
                [
                    DetalleVenta(venta=venta, **detalle)
                    for detalle in detalles
                ]
            )

        return venta

    def update(self, instance, validated_data):
        detalles = validated_data.pop("detalles", None)
        reemplazar_detalles = detalles is not None
        if detalles is None:
            detalles = [
                {"cosecha": detalle.cosecha, "cantidad": detalle.cantidad}
                for detalle in instance.detalles.all()
            ]

        productor = validated_data.get("productor", instance.productor)

        with transaction.atomic():
            venta = Venta.objects.select_for_update().get(pk=instance.pk)
            validar_disponibilidad(
                detalles,
                productor,
                venta=venta,
                bloquear=True,
            )

            for campo, valor in validated_data.items():
                setattr(venta, campo, valor)
            venta.save()

            if reemplazar_detalles:
                venta.detalles.all().delete()
                DetalleVenta.objects.bulk_create(
                    [
                        DetalleVenta(venta=venta, **detalle)
                        for detalle in detalles
                    ]
                )

        return venta
