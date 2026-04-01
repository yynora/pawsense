require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST"],
}));
app.use(express.json({ limit: "50mb" }));

// Initialize the standard REST SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PET_ETHOLOGIST_PROMPT = `You are an expert pet behaviorist. Analyze this frame and audio snippet. Compare it to the provided history. Look specifically for pacing (movement across frames), scratching, or distress vocalizations.\n\nCRITICAL INTERVENTION RULES:\n- For any stress level > 5, you must intervene.\n- Your default intervention MUST be 'play_lyria' to attempt de-escalation.\n- You may ONLY use 'alert_owner' IF the history array shows the dog has already been at a high stress level (> 5) for at least 4 past consecutive frames (approx 15 seconds). If it is a new stress event, strictly output 'play_lyria'.\n- If you only see a human face and NO pet is visible in the frame, you MUST set the stress level to 1 and action to 'none' immediately.\n\nReturn a JSON object strictly following the required schema.`;

// Define exactly what the model should output
const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    stress_level: {
      type: SchemaType.INTEGER,
      description: "A stress score between 1 and 10 based on the observations.",
    },
    behavior_detected: {
      type: SchemaType.STRING,
      description: "A brief description of what the pet is actively doing right now.",
    },
    intervention_required: {
      type: SchemaType.BOOLEAN,
      description: "True if the pet's stress exceeds 5 or shows clear distress.",
    },
    action: {
      type: SchemaType.STRING,
      description: "Action to take. E.g., 'play_lyria', 'alert_owner', or 'none'.",
    },
    chatbot_message: {
      type: SchemaType.STRING,
      description: "A friendly but urgent chat message direct to the pet owner. Explain what the dog is currently doing, use the History array to state approximately how long the behavior has lasted (each history frame is 3.5 seconds), what the behavior indicates psychologically (e.g., panic, boredom), and what action you (the AI) are taking.",
    },
  },
  required: ["stress_level", "behavior_detected", "intervention_required", "action", "chatbot_message"],
};

// Mock DB Storage
const eventLogDB = [];

// Lyria Audio Context Cache
let currentLyriaBuffer = null;
let lastLyriaGenerationTime = 0;

app.post("/api/analyze-pulse", async (req, res) => {
  try {
    const { image, audio, history } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: PET_ETHOLOGIST_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    // Construct the multimodal content array
    const parts = [
      { text: `Previous State History for Context: ${JSON.stringify(history)}\nAnalyze the current attached frame and audio:` }
    ];

    if (image) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: image, // base64 string
        },
      });
    }

    if (audio) {
      parts.push({
        inlineData: {
          mimeType: "audio/webm",
          data: audio, // base64 string
        },
      });
    }

    const result = await model.generateContent(parts);
    const responseText = result.response.text();
    const analysis = JSON.parse(responseText);

    // Real Lyria Intervention Synthesis
    let audioUrl = null;
    if (analysis.action === "play_lyria") {
      console.log("-> 🎵 Lyria Engine Triggered! Stress level:", analysis.stress_level);
      
      const now = Date.now();
      // If we generated a song less than 25 seconds ago, return the cached version to keep the player smooth
      if (currentLyriaBuffer && (now - lastLyriaGenerationTime < 25000)) {
         audioUrl = currentLyriaBuffer;
         console.log("   -> Returning Currently Playing Track (Cached).");
      } else {
         console.log("   -> Calling lyria-3-pro-preview API to synthesize new 30s track...");
         try {
           const lyriaModel = genAI.getGenerativeModel({ model: "lyria-3-pro-preview" });
           
           // We use the behavior_detected to give context to the Lyria model
           const lyriaPrompt = `A deeply soothing, 30-second acoustic meditation track to calm a dog experiencing ${analysis.behavior_detected}. Ambient drone, low BPM, soft piano, no drums.`;
           
           const lyriaResult = await lyriaModel.generateContent(lyriaPrompt);
           
           // Extract audio base64 payload safely
           const parts = lyriaResult?.response?.candidates?.[0]?.content?.parts;
           const audioBase64 = parts?.[0]?.inlineData?.data;
           
           if (!audioBase64) {
             throw new Error("Lyria API did not return valid inlineData");
           }
           audioUrl = `data:audio/mp3;base64,${audioBase64}`;
           
           // Cache it globally
           currentLyriaBuffer = audioUrl;
           lastLyriaGenerationTime = now;
           console.log("   -> Synthesized brand new acoustic medicine track!");
           
         } catch (lyriaErr) {
           console.error("   -> Error generating Lyria track:", lyriaErr);
           // Fallback to the user-requested Youtube Releaxing Dog Music track
           audioUrl = "https://www.youtube.com/watch?v=UGsji3SHKis";
         }
      }
    }

    // Log to Mock DB
    const eventEntry = { timestamp: new Date(), analysis, action_taken: analysis.action };
    eventLogDB.push(eventEntry);
    console.log(`[DB Logged] Stress: ${analysis.stress_level}/10 | Action: ${analysis.action.toUpperCase()} | Behavior: ${analysis.behavior_detected}`);
    console.log(`[AI Ethologist ChatMsg]: ${analysis.chatbot_message}`);

    if (analysis.action === "alert_owner") {
      console.log(`\n======================================================`);
      console.log(`📡 [DISPATCHING PUSH NOTIFICATION TO OWNER'S PHONE]`);
      console.log(`📡 PAYLOAD: { "title": "🚨 Guardian Pet AI Emergency",`);
      console.log(`📡            "body": "${analysis.chatbot_message}" }`);
      console.log(`======================================================\n`);
    }

    res.json({
      success: true,
      analysis,
      audioUrl
    });

  } catch (error) {
    console.error("Pulse Analysis Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate Anxiety Report Endpoint
app.post("/generate-report", async (req, res) => {
  try {
    if (eventLogDB.length === 0) {
      return res.json({ success: true, report: "No pet activity logged yet. Keep monitoring to generate a report." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const logSummary = eventLogDB.map(event => `Stress: ${event.analysis.stress_level}, Behavior: ${event.analysis.behavior_detected}`).join("\n");
    
    const prompt = `You are writing a Daily Dog Report Card for Nora about her dog, Bruce.
Bruce's Profile: Nova Scotia Duck Tolling Retriever, Male, 5 Years Old, 40 Pounds.
Log Data:
${logSummary}

CRITICAL RULES:
- DO NOT use any Markdown formatting whatsoever (no **, no ###, no bullet points).
- Do not add "Observer: Professional Pet Behaviorist" or any formal signature.
- Write it in plain, friendly text directly to Nora.

Format the text strictly like this:

WHAT BRUCE DID TODAY:
[A short 2-3 sentence paragraph summarizing his overall behavior, separation anxiety, and stress vs calm times today]

TODAY BRUCE WAS:
[List 2-3 traits from: Happy, Playful, Naughty, Loud, Lazy, Silly, Shy based on the logs]

COMMENTS:
[A final encouraging sentence or recommendation for Nora]`;

    const result = await model.generateContent(prompt);
    
    res.json({ success: true, report: result.response.text() });
  } catch (error) {
    console.error("Report Generation Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend Pulse API running on http://localhost:${PORT}`);
});
