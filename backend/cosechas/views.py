from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Cosecha
from .serializers import CosechaSerializer


class CosechaViewSet(viewsets.ModelViewSet):
    serializer_class = CosechaSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Cosecha.objects.select_related(
            "lote",
            "lote__tipo_cultivo",
        ).all()

        lote_id = self.request.query_params.get("lote")
        unidad = self.request.query_params.get("unidad_medida")
        fecha = self.request.query_params.get("fecha_cosecha")

        if lote_id:
            queryset = queryset.filter(lote_id=lote_id)

        if unidad:
            queryset = queryset.filter(unidad_medida=unidad)

        if fecha:
            queryset = queryset.filter(fecha_cosecha=fecha)

        return queryset
