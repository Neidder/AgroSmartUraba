
from decimal import Decimal

from rest_framework import serializers
from .models import Actividad


class ActividadSerializer(serializers.ModelSerializer):
    nombre_lote = serializers.CharField(
        source="lote.nombre",
        read_only=True,
    )
    nombre_responsable = serializers.SerializerMethodField()
    tipo_display = serializers.CharField(
        source="get_tipo_display",
        read_only=True,
    )

    class Meta:
        model = Actividad
        fields = "__all__"
        read_only_fields = ["id", "responsable", "fecha_creacion"]
        extra_kwargs = {
            "costo": {
                "min_value": Decimal("0"),
                "max_digits": 12,
                "decimal_places": 2,
            },
        }

    def get_nombre_responsable(self, obj):
        nombre = obj.responsable.get_full_name()
        return nombre or obj.responsable.username

    def validate(self, attrs):
        lote = attrs.get("lote", self.instance.lote if self.instance else None)
        activo = attrs.get(
            "activo",
            self.instance.activo if self.instance else True,
        )
        reactivando = (
            self.instance is not None
            and not self.instance.activo
            and activo
        )

        if lote and not lote.activo and (
            self.instance is None
            or self.instance.lote_id != lote.pk
            or reactivando
        ):
            raise serializers.ValidationError(
                {"lote": "Selecciona un lote activo."}
            )

        return attrs
