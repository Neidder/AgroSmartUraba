from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Productor
from .serializers import ProductorSerializer


class ProductorViewSet(viewsets.ModelViewSet):
    serializer_class = ProductorSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Productor.objects.all().order_by("-id")

        activo = self.request.query_params.get("activo")

        if activo is not None:
            if activo.lower() == "true":
                queryset = queryset.filter(activo=True)
            elif activo.lower() == "false":
                queryset = queryset.filter(activo=False)

        return queryset

