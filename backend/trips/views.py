import json
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Trip, PassengerTrip
from .paynow_utils import (
	create_ecocash_payment,
	create_card_payment,
	get_payment_status,
	get_test_phone_numbers,
	get_test_card_tokens,
	TEST_MODE,
)


def health_check(request):
	return JsonResponse({"status": "ok"})


@csrf_exempt
def create_trip(request):
	if request.method == "POST":
		data = json.loads(request.body)

		# Use QR code from request, or generate UUID as fallback
		qr_id = data.get("qr_code") or str(uuid.uuid4())

		trip = Trip.objects.create(
			phone_number=data["phone_number"],
			origin_lat=data["origin_lat"],
			origin_lng=data["origin_lng"],
			destination_name=data["destination_name"],
			destination_lat=data["destination_lat"],
			destination_lng=data["destination_lng"],
			distance_km=data["distance_km"],
			fare=data["fare"],
		qr_code=qr_id,
		boarded=True  # Payment completed means passenger is boarding
	)

	return JsonResponse({
		"status": "success",
		"qr_code": qr_id,
		"trip_id": trip.id
	})


@csrf_exempt
def validate_qr(request):
	data = json.loads(request.body)
	qr_code = data["qr_code"]
	action = data.get("action", None)  # Can be: "validate", "disembark", "bus_break_out", "bus_break_in"

	try:
		# Find active trip (boarded=True, completed=False)
		trip = Trip.objects.get(qr_code=qr_code, boarded=True, completed=False)
		
		# Handle different actions
		if action == "disembark":
			# Passenger is getting off permanently
			trip.completed = True
			trip.boarded = False
			trip.on_bus_break = False
			trip.save()
			return JsonResponse({
				"status": "valid",
				"action": "disembark",
				"message": "Trip completed successfully"
			})
		
		elif action == "bus_break_out":
			# Passenger is temporarily leaving the bus
			trip.on_bus_break = True
			trip.save()
			return JsonResponse({
				"status": "valid",
				"action": "bus_break_out",
				"message": "Passenger marked as on break"
			})
		
		elif action == "bus_break_in":
			# Passenger is returning to the bus
			trip.on_bus_break = False
			trip.save()
			return JsonResponse({
				"status": "valid",
				"action": "bus_break_in",
				"message": "Passenger marked as back on bus"
			})
		
		else:
			# Default validation - just check if trip is valid without modifying it
			return JsonResponse({
				"status": "valid",
				"trip_id": trip.id,
				"phone_number": trip.phone_number,
				"destination": trip.destination_name,
				"on_bus_break": trip.on_bus_break
			})
	
	except Trip.DoesNotExist:
		return JsonResponse({"status": "invalid", "message": "No active trip found"})


def active_trips(request):
	trips = Trip.objects.filter(boarded=True, completed=False)

	data = []
	for trip in trips:
		data.append({
			"id": trip.id,
			"destination_lat": trip.destination_lat,
			"destination_lng": trip.destination_lng,
			"destination_name": trip.destination_name,
			"distance_km": trip.distance_km,
		})

	return JsonResponse(data, safe=False)


