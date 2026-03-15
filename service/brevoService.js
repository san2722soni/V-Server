import Brevo from "@getbrevo/brevo";
import config from "../constants/config.js";

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, config.BREVO_API_KEY);

export async function sendOtpEmail({ to, otp }) {
  const sendSmtpEmail = {
    sender: { name: "V-Server", email: "invictusasw7@gmail.com" },
    to: [{ email: to }],
    subject: "Your V-Dashboard Developer Login OTP",
    htmlContent: `
      <div style="font-family: Arial; max-width: 600px;">
        <h2>Your V-Dashboard Login OTP</h2>
        <p>Use this OTP to complete login in dashboard:</p>
        <div style="padding: 20px; font-size: 32px; font-weight: bold;">${otp}</div>
        <p>This OTP expires in 10 minutes.</p>
      </div>
    `,
  };

  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("Email sent:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Failed to send email");
  }
}
