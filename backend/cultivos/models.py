
from django.db import models
from fincas.models import Finca


class TipoCultivo(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "tipos_cultivo"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Lote(models.Model):
    finca = models.ForeignKey(
        Finca,
        on_delete=models.PROTECT,
        related_name="lotes",
    )
    tipo_cultivo = models.ForeignKey(
        TipoCultivo,
        on_delete=models.PROTECT,
        related_name="lotes",
    )
    nombre = models.CharField(max_length=100)
    hectareas = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_siembra = models.DateField(null=True, blank=True)
    fecha_fin_estimada = models.DateField(null=True, blank=True)
    observaciones = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "lotes"
        ordering = ["nombre"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(hectareas__gt=0),
                name="lote_hectareas_mayores_cero",
            ),
        ]

    def __str__(self):
        return f"{self.nombre} - {self.tipo_cultivo.nombre}"
