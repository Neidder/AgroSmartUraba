from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import CostoProduccion, PerdidaAgricola
from .serializers import (
    CostoProduccionSerializer,
    PerdidaAgricolaSerializer,
)


class CostoProduccionViewSet(viewsets.ModelViewSet):
    queryset = CostoProduccion.objects.select_related("lote").all()
    serializer_class = CostoProduccionSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()

        lote = self.request.query_params.get("lote")
        categoria = self.request.query_params.get("categoria")
        fecha = self.request.query_params.get("fecha_gasto")

        if lote:
            queryset = queryset.filter(lote_id=lote)

        if categoria:
            queryset = queryset.filter(categoria=categoria)

        if fecha:
            queryset = queryset.filter(fecha_gasto=fecha)

        return queryset


class PerdidaAgricolaViewSet(viewsets.ModelViewSet):
    queryset = PerdidaAgricola.objects.select_related("lote").all()
    serializer_class = PerdidaAgricolaSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()

        lote = self.request.query_params.get("lote")
        motivo = self.request.query_params.get("motivo")
        fecha = self.request.query_params.get("fecha_perdida")

        if lote:
            queryset = queryset.filter(lote_id=lote)

        if motivo:
            queryset = queryset.filter(motivo=motivo)

        if fecha:
            queryset = queryset.filter(fecha_perdida=fecha)

        return queryset
