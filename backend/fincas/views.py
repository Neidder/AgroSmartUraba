from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Finca
from .serializers import FincaSerializer


class FincaViewSet(viewsets.ModelViewSet):
    serializer_class = FincaSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Finca.objects.select_related("productor").order_by("-id")

        activa = self.request.query_params.get("activa")

        if activa is not None:
            if activa.lower() == "true":
                queryset = queryset.filter(activa=True)
            elif activa.lower() == "false":
                queryset = queryset.filter(activa=False)

        productor_id = self.request.query_params.get("productor")

        if productor_id:
            queryset = queryset.filter(productor_id=productor_id)

        return queryset
