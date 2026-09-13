export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // الصفحة الرئيسية
    if (request.method === "GET" && url.pathname === "/") {
      return new Response("WhatsApp Voice Bot is running.");
    }

    // التحقق من WhatsApp Webhook
    if (request.method === "GET" && url.pathname === "/webhook") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === env.VERIFY_TOKEN) {
        return new Response(challenge);
      }

      return new Response("Forbidden", { status: 403 });
    }

    // استقبال رسائل WhatsApp
    if (request.method === "POST" && url.pathname === "/webhook") {
      try {
        const body = await request.json();

        const message =
          body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (!message) {
          return new Response("OK");
        }

        if (message.type !== "text") {
          return new Response("OK");
        }

        const sender = String(message.from || "").replace(/\D/g, "");
        const text = message.text?.body?.trim();

        if (!sender || !text) {
          return new Response("OK");
        }

        // الأرقام المسموح لها
        const allowed = (env.ALLOWED_NUMBERS || "")
          .split(",")
          .map(x => x.replace(/\D/g, ""))
          .filter(Boolean);

        if (!allowed.includes(sender)) {
          console.log("Blocked:", sender);
          return new Response("OK");
        }

        console.log("Message:", text);

        // الرد المؤقت
        await sendWhatsApp(
          sender,
          "✅ وصلتني رسالتك!\n🎙️ جاري تجهيز الصوت..."
        , env);

        return new Response("OK");

      } catch (error) {
        console.error(error);
        return new Response("OK");
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};

async function sendWhatsApp(to, text, env) {
  const response = await fetch(
    `https://graph.facebook.com/v23.0/${env.PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: text
        }
      })
    }
  );

  if (!response.ok) {
    console.error(await response.text());
  }
          }
