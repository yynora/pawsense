# PawSense

**A real-time multimodal pet monitoring prototype for detecting separation anxiety and triggering timely interventions.**

PawSense is an applied machine learning system for a product problem that is easy to describe but hard to solve well: **how do we infer a pet’s stress state from noisy live audio/video, keep the estimate stable over time, and only intervene when the signal is strong enough to be useful?**

The current prototype captures webcam video and microphone audio in the browser, sends short multimodal windows to a backend, produces a structured stress assessment, and turns that assessment into actions such as calming audio playback, owner alerts, and a daily behavior summary.

---

## The problem

Pet stress is a **latent state**. In a real home environment, it is not directly observable and must be inferred from weak, ambiguous cues such as pacing, scratching, whining, barking, restlessness, or silence after agitation.

This makes the problem fundamentally different from simple image classification:

- a single frame is often not enough to distinguish stress from normal activity,
- audio and video are both noisy and incomplete,
- decisions must be made **sequentially** over time rather than independently per frame,
- and the product has to balance **sensitivity** with **false alarm control**.

In other words, the hard part is not just “can a model describe what it sees,” but:

> **Can a system convert messy multimodal signals into a stable, trustworthy intervention policy?**

That is the core problem this project is designed around.

---

## Why this is hard

### 1. Stress is not directly labeled in the environment
The user does not provide ground-truth labels in real time. The system must infer an internal state from behavior patterns, which makes robustness and calibration more important than one-off predictions.

### 2. Temporal context matters
A bark or movement spike in isolation may be harmless. Repeated pacing, scratching, or distress vocalization across several windows is much more meaningful. The system therefore needs short-term memory and rules for escalation and cooldown.

### 3. Product quality depends on decision policy, not just model output
A good user experience requires more than a model score. The system must decide when to stay quiet, when to play calming audio, and when the situation is severe enough to alert the owner.

### 4. The output must be machine-actionable
Free-form text is not enough for a real product loop. The backend needs structured outputs so that downstream actions are deterministic and safe.

---

## Approach

PawSense is implemented as a small end-to-end ML product pipeline:

1. **Browser-side sensing**  
   The frontend captures live webcam video and microphone audio from the user’s device.

2. **Windowed multimodal inference**  
   On a fixed cadence of roughly **3.5 seconds**, the app sends a compressed video frame, a short audio chunk, and recent behavior history to the backend.

3. **Structured state estimation**  
   The backend calls a multimodal model with a strict JSON schema and requests fields such as:
   - `stress_level`
   - `behavior_detected`
   - `intervention_required`
   - `action`
   - `chatbot_message`

4. **Intervention policy layer**  
   The model output is passed through simple but interpretable temporal rules:
   - high stress triggers soothing intervention,
   - owner alert is reserved for roughly **15 seconds of sustained high stress**,
   - roughly **15 seconds of calm** is required before turning intervention off.

5. **Action + reporting**  
   The system plays calming audio, logs events, displays a live activity feed, and can generate a daily behavior report from the accumulated event history.

---

## What the current prototype does

### Live monitoring
- Captures webcam + microphone input in the browser.
- Buffers audio and samples video periodically.
- Sends a multimodal payload to the backend for analysis.

### Stress-aware intervention
- Estimates a 1–10 stress level.
- Describes the current behavior in structured form.
- Chooses between no action, calming audio, or owner alert.

### Temporal smoothing
- Maintains recent state history across multiple analysis windows.
- Prevents the system from rapidly toggling between active and inactive states.
- Uses cooldown logic so intervention stops only after continued calm behavior.

### Real-time UX layer
- Displays a live stress meter.
- Maintains an activity log for model-generated explanations.
- Plays a generated or fallback soothing track.
- Surfaces owner notifications during high-confidence distress events.

### End-of-day summary
- Aggregates logged events.
- Produces a readable daily report card summarizing behavior patterns.

---

## Applied ML framing

