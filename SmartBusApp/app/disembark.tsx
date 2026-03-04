import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { decrementPassengerCount } from '../utils/passengerCounter';
import { Camera, CameraView, BarcodeScanningResult } from 'expo-camera';
import { API_BASE_URL } from '../utils/api';

export default function DisembarkScreen() {
	const [qrCode, setQrCode] = useState('');
	const [hasPermission, setHasPermission] = useState<boolean | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [scanningEnabled, setScanningEnabled] = useState(true);
	const [validationMessage, setValidationMessage] = useState<string>('');
	const [validationType, setValidationType] = useState<'none' | 'success' | 'error'>('none');
	const [lastTicket, setLastTicket] = useState<string>('');
	const [lastPassenger, setLastPassenger] = useState<{ destination?: string; origin?: string; fare?: number } | null>(null);
	const cameraRef = useRef<CameraView>(null);
	const lastScannedRef = useRef<string>('');

	useEffect(() => {
		(async () => {
			const { status } = await Camera.requestCameraPermissionsAsync();
			setHasPermission(status === 'granted');
		})();
	}, []);

	const parseQrPayload = (raw: string) => {
		try {
			const parsed = JSON.parse(raw);
			const hasTicket = typeof parsed.ticketId === 'string' && parsed.ticketId.startsWith('BUS-');
			const hasDestination = typeof parsed.destination === 'string' && parsed.destination.length > 0;
			const hasOrigin = typeof parsed.origin === 'string' && parsed.origin.length > 0;
			if (!hasTicket || !hasDestination || !hasOrigin) return null;
			return parsed as {
				ticketId: string;
				destination: string;
				origin: string;
				fare?: number;
				distanceKm?: number | null;
				timestamp?: string;
			};
		} catch (error) {
			return null;
		}
	};

	const handleValidPassenger = async (payload: { ticketId: string; destination: string; origin: string; fare?: number }) => {
		setIsProcessing(true);
		try {
			// Validate against backend and mark as completed
			const ok = await validateOnServer(payload.ticketId);
			if (!ok) {
				setValidationType('error');
				setValidationMessage('QR not recognized or already processed.');
				return;
			}

			await decrementPassengerCount();
			setValidationType('success');
			setValidationMessage('Passenger disembarked. Seat count updated.');
			setLastTicket(payload.ticketId);
			setLastPassenger({ destination: payload.destination, origin: payload.origin, fare: payload.fare });
			setScanningEnabled(false);
		} catch (error) {
			setValidationType('error');
			setValidationMessage('Unable to update seats. Try again.');
		} finally {
			setIsProcessing(false);
		}
	};

	const validateOnServer = async (qr: string) => {
		try {
			const res = await fetch(`${API_BASE_URL}/api/trips/validate/`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ qr_code: qr, action: 'disembark' }),
			});
			const data = await res.json();
			return data?.status === 'valid';
		} catch (error) {
			return false;
		}
	};

	const handleScan = async (frame: BarcodeScanningResult) => {
		console.log('QR scan detected:', frame);
		if (!scanningEnabled || isProcessing || !frame) {
			console.log('Scan ignored - scanningEnabled:', scanningEnabled, 'isProcessing:', isProcessing, 'frame:', !!frame);
			return;
		}
		
		const data = frame.data;
		console.log('QR code data:', data);
		if (typeof data === 'string') {
			// Direct string data from camera
			if (lastScannedRef.current === data) {
				console.log('Duplicate scan ignored');
				return; // Debounce
			}
			lastScannedRef.current = data;
			const payload = parseQrPayload(data) ?? { ticketId: data, destination: '', origin: '' };
			console.log('Processing QR payload:', payload);
			await handleValidPassenger(payload as any);
		}
	};

	const handleManualValidate = async () => {
		if (!qrCode.trim()) {
			Alert.alert('QR required', 'Please enter the QR code content.');
			return;
		}
		const payload = parseQrPayload(qrCode.trim()) ?? { ticketId: qrCode.trim(), destination: '', origin: '' };
		await handleValidPassenger(payload as any);
	};

	const handleResetScanner = () => {
		console.log('Resetting scanner');
		setScanningEnabled(true);
		setValidationType('none');
		setValidationMessage('');
		setLastTicket('');
		setLastPassenger(null);
		lastScannedRef.current = ''; // Clear debounce
	};

	return (
		<View style={styles.container}>
			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Text style={styles.backButtonText}>← Back to Home</Text>
				</TouchableOpacity>

			<View style={styles.card}>
				<View style={styles.header}>
					<Text style={styles.icon}>🧾</Text>
					<View style={styles.headerTextWrap}>
						<Text style={styles.headerTitle}>Disembark Scanner</Text>
						<Text style={styles.headerSubtitle}>Scan your QR code to exit the bus</Text>
					</View>
				</View>

				<View style={styles.scannerBox}>
			{hasPermission === false ? (
				<Text style={styles.permissionText}>Camera permission denied. Enable it in settings to scan.</Text>
			) : hasPermission === null ? (
				<Text style={styles.permissionText}>Requesting camera permission...</Text>
			) : (
				<CameraView
					ref={cameraRef}
					style={styles.barcode}
				facing="front"
				barcodeScannerSettings={{
					barcodeTypes: ['qr'],
				}}
					onBarcodeScanned={scanningEnabled ? handleScan : undefined}
				/>
			)}
			<Text style={styles.scannerText}>{scanningEnabled ? 'Position QR code within frame' : 'Scan completed'}</Text>
		</View>

			{validationType !== 'none' && (
				<View style={styles.statusBar}>
					<Text style={[styles.statusText, validationType === 'success' ? styles.statusSuccess : styles.statusError]}>
						{validationMessage || (validationType === 'success' ? 'Processed successfully.' : 'There was a problem.')}
					</Text>
					{lastTicket ? (
						<Text style={styles.ticketMeta}>{lastPassenger?.origin ?? 'Origin'} → {lastPassenger?.destination ?? 'Destination'} {lastPassenger?.fare ? `• $${lastPassenger.fare}` : ''}</Text>
					) : null}
				</View>
			)}
				<Text style={styles.manualLabel}>Or enter QR code manually:</Text>
				<View style={styles.inputRow}>
					<Text style={styles.inputLabel}>QR Code</Text>
					<TextInput
						style={styles.input}
						placeholder="Enter QR code (e.g., BUS-1234567890-ABC)"
						placeholderTextColor="#64748B"
						value={qrCode}
						onChangeText={setQrCode}
					/>
				</View>

				<TouchableOpacity style={[styles.scanButton, isProcessing && styles.scanButtonDisabled]} onPress={handleManualValidate} disabled={isProcessing}>
					<Text style={styles.scanButtonText}>{isProcessing ? 'Processing...' : 'Validate QR Manually'}</Text>
				</TouchableOpacity>

				<TouchableOpacity style={styles.secondaryButton} onPress={handleResetScanner} disabled={isProcessing}>
					<Text style={styles.secondaryButtonText}>Reset Scanner</Text>
				</TouchableOpacity>

				<View style={styles.separator} />

				<Text style={styles.instructionsTitle}>Instructions:</Text>
				<View style={styles.bulletRow}>
					<Text style={styles.bullet}>✔</Text>
					<Text style={styles.bulletText}>Present your QR code to the scanner</Text>
				</View>
				<View style={styles.bulletRow}>
					<Text style={styles.bullet}>✔</Text>
					<Text style={styles.bulletText}>Wait for driver confirmation</Text>
				</View>
				<View style={styles.bulletRow}>
					<Text style={styles.bullet}>✔</Text>
					<Text style={styles.bulletText}>Door will open automatically</Text>
				</View>
			</View>

			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#0F172A',
	},
	scrollView: {
		flex: 1,
	},
	backButton: {
		paddingHorizontal: 20,
		paddingVertical: 16,
	},
	backButtonText: {
		color: '#3B82F6',
		fontSize: 16,
		fontWeight: '500',
	},
	card: {
		backgroundColor: '#1E293B',
		marginHorizontal: 16,
		padding: 20,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#334155',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	icon: {
		fontSize: 32,
		marginRight: 12,
	},
	headerTextWrap: {
		flex: 1,
	},
	headerTitle: {
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: '700',
	},
	headerSubtitle: {
		color: '#94A3B8',
		fontSize: 14,
		marginTop: 2,
	},
	scannerBox: {
		height: 350,
		backgroundColor: '#0B1224',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#111827',
		marginBottom: 16,
		position: 'relative',
		overflow: 'hidden',
	},
	permissionText: {
		color: '#FDE68A',
		textAlign: 'center',
		paddingHorizontal: 12,
		position: 'absolute',
		top: '50%',
		left: 0,
		right: 0,
		transform: [{ translateY: -10 }],
		zIndex: 1,
	},
	barcode: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	scannerText: {
		position: 'absolute',
		bottom: 10,
		left: 0,
		right: 0,
		color: '#E2E8F0',
		fontSize: 14,
		textAlign: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		paddingVertical: 4,
		zIndex: 10,
	},
	statusBar: {
		backgroundColor: '#0B1224',
		borderWidth: 1,
		borderColor: '#111827',
		borderRadius: 10,
		padding: 12,
		marginBottom: 12,
	},
	statusText: {
		fontSize: 13,
		marginBottom: 4,
	},
	statusSuccess: {
		color: '#10B981',
	},
	statusError: {
		color: '#FCA5A5',
	},
	statusMuted: {
		color: '#94A3B8',
	},
	ticketMeta: {
		color: '#E2E8F0',
		fontSize: 12,
	},
	manualLabel: {
		color: '#94A3B8',
		fontSize: 14,
		textAlign: 'center',
		marginBottom: 12,
	},
	inputRow: {
		marginBottom: 12,
	},
	inputLabel: {
		color: '#FFFFFF',
		fontSize: 13,
		marginBottom: 6,
	},
	input: {
		backgroundColor: '#0F172A',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#334155',
		paddingHorizontal: 12,
		paddingVertical: 12,
		color: '#FFFFFF',
		fontSize: 14,
	},
	scanButton: {
		backgroundColor: '#EF4444',
		paddingVertical: 14,
		borderRadius: 10,
		alignItems: 'center',
	},
	scanButtonDisabled: {
		opacity: 0.6,
	},
	scanButtonText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '700',
	},
	secondaryButton: {
		marginTop: 10,
		paddingVertical: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#334155',
		alignItems: 'center',
		backgroundColor: '#0F172A',
	},
	secondaryButtonText: {
		color: '#E2E8F0',
		fontSize: 14,
		fontWeight: '600',
	},
	separator: {
		height: 1,
		backgroundColor: '#334155',
		marginVertical: 16,
	},
	instructionsTitle: {
		color: '#FFFFFF',
		fontSize: 13,
		fontWeight: '700',
		marginBottom: 8,
	},
	bulletRow: {
		flexDirection: 'row',
		marginBottom: 8,
	},
	bullet: {
		color: '#94A3B8',
		fontSize: 14,
		marginRight: 8,
	},
	bulletText: {
		color: '#94A3B8',
		fontSize: 13,
		flex: 1,
	},
	notice: {
		flexDirection: 'row',
		backgroundColor: 'rgba(249, 115, 22, 0.1)',
		borderLeftWidth: 3,
		borderLeftColor: '#F97316',
		padding: 12,
		marginHorizontal: 16,
		marginBottom: 20,
		borderRadius: 8,
	},
	noticeIcon: {
		fontSize: 16,
		marginRight: 8,
	},
	noticeText: {
		color: '#94A3B8',
		fontSize: 12,
		flex: 1,
	},
});
