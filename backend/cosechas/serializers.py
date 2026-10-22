
from rest_framework import serializers
from .models import Cosecha


class CosechaSerializer(serializers.ModelSerializer):
    nombre_lote = serializers.CharField(
        source="lote.nombre",
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
