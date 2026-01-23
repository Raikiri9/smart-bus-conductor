from rest_framework import serializers
from .models import PassengerTrip


class PassengerTripSerializer(serializers.ModelSerializer):
    class Meta:
        model = PassengerTrip
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
