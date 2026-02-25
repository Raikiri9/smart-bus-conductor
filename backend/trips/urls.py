from django.urls import path
from .views import (
    create_trip,
    validate_qr,
    active_trips,
    initiate_payment,
    payment_status,
    get_test_data,
    send_qr_email,
    health_check,
    # Simulation endpoints
    create_gps_simulation,
    get_next_gps_point,
    reset_gps_simulation,
    list_simulations,
)

urlpatterns = [
    path('health/', health_check),
    path('create/', create_trip),
    path('validate/', validate_qr),
    path('active/', active_trips),
    path('payment/initiate/', initiate_payment),
    path('payment/status/<str:reference>/', payment_status),
    path('payment/test-data/', get_test_data),
    path('send-qr-email/', send_qr_email),
    
    # Simulation endpoints
    path('simulate/gps/create/', create_gps_simulation),
    path('simulate/gps/next/<str:session_id>/', get_next_gps_point),
    path('simulate/gps/reset/<str:session_id>/', reset_gps_simulation),
    path('simulate/gps/list/', list_simulations),
]
