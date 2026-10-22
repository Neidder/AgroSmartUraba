
from rest_framework import serializers
from .models import Finca


class FincaSerializer(serializers.ModelSerializer):
    nombre_productor = serializers.SerializerMethodField()

    class Meta:
        model = Finca
        fields = "__all__"
        read_only_fields = ["id", "fecha_creacion"]

    def get_nombre_productor(self, obj):
        return str(obj.productor)
