from django.urls import path
from .views import create_trip, validate_qr, active_trips

urlpatterns = [
    path('create/', create_trip),
    path('validate/', validate_qr),
    path('active/', active_trips),
]
