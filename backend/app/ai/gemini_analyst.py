"""
EarthWatch AI Analyst — Powered by Google Gemini
Replaces the old rule-based keyword-matching analyst with a real LLM.
Dynamically grounds every answer in live DB data passed as context.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# ── Try to import Gemini SDK ──────────────────────────────────────────────────
try:
    import google.generativeai as genai
    _GEMINI_AVAILABLE = True
except ImportError:
    _GEMINI_AVAILABLE = False
    logger.warning("google-generativeai not installed. Falling back to rule-based analyst.")

from app.models.schemas import AIAnalyzeRequest, AIAnalyzeResponse, DisasterEventOut, SatelliteOut


# ── System Prompt ─────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """You are EarthWatch AI Analyst — a precise, grounded Earth & disaster intelligence assistant.

RULES YOU MUST FOLLOW:
1. ONLY use the data provided in the context block. Never invent coordinates, events, or satellite details.
2. If the user's question cannot be answered from the context, say exactly:
   "Insufficient verified data available for that query. Please ask about active monitored events, satellites, or specific regions."
3. Keep answers factual, concise, and professional — like a mission control operator.
4. When citing events or satellites, use their exact names and IDs from the context.
5. Always end your answer with 2–3 relevant follow-up question suggestions (as a JSON array in a special block).
6. Confidence: report a number 0.0–1.0. Use ≥0.90 only when the context directly answers the question.

RESPONSE FORMAT (strict):
Answer your question naturally in plain text, then at the very end add:
<!--SUGGESTIONS:["suggestion 1","suggestion 2","suggestion 3"]-->
<!--CONFIDENCE:0.95-->
<!--SOURCES:["Source A","Source B"]-->
"""


def _build_context_block(
    events: List[Dict[str, Any]],
    satellites: List[Dict[str, Any]],
    selected_event: Optional[Dict] = None,
    selected_location: Optional[Dict] = None,
) -> str:
    """Serialise live DB data into a compact JSON context the LLM can reason over."""
    active_events = [e for e in events if e.get("status") in ("Active", "Monitoring")]

    ctx = {
        "active_events_count": len(active_events),
        "events": [
            {
                "id": e.get("id"),
                "title": e.get("title"),
                "type": e.get("type"),
                "severity": e.get("severity"),
                "latitude": e.get("latitude"),
                "longitude": e.get("longitude"),
                "description": e.get("description", "")[:200],
                "source": e.get("source"),
                "status": e.get("status"),
                "affected_area_km2": e.get("affected_area_km2"),
                "estimated_population": e.get("estimated_population"),
            }
            for e in active_events[:25]
        ],
        "satellites_count": len(satellites),
        "satellites": [
            {
                "id": s.get("id"),
                "name": s.get("name"),
                "norad_id": s.get("norad_id"),
                "mission": s.get("mission"),
                "sensor_type": s.get("sensor_type"),
                "swath_km": s.get("swath_km"),
                "altitude": s.get("altitude"),
                "latitude": round(s.get("latitude", 0), 2),
                "longitude": round(s.get("longitude", 0), 2),
            }
            for s in satellites[:15]
        ],
    }

    if selected_event:
        ctx["selected_event"] = selected_event
    if selected_location:
        ctx["selected_location"] = selected_location

    return json.dumps(ctx, indent=2, default=str)


def _parse_llm_response(raw: str, events: list, satellites: list, query: str) -> AIAnalyzeResponse:
    """Parse structured metadata blocks from the LLM response text."""
    import re

    suggestions = []
    confidence = 0.85
    sources = ["EarthWatch Live Database", "CelesTrak", "USGS", "NASA EONET"]

    # Extract suggestions
    sug_match = re.search(r'<!--SUGGESTIONS:(.*?)-->', raw, re.DOTALL)
    if sug_match:
        try:
            suggestions = json.loads(sug_match.group(1).strip())
        except Exception:
            pass
        raw = raw.replace(sug_match.group(0), "").strip()

    # Extract confidence
    conf_match = re.search(r'<!--CONFIDENCE:([\d.]+)-->', raw)
    if conf_match:
        try:
            confidence = float(conf_match.group(1))
        except Exception:
            pass
        raw = raw.replace(conf_match.group(0), "").strip()

    # Extract sources
    src_match = re.search(r'<!--SOURCES:(.*?)-->', raw, re.DOTALL)
    if src_match:
        try:
            sources = json.loads(src_match.group(1).strip())
        except Exception:
            pass
        raw = raw.replace(src_match.group(0), "").strip()

    answer = raw.strip()
    insufficient = "insufficient" in answer.lower() and "data" in answer.lower()

    # Find relevant events mentioned by name
    relevant_events = []
    answer_lower = answer.lower()
    for e in events[:6]:
        title_words = e.get("title", "").lower().split()
        if any(w in answer_lower for w in title_words if len(w) > 4):
            try:
                relevant_events.append(DisasterEventOut(**e))
            except Exception:
                pass
        if len(relevant_events) >= 4:
            break

    # Find relevant satellites mentioned
    relevant_sats = []
    for s in satellites[:5]:
        name_words = s.get("name", "").lower().split()
        if any(w in answer_lower for w in name_words if len(w) > 4):
            try:
                relevant_sats.append(SatelliteOut(**s))
            except Exception:
                pass

    return AIAnalyzeResponse(
        query=query,
        answer=answer,
        confidence=confidence,
        sources=sources,
        relevant_events=relevant_events,
        relevant_satellites=relevant_sats,
        suggestions=suggestions or [
            "What disasters are currently being monitored?",
            "Show me high-severity events",
            "Which satellites are relevant to this flood?",
        ],
        insufficient_data=insufficient,
    )


def process_analyst_query_gemini(
    req: AIAnalyzeRequest,
    events: List[Dict[str, Any]],
    satellites: List[Dict[str, Any]],
) -> AIAnalyzeResponse:
    """
    Main entry point — uses Gemini if API key is set, otherwise falls back
    to the original rule-based analyst gracefully.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not _GEMINI_AVAILABLE or not api_key:
        # Graceful fallback to old rule-based system
        from app.ai.analyst import process_analyst_query
        logger.info("Gemini API key not set — using rule-based analyst fallback.")
        return process_analyst_query(req, events, satellites)

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=_SYSTEM_PROMPT,
        )

        context_block = _build_context_block(
            events, satellites,
            selected_event=req.context_filters.get("event") if req.context_filters else None,
            selected_location=req.context_filters.get("location") if req.context_filters else None,
        )

        prompt = f"""LIVE EARTHWATCH DATABASE CONTEXT:
{context_block}

USER QUESTION: {req.query}

Answer grounded strictly in the context above."""

        response = model.generate_content(prompt)
        raw_text = response.text

        return _parse_llm_response(raw_text, events, satellites, req.query)

    except Exception as exc:
        logger.error(f"Gemini API error: {exc}. Falling back to rule-based analyst.")
        from app.ai.analyst import process_analyst_query
        return process_analyst_query(req, events, satellites)
