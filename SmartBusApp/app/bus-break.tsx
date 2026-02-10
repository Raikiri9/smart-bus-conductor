import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, CameraView, BarcodeScanningResult } from 'expo-camera';
import { decrementPassengerCount, incrementPassengerCount } from '../utils/passengerCounter';
import { API_BASE_URL } from '../utils/api';

type BreakAction = 'out' | 'in';

export default function BusBreakScreen() {
	const [selectedAction, setSelectedAction] = useState<BreakAction>('out');
	const isGoingOut = selectedAction === 'out';
	const isComingIn = selectedAction === 'in';

	const [hasPermission, setHasPermission] = useState<boolean | null>(null);
	const [qrCode, setQrCode] = useState('');
	const [isProcessing, setIsProcessing] = useState(false);
	const [scanningEnabled, setScanningEnabled] = useState(true);
	const [validationMessage, setValidationMessage] = useState<string>('');
	const [validationType, setValidationType] = useState<'none' | 'success' | 'error'>('none');
	const [lastTicket, setLastTicket] = useState<string>('');
	const [lastPassenger, setLastPassenger] = useState<{ destination?: string; origin?: string; fare?: number } | null>(null);
	const [outsideTickets, setOutsideTickets] = useState<string[]>([]);
	const cameraRef = useRef<CameraView>(null);
	const lastScannedRef = useRef<string>('');

	const scannerLabel = isGoingOut ? 'Scan to mark yourself outside' : 'Scan to confirm you are back onboard';
	const inputPlaceholder = isGoingOut ? 'Enter QR payload to exit' : 'Enter QR payload to return';
	const confirmLabel = isGoingOut ? 'Confirm Exit' : 'Confirm Return';

	const actions: Array<{ key: BreakAction; title: string; subtitle: string; icon: string }> = [
		{ key: 'out', title: 'Going Out', subtitle: 'Leaving the bus', icon: '↗' },
		{ key: 'in', title: 'Coming In', subtitle: 'Returning to bus', icon: '↙' },
	];

	useEffect(() => {
		(async () => {
			const { status } = await Camera.requestCameraPermissionsAsync();
			setHasPermission(status === 'granted');
		})();
		loadOutsideTickets();
	}, []);

	const OUTSIDE_KEY = 'OUTSIDE_PASSENGERS';

	const loadOutsideTickets = async () => {
		try {
			const raw = await AsyncStorage.getItem(OUTSIDE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) setOutsideTickets(parsed);
			}
		} catch (error) {
			console.log('Load outside error', error);
		}
	};

	const saveOutsideTickets = async (tickets: string[]) => {
		try {
			setOutsideTickets(tickets);
			await AsyncStorage.setItem(OUTSIDE_KEY, JSON.stringify(tickets));
		} catch (error) {
			console.log('Save outside error', error);
		}
	};

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

	const handleValidScan = async (payload: { ticketId: string; destination: string; origin: string; fare?: number }) => {
		setIsProcessing(true);
		try {
			// Validate against backend
			const ok = await validateOnServer(payload.ticketId);
			if (!ok) {
				setValidationType('error');
				setValidationMessage('QR not recognized or already processed.');
				return;
			}

			if (isGoingOut) {
				const updated = Array.from(new Set([...outsideTickets, payload.ticketId]));
				await saveOutsideTickets(updated);
				await decrementPassengerCount();
				setValidationType('success');
				setValidationMessage('Marked as outside. Occupancy updated.');
			} else {
				const updated = outsideTickets.filter((id) => id !== payload.ticketId);
				await saveOutsideTickets(updated);
				await incrementPassengerCount();
				setValidationType('success');
				setValidationMessage('Welcome back onboard. Occupancy updated.');
			}
			setLastTicket(payload.ticketId);
			setLastPassenger({ destination: payload.destination, origin: payload.origin, fare: payload.fare });
			setScanningEnabled(false);
		} catch (error) {
			setValidationType('error');
			setValidationMessage('Unable to record status. Try again.');
		} finally {
			setIsProcessing(false);
		}
	};

	const handleScan = async (frame: BarcodeScanningResult) => {
		if (!scanningEnabled || isProcessing || !frame) return;
		
		const data = frame.data;
		if (typeof data === 'string') {
			if (lastScannedRef.current === data) return; // Debounce
			lastScannedRef.current = data;
			const payload = parseQrPayload(data) ?? { ticketId: data, destination: '', origin: '' };
			await handleValidScan(payload as any);
		}
	};

	const handleManualValidate = async () => {
		if (!qrCode.trim()) {
			Alert.alert('QR required', 'Please enter the QR code content.');
			return;
		}
		const payload = parseQrPayload(qrCode.trim()) ?? { ticketId: qrCode.trim(), destination: '', origin: '' };
		await handleValidScan(payload as any);
	};

	const validateOnServer = async (qr: string) => {
		try {
			const res = await fetch(`${API_BASE_URL}/api/trips/validate/`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ qr_code: qr }),
			});
			const data = await res.json();
			return data?.status === 'valid';
		} catch (error) {
			return false;
		}
	};

	const handleResetScanner = () => {
		setScanningEnabled(true);
		setValidationType('none');
		setValidationMessage('');
		setLastTicket('');
		setLastPassenger(null);
	};

	return (
		<View style={styles.container}>
			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Text style={styles.backButtonText}>← Back to Home</Text>
				</TouchableOpacity>

			<View style={styles.card}>
				<View style={styles.header}>
					<Text style={styles.icon}>📟</Text>
					<View style={styles.headerTextWrap}>
						<Text style={styles.headerTitle}>Restroom Break</Text>
						<Text style={styles.headerSubtitle}>Scan QR code when leaving or returning to the bus</Text>
					</View>
				</View>

				<Text style={styles.sectionLabel}>Select Action:</Text>

				<View style={styles.actionsRow}>
					{actions.map((action) => {
						const isSelected = selectedAction === action.key;
						return (
							<TouchableOpacity
								key={action.key}
								style={[
									styles.actionCard,
									isSelected && styles.actionCardSelected,
									action.key === 'out' && isSelected && styles.actionCardSelectedOut,
									action.key === 'in' && isSelected && styles.actionCardSelectedIn,
								]}
								onPress={() => setSelectedAction(action.key)}
							>
								<Text style={[styles.actionIcon, { color: isSelected ? '#F97316' : '#9CA3AF' }]}>
									{action.icon}
								</Text>
								<Text style={styles.actionTitle}>{action.title}</Text>
								<Text style={styles.actionSubtitle}>{action.subtitle}</Text>
							</TouchableOpacity>
						);
					})}
				</View>

				<View style={styles.detailPanel}>
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
							onBarcodeScanned={scanningEnabled ? handleScan : undefined}
						/>
					)}
					<View style={styles.scanLine} />
					<Text style={styles.scannerText}>{scanningEnabled ? scannerLabel : 'Scan completed'}</Text>
				</View>

				{validationType !== 'none' && (
				<View style={styles.statusBar}>
					<Text style={[styles.statusText, validationType === 'success' ? styles.statusSuccess : styles.statusError]}>
						{validationMessage || (validationType === 'success' ? 'Processed successfully.' : 'There was a problem.')}
					</Text>
						{lastTicket ? (
							<Text style={styles.ticketMeta}>{lastPassenger?.origin ?? 'Origin'} → {lastPassenger?.destination ?? 'Destination'} {lastPassenger?.fare ? `• $${lastPassenger.fare}` : ''}</Text>
						) : null}
						{outsideTickets.length > 0 ? (
							<Text style={styles.outsideMeta}>Currently outside: {outsideTickets.length}</Text>
						) : null}
					</View>
				)}

			<Text style={styles.manualLabel}>Or enter QR code manually:</Text>
			<View style={styles.inputRow}>
						<Text style={styles.inputLabel}>QR Code</Text>
						<TextInput
							style={styles.input}
							placeholder={inputPlaceholder}
							placeholderTextColor="#9CA3AF"
							value={qrCode}
							onChangeText={setQrCode}
						/>
					</View>

					<TouchableOpacity
						style={[styles.scanButton, isComingIn && styles.scanButtonIn, isProcessing && styles.scanButtonDisabled]}
						onPress={handleManualValidate}
						disabled={isProcessing}
					>
						<Text style={styles.scanButtonText}>{isProcessing ? 'Processing...' : confirmLabel}</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.secondaryButton} onPress={handleResetScanner} disabled={isProcessing}>
						<Text style={styles.secondaryButtonText}>Reset Scanner</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.separator} />

				<Text style={styles.infoTitle}>Important Information:</Text>
				<View style={styles.bulletRow}>
					<Text style={styles.bullet}>✔</Text>
					<Text style={styles.bulletText}>Scan when leaving the bus for a restroom break</Text>
				</View>
				<View style={styles.bulletRow}>
					<Text style={styles.bullet}>✔</Text>
					<Text style={styles.bulletText}>Scan again when returning to the bus</Text>
				</View>
				<View style={styles.bulletRow}>
					<Text style={styles.bullet}>✔</Text>
					<Text style={styles.bulletText}>The bus will track your presence</Text>
				</View>
				<View style={styles.bulletRow}>
					<Text style={styles.bullet}>✔</Text>
					<Text style={styles.bulletText}>You will receive an alert if the bus starts moving without you</Text>
				</View>
			</View>

			<View style={styles.tipCard}>
				<Text style={styles.tipIcon}>💡</Text>
				<Text style={styles.tipText}>
					Tip: Make sure to scan both when leaving and returning to ensure proper tracking.
				</Text>
			</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#0F172A',
		paddingTop: 8,
	},
	scrollView: {
		flex: 1,
	},
	backButton: {
		paddingHorizontal: 20,
		paddingVertical: 14,
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
		alignItems: 'center',
		marginBottom: 20,
	},
	icon: {
		fontSize: 40,
		marginBottom: 8,
	},
	headerTextWrap: {
		alignItems: 'center',
	},
	headerTitle: {
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: '700',
	},
	headerSubtitle: {
		color: '#94A3B8',
		fontSize: 14,
		marginTop: 4,
	},
	sectionLabel: {
		color: '#E2E8F0',
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 10,
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 10,
		marginBottom: 20,
	},
	actionCard: {
		flex: 1,
		backgroundColor: '#0F172A',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#334155',
		padding: 12,
		alignItems: 'center',
	},
	actionCardSelected: {
		borderColor: '#F97316',
		backgroundColor: 'rgba(249, 115, 22, 0.1)',
	},
	actionCardSelectedOut: {
		borderColor: '#F97316',
		backgroundColor: 'rgba(249, 115, 22, 0.15)',
	},
	actionCardSelectedIn: {
		borderColor: '#10B981',
		backgroundColor: 'rgba(16, 185, 129, 0.15)',
	},
	actionIcon: {
		fontSize: 20,
		marginBottom: 6,
	},
	actionTitle: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 2,
	},
	actionSubtitle: {
		color: '#94A3B8',
		fontSize: 10,
	},
	detailPanel: {
		marginBottom: 16,
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
	scanLine: {
		position: 'absolute',
		width: '90%',
		height: 2,
		backgroundColor: '#F97316',
		top: '50%',
		left: '5%',
		zIndex: 10,
	},
	scanLineIn: {
		backgroundColor: '#10B981',
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
	outsideMeta: {
		color: '#F97316',
		fontSize: 12,
		marginTop: 4,
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
		backgroundColor: '#F97316',
		paddingVertical: 14,
		borderRadius: 10,
		alignItems: 'center',
		marginBottom: 8,
	},
	scanButtonIn: {
		backgroundColor: '#10B981',
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
	infoTitle: {
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
	tipCard: {
		flexDirection: 'row',
		backgroundColor: 'rgba(59, 130, 246, 0.1)',
		borderLeftWidth: 3,
		borderLeftColor: '#3B82F6',
		padding: 12,
		marginHorizontal: 16,
		marginBottom: 20,
		borderRadius: 8,
	},
	tipIcon: {
		fontSize: 16,
		marginRight: 8,
	},
	tipText: {
		color: '#94A3B8',
		fontSize: 12,
		flex: 1,
	},
});