@csrf_exempt
def initiate_payment(request):
	"""
	Initiate a payment via Paynow.
	
	POST data:
	{
		"trip_id": int,
		"payment_method": "ecocash" or "card",
		"phone_number": "+263771234567",
		"payer_phone": "+263779876543" (for ecocash),
		"card_token": "token-or-uuid" (for card),
		"amount": 10.50
	}
	"""
	if request.method != "POST":
		return JsonResponse({"error": "Method not allowed"}, status=405)
	
	try:
		data = json.loads(request.body)
	except json.JSONDecodeError:
		return JsonResponse({"error": "Invalid JSON"}, status=400)
	
	# Validate required fields
	required_fields = ["payment_method", "phone_number", "amount"]
	if not all(field in data for field in required_fields):
		return JsonResponse({"error": "Missing required fields"}, status=400)
	
	payment_method = data.get("payment_method", "").lower()
	phone_number = data.get("phone_number", "")
	amount = float(data.get("amount", 0))
	
	# Generate unique reference
	reference = f"BUS-{timezone.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8]}"
	
	try:
		# Route to appropriate payment handler
		if payment_method == "ecocash":
			payer_phone = data.get("payer_phone", phone_number)
			result = create_ecocash_payment(
				phone_number=phone_number,
				payer_phone=payer_phone,
				reference=reference,
				amount=amount,
				description=f"Bus fare - {data.get('destination', 'Trip')}"
			)
		elif payment_method == "card":
			card_token = data.get("card_token", "")
			result = create_card_payment(
				phone_number=phone_number,
				card_token=card_token,
				reference=reference,
				amount=amount,
				description=f"Bus fare - {data.get('destination', 'Trip')}"
			)
		else:
			return JsonResponse({"error": "Invalid payment method"}, status=400)
		
		# Create or update Trip with payment info
		trip = None
		if "trip_id" in data:
			try:
				trip = Trip.objects.get(id=data["trip_id"])
				trip.payment_method = payment_method
				# Set status based on actual payment result
				trip.payment_status = result.get("status", "processing")
				trip.payer_phone = data.get("payer_phone", phone_number) if payment_method == "ecocash" else None
				trip.paynow_reference = reference
				trip.payment_timestamp = timezone.now()
				trip.save()
			except Trip.DoesNotExist:
				pass
		
		# Return response
		response = {
			"success": result.get("success", False),
			"reference": reference,
			"payment_method": payment_method,
			"amount": amount,
			"status": result.get("status", "pending"),
			"test_mode": TEST_MODE,
		}
		
		if "poll_url" in result:
			response["poll_url"] = result["poll_url"]
		if "error" in result:
			response["error"] = result["error"]
		
		status_code = 200 if result.get("success") else 400
		return JsonResponse(response, status=status_code)
	
	except Exception as e:
		return JsonResponse({
			"error": str(e),
			"reference": reference,
		}, status=500)


@csrf_exempt
def payment_status(request, reference):
	"""
	Check payment status for a given Paynow reference.
	"""
	if request.method != "GET":
		return JsonResponse({"error": "Method not allowed"}, status=405)
	
	try:
		trip = Trip.objects.get(paynow_reference=reference)
		
		# In production, you would poll Paynow here
		# For now, return the current status
		return JsonResponse({
			"reference": reference,
			"status": trip.payment_status,
			"method": trip.payment_method,
			"amount": trip.fare,
			"test_mode": TEST_MODE,
		})
	except Trip.DoesNotExist:
		return JsonResponse({
			"error": "Payment not found",
			"reference": reference,
		}, status=404)


@csrf_exempt
def get_test_data(request):
	"""
	Return test phone numbers and card tokens for development.
	This endpoint should be disabled in production.
	"""
	if not TEST_MODE:
		return JsonResponse({"error": "Test mode is disabled"}, status=403)
	
	return JsonResponse({
		"test_mode": True,
		"ecocash_test_numbers": get_test_phone_numbers(),
		"card_test_tokens": get_test_card_tokens(),
		"merchant_email": "n02218334j@students.nust.ac.zw",
		"info": {
			"success": "Payment will complete within 5 seconds",
			"delayed": "Payment will complete within 30 seconds",
			"failed": "Payment will fail after 30 seconds (user cancelled)",
			"insufficient_balance": "Payment will fail immediately",
		}
	})


