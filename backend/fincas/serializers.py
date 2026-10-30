
from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers

from productores.models import Productor
from .models import Finca


class FincaSerializer(serializers.ModelSerializer):
    nombre_productor = serializers.SerializerMethodField()

    class Meta:
        model = Finca
        fields = "__all__"
        read_only_fields = ["id", "fecha_creacion"]
        extra_kwargs = {
            "hectareas": {
                "min_value": Decimal("0.01"),
                "max_digits": 10,
                "decimal_places": 2,
            },
        }

    def get_nombre_productor(self, obj):
        return str(obj.productor)

    def validate_productor(self, productor):
        if not productor.activo and (
            self.instance is None or self.instance.productor_id != productor.pk
        ):
            raise serializers.ValidationError(
                "Selecciona un productor activo."
            )
        return productor

    def validate_hectareas(self, hectareas):
        if self.instance:
            area_lotes_activos = self.instance.lotes.filter(
                activo=True,
            ).aggregate(total=Sum("hectareas"))["total"] or Decimal("0")
            if area_lotes_activos > hectareas:
                raise serializers.ValidationError(
                    "El área no puede ser menor que la suma de los lotes activos "
                    f"({area_lotes_activos} ha)."
                )
        return hectareas
