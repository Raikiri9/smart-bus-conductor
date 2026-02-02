from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('trips', '0002_trip'),
    ]

    operations = [
        migrations.AddField(
            model_name='trip',
            name='payment_method',
            field=models.CharField(
                blank=True,
                choices=[('ecocash', 'EcoCash'), ('card', 'Card'), ('test', 'Test Mode')],
                default='ecocash',
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='trip',
            name='payment_status',
            field=models.CharField(
                blank=True,
                choices=[('pending', 'Pending'), ('processing', 'Processing'), ('success', 'Success'), ('failed', 'Failed')],
                default='pending',
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='trip',
            name='payer_phone',
            field=models.CharField(blank=True, max_length=15, null=True),
        ),
        migrations.AddField(
            model_name='trip',
            name='paynow_reference',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='trip',
            name='payment_timestamp',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
