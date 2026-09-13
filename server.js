const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// أرقام واتساب المسموح لها باستخدام البوت
const ALLOWED_NUMBERS = (process.env.ALLOWED_NUMBERS || "")
  .split(",")
  .map(n => n.replace(/\D/g, ""))
  .filter(Boolean);

// إعدادات WhatsApp Cloud API
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send("WhatsApp Voice Bot is running.");
});

// التحقق من Webhook الخاص بواتساب
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// استقبال رسائل واتساب
app.post("/webhook", async (req, res) => {
  // نرد بسرعة على Meta
  res.sendStatus(200);

  try {
    const message =
      req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return;

    // نحن نريد النص فقط في هذه المرحلة
    if (message.type !== "text") return;

    const sender = String(message.from || "").replace(/\D/g, "");
    const text = message.text?.body?.trim();

    if (!sender || !text) return;

    // منع أي رقم غير مصرح له
    if (!ALLOWED_NUMBERS.includes(sender)) {
      console.log("Blocked number:", sender);
      return;
    }

    console.log(`Text from ${sender}: ${text}`);

    // مؤقتًا نرسل تأكيدًا.
    // سنستبدله بتوليد الصوت في الخطوة التالية.
    await sendText(
      sender,
      "✅ وصلتني رسالتك.\n\nجاري تجهيز الصوت..."
    );

  } catch (error) {
    console.error(
      "Webhook error:",
      error.response?.data || error.message
    );
  }
});

// إرسال رسالة نصية
async function sendText(to, body) {
  const url =
    `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body
      }
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
