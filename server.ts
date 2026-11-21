import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function handleGeminiError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("GEMINI_API_KEY is not configured")) {
    return { status: 400, message: msg };
  }
  if (msg.includes("PERMISSION_DENIED") || msg.includes("403")) {
    return {
      status: 403,
      message:
        "Gemini API permission denied. Please check your GEMINI_API_KEY in Settings > Secrets.",
    };
  }
  if (msg.includes("API_KEY_INVALID") || msg.includes("400")) {
    return {
      status: 400,
      message:
        "Invalid Gemini API request or key. Please verify your GEMINI_API_KEY in Settings > Secrets.",
    };
  }
  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
    return {
      status: 429,
      message:
        "Gemini API rate limit reached. Please wait a moment and try again.",
    };
  }
  return {
    status: 500,
    message: msg || "Failed to generate response from Gemini.",
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/schedule/generate", async (req, res) => {
    try {
      const {
        activitiesText = "",
        activitiesList = [],
        classes = [],
        tasks = [],
        preferences = {},
      } = req.body ?? {};

      const hasActivities =
        (typeof activitiesText === "string" && activitiesText.trim().length > 0) ||
        (Array.isArray(activitiesList) && activitiesList.length > 0);
      const hasClassesOrTasks =
        (Array.isArray(classes) && classes.length > 0) ||
        (Array.isArray(tasks) && tasks.length > 0);

      if (!hasActivities && !hasClassesOrTasks) {
        res.status(400).json({
          error:
            "Please provide at least one activity, class, or pending task to generate a schedule.",
        });
        return;
      }

      const ai = getGeminiClient();

      const wakeTime = preferences.wakeTime || "07:30";
      const sleepTime = preferences.sleepTime || "23:00";
      const breakMinutes = Number(preferences.breakMinutes) || 15;
      const scope = preferences.scope === "today" ? "today" : "week";
      const weekDates = Array.isArray(preferences.weekDates)
        ? preferences.weekDates
        : [];
      const targetDay = preferences.targetDay || "Mon";
      const targetDate = preferences.targetDate || "";
      const focusNote = preferences.focusNote || "";

      const systemInstruction = [
        "You are an expert academic time-blocking assistant for university students.",
        "Build a realistic, conflict-free, energizing schedule using 24-hour HH:MM times.",
        "Rules:",
        "1. NEVER move, shorten, or overlap fixed classes. Include all fixed classes that fall inside the requested scope as blocks with sourceType='class'.",
        "2. Schedule every requested user activity according to its frequency, duration, and preferred time window.",
        "3. Fit pending high-priority and upcoming tasks into available open slots before their due dates using their estimated duration.",
        `4. Respect waking hours (${wakeTime} to ${sleepTime}) and leave at least ${breakMinutes} minutes of transition/break buffer between intensive sessions where practical.`,
        "5. Avoid scheduling overlapping blocks on the same day. Every block must have startTime < endTime.",
        "6. Use concise, natural titles and helpful practical notes (e.g., room name for classes, preparation tip for study blocks).",
        "7. Keep summary to 2-3 clear sentences explaining the schedule logic.",
      ].join("\n");

      const promptPayload = {
        scope,
        targetDay: scope === "today" ? targetDay : undefined,
        targetDate: scope === "today" ? targetDate : undefined,
        weekDates,
        wakingHours: { wakeTime, sleepTime, breakMinutes },
        focusNote,
        fixedClasses: classes,
        pendingTasks: tasks,
        requestedActivitiesText: activitiesText,
        requestedStructuredActivities: activitiesList,
      };

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Generate a structured, conflict-free student schedule for this context:\n${JSON.stringify(
          promptPayload,
          null,
          2
        )}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description:
                  "A concise 2-3 sentence overview explaining how activities, classes, and tasks were balanced.",
              },
              blocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    day: {
                      type: Type.STRING,
                      description:
                        "Three-letter weekday abbreviation: Mon, Tue, Wed, Thu, Fri, Sat, or Sun.",
                    },
                    startTime: {
                      type: Type.STRING,
                      description: "24-hour HH:MM start time, e.g. 09:00",
                    },
                    endTime: {
                      type: Type.STRING,
                      description: "24-hour HH:MM end time, e.g. 10:30",
                    },
                    category: {
                      type: Type.STRING,
                      description:
                        "One of: class, study, activity, errand, wellness, work, break",
                    },
                    location: { type: Type.STRING },
                    notes: { type: Type.STRING },
                    sourceType: {
                      type: Type.STRING,
                      description: "One of: class, task, activity",
                    },
                    sourceId: {
                      type: Type.STRING,
                      description:
                        "Matching class or task ID if derived from one, otherwise empty string",
                    },
                  },
                  required: [
                    "title",
                    "day",
                    "startTime",
                    "endTime",
                    "category",
                    "sourceType",
                  ],
                },
              },
            },
            required: ["summary", "blocks"],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err) {
      const { status, message } = handleGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post("/api/tasks/parse", async (req, res) => {
    try {
      const { text = "", todayDate = "", classes = [] } = req.body ?? {};
      if (typeof text !== "string" || !text.trim()) {
        res.status(400).json({ error: "Please enter notes or items to organize." });
        return;
      }

      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Current date: ${todayDate}\nStudent courses: ${JSON.stringify(
          classes
        )}\n\nParse this student brain dump into individual actionable tasks:\n${text}`,
        config: {
          systemInstruction:
            "Extract every actionable to-do item from the student's text. Infer realistic category (Academic, Errand, Finance, Personal), priority (High, Medium, Low), dueDate (YYYY-MM-DD, using current date as reference), dueTime (HH:MM 24h), estimatedMinutes (integer 10-240), and matching courseCode if applicable.",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    category: {
                      type: Type.STRING,
                      description: "One of: Academic, Errand, Finance, Personal",
                    },
                    priority: {
                      type: Type.STRING,
                      description: "One of: High, Medium, Low",
                    },
                    dueDate: {
                      type: Type.STRING,
                      description: "YYYY-MM-DD format",
                    },
                    dueTime: {
                      type: Type.STRING,
                      description: "HH:MM 24-hour format",
                    },
                    estimatedMinutes: { type: Type.INTEGER },
                    courseCode: { type: Type.STRING },
                    notes: { type: Type.STRING },
                  },
                  required: [
                    "title",
                    "category",
                    "priority",
                    "dueDate",
                    "estimatedMinutes",
                  ],
                },
              },
            },
            required: ["tasks"],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err) {
      const { status, message } = handleGeminiError(err);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*path}", (_req, res) => {
      const indexHtml = path.join(distPath, "index.html");
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send("Build output not found. Run npm run build first.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Termflow server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
