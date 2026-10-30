
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from ventas.models import DetalleVenta, Venta
from .models import Cosecha


class CosechaSerializer(serializers.ModelSerializer):
    nombre_lote = serializers.CharField(
        source="lote.nombre",
        read_only=True,
    )
    nombre_finca = serializers.CharField(
        source="lote.finca.nombre",
        read_only=True,
    )
    nombre_tipo_cultivo = serializers.CharField(
        source="lote.tipo_cultivo.nombre",
        read_only=True,
    )
    unidad_medida_display = serializers.CharField(
        source="get_unidad_medida_display",
        read_only=True,
    )

    class Meta:
        model = Cosecha
        fields = "__all__"
        read_only_fields = ["id", "fecha_creacion"]
        extra_kwargs = {
            "cantidad": {
                "min_value": Decimal("0.01"),
                "max_digits": 12,
                "decimal_places": 2,
            },
        }

    def validate(self, attrs):
        lote = attrs.get("lote", self.instance.lote if self.instance else None)
        fecha_cosecha = attrs.get(
            "fecha_cosecha",
            self.instance.fecha_cosecha if self.instance else None,
        )
        cantidad = attrs.get(
            "cantidad",
            self.instance.cantidad if self.instance else None,
        )
        unidad_medida = attrs.get(
            "unidad_medida",
            self.instance.unidad_medida if self.instance else None,
        )

        if fecha_cosecha and fecha_cosecha > timezone.localdate():
            raise serializers.ValidationError(
                {"fecha_cosecha": "La fecha de cosecha no puede ser futura."}
            )

        if lote and not lote.activo and (
            self.instance is None or self.instance.lote_id != lote.pk
        ):
            raise serializers.ValidationError(
                {"lote": "Selecciona un lote activo."}
            )

        if self.instance:
            detalles_venta = DetalleVenta.objects.filter(cosecha=self.instance)
            if detalles_venta.exists():
                if self.instance.lote_id != lote.pk:
                    raise serializers.ValidationError(
                        {
                            "lote": (
                                "No se puede cambiar el lote de una cosecha "
                                "asociada a ventas."
                            )
                        }
                    )

                if self.instance.unidad_medida != unidad_medida:
                    raise serializers.ValidationError(
                        {
                            "unidad_medida": (
                                "No se puede cambiar la unidad de una cosecha "
                                "asociada a ventas."
                            )
                        }
                    )

                cantidad_vendida = detalles_venta.filter(
                    venta__estado=Venta.Estado.REGISTRADA,
                ).aggregate(total=Sum("cantidad"))["total"] or Decimal("0.00")
                if cantidad < cantidad_vendida:
                    raise serializers.ValidationError(
                        {
                            "cantidad": (
                                "La cantidad no puede ser menor que la cantidad "
                                f"vendida vigente ({cantidad_vendida})."
                            )
                        }
                    )

        return attrs
