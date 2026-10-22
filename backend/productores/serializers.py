
from rest_framework import serializers
from .models import Productor


class ProductorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Productor
        fields = "__all__"
        read_only_fields = ["id", "fecha_creacion"]
