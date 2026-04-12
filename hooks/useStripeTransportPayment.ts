import { useStripe } from "@stripe/stripe-react-native";
import apiService from "../services/api.service";

function merchantCountryFromCurrency(currency: string) {
  const c = currency.toLowerCase();
  if (c === "inr") return "IN";
  return "IN";
}

export type SheetApiResponse = {
  success: boolean;
  message?: string;
  code?: string;
  paidWithWalletOnly?: boolean;
  paymentIntentClientSecret?: string;
  ephemeralKeySecret?: string;
  customerId?: string;
  currency?: string;
  totalCents?: number;
  walletAppliedCents?: number;
  stripeChargeCents?: number;
  requiredCents?: number;
  walletBalanceCents?: number;
};

export function formatMinorCurrency(
  amountCents: number,
  currency: string = "inr",
) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export function useStripeTransportPayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  async function presentPaymentSheetFromApiResponse(
    sheet: SheetApiResponse,
  ): Promise<{
    ok: boolean;
    canceled?: boolean;
    message?: string;
    code?: string;
  }> {
    if (!sheet.success) {
      return {
        ok: false,
        message: sheet.message || "Payment setup failed",
        code: sheet.code,
      };
    }
    if (sheet.paidWithWalletOnly) {
      return { ok: true };
    }
    const currency = sheet.currency || "inr";
    const country = merchantCountryFromCurrency(currency);
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: "Transport",
      paymentIntentClientSecret: sheet.paymentIntentClientSecret!,
      customerEphemeralKeySecret: sheet.ephemeralKeySecret,
      customerId: sheet.customerId,
      returnURL: "mobile://stripe-redirect",
      // applePay: { merchantCountryCode: country },
      allowsDelayedPaymentMethods: false,
      googlePay: {
        merchantCountryCode: country,
        testEnv: __DEV__,
      },
      allowsRemovalOfLastSavedPaymentMethod: true,
    });

    if (initError) {
      console.log("initError.message", initError.message);
      return { ok: false, message: initError.message };
    }
    const { error: presentError } = await presentPaymentSheet();
    if (presentError) {
      if (presentError.code === "Canceled") {
        return { ok: false, canceled: true, message: presentError.message };
      }
      return { ok: false, message: presentError.message };
    }
    return { ok: true, message: "Payment successful" };
  }

  async function payForBooking(bookingId: string) {
    const data = (await apiService.createStripePaymentSheet({
      type: "booking_payment",
      bookingId,
    })) as SheetApiResponse;
    return presentPaymentSheetFromApiResponse(data);
  }

  async function payVehicleRegistration(vehicleId: string) {
    const data = (await apiService.createStripePaymentSheet({
      type: "vehicle_registration",
      vehicleId,
    })) as SheetApiResponse;
    return presentPaymentSheetFromApiResponse(data);
  }

  async function topUpWallet(amountCents: number) {
    const data = (await apiService.createStripePaymentSheet({
      type: "wallet_topup",
      amountCents,
    })) as SheetApiResponse;
    return presentPaymentSheetFromApiResponse(data);
  }

  return {
    payForBooking,
    payVehicleRegistration,
    topUpWallet,
    presentPaymentSheetFromApiResponse,
  };
}