@csrf_exempt
def send_qr_email(request):
	"""
	Send QR code to user's email address.
	
	POST data:
	{
		"email": "user@example.com",
		"ticket_id": "BUS-xxx",
		"destination": "Harare",
		"origin": "Bulawayo",
		"fare": 5.00,
		"distance_km": 150,
		"qr_payload": {...}
	}
	"""
	if request.method != "POST":
		return JsonResponse({"success": False, "error": "Method not allowed"}, status=405)
	
	try:
		data = json.loads(request.body)
		email = data.get("email", "").strip()
		ticket_id = data.get("ticket_id", "")
		destination = data.get("destination", "Unknown")
		origin = data.get("origin", "Unknown")
		fare = data.get("fare", 0)
		distance_km = data.get("distance_km", 0)
		qr_payload = data.get("qr_payload", {})
		
		# Validate email
		if not email or "@" not in email:
			return JsonResponse({"success": False, "error": "Invalid email address"})
		
		# Import email functions
		from django.core.mail import EmailMultiAlternatives
		from django.conf import settings
		import json as json_module
		from io import BytesIO
		import qrcode
		from email.mime.image import MIMEImage
		
		# Prepare email content
		qr_json = json_module.dumps(qr_payload, indent=2)
		qr_image = qrcode.make(qr_json)
		qr_buffer = BytesIO()
		qr_image.save(qr_buffer, format="PNG")
		qr_bytes = qr_buffer.getvalue()
		
		subject = f"Your Smart Bus Ticket - {ticket_id}"
		
		html_message = f"""
		<html>
		<head>
			<style>
				body {{ font-family: Arial, sans-serif; background-color: #f5f5f5; }}
				.container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
				.header {{ text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3B82F6; padding-bottom: 20px; }}
				.header h1 {{ color: #0F172A; margin: 0; font-size: 28px; }}
				.header p {{ color: #666; margin: 5px 0 0 0; }}
				.ticket-details {{ background-color: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 20px; }}
				.detail-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }}
				.detail-row:last-child {{ border-bottom: none; }}
				.detail-label {{ color: #666; font-weight: bold; }}
				.detail-value {{ color: #000; }}
				.qr-section {{ text-align: center; margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 6px; }}
				.qr-section h3 {{ color: #0F172A; margin-top: 0; }}
				.qr-code {{ background-color: #ffffff; padding: 10px; border: 1px solid #e5e7eb; border-radius: 4px; display: inline-block; }}
				.qr-payload {{ background-color: #0F172A; color: #e5e7eb; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; text-align: left; margin-top: 15px; overflow-x: auto; }}
				.instructions {{ background-color: #ecfdf5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 4px; }}
				.instructions h3 {{ color: #065f46; margin-top: 0; }}
				.instructions ol {{ color: #047857; margin: 10px 0; }}
				.footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; }}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>🚌 Smart Bus Ticket</h1>
					<p>Your Journey Confirmation</p>
				</div>
				
				<div class="ticket-details">
					<div class="detail-row">
						<span class="detail-label">Ticket ID:</span>
						<span class="detail-value"><strong>{ticket_id}</strong></span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Origin:</span>
						<span class="detail-value">{origin}</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Destination:</span>
						<span class="detail-value">{destination}</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Distance:</span>
						<span class="detail-value">{distance_km:.1f} km</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Fare:</span>
						<span class="detail-value">${fare:.2f}</span>
					</div>
				</div>
				
				<div class="instructions">
					<h3>📋 How to Use Your Ticket:</h3>
					<ol>
						<li>Keep this email and the QR code below safe</li>
						<li>Keep your ticket throughout your journey</li>
					</ol>
				</div>
				
				<div class="qr-section">
					<h3>Your QR Code:</h3>
					<p>Use this QR code for boarding:</p>
					<div class="qr-code">
						<img src="cid:qr_code" alt="QR Code" style="width: 220px; height: 220px;" />
					</div>
					<p style="color: #666; font-size: 12px; margin-top: 10px;">
						If you cannot scan, show this code to the bus driver
					</p>
				</div>
				
				<div class="footer">
					<p>Thank you for using Smart Bus Conductor!</p>
					<p>Questions? Contact our support team</p>
					<p style="color: #ccc; margin-top: 10px;">© 2026 Smart Bus Conductor. All rights reserved.</p>
				</div>
			</div>
		</body>
		</html>
		"""
		
		def mark_passenger_trip():
			PassengerTrip.objects.update_or_create(
				ticket_id=ticket_id,
				defaults={
					"origin": origin,
					"destination": destination,
					"fare": fare,
					"distance_km": distance_km,
					"origin_lat": data.get("origin_lat"),
					"origin_lon": data.get("origin_lon"),
					"destination_lat": data.get("destination_lat"),
					"destination_lon": data.get("destination_lon"),
					"status": "active",
				},
			)

		# Send email
		try:
			text_message = f"Your ticket ID: {ticket_id}\n\nQR Payload:\n{qr_json}"
			message = EmailMultiAlternatives(
				subject=subject,
				body=text_message,
				from_email=settings.DEFAULT_FROM_EMAIL or "noreply@smartbus.com",
				to=[email],
			)
			message.attach_alternative(html_message, "text/html")
			image = MIMEImage(qr_bytes, _subtype="png")
			image.add_header("Content-ID", "<qr_code>")
			image.add_header("Content-Disposition", "inline", filename="qr.png")
			message.attach(image)
			message.send()

			# Update passenger trip record after successful email send
			mark_passenger_trip()
			
			return JsonResponse({
				"success": True,
				"message": f"QR code sent successfully to {email}"
			})
		
		except Exception as email_error:
			error_text = str(email_error)
			print(f"Email sending error: {email_error}")
			if "CERTIFICATE_VERIFY_FAILED" in error_text:
				try:
					import smtplib
					from email.message import EmailMessage
					import ssl as ssl_module

					msg = EmailMessage()
					msg["Subject"] = subject
					msg["From"] = settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER or "noreply@smartbus.com"
					msg["To"] = email
					msg.set_content(text_message)
					msg.add_alternative(html_message, subtype="html")
					msg.get_payload()[1].add_related(qr_bytes, maintype="image", subtype="png", cid="qr_code", filename="qr.png")

					host = getattr(settings, "EMAIL_HOST", "smtp.gmail.com")
					port = getattr(settings, "EMAIL_PORT", 587)
					use_tls = getattr(settings, "EMAIL_USE_TLS", True)
					use_ssl = getattr(settings, "EMAIL_USE_SSL", False)
					user = getattr(settings, "EMAIL_HOST_USER", "")
					password = getattr(settings, "EMAIL_HOST_PASSWORD", "")

					context = ssl_module._create_unverified_context()
					if use_ssl:
						with smtplib.SMTP_SSL(host, port, context=context) as server:
							if user and password:
								server.login(user, password)
							server.send_message(msg)
					else:
						with smtplib.SMTP(host, port) as server:
							server.ehlo()
							if use_tls:
								server.starttls(context=context)
								server.ehlo()
							if user and password:
								server.login(user, password)
							server.send_message(msg)

					mark_passenger_trip()
					return JsonResponse({
						"success": True,
						"message": f"QR code sent successfully to {email}"
					})
				except Exception as fallback_error:
					print(f"Email fallback error: {fallback_error}")
					return JsonResponse({
						"success": False,
						"error": f"Failed to send email: {str(fallback_error)}"
					}, status=500)

			return JsonResponse({
				"success": False,
				"error": f"Failed to send email: {str(email_error)}"
			}, status=500)
	
	except Exception as error:
		print(f"Error in send_qr_email: {error}")
		return JsonResponse({
			"success": False,
			"error": f"Internal server error: {str(error)}"
		}, status=500)


