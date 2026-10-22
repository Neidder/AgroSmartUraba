
from rest_framework import serializers
from .models import TipoCultivo, Lote


class TipoCultivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoCultivo
        fields = "__all__"


class LoteSerializer(serializers.ModelSerializer):
    nombre_finca = serializers.CharField(
        source="finca.nombre",
        read_only=True,
    )
    nombre_tipo_cultivo = serializers.CharField(
        source="tipo_cultivo.nombre",
        read_only=True,
    )

    class Meta:
        model = Lote
        fields = "__all__"
        read_only_fields = ["id", "fecha_creacion"]
