
from django.db import models
from productores.models import Productor


class Finca(models.Model):
    productor = models.ForeignKey(
        Productor,
        on_delete=models.PROTECT,
        related_name="fincas",
    )
    nombre = models.CharField(max_length=150)
    municipio = models.CharField(max_length=100)
    vereda = models.CharField(max_length=100, blank=True)
    direccion = models.CharField(max_length=200, blank=True)
    hectareas = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )
    observaciones = models.TextField(blank=True)
    activa = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "fincas"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(hectareas__gt=0),
                name="finca_hectareas_mayores_cero",
            ),
        ]

    def __str__(self):
        return self.nombre
