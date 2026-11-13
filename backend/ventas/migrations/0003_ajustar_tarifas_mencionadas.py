import unicodedata
from decimal import Decimal

from django.db import migrations


AJUSTES = (
    ("banano", "KG", Decimal("2320.00"), Decimal("23200.00")),
    ("platano", "KG", Decimal("1631.50"), Decimal("16310.00")),
    ("platano", "TON", Decimal("2599.40"), Decimal("2599000.00")),
)


def normalizar_nombre(nombre):
    descompuesto = unicodedata.normalize("NFD", nombre.casefold())
    return "".join(
        caracter
        for caracter in descompuesto
        if unicodedata.category(caracter) != "Mn"
    )


def ajustar_tarifas(apps, schema_editor):
    PrecioProducto = apps.get_model("ventas", "PrecioProducto")
    alias = schema_editor.connection.alias

    tarifas = PrecioProducto.objects.using(alias).select_related("tipo_cultivo")
    for tarifa in tarifas.iterator():
        nombre_cultivo = normalizar_nombre(tarifa.tipo_cultivo.nombre)
        for cultivo, unidad, precio_anterior, precio_corregido in AJUSTES:
            if (
                nombre_cultivo == cultivo
                and tarifa.unidad_medida == unidad
                and tarifa.precio_unitario == precio_anterior
            ):
                tarifa.precio_unitario = precio_corregido
                tarifa.save(using=alias, update_fields=["precio_unitario"])
                break


def revertir_ajuste(apps, schema_editor):
    PrecioProducto = apps.get_model("ventas", "PrecioProducto")
    alias = schema_editor.connection.alias

    tarifas = PrecioProducto.objects.using(alias).select_related("tipo_cultivo")
    for tarifa in tarifas.iterator():
        nombre_cultivo = normalizar_nombre(tarifa.tipo_cultivo.nombre)
        for cultivo, unidad, precio_anterior, precio_corregido in AJUSTES:
            if (
                nombre_cultivo == cultivo
                and tarifa.unidad_medida == unidad
                and tarifa.precio_unitario == precio_corregido
            ):
                tarifa.precio_unitario = precio_anterior
                tarifa.save(using=alias, update_fields=["precio_unitario"])
                break


class Migration(migrations.Migration):

    dependencies = [
        ("ventas", "0002_precioproducto_detalleventa_precio_aplicado_and_more"),
    ]

    operations = [
        migrations.RunPython(ajustar_tarifas, revertir_ajuste),
    ]
