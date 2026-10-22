
from rest_framework import serializers
from .models import CostoProduccion, PerdidaAgricola


class CostoProduccionSerializer(serializers.ModelSerializer):
    nombre_lote = serializers.CharField(
        source="lote.nombre",
        read_only=True
    )
    categoria_display = serializers.CharField(
        source="get_categoria_display",
        read_only=True
    )

    class Meta:
        model = CostoProduccion
        fields = "__all__"
        read_only_fields = ["id", "fecha_creacion"]


class PerdidaAgricolaSerializer(serializers.ModelSerializer):
    nombre_lote = serializers.CharField(
        source="lote.nombre",
        read_only=True
    )
    motivo_display = serializers.CharField(
        source="get_motivo_display",
        read_only=True
    )

    class Meta:
        model = PerdidaAgricola
        fields = "__all__"
        read_only_fields = ["id", "fecha_creacion"]