# ============================================================
# SIMULATION API ENDPOINTS
# ============================================================

@csrf_exempt
def create_gps_simulation(request):
	"""
	Create a GPS simulation session with a path of waypoints.
	
	POST data:
	{
		"session_id": "simulation-1",
		"name": "Harare to Bulawayo",
		"description": "Highway route",
		"waypoints": [
			{"lat": -17.8292, "lng": 31.0522, "heading": 180, "speed": 20},
			{"lat": -17.8300, "lng": 31.0522, "heading": 180, "speed": 20},
			...
		]
	}
	"""
	if request.method != "POST":
		return JsonResponse({"error": "Method not allowed"}, status=405)
	
	try:
		from .models import GPSSimulationSession, GPSSimulationPoint
		
		data = json.loads(request.body)
		session_id = data.get("session_id", f"sim-{uuid.uuid4().hex[:8]}")
		name = data.get("name", "Unnamed Simulation")
		description = data.get("description", "")
		waypoints = data.get("waypoints", [])
		
		# Delete existing session with same ID
		GPSSimulationSession.objects.filter(session_id=session_id).delete()
		
		# Create new session
		session = GPSSimulationSession.objects.create(
			session_id=session_id,
			name=name,
			description=description,
			current_index=0,
			is_active=True
		)
		
		# Create waypoints
		for idx, point in enumerate(waypoints):
			GPSSimulationPoint.objects.create(
				session=session,
				sequence=idx,
				latitude=point["lat"],
				longitude=point["lng"],
				heading=point.get("heading", None),
				speed=point.get("speed", None),
				timestamp_offset=point.get("timestamp_offset", idx * 2)
			)
		
		return JsonResponse({
			"success": True,
			"session_id": session_id,
			"waypoint_count": len(waypoints),
			"deep_link": f"smartbusapp://simulate/gps?session_id={session_id}"
		})
	
	except Exception as error:
		return JsonResponse({"error": str(error)}, status=400)


