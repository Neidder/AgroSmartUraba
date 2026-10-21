
from django.db import models


class Productor(models.Model):

    class TipoDocumento(models.TextChoices):
        CC = "CC", "Cédula de ciudadanía"
        CE = "CE", "Cédula de extranjería"
        NIT = "NIT", "NIT"
        OTRO = "OTRO", "Otro"

    tipo_documento = models.CharField(
        max_length=5,
        choices=TipoDocumento.choices,
    )
    numero_documento = models.CharField(
        max_length=30,
        unique=True,
    )
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20, blank=True)
    correo = models.EmailField(blank=True)
    direccion = models.CharField(max_length=200, blank=True)
    municipio = models.CharField(max_length=100, blank=True)
    observaciones = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "productores"

    def __str__(self):
        return f"{self.nombres} {self.apellidos}"