This project is best understood as an **applied ML / decision system**, not just a UI demo.

The central ML question is:

> **How do we infer a stable behavioral state from noisy multimodal observations and convert it into a product action with acceptable false positive / false negative tradeoffs?**

That framing matters because it mirrors many real product ML problems:

- classify a hidden customer state from partial observations,
- fuse multiple weak signals,
- add temporal memory to improve decision quality,
- make outputs structured enough for automation,
- and optimize for downstream product utility rather than model output alone.

---

## Design choices in this repository

These implementation choices are especially important because they make the system more product-like and less like a one-off prompt demo:

### Structured outputs instead of free-form generation
The backend defines an explicit response schema for stress score, detected behavior, intervention flag, action, and owner-facing explanation. This makes the output easier to validate and route into UI or automation.

### Short-horizon memory
The frontend maintains a rolling history of recent behavior windows and sends it back with each request. In the current implementation, that history covers the last **6 windows** (about **21 seconds**), which gives the system enough local context to reason over progression rather than isolated snapshots.

### Escalation / de-escalation logic
The system separates **state estimation** from **action policy**. This is a good product ML pattern because model predictions alone are rarely sufficient for intervention decisions.

### Cached intervention media
Calming audio generation is cached for a short period (about **25 seconds** in the current implementation) so the experience feels continuous instead of re-triggering abruptly on every cycle.

---

## Current architecture

```text
Browser webcam/mic
    ↓
Periodic frame + audio window capture
    ↓
Backend multimodal analysis endpoint
    ↓
Structured stress assessment
    ↓
Policy layer (soothe / alert / stay inactive)
    ↓
Live dashboard + activity log + audio playback
    ↓
Event logging + daily behavior report
```

---

## Repository structure

```text
backend/
  server.js                # Express API for multimodal analysis and report generation
  package.json             # Backend dependencies

frontend/
  src/app/page.tsx         # Main dashboard
  src/components/
    PetVideoFeed.tsx       # Browser webcam/audio capture and periodic analysis loop
    LiveInterventionMonitor.tsx   # Status UI, activity log, audio player, intervention controls
```

---

## Tech stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express
- **ML / AI services:** Gemini multimodal inference, Lyria audio generation
- **Browser APIs:** `getUserMedia`, `MediaRecorder`, Notifications API

---

## What I would evaluate next

If I were extending this into a stronger product ML project, the next step would be to add a proper evaluation loop.

### Offline evaluation
- Event-level precision / recall for true distress episodes
- False alerts per monitoring hour
- Time-to-detection after onset of sustained stress
- Intervention shutoff accuracy after recovery

### Product evaluation
- Alert acknowledgement rate
- Fraction of distress sessions resolved by soothing audio before escalation
- User trust metrics such as alert fatigue or suppression rate
- Retention / repeat usage for households with active monitoring

### Modeling extensions
- Personalized thresholds by pet
- Per-pet history and calibration
- Better separation of boredom, play, and anxiety behaviors
- Persistent storage and labeled event review workflow
- Learning intervention policy from owner feedback over time

---

## Limitations

This repository is a prototype, and a few choices are intentionally lightweight:

- event history is currently stored in memory rather than a database,
- intervention logic is rule-based rather than learned from outcomes,
- there is no offline benchmark yet,
- and the current experience is centered on a single-pet monitoring workflow.

Those limitations are also what make the next iteration interesting from a data science perspective.

---

## Local setup

### Backend
```bash
cd backend
npm install
cp .env.example .env
# set GEMINI_API_KEY in .env
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

If needed, set:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

Then open the frontend locally and allow camera / microphone permissions to test the live monitoring loop.

---

## Summary

PawSense is an end-to-end prototype for a product-centric ML problem:

**estimating pet stress from noisy multimodal behavioral signals and turning that estimate into stable, useful interventions.**

That combination of sensing, structured inference, temporal reasoning, and decision policy is the main technical challenge this repository is solving.
