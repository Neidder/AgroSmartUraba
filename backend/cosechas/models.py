
from django.db import models
from cultivos.models import Lote


class Cosecha(models.Model):

    class UnidadMedida(models.TextChoices):
        KILOGRAMOS = "KG", "Kilogramos"
        TONELADAS = "TON", "Toneladas"
        UNIDADES = "UND", "Unidades"
        CAJAS = "CAJAS", "Cajas"

    lote = models.ForeignKey(
        Lote,
        on_delete=models.PROTECT,
        related_name="cosechas",
    )

    fecha_cosecha = models.DateField()

    cantidad = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    unidad_medida = models.CharField(
        max_length=5,
        choices=UnidadMedida.choices,
        default=UnidadMedida.KILOGRAMOS,
    )

    observaciones = models.TextField(blank=True)

    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cosechas"
        ordering = ["-fecha_cosecha"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(cantidad__gt=0),
                name="cosecha_cantidad_mayor_cero",
            ),
        ]

    def __str__(self):
        return (
            f"Cosecha de {self.lote.nombre} "
            f"- {self.fecha_cosecha}"
        )

