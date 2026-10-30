from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from rest_framework import serializers

from cosechas.models import Cosecha
from .models import DetalleVenta, PrecioProducto, Venta


class PrecioProductoSerializer(serializers.ModelSerializer):
    nombre_tipo_cultivo = serializers.CharField(
        source="tipo_cultivo.nombre",
        read_only=True,
    )
    unidad_medida_display = serializers.CharField(
        source="get_unidad_medida_display",
        read_only=True,
    )
    nombre_registrado_por = serializers.SerializerMethodField()

    class Meta:
        model = PrecioProducto
        fields = [
            "id",
            "tipo_cultivo",
            "nombre_tipo_cultivo",
            "unidad_medida",
            "unidad_medida_display",
            "precio_unitario",
            "vigente_desde",
            "registrado_por",
            "nombre_registrado_por",
            "fecha_creacion",
        ]
        read_only_fields = ["id", "registrado_por", "fecha_creacion"]
        extra_kwargs = {
            "precio_unitario": {
                "min_value": Decimal("0.01"),
                "max_digits": 12,
                "decimal_places": 2,
            },
        }

    def get_nombre_registrado_por(self, obj):
        nombre = obj.registrado_por.get_full_name()
        return nombre or obj.registrado_por.username

    def validate_tipo_cultivo(self, tipo_cultivo):
        if not tipo_cultivo.activo:
            raise serializers.ValidationError(
                "Solo se pueden registrar precios para cultivos activos."
            )
        return tipo_cultivo

    def validate(self, attrs):
        tipo_cultivo = attrs.get(
            "tipo_cultivo",
            self.instance.tipo_cultivo if self.instance else None,
        )
        unidad_medida = attrs.get(
            "unidad_medida",
            self.instance.unidad_medida if self.instance else None,
        )
        vigente_desde = attrs.get(
            "vigente_desde",
            self.instance.vigente_desde if self.instance else None,
        )
        existe = PrecioProducto.objects.filter(
            tipo_cultivo=tipo_cultivo,
            unidad_medida=unidad_medida,
            vigente_desde=vigente_desde,
        )
        if self.instance:
            existe = existe.exclude(pk=self.instance.pk)
        if existe.exists():
            raise serializers.ValidationError(
                {
                    "vigente_desde": (
                        "Ya existe una tarifa para este cultivo, unidad y fecha."
                    )
                }
            )
        return attrs

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
    precio_aplicado = serializers.PrimaryKeyRelatedField(read_only=True)

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
            "precio_aplicado",
            "subtotal",
        ]
        read_only_fields = ["id", "precio_unitario", "precio_aplicado"]
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
        detalles_enviados = attrs.get("detalles")
        fecha_venta = attrs.get(
            "fecha_venta",
            self.instance.fecha_venta if self.instance else None,
        )

        detalles = detalles_enviados
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

        if detalles_enviados is not None:
            self.asignar_precios_vigentes(
                detalles_enviados,
                fecha_venta,
                venta=self.instance,
            )

        validar_disponibilidad(detalles, productor, venta=self.instance)
        return attrs

    @staticmethod
    def asignar_precios_vigentes(detalles, fecha_venta, venta=None):
        precios_existentes_por_cosecha = {}
        if venta:
            existentes = venta.detalles.select_related(
                "precio_aplicado",
            ).order_by("id")
            for detalle_existente in existentes:
                precios_existentes_por_cosecha.setdefault(
                    detalle_existente.cosecha_id,
                    [],
                ).append(detalle_existente)

        detalles_nuevos = []
        for detalle in detalles:
            existentes = precios_existentes_por_cosecha.get(
                detalle["cosecha"].pk,
                [],
            )
            if existentes:
                detalle_existente = existentes.pop(0)
                detalle["precio_unitario"] = detalle_existente.precio_unitario
                if detalle_existente.precio_aplicado_id:
                    detalle["precio_aplicado"] = (
                        detalle_existente.precio_aplicado
                    )
                continue
            detalles_nuevos.append(detalle)

        claves = {
            (
                detalle["cosecha"].lote.tipo_cultivo_id,
                detalle["cosecha"].unidad_medida,
            )
            for detalle in detalles_nuevos
        }
        ids_cultivos = {tipo_cultivo_id for tipo_cultivo_id, _ in claves}
        unidades = {unidad for _, unidad in claves}
        tarifas = (
            PrecioProducto.objects.filter(
                tipo_cultivo_id__in=ids_cultivos,
                unidad_medida__in=unidades,
                vigente_desde__lte=fecha_venta,
            )
            .order_by(
                "tipo_cultivo_id",
                "unidad_medida",
                "-vigente_desde",
                "-id",
            )
        )
        precios_por_clave = {}
        for precio in tarifas:
            clave = (precio.tipo_cultivo_id, precio.unidad_medida)
            if clave not in precios_por_clave:
                precios_por_clave[clave] = precio

        errores = []
        for detalle in detalles_nuevos:
            cosecha = detalle["cosecha"]
            clave = (cosecha.lote.tipo_cultivo_id, cosecha.unidad_medida)
            precio = precios_por_clave.get(clave)
            if precio is None:
                errores.append(
                    f"No hay una tarifa vigente para "
                    f"{cosecha.lote.tipo_cultivo.nombre} por "
                    f"{cosecha.get_unidad_medida_display()} el "
                    f"{fecha_venta:%d/%m/%Y}."
                )
                continue

            detalle["precio_aplicado"] = precio
            detalle["precio_unitario"] = precio.precio_unitario

        if errores:
            raise serializers.ValidationError({"detalles": errores})

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
