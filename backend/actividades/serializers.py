
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
        read_only_fields = ["id", "fecha_creacion"]

    def get_nombre_responsable(self, obj):
        return str(obj.responsable)