@csrf_exempt
def get_next_gps_point(request, session_id):
	"""
	Get the next GPS point in a simulation session.
	Called repeatedly by the app to simulate movement.
	"""
	try:
		from .models import GPSSimulationSession, GPSSimulationPoint
		
		session = GPSSimulationSession.objects.get(session_id=session_id)
		
		if not session.is_active:
			return JsonResponse({"completed": True, "message": "Simulation ended"})
		
		# Get next point
		points = list(session.points.all())
		
		if session.current_index >= len(points):
			session.is_active = False
			session.save()
			return JsonResponse({"completed": True, "message": "Path completed"})
		
		point = points[session.current_index]
		
		# Increment index for next call
		session.current_index += 1
		session.save()
		
		return JsonResponse({
			"completed": False,
			"location": {
				"lat": point.latitude,
				"lng": point.longitude,
				"heading": point.heading,
				"speed": point.speed
			},
			"progress": {
				"current": session.current_index,
				"total": len(points)
			}
		})
	
	except GPSSimulationSession.DoesNotExist:
		return JsonResponse({"error": "Session not found"}, status=404)
	except Exception as error:
		return JsonResponse({"error": str(error)}, status=400)


@csrf_exempt
def reset_gps_simulation(request, session_id):
	"""Reset a simulation back to the beginning"""
	try:
		from .models import GPSSimulationSession
		
		session = GPSSimulationSession.objects.get(session_id=session_id)
		session.current_index = 0
		session.is_active = True
		session.save()
		
		return JsonResponse({"success": True, "message": "Simulation reset"})
	
	except GPSSimulationSession.DoesNotExist:
		return JsonResponse({"error": "Session not found"}, status=404)


@csrf_exempt
def list_simulations(request):
	"""List all available GPS simulations"""
	try:
		from .models import GPSSimulationSession
		
		sessions = GPSSimulationSession.objects.all()
		
		data = []
		for session in sessions:
			data.append({
				"session_id": session.session_id,
				"name": session.name,
				"description": session.description,
				"waypoint_count": session.points.count(),
				"current_index": session.current_index,
				"is_active": session.is_active,
				"deep_link": f"smartbusapp://simulate/gps?session_id={session.session_id}"
			})
		
		return JsonResponse({"simulations": data})
	
	except Exception as error:
		return JsonResponse({"error": str(error)}, status=400)
